// services/stateService.mjs
import fs from 'fs';
import path from 'path';

const STATE_FILE = path.resolve(process.cwd(), 'sensor_data', 'state.json');
const MOISTURE_LOG = path.resolve(process.cwd(), 'sensor_data', 'moisture_log.json');

let state = {
  lastTriggerTimes: {}, // z. B. { P1: '2025-06-11T05:00:00Z' }
  dayData: {}           // z. B. { P1: { count: 1, totalWater: 300, moistureReadings: [39] } }
};

// ===== Legacy-Kompatibilität für loadState() wie früher =====
export function loadStateLegacy() {
  try {
    const data = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'state.json'), 'utf8'));
    return new Date(data.lastTriggerTime);
  } catch {
    return null;
  }
}
export function saveStateLegacy(lastTriggerTime) {
  fs.writeFileSync(path.resolve(process.cwd(), 'state.json'), JSON.stringify({ lastTriggerTime }), 'utf8');
}

// ===== Neues erweitertes System =====
export function loadState() {
  try {
    const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    state = { ...state, ...data };
  } catch {
    // default bleibt erhalten
  }
}

export function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

export function getLastTriggerTime(phase) {
  const t = state.lastTriggerTimes?.[phase];
  return t ? new Date(t) : null;
}

export function setLastTriggerTime(phase, date) {
  state.lastTriggerTimes[phase] = date.toISOString();
}

export function logWateringEvent(phase, volume) {
  if (!state.dayData[phase]) {
    state.dayData[phase] = { count: 0, totalWater: 0, moistureReadings: [] };
  }
  state.dayData[phase].count += 1;
  state.dayData[phase].totalWater += volume;
}

export function logMoisture(phase, value) {
  if (!state.dayData[phase]) {
    state.dayData[phase] = { count: 0, totalWater: 0, moistureReadings: [] };
  }
  state.dayData[phase].moistureReadings.push(value);
}

export function getDayData(phase) {
  return state.dayData[phase] || { count: 0, totalWater: 0, moistureReadings: [] };
}

export function resetDayData(phase) {
  state.dayData[phase] = { count: 0, totalWater: 0, moistureReadings: [] };
}

// ========== Optional: moisture_log.json live analysieren ==========
export function getTodayMoistureValues() {
  if (!fs.existsSync(MOISTURE_LOG)) return [];

  try {
    const entries = JSON.parse(fs.readFileSync(MOISTURE_LOG, 'utf8'));
    const today = new Date().toISOString().split('T')[0];
    return entries
      .filter(e => e?.timestamp?.startsWith(today) && typeof e?.moisture === 'number')
      .map(e => e.moisture);
  } catch (e) {
    return [];
  }
}
