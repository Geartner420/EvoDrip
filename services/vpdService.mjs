import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { interval } from 'd3-timer';

const LEAF_TEMP = 25;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '../sensor_data');

const files = fs.readdirSync(dir).filter(f => f.startsWith('sensor_') && f.endsWith('.json') && f !== 'sensor_ids.json');

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

// Regelmäßige Berechnung alle 10 Sekunden
interval(() => {
    console.log('--- Neue Berechnung ---');
    for (const file of files) {
        const jsonPath = path.join(dir, file);
        const sensorData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        if (!Array.isArray(sensorData)) continue;

        const last_entry = sensorData[sensorData.length - 1];
        console.log(`Sensor: ${file}`);
        console.log(`Temp: ${last_entry.temperature}°C, RH: ${last_entry.humidity}%`);
        console.log(`VPD: ${calculateVpd(last_entry)} kPa`);
        console.log(`Leaf VPD (Leaf=${LEAF_TEMP}°C): ${calculateLeafVpd(last_entry, LEAF_TEMP)} kPa`);
        console.log(`Dew Point: ${calculateDewPoint(last_entry)} °C`);
        console.log(`Absolute Humidity: ${calculateAbsoluteHumidity(last_entry)} g/m³`);
        console.log('------------------------------');
        
    }
}, 10000);
