import express from 'express';
import path from 'path';
import fs from 'fs';
import bodyParser from 'body-parser';
import basicAuth from 'express-basic-auth';
import { fetchMoisture } from './services/fytaservice.mjs';
import { triggerShelly } from './services/shellyService.mjs';
import { loadState, saveState } from './services/stateService.mjs';
import { loadMoistureData, saveMoistureData } from './services/moistureService.mjs';
import { isNightTime } from './services/timeService.mjs';
import { checkAndWater } from './services/wateringService.mjs';
import { loadRoutes } from './helper/loadRoutes.mjs';
import { watchEnvAndRestart } from './services/watchEnv.mjs';
import { buildWateringOptions } from './helper/wateringOptions.mjs';
import config from './helper/config.mjs';
import logger from './helper/logger.mjs';
import { cta } from './services/connectAll.mjs';
import { getLatestSensorValues } from './services/connectAll.mjs';
import sensorDataRoutes from './routes/sensorDataRoutes.mjs';
import { startSensorProcessing } from './services/vpdService.mjs';
import historyRoute from './routes/historyRoute.mjs';
import historyViewRoute from './routes/historyView.mjs';
import rulesRoutes from './routes/api/rules.mjs';
import relaysRoutes from './routes/api/relays.mjs';
import sensorsRoutes from './routes/api/sensors.mjs';
import { startRuleEngine } from './services/rule_engine.mjs';
import sensorStatusRoute from './routes/api/sensorStatus.mjs';
import { controlRelays } from './services/umluftContol.mjs'; // Relaissteuerung importieren
import relayRulesRoutes from './routes/api/relaysRules.mjs';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const {
  UI_USERNAME,
  UI_PASSWORD,
  CHECK_INTERVAL_MINUTES,
  MOISTURE_SAVE_INTERVAL_MS
} = config;

async function startServer() {
  const app = express();

  // Middleware
  app.set('view engine', 'ejs');
  app.set('views', './views');
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(basicAuth({ users: { [UI_USERNAME]: UI_PASSWORD }, challenge: true }));
  app.use('/sensor-data', sensorDataRoutes);
  app.use(historyRoute);
  app.use(historyViewRoute);
  app.use('/api/rules', rulesRoutes);
  app.use('/api/relays', relaysRoutes);
  app.use('/api/sensors', sensorsRoutes);
  app.use('/api/sensor-status', sensorStatusRoute);
  app.use('/api/relaysRules', relayRulesRoutes);
  app.use(express.static(path.join(__dirname, 'public')));


  const filePath = './sensor_data/sensorNames.json';
  
  // GET: Alle Namen zurückgeben
  app.get('/api/sensor-names', (req, res) => {
    fs.readFile(filePath, (err, data) => {
      if (err) return res.status(500).json({});
      res.json(JSON.parse(data));
    });
  });

    // Rendern der neuen UI-Datei shellyControl.ejs
    app.get('/shelly-control', (req, res) => {
      res.render('index'); // Das Formular für Relaissteuerung
    });

  // Rendern der neuen UI-Datei shellyControl.ejs
  app.get('/relay-cycle', (req, res) => {
    res.render('shellyControl'); // Das Formular für Relaissteuerung
  });

  // Route zum Starten des Relaiszyklus
  app.post('/start-relay-cycle', async (req, res) => {
    try {
        await controlRelays();  // Relaissteuerung aus umluftContol.mjs aufrufen
        res.status(200).send('Relaissteuerung gestartet.');
    } catch (error) {
        res.status(500).send('Fehler beim Starten der Relaissteuerung: ' + error.message);
    }
  });

  // POST: Einen Namen speichern
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

  // Feuchtigkeitsdaten initial laden
  let lastTriggerTime = loadState();
  loadMoistureData();

  // Routen automatisch laden
  await loadRoutes(app, './routes');

  // Gießüberwachung starten
  global.busy = false;
  const getLastTriggerTime = () => lastTriggerTime;
  const setLastTriggerTime = (ts) => { lastTriggerTime = ts; };

  const wateringOptions = buildWateringOptions(getLastTriggerTime, setLastTriggerTime, logger);
  checkAndWater(wateringOptions);
  setInterval(() => checkAndWater(wateringOptions), CHECK_INTERVAL_MINUTES * 60000);

  // Feuchtigkeitsdaten regelmäßig speichern
  setInterval(saveMoistureData, MOISTURE_SAVE_INTERVAL_MS);

  // Server starten
  const PORT = process.env.PORT || 3500;
  app.listen(PORT, () => logger.info(`🛜 Interface läuft auf http://localhost:${PORT}`));

  logger.info(`💾 Feuchtigkeitsdaten werden alle ${MOISTURE_SAVE_INTERVAL_MS / 1000} Sekunden gespeichert`);
}

// Server starten
startServer();
cta();
controlRelays();
getLatestSensorValues();
startSensorProcessing();
startRuleEngine();
watchEnvAndRestart();



