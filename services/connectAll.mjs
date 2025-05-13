import noble from 'noble-mac';
import fs from 'fs';
import path from 'path';
import { sendTelegramMessage } from './telegramService.mjs';
import logger from '../helper/logger.mjs';


// Verzeichnisse für Sensor-Daten und IDs
const ID_FILE = path.join('./sensor_data/sensor_ids.json');
const DATA_DIR = path.join('./sensor_data');

// Konfiguration für offline Zeiten und Intervall für Offline-Überprüfung
const OFFLINE_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 Stunden
const OFFLINE_CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 Minuten
const WRITE_THROTTLE_MS = 20_000; // 30 Sekunden
let sensorCounter = 1;

const offlineNotified = new Set();
const deviceToSensorId = new Map();
const lastUpdateTime = new Map();
const latestValues = new Map();

// Lade persistente Zuordnung
export function loadSensorIdMapping() {
  if (fs.existsSync(ID_FILE)) {
    const raw = fs.readFileSync(ID_FILE);
    try {
      const arr = JSON.parse(raw);

      // Sicherstellen, dass es ein Array von Objekten ist
      if (!Array.isArray(arr)) {
        console.warn('Warnung: sensor_ids.json ist kein Array. Setze als leeres Array.');
        deviceToSensorId.clear();
      } else {
        for (const { uuid, id } of arr) {
          deviceToSensorId.set(uuid, id);
          sensorCounter = Math.max(sensorCounter, id + 1);
        }
        console.log(`📁 Sensor-Zuordnung geladen (${deviceToSensorId.size} bekannt)`);
      }
    } catch (err) {
      logger.error('❌ Fehler beim Laden der sensor_ids.json:', err.message);
      deviceToSensorId.clear(); // Bei Fehlern wird die Zuordnung geleert
    }
  } else {
    logger.warn('sensor_ids.json existiert nicht. Erstelle eine neue Zuordnung.');
    saveSensorIdMapping(); // Lege eine neue Datei mit einem leeren Array an
  }
}

// Speichere die Zuordnung von Sensor-IDs
export function saveSensorIdMapping() {
  // Umwandeln der Map in ein Array von Objekten
  const arr = Array.from(deviceToSensorId.entries()).map(([uuid, id]) => ({ uuid, id }));

  if (!Array.isArray(arr)) {
    logger.error('❌ Fehler: sensor_ids.json Zuordnung ist ungültig.');
    return;
  }

  fs.writeFileSync(ID_FILE, JSON.stringify(arr, null, 2), 'utf-8');
  logger.debug('💾 sensor_ids.json erfolgreich gespeichert.');
}

// Die Funktion zur Verarbeitung und Speicherung von Sensordaten
function writeSensorData(sensorId, data) {
  const now = Date.now();
  const lastWrite = lastUpdateTime.get(sensorId) || 0;
  if (now - lastWrite < WRITE_THROTTLE_MS) return;

  lastUpdateTime.set(sensorId, now);

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

  const filename = `sensor_${sensorId}.json`;
  const filepath = path.join(DATA_DIR, filename);

  let existingData = [];

  if (fs.existsSync(filepath)) {
    const raw = fs.readFileSync(filepath);
    try {
      existingData = JSON.parse(raw);

      if (!Array.isArray(existingData)) {
        logger.warn(`Warnung: Daten von Sensor ${sensorId} sind kein Array. Setze als leeres Array.`);
        existingData = [];
      }
    } catch (err) {
      console.error(`❌ Fehler beim Parsen der Datei ${filename}:`, err.message);
      existingData = [];
    }
  }

  existingData.push(data);

  if (existingData.length > 200000) {
    existingData = existingData.slice(-200000);
  }

  fs.writeFile(filepath, JSON.stringify(existingData, null, 2), (err) => {
    if (err) {
     logger.error(`❌ Fehler beim Schreiben von ${filename}:`, err.message);
    } else {
      logger.debug(`💾 Gespeichert in ${filename}`);
    }
  });
}

// Die Funktion zum Dekodieren der Sensor-Daten
function decodeAdvertisement(manufacturerData) {
  if (!manufacturerData || manufacturerData.length < 7) return null;

  const tempRaw = manufacturerData.readUInt16LE(1);
  const temperature = tempRaw / 10;
  const humidity = manufacturerData[3];

  return {
    temperature: parseFloat(temperature.toFixed(1)),
    humidity: Math.round(humidity),
    timestamp: new Date().toISOString()
  };
}

function checkForOfflineSensors() {
  const now = Date.now();

  for (const [sensorId, lastSeen] of lastUpdateTime.entries()) {
    const inactiveFor = now - lastSeen;

    if (inactiveFor > OFFLINE_TIMEOUT_MS && !offlineNotified.has(sensorId)) {
      const hours = Math.floor(inactiveFor / (60 * 60 * 1000));
      const minutes = Math.floor((inactiveFor % (60 * 60 * 1000)) / (60 * 1000));

      const message = `⚠️ *Sensor ${sensorId}* wurde seit *${hours}h ${minutes}min* nicht mehr empfangen.`;
      logger.warn(message);
      sendTelegramMessage(message);

      offlineNotified.add(sensorId);
    }

    if (inactiveFor <= OFFLINE_TIMEOUT_MS && offlineNotified.has(sensorId)) {
      const message = `✅ *Sensor ${sensorId}* ist wieder aktiv.`;
      logger.info (message);
      sendTelegramMessage(message);
      offlineNotified.delete(sensorId);
    }
  }
}

// Überprüfe alle 10 Minuten auf Offline-Sensoren
setInterval(checkForOfflineSensors, OFFLINE_CHECK_INTERVAL_MS);

// Funktion, die die Daten aus den JSON-Dateien liest
function getSensorDataFromFile(sensorId) {
  const filepath = path.join(DATA_DIR, `sensor_${sensorId}.json`);

  if (!fs.existsSync(filepath)) {
    logger.warn(`⚠️ Keine Daten gefunden für Sensor ${sensorId}`);
    return null;
  }

  let data = [];
  try {
    const raw = fs.readFileSync(filepath);
    data = JSON.parse(raw);

    if (!Array.isArray(data)) {
      logger.warn(`Warnung: Daten von Sensor ${sensorId} sind kein Array. Setze als leeres Array.`);
      data = [];
    }
  } catch (err) {
    logger.error(`❌ Fehler beim Laden der Datei für Sensor ${sensorId}:`, err.message);
    data = [];
  }

  return data[data.length - 1]; // Gibt die letzten gespeicherten Daten zurück
}

// Neue Version von getLatestSensorValues, die keine Sensor-IDs braucht
export function getLatestSensorValues() {
  const result = {};
  const files = fs.readdirSync(DATA_DIR);

  for (const file of files) {
    const match = file.match(/^sensor_(\d+)\.json$/); // Sensor-ID aus Dateinamen extrahieren
    if (!match) continue;

    const sensorId = match[1]; // Die Sensor-ID
    const filepath = path.join(DATA_DIR, file); // Vollständiger Pfad zur Datei
    const raw = fs.readFileSync(filepath, 'utf-8'); // Lese die Datei

    try {
      const data = JSON.parse(raw); // Parsen der JSON-Daten

      if (Array.isArray(data) && data.length > 0) {
        result[sensorId] = data[data.length - 1]; // Füge nur die neuesten Daten hinzu
      }
    } catch (err) {
      logger.error(`Fehler beim Parsen der Datei ${file}:`, err.message);
    }
  }

  logger.debug(`Aktuelle Sensordaten aus JSON-Dateien:`, result);
  return result; // Gibt die gesammelten Daten zurück
}

export function cta() {
  loadSensorIdMapping();  // Stellt sicher, dass die Sensor-IDs geladen werden

  noble.on('stateChange', (state) => {
    if (state === 'poweredOn') {
      logger.info('🟢 BLE aktiv – TP357S-Scan läuft...');
      noble.startScanning([], true);  // Starten des Scannens ohne den Status zu stoppen
    } else {
      logger.warn('🔴 BLE nicht bereit:', state);
      // Hier können wir den Status ignorieren und das Scannen weiterhin fortsetzen
    }
  });

  noble.on('discover', (peripheral) => {
    const name = peripheral.advertisement.localName || '';
    const uuid = peripheral.uuid;
    const manufacturerData = peripheral.advertisement.manufacturerData;

    if (!name.includes('TP357S')) return;

    if (!deviceToSensorId.has(uuid)) {
      const sensorId = sensorCounter++;
      deviceToSensorId.set(uuid, sensorId);
      saveSensorIdMapping();
      logger.info(`🎯 Neuer TP357S erkannt: Sensor ${sensorId} (${uuid})`);
    }

    const sensorId = deviceToSensorId.get(uuid);
    const decoded = decodeAdvertisement(manufacturerData);
    if (!decoded) return;

    latestValues.set(sensorId, decoded);

    const timestamp = new Date().toISOString();
    logger.debug(`📡 [Sensor ${sensorId}] ${timestamp} 🌡️ ${decoded.temperature} °C | 💧 ${decoded.humidity} % |[}]`);

    writeSensorData(sensorId, decoded);
  });
}
<<<<<<< Updated upstream

// ================== Zugriff für andere Module ===================
export function getLatestSensorValues() {
  const result = {};
  const files = fs.readdirSync(DATA_DIR);

  for (const file of files) {
    const match = file.match(/^sensor_(\d+)\.json$/);
    if (!match) continue;

    const sensorId = match[1];
    try {
      const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) {
        result[sensorId] = data[data.length - 1];
      }
    } catch (err) {
      logger.error(`❌ Fehler beim Parsen von ${file}:`, err.message);
    }
  }

  return result;
}
export { loadSensorIdMapping, saveSensorIdMapping };

//Test
=======
>>>>>>> Stashed changes
