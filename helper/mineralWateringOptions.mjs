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
  const common = {
    FLOW_RATE_ML_PER_MINUTE: parseFloat(config.FLOW_RATE_ML_PER_MINUTE),
    DRIPPERS_PER_POT: parseInt(config.DRIPPERS_PER_POT),
    POT_COUNT: parseInt(config.POT_COUNT),
    MAX_DAILY_WATER_VOLUME_ML: parseFloat(config.MAX_DAILY_WATER_VOLUME_ML)
  };

  return {
    fetchMoisture,
    triggerShelly,
    getLastTriggerTime,
    setLastTriggerTime,
    getTodayTotalWater,
    saveState,

    settings: {
      P1: {
        ENABLED: config.P1_ENABLED === 'true',
        START_HOUR: parseInt(config.P1_START_HOUR),
        END_HOUR: parseInt(config.P1_END_HOUR),
        MIN_MOISTURE: parseFloat(config.P1_MIN_MOISTURE),
        MAX_MOISTURE: parseFloat(config.P1_MAX_MOISTURE),
        MIN_TIME_BETWEEN_CYCLES_MIN: parseInt(config.P1_MIN_TIME_BETWEEN_CYCLES_MIN),
        ...common
      },
      P2: {
        ENABLED: config.P2_ENABLED === 'true',
        START_HOUR: parseInt(config.P2_START_HOUR),
        END_HOUR: parseInt(config.P2_END_HOUR),
        MIN_MOISTURE: parseFloat(config.P2_MIN_MOISTURE),
        MAX_MOISTURE: parseFloat(config.P2_MAX_MOISTURE),
        MIN_TIME_BETWEEN_CYCLES_MIN: parseInt(config.P2_MIN_TIME_BETWEEN_CYCLES_MIN),
        ...common
      },
      P3: {
        ENABLED: config.P3_ENABLED === 'true',
        START_HOUR: parseInt(config.P3_START_HOUR),
        END_HOUR: parseInt(config.P3_END_HOUR),
        MIN_MOISTURE: parseFloat(config.P3_MIN_MOISTURE),
        MAX_MOISTURE: parseFloat(config.P3_MAX_MOISTURE),
        MIN_TIME_BETWEEN_CYCLES_MIN: parseInt(config.P3_MIN_TIME_BETWEEN_CYCLES_MIN),
        ...common
      }
    }
  };
}
