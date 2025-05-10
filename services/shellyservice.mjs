// shellyService.mjs
import fetch from 'node-fetch';
import config from '../helper/config.mjs';
import logger from '../helper/logger.mjs';

const { SHELLY_IP, SHELLY_TIMER_MINUTES } = config;

export async function triggerShelly() {
  const secs = Math.round(SHELLY_TIMER_MINUTES * 60);
  const url = `http://${SHELLY_IP}/relay/0?turn=on&timer=${secs}`;

  const res = await fetch(url);
  if (!res.ok) {
    logger.error(`Shelly HTTP ${res.status}`);
    throw new Error(`Shelly HTTP ${res.status}`);
  }

  logger.info(`⏻ Shelly eingeschaltet für ${SHELLY_TIMER_MINUTES} Min`);
}
