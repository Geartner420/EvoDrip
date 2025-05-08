import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import logger from '../helper/logger.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../sensor_data');

const rulesFile = path.join(dataDir, 'relay_rules.json');
const relaysFile = path.join(dataDir, 'relays.json');
const sensorFile = path.join(dataDir, 'last_entrys.json');
const relayLogFile = path.join(dataDir, 'relay_log.json');

const DEBUG_MODE = process.env.DEBUG === 'true';
const lastStates = {};

const operatorMap = {
  '>': 'größer als',
  '<': 'kleiner als',
  '>=': 'größer oder gleich',
  '<=': 'kleiner oder gleich',
  '==': 'gleich'
};

// Sicheres Laden von JSON-Dateien
function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    logger.error(`[rule_engine] Fehler beim Lesen von ${filePath}: ${err.message}`);
    return [];
  }
}

// Relay-Log speichern
function saveRelayLogEntry(entry) {
  let log = [];
  try {
    if (fs.existsSync(relayLogFile)) {
      const raw = fs.readFileSync(relayLogFile, 'utf-8');
      log = JSON.parse(raw);
      if (!Array.isArray(log)) log = [];
    }
  } catch (err) {
    logger.warn(`[rule_engine] Konnte relay_log.json nicht laden: ${err.message}`);
  }

  log.unshift(entry);
  if (log.length > 5000) log = log.slice(0, 5000);

  try {
    fs.writeFileSync(relayLogFile, JSON.stringify(log, null, 2), 'utf-8');
  } catch (err) {
    logger.error(`[rule_engine] Fehler beim Schreiben von relay_log.json: ${err.message}`);
  }
}

// Fetch mit Timeout und Logging
function fetchWithTimeout(url, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => {
    controller.abort();
    logger.warn(`[rule_engine] ⚠️ Timeout beim Zugriff: ${url}`);
  }, timeout);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
}

// Wiederholtes Schalten mit Retry
async function safeSwitch(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (err) {
      logger.warn(`[rule_engine] ⚠️ Schaltversuch ${i + 1} fehlgeschlagen: ${url}`);
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

// Evaluierung mit Hysterese
function evaluateCondition(sensorValue, { param, op, value, hysteresis }, currentState) {
  const actual = sensorValue[param];
  const expected = parseFloat(value);
  if (actual == null || isNaN(expected)) return false;

  const h = parseFloat(hysteresis) || 0;

  switch (op) {
    case '>': return currentState === 'off' ? actual > expected : actual > (expected - h);
    case '<': return currentState === 'off' ? actual < expected : actual < (expected + h);
    case '>=': return currentState === 'off' ? actual >= expected : actual > (expected - h);
    case '<=': return currentState === 'off' ? actual <= expected : actual < (expected + h);
    case '==': return actual === expected;
    default: return false;
  }
}

function getShellyUrl(ip, state) {
  return `http://${ip}/relay/0?turn=${state}`;
}

// Zeitfenster prüfen
function isWithinTimeWindow(from, to) {
  if (!from || !to) return true;

  const now = new Date();
  const [fromH, fromM] = from.split(':').map(Number);
  const [toH, toM] = to.split(':').map(Number);

  const start = new Date(now); start.setHours(fromH, fromM, 0, 0);
  const end = new Date(now); end.setHours(toH, toM, 0, 0);

  return end < start ? (now >= start || now <= end) : (now >= start && now <= end);
}

// Hauptregel-Engine
function runRuleEngine() {
  const rules = loadJson(rulesFile);
  const relays = loadJson(relaysFile);
  const sensors = loadJson(sensorFile);

  const relayMap = Object.fromEntries(relays.map(r => [r.name, r.ip]));
  const sensorMap = Object.fromEntries(
    sensors.filter(s => s.sensor && typeof s === 'object').map(s => [s.sensor, s])
  );

  let checked = 0;
  let switched = 0;

  for (const rule of rules) {
    const sensorData = sensorMap[rule.sensor];
    if (!sensorData) {
      logger.warn(`[rule_engine] ❗ Sensor "${rule.sensor}" nicht gefunden.`);
      continue;
    }

    if (!isWithinTimeWindow(rule.activeFrom, rule.activeTo)) {
      if (DEBUG_MODE) {
        logger.debug(`[rule_engine] ⏰ Regel ${rule.relay} (${rule.action}) ignoriert – außerhalb des Zeitfensters.`);
      }
      continue;
    }

    const lastState = lastStates[rule.relay] || 'off';

    const conditionResults = rule.conditions.map(cond => {
      const actual = sensorData[cond.param];
      const passed = evaluateCondition(sensorData, cond, lastState);
      const hStr = cond.hysteresis ? ` ±${cond.hysteresis}` : '';
      const label = cond.param === 'Temperatur' ? '🌡' :
                    cond.param === 'Feuchtigkeit' ? '💧' :
                    cond.param === 'VPD' ? '📈' : '📊';
      const operatorText = operatorMap[cond.op] || cond.op;
      const desc = `${label} ${cond.param} ${operatorText} ${cond.value}${hStr} → aktuell: ${actual}`;
      return { passed, desc };
    });

    const shouldActivate = conditionResults.every(r => r.passed);
    checked++;

    if (!shouldActivate) continue;

    const desiredState = rule.action;
    const ip = relayMap[rule.relay];
    if (!ip) {
      logger.warn(`[rule_engine] ⚠️ Keine IP für Relais "${rule.relay}".`);
      continue;
    }

    if (desiredState !== lastState) {
      const url = getShellyUrl(ip, desiredState);
      const emoji = desiredState === 'on' ? '🟢' : '🔴';
      const conditionStr = conditionResults.map(r => r.desc).join(' UND ');

      if (!isWithinTimeWindow(rule.activeFrom, rule.activeTo)) {
        logger.debug(`[rule_engine] ⏰ Regel ${rule.relay} übersprungen – Zeitfenster inzwischen ungültig`);
        continue;
      }

      safeSwitch(url)
        .then(() => {
          logger.info(`${emoji} ${rule.relay} ${desiredState === 'on' ? '🟢' : '🔴'} → ${conditionStr}`);
          saveRelayLogEntry({
            timestamp: new Date().toISOString(),
            relay: rule.relay,
            ip,
            state: desiredState,
            sourceSensor: rule.sensor,
            conditions: rule.conditions,
            activeFrom: rule.activeFrom,
            activeTo: rule.activeTo
          });
          lastStates[rule.relay] = desiredState;
          switched++;
        })
        .catch(err => {
          logger.error(`[rule_engine] ❌ Fehler beim Schalten von ${rule.relay}: ${err.message}`);
        });
    }
  }

  if (DEBUG_MODE) {
    logger.debug(`[rule_engine] ✅ ${checked} Regeln geprüft, ${switched} geschaltet`);
  }
}

// Fehlerresistenter Wrapper
let tick = 0;
function runRuleEngineSafe() {
  try {
    logger.debug(`⏲ Tick ${++tick}`);
    runRuleEngine();
  } catch (err) {
    logger.error(`❌ Ungefangener Fehler: ${err.message}`);
  }
}

export function startRuleEngine() {
  logger.info('🚀 Regel-Engine gestartet (alle 10s)');
  runRuleEngineSafe();
  setInterval(runRuleEngineSafe, 10000);
}
