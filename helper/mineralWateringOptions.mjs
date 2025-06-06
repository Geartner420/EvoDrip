// helper/mineralWateringOptions.mjs

import config from './config.mjs';
import { fetchMoisture } from '../services/fytaservice.mjs';
import { triggerShelly } from '../services/shellyService.mjs';
import { saveState } from '../services/stateService.mjs';
import { getTodayTotalWater } from '../services/statsService.mjs';

/**
 * Baut die Optionsstruktur für die mineralische Bewässerung.
 * Diese Struktur wird an checkAndWaterMineralSubstrate übergeben.
 *
 * @param {Function} getLastTriggerTime - Liefert den letzten Gießzeitpunkt
 * @param {Function} setLastTriggerTime - Setzt den letzten Gießzeitpunkt
 * @returns {Object} Optionen für die Bewässerungslogik
 */
export function buildMineralWateringOptions(getLastTriggerTime, setLastTriggerTime) {
  return {
    fetchMoisture, // Sensorwert abfragen
    triggerShelly, // Relais auslösen
    POT_COUNT: config.POT_COUNT,
    DRIPPERS_PER_POT: config.DRIPPERS_PER_POT,
    FLOW_RATE_ML_PER_MINUTE: config.FLOW_RATE_ML_PER_MINUTE,
      SHELLY_TIMER_MINERAL_HOURS: config.SHELLY_TIMER_MINERAL_HOURS,
    SHELLY_TIMER_MINERAL_MINUTES: config.SHELLY_TIMER_MINERAL_MINUTES,
    SHELLY_TIMER_MINERAL_SECONDS: config.SHELLY_TIMER_MINERAL_SECONDS,
    MIN_TIME_BETWEEN_CYCLES_MIN: config.MIN_TIME_BETWEEN_CYCLES_MIN,
    MAX_DAILY_WATER_VOLUME_ML: config.MAX_DAILY_WATER_VOLUME_ML,
    MAX_MOISTURE: config.MAX_MOISTURE_MINERAL,
    DAY_START_HOUR: config.DAY_START_HOUR,
    DAY_END_HOUR: config.DAY_END_HOUR,
    getLastTriggerTime,
    setLastTriggerTime,
    getTodayTotalWater, // Tageszähler (für Wasserlimit)
    saveState
  };
}
