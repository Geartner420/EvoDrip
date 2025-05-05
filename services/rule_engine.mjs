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

const lastStates = {}; // Merkt sich den letzten Schaltzustand pro Relais

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

function saveRelayLogEntry(entry) {
  let log = [];
  try {
    if (fs.existsSync(relayLogFile)) {
      log = JSON.parse(fs.readFileSync(relayLogFile, 'utf-8'));
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

function evaluateCondition(sensorValue, { param, op, value }) {
  const actual = sensorValue[param];
  const expected = parseFloat(value);
  if (actual == null || isNaN(expected)) return false;

  switch (op) {
    case '>': return actual > expected;
    case '<': return actual < expected;
    case '>=': return actual >= expected;
    case '<=': return actual <= expected;
    case '==': return actual == expected;
    default: return false;
  }
}

function getShellyUrl(ip, state) {
  return `http://${ip}/relay/0?turn=${state}`;
}

function isWithinTimeWindow(from, to) {
  if (!from || !to) return true; // keine Einschränkung
  const now = new Date();
  const [fromH, fromM] = from.split(':').map(Number);
  const [toH, toM] = to.split(':').map(Number);

  const start = new Date(now);
  start.setHours(fromH, fromM, 0, 0);
  const end = new Date(now);
  end.setHours(toH, toM, 0, 0);

  return now >= start && now <= end;
}

function runRuleEngine() {
  const rules = loadJson(rulesFile);
  const relays = loadJson(relaysFile);
  const sensors = loadJson(sensorFile);

  const relayMap = Object.fromEntries(relays.map(r => [r.name, r.ip]));
  const sensorMap = Object.fromEntries(sensors.map(s => [s.sensor, s]));

  for (const rule of rules) {
    const sensorData = sensorMap[rule.sensor];
    if (!sensorData) {
      logger.warn(`[rule_engine] Sensor "${rule.sensor}" nicht gefunden.`);
      continue;
    }

    if (!isWithinTimeWindow(rule.activeFrom, rule.activeTo)) {
     //logger.debug(`[rule_engine] Regel für ${rule.relay} aktuell nicht im Zeitfenster.`);
      continue;
    }

    const shouldActivate = rule.conditions.every(cond => evaluateCondition(sensorData, cond));
    if (!shouldActivate) continue;

    const desiredState = rule.action; // 'on' oder 'off'
    const ip = relayMap[rule.relay];
    if (!ip) {
      logger.warn(`[rule_engine] Keine IP für Relais "${rule.relay}".`);
      continue;
    }

    const lastState = lastStates[rule.relay];
    if (desiredState !== lastState) {
      const url = getShellyUrl(ip, desiredState);
      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          logger.info(`[rule_engine] Relais "${rule.relay}" geschaltet: ${desiredState}`);

          const logEntry = {
            timestamp: new Date().toISOString(),
            relay: rule.relay,
            ip,
            state: desiredState,
            sourceSensor: rule.sensor,
            conditions: rule.conditions,
            activeFrom: rule.activeFrom,
            activeTo: rule.activeTo
          };
          saveRelayLogEntry(logEntry);

          lastStates[rule.relay] = desiredState;
        })
        .catch(err => {
          logger.error(`[rule_engine] Fehler beim Schalten von ${rule.relay}: ${err.message}`);
        });
    }
  }
}

export function startRuleEngine() {
  logger.info('[rule_engine] Regel-Engine gestartet (alle 10s)');
  runRuleEngine();
  setInterval(runRuleEngine, 10000);
}
