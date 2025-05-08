// services/statsService.mjs
import fs from 'fs';
import path from 'path';
import logger from '../helper/logger.mjs';

const STATS_FILE = path.resolve('./sensor_data', 'wateringStats.json');

export function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      const raw = fs.readFileSync(STATS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    logger.error('❌ Fehler beim Laden der Stats:', err.message);
  }
  return { nightWaterCount: 0, dayWaterCount: 0 };
}

export function saveStats(stats) {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats));
  } catch (err) {
    logger.error('❌ Fehler beim Speichern der Stats:', err.message);
  }
}

export function incrementNightWater() {
  const stats = loadStats();
  stats.nightWaterCount += 1;
  saveStats(stats);
}

export function incrementDayWater() {
  const stats = loadStats();
  stats.dayWaterCount += 1;
  saveStats(stats);
}
