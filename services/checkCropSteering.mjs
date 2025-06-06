import { checkAndWaterMineralSubstrate } from '../services/wateringMineralService.mjs';
import { getCropSteeringSettings } from '../helper/cropSteeringEnvService.mjs';
import { fetchMoisture } from './fytaservice.mjs';
import { triggerShelly } from './shellyService.mjs';
import { saveState } from './stateService.mjs';
import { getTodayTotalWater } from './statsService.mjs';


const lastTriggers = {};

function getLastTriggerTime(phase) {
  return lastTriggers[phase] ?? null;
}

function setLastTriggerTime(phase, time) {
  lastTriggers[phase] = time;
}

export async function checkAllPhases() {
  const settings = getCropSteeringSettings();

  for (const phase of ['P1', 'P2', 'P3']) {
    await checkAndWaterMineralSubstrate({
      phase,
      settings,
      fetchMoisture,
      triggerShelly,
      getLastTriggerTime,
      setLastTriggerTime,
      getTodayTotalWater,
      saveState
    });
  }
}
