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
    MAX_DAILY_WATER_VOLUME_ML: config.MAX_DAILY_WATER_VOLUME_ML,


    getLastTriggerTime,
    setLastTriggerTime,
    getTodayTotalWater, // Tageszähler (für Wasserlimit)
    saveState
};
}
