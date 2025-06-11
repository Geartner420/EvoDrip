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
  return {
    dayWaterCount: 0,
    nightWaterCount: 0,
    dayWatering: 0,
    nightWatering: 0,
    lastReset: null
  };
}

export function saveStats(stats) {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  } catch (err) {
    logger.error('❌ Fehler beim Speichern der Stats:', err.message);
  }
}

// === Deine bestehenden Exports ===

export function incrementDayWater() {
  const stats = loadStats();
  stats.dayWaterCount += 1;
  saveStats(stats);
}

export function incrementNightWater() {
  const stats = loadStats();
  stats.nightWaterCount += 1;
  saveStats(stats);
}

// === Ergänzt: Menge hinzufügen ===

export function incrementDayWatering(amount) {
  const stats = loadStats();
  stats.dayWatering += amount;
  saveStats(stats);
}

export function incrementNightWatering(amount) {
  const stats = loadStats();
  stats.nightWatering += amount;
  saveStats(stats);
}

export function getTodayTotalWater() {
  const stats = loadStats();
  return stats.dayWatering;
}

export function resetTodayStats() {
  const stats = loadStats();
  stats.dayWaterCount = 0;
  stats.dayWatering = 0;
  stats.lastReset = new Date().toISOString();
  saveStats(stats);
}

export function getTodayWaterCount() {
  const stats = loadStats();
  return stats.dayWaterCount ?? 0;
}
