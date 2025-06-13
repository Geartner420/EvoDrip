// connectAll.mjs
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { sendTelegramMessage } from './telegramService.mjs';
import logger from '../helper/logger.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ID_FILE = path.join(__dirname, '../sensor_data/sensor_ids.json');
const DATA_DIR = path.join(__dirname, '../sensor_data');

const OFFLINE_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 Stunden
const OFFLINE_CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 Minuten
const WRITE_THROTTLE_MS = 20_000;
const MAX_SENSOR_CACHE = 500;

let noble;
const offlineNotified = new Set();
const deviceToSensorId = new Map();
const lastUpdateTime = new Map();
const latestValues = new Map();
let sensorCounter = 1;

// ========== Sensor-ID-Zuordnung ==========
function loadSensorIdMapping() {
  if (fs.existsSync(ID_FILE)) {
    try {
      const raw = fs.readFileSync(ID_FILE);
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) throw new Error('Nicht-Array');

      for (const { uuid, id } of arr) {
        deviceToSensorId.set(uuid, id);
        sensorCounter = Math.max(sensorCounter, id + 1);
      }
      logger.info(`📁 Sensor-Zuordnung geladen (${deviceToSensorId.size} bekannt)`);
    } catch (err) {
      logger.error('❌ Fehler beim Laden der sensor_ids.json:', err.message);
      deviceToSensorId.clear();
    }
  } else {
    logger.warn('sensor_ids.json existiert nicht – neue Datei wird erstellt.');
    saveSensorIdMapping();
  }
}

function saveSensorIdMapping() {
  const arr = Array.from(deviceToSensorId.entries()).map(([uuid, id]) => ({ uuid, id }));
  fs.writeFileSync(ID_FILE, JSON.stringify(arr, null, 2), 'utf-8');
  logger.debug('💾 sensor_ids.json gespeichert');
}

// ========== Sensordaten speichern ==========
function writeSensorData(sensorId, data) {
  const now = Date.now();
  const lastWrite = lastUpdateTime.get(sensorId) || 0;
  if (now - lastWrite < WRITE_THROTTLE_MS) return;
  lastUpdateTime.set(sensorId, now);

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const file = path.join(DATA_DIR, `sensor_${sensorId}.json`);
  const tmpFile = file + '.tmp';
  let existingData = [];

  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf-8');
      existingData = JSON.parse(raw);
      if (!Array.isArray(existingData)) existingData = [];
    }
  } catch (err) {
    logger.error(`❌ Fehler beim Lesen von ${file}: ${err.message}`);
    existingData = [];
  }

  existingData.push(data);
  if (existingData.length > 200_000) {
    existingData = existingData.slice(-200_000);
  }

  try {
    fs.writeFileSync(tmpFile, JSON.stringify(existingData, null, 2), 'utf-8');

    const start = Date.now();
    while (Date.now() - start < 10); // 10ms Delay für Windows-Sync

    if (!fs.existsSync(tmpFile)) {
      logger.warn(`⚠️ Temporäre Datei ${tmpFile} wurde nicht gefunden, obwohl gerade geschrieben – Rename abgebrochen.`);
      return;
    }

    fs.renameSync(tmpFile, file);
    logger.debug(`💾 Sensor ${sensorId} erfolgreich in ${file} gespeichert.`);

  } catch (err) {
    logger.error(`❌ Fehler beim Schreiben oder Umbenennen von ${tmpFile} → ${file}: ${err.message}`);
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch (e2) {
      logger.warn(`⚠️ Konnte temporäre Datei ${tmpFile} nicht entfernen: ${e2.message}`);
    }
  }
}

// ========== BLE-Daten entschlüsseln ==========
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

// ========== Offline-Erkennung ==========
function checkForOfflineSensors() {
  const now = Date.now();

  for (const [sensorId, lastSeen] of lastUpdateTime.entries()) {
    const inactive = now - lastSeen;

    if (inactive > OFFLINE_TIMEOUT_MS && !offlineNotified.has(sensorId)) {
      const hours = Math.floor(inactive / (60 * 60 * 1000));
      const minutes = Math.floor((inactive % (60 * 60 * 1000)) / (60 * 1000));
      const msg = `⚠️ *Sensor ${sensorId}* wurde seit *${hours}h ${minutes}min* nicht mehr empfangen.`;
      logger.warn(msg);
      sendTelegramMessage(msg);
      offlineNotified.add(sensorId);
    }

    if (inactive <= OFFLINE_TIMEOUT_MS && offlineNotified.has(sensorId)) {
      const msg = `✅ *Sensor ${sensorId}* ist wieder aktiv.`;
      logger.info(msg);
      sendTelegramMessage(msg);
      offlineNotified.delete(sensorId);
    }
  }
}

setInterval(checkForOfflineSensors, OFFLINE_CHECK_INTERVAL_MS);

// ========== Hauptfunktion BLE ==========
export async function cta() {
  loadSensorIdMapping();
  // Vor dem Start: alte .tmp-Dateien aufräumen
try {
  const files = fs.readdirSync(DATA_DIR);
  for (const file of files) {
    if (file.endsWith('.tmp')) {
      const fullPath = path.join(DATA_DIR, file);
      fs.unlinkSync(fullPath);
      logger.warn(`🧹 Entfernte veraltete temporäre Datei: ${file}`);
    }
  }
} catch (err) {
  logger.error(`❌ Fehler beim Aufräumen von .tmp-Dateien: ${err.message}`);
}

  if (global.bleStarted) {
    logger.info('[BLE] Schon aktiv – kein erneuter Start');
    return;
  }
  global.bleStarted = true;

  try {
    if (os.platform() === 'darwin') {
      noble = (await import('noble-mac')).default;
    } else {
      noble = (await import('@abandonware/noble')).default;
    }
  } catch (err) {
    logger.error('❌ noble-Modul konnte nicht geladen werden:', err.message);
    return;
  }

  noble.on('stateChange', (state) => {
    if (state === 'poweredOn') {
      logger.info('🟢 BLE aktiv – TP357S-Scan läuft...');
      noble.startScanning([], true);
    } else {
      logger.warn(`🔴 BLE inaktiv: ${state}`);
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

    if (latestValues.size >= MAX_SENSOR_CACHE) {
      const oldest = latestValues.keys().next().value;
      latestValues.delete(oldest);
      lastUpdateTime.delete(oldest);
      offlineNotified.delete(oldest);
    }

    latestValues.set(sensorId, decoded);

    logger.debug(`📡 [Sensor ${sensorId}] ${decoded.timestamp} 🌡️ ${decoded.temperature} °C | 💧 ${decoded.humidity} %`);
    writeSensorData(sensorId, decoded);
  });
}

// ========== Externe Datenzugriffe ==========
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
      logger.error(`❌ Fehler beim Parsen von ${file}: ${err.message}`);
    }
  }

  return result;
}

export { loadSensorIdMapping, saveSensorIdMapping };

// ========== Diagnose-Memorylog ==========
setInterval(() => {
  const mb = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
  logger.info(`[MEM] Heap-Nutzung: ${mb} MB`);
}, 600_000);
