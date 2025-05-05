import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { interval } from 'd3-timer';
import config from '../helper/config.mjs'; // oder './config/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '../sensor_data');

const LEAF_TEMP_DIFF = config.LEAF_TEMP_DIFF; // Fallback falls nicht gesetzt
const MAX_HISTORY = 200000;

const files = fs.readdirSync(dir).filter(f =>
  f.startsWith('sensor_') && f.endsWith('.json') && f !== 'sensor_ids.json'
);

// Funktionen zur Berechnung
function calculateVpd(data) {
  const temp = data.temperature;
  const rh = data.humidity;
  const es = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
  const ea = es * (rh / 100);
  return parseFloat((es - ea).toFixed(3)); // VPD in kPa
}

function calculateLeafVpd(data, leafTemp) {
  const leafData = { temperature: leafTemp, humidity: data.humidity };
  return calculateVpd(leafData);
}

function calculateDewPoint(data) {
  const t = data.temperature;
  const rh = data.humidity;
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * t) / (b + t)) + Math.log(rh / 100);
  const dp = (b * alpha) / (a - alpha);
  return parseFloat(dp.toFixed(2));
}

function calculateAbsoluteHumidity(data) {
  const T = data.temperature;
  const RH = data.humidity;
  const absHum = 216.7 * (RH / 100) * 6.112 * Math.exp((17.62 * T) / (243.12 + T)) / (273.15 + T);
  return parseFloat(absHum.toFixed(2)); // g/m³
}

export function startSensorProcessing() {
  interval(() => {
    console.log('--- Neue Berechnung ---');
    const final_entrys = [];

    for (const file of files) {
      const jsonPath = path.join(dir, file);
      const sensorData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      if (!Array.isArray(sensorData) || sensorData.length === 0) continue;

      const last_entry = sensorData[sensorData.length - 1];
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

      console.log(`Sensor: ${file}`);
      console.log(`Temp: ${last_entry.temperature}°C, RH: ${last_entry.humidity}%`);
      console.log(`VPD: ${final_entry.vpd} kPa`);
      console.log(`Leaf VPD: ${final_entry.leaf_vpd} kPa (Leaf = ${last_entry.temperature + LEAF_TEMP_DIFF}°C)`);
      console.log(`Dew Point: ${final_entry.dew_point} °C`);
      console.log(`Absolute Humidity: ${final_entry.absolute_humidity} g/m³`);
      console.log('------------------------------');
    }

    // Speichern der letzten Werte
    const savePath = path.join(dir, 'last_entrys.json');
    fs.writeFileSync(savePath, JSON.stringify(final_entrys, null, 2), 'utf-8');
    console.log(`Last entrys wurden in Datei ${savePath} gespeichert.`);

    // Verlauf aktualisieren
    const historyPath = path.join(dir, 'history_entrys.json');
    let history = [];

    if (fs.existsSync(historyPath)) {
      try {
        history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
        if (!Array.isArray(history)) history = [];
      } catch (err) {
        console.error('Fehler beim Einlesen der history_entrys.json:', err);
      }
    }

    history = [...final_entrys, ...history].slice(0, MAX_HISTORY);

    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf-8');
    console.log(`History wurde aktualisiert (${history.length} Einträge insgesamt).`);

    // OPTIONAL: Alternativ Verlauf nach Sensor gruppieren (JSON-Objekt statt Array):
    
    const grouped = {};
    for (const entry of final_entrys) {
      const name = entry.sensor.replace('.json', '');
      if (!grouped[name]) grouped[name] = [];
      grouped[name].unshift(entry);
      grouped[name] = grouped[name].slice(0, MAX_HISTORY); // begrenzen pro Sensor
    }
    fs.writeFileSync(path.join(dir, 'history_by_sensor.json'), JSON.stringify(grouped, null, 2), 'utf-8');
    
  }, 10000); // alle 10 Sekunden
}
