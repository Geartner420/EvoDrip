import fs from 'fs';
import path from 'path';
import logger from '../helper/logger.mjs';

const STATS_FILE = path.resolve('./sensor_data', 'wateringStats.json');

let stats = {
  dayWaterCount: 0,
  nightWaterCount: 0,
  dayWatering: 0,
  nightWatering: 0,
  lastReset: null
};

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function ensureStatsLoaded() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      const raw = fs.readFileSync(STATS_FILE, 'utf-8');
      stats = { ...stats, ...JSON.parse(raw) };
    }
  } catch (err) {
    logger.error('❌ Fehler beim Laden der Stats:', err.message);
  }
}

function ensureDailyReset() {
  const today = getTodayDate();
  if (stats.lastReset !== today) {
    logger.info(`📆 Stats-Reset für neuen Tag (${today})`);
    stats.dayWaterCount = 0;
    stats.dayWatering = 0;
    stats.lastReset = today;
    saveStats();
  }
}

function saveStats() {
  try {
    fs.writeFile(STATS_FILE, JSON.stringify(stats, null, 2), err => {
      if (err) {
        logger.error(`❌ Fehler beim Speichern der Stats: ${err.message}`);
      }
    });
  } catch (err) {
    logger.error(`❌ Fehler beim Schreiben der Stats: ${err.message}`);
  }
}

// ========== Öffentliche API ==========

export function incrementDayWater() {
  ensureDailyReset();
  stats.dayWaterCount += 1;
  saveStats();
}

export function incrementNightWater() {
  stats.nightWaterCount += 1;
  saveStats();
}

export function incrementDayWatering(amount) {
  ensureDailyReset();
  stats.dayWatering += amount;
  saveStats();
}

export function incrementNightWatering(amount) {
  stats.nightWatering += amount;
  saveStats();
}

export function getTodayTotalWater() {
  ensureDailyReset();
  return stats.dayWatering;
}

export function getTodayWaterCount() {
  ensureDailyReset();
  return stats.dayWaterCount;
}

export function resetTodayStats() {
  const today = getTodayDate();
  stats.dayWaterCount = 0;
  stats.dayWatering = 0;
  stats.lastReset = today;
  saveStats();
  logger.info('♻️ Tages-Wasserstatistik manuell zurückgesetzt.');
}

export function getStats() {
  ensureDailyReset();
  return { ...stats };
}

// Initial laden bei Modulstart
ensureStatsLoaded();
ensureDailyReset();
