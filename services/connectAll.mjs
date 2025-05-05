import noble from 'noble-mac';
import fs from 'fs';
import path from 'path';
import { sendTelegramMessage } from './telegramService.mjs';

// Verzeichnisse für Sensor-Daten und IDs
const ID_FILE = path.join('./sensor_data/sensor_ids.json');
const DATA_DIR = path.join('./sensor_data');

// Konfiguration für offline Zeiten und Intervall für Offline-Überprüfung
const OFFLINE_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 Stunden
const OFFLINE_CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 Minuten
const WRITE_THROTTLE_MS = 5_000; // 30 Sekunden
let sensorCounter = 1;

const offlineNotified = new Set();
const deviceToSensorId = new Map();
const lastUpdateTime = new Map();
const latestValues = new Map();

// Lade persistente Zuordnung
function loadSensorIdMapping() {
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
      console.error('❌ Fehler beim Laden der sensor_ids.json:', err.message);
      deviceToSensorId.clear(); // Bei Fehlern wird die Zuordnung geleert
    }
  } else {
    console.warn('sensor_ids.json existiert nicht. Erstelle eine neue Zuordnung.');
    saveSensorIdMapping(); // Lege eine neue Datei mit einem leeren Array an
  }
}

// Speichere die Zuordnung von Sensor-IDs
function saveSensorIdMapping() {
  // Umwandeln der Map in ein Array von Objekten
  const arr = Array.from(deviceToSensorId.entries()).map(([uuid, id]) => ({ uuid, id }));

  if (!Array.isArray(arr)) {
    console.error('❌ Fehler: sensor_ids.json Zuordnung ist ungültig.');
    return;
  }

  fs.writeFileSync(ID_FILE, JSON.stringify(arr, null, 2), 'utf-8');
  console.log('💾 sensor_ids.json erfolgreich gespeichert.');
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
        console.warn(`Warnung: Daten von Sensor ${sensorId} sind kein Array. Setze als leeres Array.`);
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
      console.error(`❌ Fehler beim Schreiben von ${filename}:`, err.message);
    } else {
      console.log(`💾 Gespeichert in ${filename}`);
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
      console.warn(message);
      sendTelegramMessage(message);

      offlineNotified.add(sensorId);
    }

    if (inactiveFor <= OFFLINE_TIMEOUT_MS && offlineNotified.has(sensorId)) {
      const message = `✅ *Sensor ${sensorId}* ist wieder aktiv.`;
      console.log(message);
      sendTelegramMessage(message);
      offlineNotified.delete(sensorId);
    }
  }
}

// Überprüfe alle 10 Minuten auf Offline-Sensoren
setInterval(checkForOfflineSensors, OFFLINE_CHECK_INTERVAL_MS);

export function getLatestSensorValues() {
  const result = {};
  for (const [sensorId, data] of latestValues.entries()) {
    result[sensorId] = data;
  }
  return result;
}

export function cta() {
  loadSensorIdMapping();

  noble.on('stateChange', (state) => {
    if (state === 'poweredOn') {
      console.log('🟢 BLE aktiv – TP357S-Scan läuft...');
      noble.startScanning([], true);
    } else {
      console.log('🔴 BLE nicht bereit:', state);
      noble.stopScanning();
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
      console.log(`🎯 Neuer TP357S erkannt: Sensor ${sensorId} (${uuid})`);
    }

    const sensorId = deviceToSensorId.get(uuid);
    const decoded = decodeAdvertisement(manufacturerData);
    if (!decoded) return;

    latestValues.set(sensorId, decoded);

    console.log(`📡 [Sensor ${sensorId}] 🌡️ ${decoded.temperature} °C | 💧 ${decoded.humidity} %`);
    writeSensorData(sensorId, decoded);
  });
}
