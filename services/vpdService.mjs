import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { interval } from 'd3-timer';
import config from '../helper/config.mjs';
import  logger  from '../helper/logger.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Sensorverzeichnis aus Konfiguration oder Standardwert
const SENSOR_DATA_DIR = config.SENSOR_DATA_DIR || path.join(__dirname, '../sensor_data');
const MAX_HISTORY = 200000;
const LEAF_TEMP_DIFF = config.LEAF_TEMP_DIFF || 2;

// Einfacher Logger mit Timestamp
function log(msg, level = 'INFO') {
  const ts = new Date().toISOString();
  logger.debug(`[${ts}] [${level}] ${msg}`);
}

// VPD-Berechnung
function calculateVpd(data) {
  const temp = data.temperature;
  const rh = data.humidity;
  const es = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
  const ea = es * (rh / 100);
  return parseFloat((es - ea).toFixed(1));
}

function calculateLeafVpd(data, leafTemp) {
  return calculateVpd({ temperature: leafTemp, humidity: data.humidity });
}

function calculateDewPoint(data) {
  const t = data.temperature;
  const rh = data.humidity;
  const a = 17.27, b = 237.7;
  const alpha = ((a * t) / (b + t)) + Math.log(rh / 100);
  const dp = (b * alpha) / (a - alpha);
  return parseFloat(dp.toFixed(2));
}

function calculateAbsoluteHumidity(data) {
  const T = data.temperature;
  const RH = data.humidity;
  const absHum = 216.7 * (RH / 100) * 6.112 * Math.exp((17.62 * T) / (243.12 + T)) / (273.15 + T);
  return parseFloat(absHum.toFixed(2));
}

export function startSensorProcessing() {
  interval(() => {
    log('Starte neue Verarbeitung...');
    const final_entrys = [];

    // Sensor-Dateien einlesen
    const files = fs.readdirSync(SENSOR_DATA_DIR).filter(f =>
      f.startsWith('sensor_') && f.endsWith('.json') && f !== 'sensor_ids.json'
    );

    for (const file of files) {
      const jsonPath = path.join(SENSOR_DATA_DIR, file);

      // Sensor-Datei lesen & parsen mit Fehlerbehandlung
      let sensorData;
      try {
        sensorData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      } catch (err) {
        log(`❌ Fehler beim Parsen von ${file}: ${err.message}`, 'WARN');
        continue;
      }

      if (!Array.isArray(sensorData) || sensorData.length === 0) continue;

      const last_entry = sensorData[sensorData.length - 1];
      if (
        typeof last_entry.temperature !== 'number' ||
        typeof last_entry.humidity !== 'number'
      ) {
        log(`⚠️ Ungültige Sensordaten in ${file}: ${JSON.stringify(last_entry)}`, 'WARN');
        continue;
      }

      const now = new Date().toISOString();
      const final_entry = {
        ...last_entry,
        timestamp: now,
        sensor: file,
        vpd: calculateVpd(last_entry),
        leaf_vpd: calculateLeafVpd(last_entry, last_entry.temperature + LEAF_TEMP_DIFF),
        dew_point: calculateDewPoint(last_entry),
        absolute_humidity: calculateAbsoluteHumidity(last_entry)
      };

      final_entrys.push(final_entry);

      // CSV-Zeile schreiben
      //const csvPath = path.join(SENSOR_DATA_DIR, 'history.csv');
     // const csvLine = `${now},"${file}",${last_entry.temperature},${last_entry.humidity},${final_entry.vpd},${final_entry.leaf_vpd},${final_entry.dew_point},${final_entry.absolute_humidity}`;
     // fs.appendFileSync(csvPath, csvLine + '\n');

      // Konsolen-Ausgabe
      log(`${file} → Temp: ${last_entry.temperature}°C, RH: ${last_entry.humidity}%, VPD: ${final_entry.vpd}`);
    }

    // JSON-Dateien speichern
    fs.writeFileSync(
      path.join(SENSOR_DATA_DIR, 'last_entrys.json'),
      JSON.stringify(final_entrys, null, 2),
      'utf-8'
    );

    // History aktualisieren
    const historyPath = path.join(SENSOR_DATA_DIR, 'history_entrys.json');
    let history = [];

    if (fs.existsSync(historyPath)) {
      try {
        const raw = fs.readFileSync(historyPath, 'utf-8');
        history = JSON.parse(raw);
        if (!Array.isArray(history)) history = [];
      } catch (err) {
        log(`⚠️ Fehler beim Laden der history_entrys.json: ${err.message}`, 'WARN');
      }
    }

    history = [...final_entrys, ...history].slice(0, MAX_HISTORY);
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf-8');

    // Optional: nach Sensor gruppiert speichern
    const grouped = {};
    for (const entry of final_entrys) {
      const name = entry.sensor.replace('.json', '');
      grouped[name] = [entry];
    }

    fs.writeFileSync(
      path.join(SENSOR_DATA_DIR, 'history_by_sensor.json'),
      JSON.stringify(grouped, null, 2),
      'utf-8'
    );

    log(`✅ Verarbeitet: ${final_entrys.length} Sensoren – History gesichert.`);
  }, 10000); // Alle 10 Sekunden
}
