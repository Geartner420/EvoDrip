// umluft_control.mjs – Async‑Refactor v2 (fixed)
// ----------------------------------------------
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../helper/logger.mjs';

// ----------------------------------------------
// Konstanten & globale States
// ----------------------------------------------
const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '../sensor_data/umluft_config.json');
const STATUS_PATH = path.join(__dirname, '../sensor_data/umluft_status.json');
const DEFAULT_SIMULT_MIN = 5;
const DEFAULT_SIMULT_MAX = 10;

let relays                     = [];
let globalSettings             = {};
let simultaneouslyCycleInterval = null;    // wird in startControl() gesetzt
let abortCtrl                  = null;     // globaler Abbruch‑Controller

// ----------------------------------------------
// Generic JSON‑Helpers
// ----------------------------------------------
async function loadJson(file, fallback = {}) {
  try {
    const raw = await fs.readFile(file, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
const saveJson = (file, data) =>
  fs.writeFile(file, JSON.stringify(data, null, 2), 'utf-8');

// ----------------------------------------------
// Random‑Helpers
// ----------------------------------------------
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function gaussianRandom(mean, stdDev) {
  const u = 1 - Math.random();
  const v = Math.random();
  return mean + Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * stdDev;
}
function boundedGaussian(mean, stdDev, min, max) {
  let x;
  do x = gaussianRandom(mean, stdDev);
  while (x < min || x > max);
  return Math.floor(x);
}

// ----------------------------------------------
// Fetch mit Timeout & Retry
// ----------------------------------------------
async function fetchWithTimeout(url, timeout = 5_000, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);

    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return;
    } catch (err) {
      if (i === retries) logger.warn(`⚠️ ${url} fehlgeschlagen: ${err.message}`);
      else {
        logger.debug(`⏳ Retry ${i + 1} für ${url}`);
        await sleep(1_000);
      }
    } finally {
      clearTimeout(timer);
    }
  }
}

// ----------------------------------------------
// Sleep‑Helper
// ----------------------------------------------
const sleep = ms => new Promise(res => setTimeout(res, ms));

// ----------------------------------------------
// Config & Status
// ----------------------------------------------
async function loadConfig() {
  try {
    const cfg = await loadJson(CONFIG_PATH);
    globalSettings = cfg.global ?? {};
    relays = (cfg.relays ?? []).map(r => ({
      ...r,
      isOn:       false,
      cycleCount: 0,
      relayUrlOn:  `http://${r.ip}/relay/0?turn=on`,
      relayUrlOff: `http://${r.ip}/relay/0?turn=off`,
    }));
    logger.info(`🔁 ${relays.length} Relais geladen.`);
  } catch (err) {
    logger.error(`❌ Konfiguration konnte nicht geladen werden: ${err.message}`);
  }
}
const readStatus  = () => loadJson(STATUS_PATH, {});
const writeStatus = status => saveJson(STATUS_PATH, status);

// ----------------------------------------------
// Kern‑Logik pro Relais
// ----------------------------------------------
async function controlCycle(relay) {
  if (relay.initialOffset > 0) {
    logger.info(`${relay.name}: warte initial ${relay.initialOffset / 1_000}s`);
    await sleep(relay.initialOffset);
  }

  while (!abortCtrl.signal.aborted) {
    // ---------- OFF‑Phase ----------
    if (relay.isOn) {
      await fetchWithTimeout(relay.relayUrlOff);
      relay.isOn = false;
      relay.cycleCount++;
      logger.debug(`🔴 ${relay.name} aus.`);

      // simultanes Einschalten
      if (relay.cycleCount % simultaneouslyCycleInterval === 0) {
        logger.info('⚡ Simultan‑Einschalten ausgelöst');
        await switchAllRelays(true);
        simultaneouslyCycleInterval = getRandomInt(DEFAULT_SIMULT_MIN, DEFAULT_SIMULT_MAX);
        logger.info(`🆕 Nächstes Simultan‑Intervall: ${simultaneouslyCycleInterval}`);
      }

      const offDur = boundedGaussian(
        globalSettings.minOff,
        globalSettings.maxOff - globalSettings.minOff,
        globalSettings.minOff,
        globalSettings.maxOff
      );
      logger.info(`[${relay.name}] 🔴 ${(offDur / 60_000).toFixed(1)} min`);
      await sleep(offDur);
    }

    // ---------- ON‑Phase -----------
    await fetchWithTimeout(relay.relayUrlOn);
    relay.isOn = true;
    logger.debug(`🟢 ${relay.name} an.`);

    const onDur = boundedGaussian(
      globalSettings.minOn,
      globalSettings.maxOn - globalSettings.minOn,
      globalSettings.minOn,
      globalSettings.maxOn
    );
    logger.info(`[${relay.name}] 🟢 ${(onDur / 60_000).toFixed(1)} min`);
    await sleep(onDur);

    // ---------- Neustart‑Check -----
    const status = await readStatus();
    if (status.restartRequested) {
      logger.info('🔁 Neustart angefordert.');
      await writeStatus({ ...status, restartRequested: false });
      restartControl();
      return;
    }
  }
}

// ----------------------------------------------
// Alle Relais gleichzeitig schalten
// ----------------------------------------------
async function switchAllRelays(on, duration = 4 * 60_000) {
  const urlKey = on ? 'relayUrlOn' : 'relayUrlOff';
  await Promise.all(relays.map(r => fetchWithTimeout(r[urlKey])));
  if (on) {
    await sleep(duration);
    await Promise.all(relays.map(r => fetchWithTimeout(r.relayUrlOff)));
  }
}

// ----------------------------------------------
// Steuerung starten / stoppen
// ----------------------------------------------
export async function startControl() {
  if (global.umluftStarted) {
    logger.info('[umluft] Steuerung bereits aktiv (global flag) – kein Neustart');
    return;
  }
  if (abortCtrl?.signal && !abortCtrl.signal.aborted) return;
  global.umluftStarted = true;

  abortCtrl = new AbortController();
  simultaneouslyCycleInterval = getRandomInt(DEFAULT_SIMULT_MIN, DEFAULT_SIMULT_MAX);

  await loadConfig();
  relays.forEach(relay =>
    controlCycle(relay).catch(err =>
      logger.error(`❌ ${relay.name}: ${err.message}`)
    ));

  logger.info('🚀 Umluftsteuerung gestartet.');
}


async function stopControl() {
  abortCtrl?.abort();
  await switchAllRelays(false, 0);   // alles sicher AUS
  logger.info('⏹️ Umluftsteuerung gestoppt.');
}

async function restartControl() {
  await stopControl();
  await startControl();
}

export const controlRelays = startControl;   // Alias für Legacy‑Code

// ----------------------------------------------
// CLI‑Start (node umluft_control.mjs)
// ----------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  startControl().catch(err => {
    logger.error(`❌ Fatal: ${err.message}`);
    process.exit(1);
  });
}

//testTest  