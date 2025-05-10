// umluftControl.mjs (fusionierte Version mit exportierter controlRelays)
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import logger from '../helper/logger.mjs';

const CONFIG_PATH = path.resolve('./sensor_data/umluft_config.json');
const STATUS_PATH = path.resolve('./sensor_data/umluft_status.json');

let relays = [];
let globalSettings = {};
let isRunning = false;
let SIMULTANEOUS_CYCLE_INTERVAL = getRandomInterval(5, 20);

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    relays = parsed.relays.map(r => ({
      ...r,
      relayUrlOn: `http://${r.ip}/relay/0?turn=on`,
      relayUrlOff: `http://${r.ip}/relay/0?turn=off`,
      isOn: false,
      timer: null,
      cycleCount: 0
    }));
    globalSettings = parsed.global;
    logger.info(`🔁 ${relays.length} Relais geladen.`);
  } catch (err) {
    logger.error('❌ Fehler beim Laden der Konfiguration:', err.message);
  }
}

function readStatus() {
  try {
    if (!fs.existsSync(STATUS_PATH)) return {};
    const raw = fs.readFileSync(STATUS_PATH);
    return JSON.parse(raw);
  } catch (err) {
    logger.warn('⚠️ Status-Datei konnte nicht gelesen werden:', err.message);
    return {};
  }
}

function writeStatus(status) {
  try {
    fs.writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2));
  } catch (err) {
    logger.warn('⚠️ Status konnte nicht geschrieben werden:', err.message);
  }
}

async function sendRequest(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      logger.warn(`⚠️ Fehler bei ${url}: ${res.statusText}`);
    }
  } catch (err) {
    logger.warn(`⚠️ Anfrage an ${url} fehlgeschlagen:`, err.message);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomNormal(mean, stdDev) {
  let u = 1 - Math.random();
  let v = Math.random();
  let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stdDev;
}

function getNormalDuration(mean, stdDev, min, max) {
  let duration;
  do {
    duration = getRandomNormal(mean, stdDev);
  } while (duration < min || duration > max);
  return Math.floor(duration);
}

function getRandomInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function controlCycle(relay) {
  if (relay.initialOffset > 0) {
    logger.info(`${relay.name}: Warte initial ${relay.initialOffset / 1000}s`);
    await sleep(relay.initialOffset);
  }
  while (isRunning) {
    if (relay.isOn) {
      await sendRequest(relay.relayUrlOff);
      relay.isOn = false;
      relay.cycleCount++;
      logger.debug(`🔴 ${relay.name} ausgeschaltet.`);

      if (relay.cycleCount % SIMULTANEOUS_CYCLE_INTERVAL === 0) {
        logger.info('🔁 Simultane Einschalten ausgelöst.');
        await ensureSimultaneousOn();
        SIMULTANEOUS_CYCLE_INTERVAL = getRandomInterval(5, 10);
        logger.info(`🆕 Neues Intervall: ${SIMULTANEOUS_CYCLE_INTERVAL}`);
      }

      const offDuration = getNormalDuration(globalSettings.minOff, globalSettings.maxOff - globalSettings.minOff, globalSettings.minOff, globalSettings.maxOff);
      logger.info(`[${relay.name}] 🔴 für ${Math.round(offDuration / 6000) / 10} Min.`);
      await sleep(offDuration);
    } else {
      await sendRequest(relay.relayUrlOn);
      relay.isOn = true;
      logger.debug(`🟢 ${relay.name} eingeschaltet.`);

      const onDuration = getNormalDuration(globalSettings.minOn, globalSettings.maxOn - globalSettings.minOn, globalSettings.minOn, globalSettings.maxOn);
      logger.info(`[${relay.name}] 🟢 für ${Math.round(onDuration / 6000) / 10} Min.`);
      await sleep(onDuration);
    }

    const status = readStatus();
    if (status.restartRequested) {
      logger.info('🔁 Neustart angefordert – Konfiguration wird neu geladen.');
      writeStatus({ ...status, restartRequested: false });
      await controlRelays();
      return;
    }
  }
}

async function ensureSimultaneousOn(duration = 4 * 60 * 1000) {
  logger.info('⚡ Alle Relais gleichzeitig AN');
  await Promise.all(relays.map(relay => sendRequest(relay.relayUrlOn)));
  await sleep(duration);
  await Promise.all(relays.map(relay => sendRequest(relay.relayUrlOff)));
}

export async function controlRelays() {
  isRunning = false;
  await sleep(1000);
  loadConfig();
  isRunning = true;
  relays.forEach(relay => {
    controlCycle(relay).catch(err => {
      logger.error(`Fehler im Zyklus ${relay.name}:`, err);
    });
  });
  logger.info('🚀 Umluftsteuerung gestartet.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  controlRelays();
}
