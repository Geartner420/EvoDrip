// services/moistureService.mjs
import fs from 'fs';
import path from 'path';
import { fetchMoisture } from '../services/fytaservice.mjs';
import logger from '../helper/logger.mjs';
import { readEnv } from '../services/envService.mjs';

const MOISTURE_FILE = path.resolve(process.cwd(), 'sensor_data','moisture.json');
const MAX_HISTORY_LENGTH = Number.MAX_SAFE_INTEGER // Maximal gespeicherte Werte

let moistureHistory = [];
let successCount = 0;
let errorCount = 0;
let lastSummaryTime = Date.now();

export function getMoistureHistory() {
  return moistureHistory;
}

export function loadMoistureData() {
  try {
    const data = JSON.parse(fs.readFileSync(MOISTURE_FILE, 'utf8'));
    moistureHistory = data.map(entry => ({
      timestamp: new Date(entry.timestamp),
      value: entry.value
    }));
    logger.debug(`🔁 ${moistureHistory.length} Feuchtigkeitswerte geladen.`);
  } catch {
    logger.warn('⚠️ Keine vorhandene moisture.json gefunden – starte leer.');
    moistureHistory = [];
  }
}

export async function saveMoistureData() {
  try {
    const moisture = await fetchMoisture();
    const timestamp = new Date();

    moistureHistory.push({ timestamp, value: moisture });
    if (moistureHistory.length > MAX_HISTORY_LENGTH) {
      moistureHistory.shift();
    }

    fs.writeFileSync(MOISTURE_FILE, JSON.stringify(moistureHistory, null, 2), 'utf8');
    successCount++;

  } catch (err) {
    logger.error(`❌ Fehler beim Feuchtigkeit abfragen/speichern: ${err.message}`);
    errorCount++;
  }

  checkAndLogSummary();
}

export function clearMoistureHistory() {
  moistureHistory = [];
  logger.info('📂 moistureHistory im Speicher geleert.');
}

function checkAndLogSummary() {
  const now = Date.now();

  // Jedes Mal die aktuelle Zusammenfassungszeit aus der .env laden
  let summaryIntervalMinutes = 60;
  try {
    const env = readEnv();
    if (env.MOISTURE_SUMMARY_INTERVAL_MINUTES) {
      summaryIntervalMinutes = parseInt(env.MOISTURE_SUMMARY_INTERVAL_MINUTES, 10) || 60;
    }
  } catch {
    logger.warn('⚠️ Zusammenfassungsintervall konnte nicht gelesen werden, nutze 60 Minuten.');
  }

  const intervalMs = summaryIntervalMinutes * 60 * 1000;
  const elapsed = now - lastSummaryTime;

  if (elapsed >= intervalMs) {
    logger.info(`📊 Zusammenfassung der letzten ${summaryIntervalMinutes} Minuten: ${successCount} Erfolge, ${errorCount} Fehler.`);
    successCount = 0;
    errorCount = 0;
    lastSummaryTime = now;
  }
}
