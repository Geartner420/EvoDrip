import logger from './helper/logger.mjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import express from 'express';
import bodyParser from 'body-parser';
import basicAuth from 'express-basic-auth';
import os from 'os';
import { spawn } from 'child_process';

// Setze __dirname (ESM-Kompatibilität)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env laden (Projektbasis)
dotenv.config({ path: path.join(__dirname, '.env') });
console.log('[DEBUG] DEBUG-Modus ist:', process.env.DEBUG);

// sensor_data-Ordner anlegen, falls nicht vorhanden
const sensorDataDir = path.join(__dirname, 'sensor_data');
if (!fs.existsSync(sensorDataDir)) {
  fs.mkdirSync(sensorDataDir, { recursive: true });
  console.log('📁 sensor_data-Verzeichnis erstellt');
}

// Lade alle relevanten Services und Hilfsmodule
import { loadState, saveState } from './services/stateService.mjs';
import { loadMoistureData, saveMoistureData } from './services/moistureService.mjs';
import { fetchMoisture } from './services/fytaservice.mjs';
import { triggerShelly } from './services/shellyService.mjs';
import { checkAndWater } from './services/wateringService.mjs';
import { buildWateringOptions } from './helper/wateringOptions.mjs';
import { buildMineralWateringOptions } from './helper/mineralWateringOptions.mjs';
import { loadRoutes } from './helper/loadRoutes.mjs';
import { cta } from './services/connectAll.mjs';
import { startSensorProcessing } from './services/vpdService.mjs';
import { startRuleEngine } from './services/rule_engine.mjs';
import { controlRelays } from './services/umluftContol.mjs';
import config from './helper/config.mjs';
import { checkAllPhases } from './services/checkCropSteering.mjs'; // Crop-Steering!


// Importiere alle Route-Module für die API und UI
import sensorDataRoutes from './routes/sensorDataRoutes.mjs';
import historyRoute from './routes/historyRoute.mjs';
import historyViewRoute from './routes/historyView.mjs';
import rulesRoutes from './routes/api/rules.mjs';
import relaysRoutes from './routes/api/relays.mjs';
import sensorsRoutes from './routes/api/sensors.mjs';
import sensorStatusRoute from './routes/api/sensorStatus.mjs';
import relayRulesRoutes from './routes/api/relaysRules.mjs';
import chartSwitches from './routes/api/chartSwitches.mjs';
import regelLogRouter from './routes/regelLogRoutes.mjs';
import envUpdateRoute from './routes/updateRoute.mjs';
import uiRoutes from './routes/uiRoutes.mjs';

// Entpacke wichtige Config-Parameter
const {
  UI_USERNAME,
  UI_PASSWORD,
  CHECK_INTERVAL_MINUTES,
  MOISTURE_SAVE_INTERVAL_MS
} = config;

// Haupt-Server-Initialisierung
async function startServer() {
  const app = express();

  // View-Engine und statische Pfade konfigurieren
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  app.use('/styles', express.static(path.join(__dirname, 'public/styles')));
  app.use('/scripts', express.static(path.join(__dirname, 'public/scripts')));
  app.use(express.static(path.join(__dirname, 'public')));

  // Basic-Auth für UI
  app.use(basicAuth({ users: { [UI_USERNAME]: UI_PASSWORD }, challenge: true }));

  // Routen für APIs & Views einhängen
  app.use('/sensor-data', sensorDataRoutes);
  app.use('/api', chartSwitches);
  app.use('/api/rules', rulesRoutes);
  app.use('/api/relays', relaysRoutes);
  app.use('/api/sensors', sensorsRoutes);
  app.use('/api/sensor-status', sensorStatusRoute);
  app.use('/api/relaysRules', relayRulesRoutes);
  app.use('/rulelog', regelLogRouter);
  app.use('/updateEnv', envUpdateRoute);
  app.use(historyRoute);
  app.use(historyViewRoute);
  app.use('/ui', uiRoutes);

  // UI-Einzelseiten
  app.get('/klima-control', (req, res) => res.render('klimaControl'));
  app.get('/relay-cycle', (req, res) => res.render('shellyControl'));
  app.get('/combined-dashboard', (req, res) => res.render('combinedDashboard'));

  // Sensor-Namen lesen/schreiben
  const filePath = path.join(sensorDataDir, 'sensorNames.json');

  app.get('/api/sensor-names', (req, res) => {
    fs.readFile(filePath, (err, data) => {
      if (err) return res.status(500).json({});
      res.json(JSON.parse(data));
    });
  });

  app.post('/api/sensor-names', (req, res) => {
    const { id, name } = req.body;
    if (!id || typeof name !== 'string') {
      return res.status(400).json({ success: false, message: 'Ungültige Daten' });
    }
    fs.readFile(filePath, (err, data) => {
      const current = err ? {} : JSON.parse(data);
      current[id] = name;
      fs.writeFile(filePath, JSON.stringify(current, null, 2), err => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
      });
    });
  });

  // Interne Initialisierung: Lese letzten Trigger, lade Daten, Routen etc.
  let lastTriggerTime = loadState();
  loadMoistureData();
  await loadRoutes(app, path.join(__dirname, 'routes'));

  // Umluft-Automatik (manuell triggerbar)
  app.post('/start-relay-cycle', async (req, res) => {
    try {
      await controlRelays();
      res.status(200).send('Relaissteuerung gestartet.');
    } catch (error) {
      res.status(500).send('Fehler beim Starten der Relaissteuerung: ' + error.message);
    }
  });

  // Globale Busy-Flag
  global.busy = false;

  // Gieß-Trigger-Handling für beide Modi
  const getLastTriggerTime = (phase = 'default') => lastTriggerTime?.[phase] ?? null;
  const setLastTriggerTime = (phase = 'default', ts) => {
    if (!lastTriggerTime) lastTriggerTime = {};
    lastTriggerTime[phase] = ts;
  };

  // Gieß-Optionsobjekte für die jeweiligen Modi
  const wateringOptions = buildWateringOptions(
    () => getLastTriggerTime('organisch'),
    ts => setLastTriggerTime('organisch', ts),
    logger
  );
  const wateringMineralOptions = buildMineralWateringOptions(
    () => getLastTriggerTime('mineralisch'),
    ts => setLastTriggerTime('mineralisch', ts)
  );

  // Automatikstart je nach Modus (Crop Steering oder klassisch)
  if (config.WATERING_MODE === 'organisch') {
    logger.info('🟢 Organischer Gießmodus aktiv');
    checkAndWater(wateringOptions);
    setInterval(() => checkAndWater(wateringOptions), config.CHECK_INTERVAL_MINUTES * 60_000);
  } else if (config.WATERING_MODE === 'mineralisch') {
    logger.info('🔵 Mineralischer Gießmodus (Crop Steering) aktiv');
    checkAllPhases(); // ruft automatisch P1, P2, P3
    setInterval(() => checkAllPhases(), config.CHECK_INTERVAL_MINUTES * 60_000);
  }

  // Server starten
  const PORT = process.env.PORT || 3600;
  app.listen(PORT, '0.0.0.0', () =>
    logger.info(`🛜 Interface läuft auf http://localhost:${PORT}`)
  );

  logger.info(`💾 Feuchtigkeitsdaten werden alle ${MOISTURE_SAVE_INTERVAL_MS / 1000} Sekunden gespeichert`);
}

// Hauptprogramm mit OS-Energiesparblock für Windows
async function main() {
  function keepAwake() {
    if (os.platform() !== 'win32') return;
    try {
      spawn('powercfg', ['/requestsoverride', 'PROCESS', 'node.exe', 'SYSTEM', 'DISPLAY'], {
        stdio: 'ignore'
      });
      logger.info('💡 Energiesparmodus blockiert (Windows)');
    } catch (err) {
      logger.warn('⚠️ Konnte Sleep-Block nicht setzen:', err.message);
    }
  }

  try {
    await startServer();
    keepAwake();
    saveMoistureData();// Initiale Feuchtigkeitsdaten speichern
    saveState(); 
    cta(); // z. B. FYTA Connect
    startSensorProcessing(); // VPD & Sensordaten-Verarbeitung

    startRuleEngine(); // Regel-Engine starten
    if (!global.umluftStarted) {
      controlRelays();
      global.umluftStarted = true;
      logger.info('[umluft] Umluftsteuerung beim Start aktiviert');
    }
  } catch (err) {
    logger.error('❌ Fehler beim Start des Servers:', err);
    process.exit(1);
  }
}

main();
setInterval(() => {saveMoistureData()}, 600000); // Speichere Feuchtigkeitsdaten alle 10 Minuten
setInterval(() => {saveState()}, 60000); // Speichere den Zustand alle 60 Sekunden