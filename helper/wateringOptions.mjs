import { fetchMoisture } from '../services/fytaservice.mjs';
import { triggerShelly } from '../services/shellyService.mjs';
import { saveState } from '../services/stateService.mjs';
import { isNightTime } from '../services/timeService.mjs';
import config from './config.mjs';

const {
  MOISTURE_THRESHOLD,
  TARGET_MOISTURE_AFTER_WATERING,
  COOLDOWN_AFTER_WATER_MINUTES,
  WAIT_AFTER_WATER_MINUTES,
  NIGHT_START_HOUR,
  NIGHT_END_HOUR,
} = config;

export function buildWateringOptions(getLastTriggerTime, setLastTriggerTime, logger) {
  return {
    fetchMoisture,
    triggerShelly,
    logger,
    MOISTURE_THRESHOLD,
    TARGET_MOISTURE_AFTER_WATERING,
    COOLDOWN_AFTER_WATER_MINUTES,
    WAIT_AFTER_WATER_MINUTES,
    NIGHT_START_HOUR,
    NIGHT_END_HOUR,
    isNightTime,
    getLastTriggerTime,
    setLastTriggerTime,
    saveState
  };
}
