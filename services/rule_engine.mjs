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

const operatorMap = {
  '>': 'größer als',
  '<': 'kleiner als',
  '>=': 'größer oder gleich',
  '<=': 'kleiner oder gleich',
  '==': 'gleich'
};

// Sicheres Laden von JSON-Dateien mit Fehlerbehandlung
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

// Sicheres Speichern von Log-Einträgen
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

// Abgebrochene fetch-Anfragen mit Timeout-Management
function fetchWithTimeout(url, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { signal: controller.signal })
    .finally(() => clearTimeout(id));
}

// Bedingungsüberprüfung mit Hysterese
function evaluateCondition(sensorValue, { param, op, value, hysteresis }, currentState) {
  const actual = sensorValue[param];
  const expected = parseFloat(value);
  if (actual == null || isNaN(expected)) return false;

  const h = parseFloat(hysteresis) || 0;

  switch (op) {
    case '>':
      return currentState === 'off' ? actual > expected : actual > (expected - h);
    case '<':
      return currentState === 'off' ? actual < expected : actual < (expected + h);
    case '>=':
      return currentState === 'off' ? actual >= expected : actual > (expected - h);
    case '<=':
      return currentState === 'off' ? actual <= expected : actual < (expected + h);
    case '==':
      return actual === expected;
    default:
      return false;
  }
}

// Abrufen der Shelly-URL für Relaissteuerung
function getShellyUrl(ip, state) {
  return `http://${ip}/relay/0?turn=${state}`;
}

// Prüfen, ob das aktuelle Zeitfenster gültig ist
function isWithinTimeWindow(from, to) {
  if (!from || !to) return true;
  const now = new Date();
  const [fromH, fromM] = from.split(':').map(Number);
  const [toH, toM] = to.split(':').map(Number);

  const start = new Date(now);
  start.setHours(fromH, fromM, 0, 0);
  const end = new Date(now);
  end.setHours(toH, toM, 0, 0);

  if (end < start) {
    // Zeitfenster über Mitternacht
    return now >= start || now <= end;
  }

  return now >= start && now <= end;
}

// Hauptlogik der Regel-Engine
function runRuleEngine() {
  const rules = loadJson(rulesFile);
  const relays = loadJson(relaysFile);
  const sensors = loadJson(sensorFile);

  const relayMap = Object.fromEntries(relays.map(r => [r.name, r.ip]));
  const sensorMap = Object.fromEntries(sensors.map(s => [s.sensor, s]));

  for (const rule of rules) {
    const sensorData = sensorMap[rule.sensor];
    if (!sensorData) {
      logger.warn(`[rule_engine] ❗ Sensor "${rule.sensor}" nicht gefunden.`);
      continue;
    }

    if (!isWithinTimeWindow(rule.activeFrom, rule.activeTo)) {
      continue;
    }

    const lastState = lastStates[rule.relay] || 'off';

    const conditionResults = rule.conditions.map(cond => {
      const actual = sensorData[cond.param];
      const passed = evaluateCondition(sensorData, cond, lastState);
      const hStr = cond.hysteresis ? ` ±${cond.hysteresis}` : '';
      const operatorText = operatorMap[cond.op] || cond.op;
      const label = cond.param === 'temperature' ? '🌡' :
                    cond.param === 'humidity' ? '💧' :
                    cond.param === 'vpd' ? '📈' : '📊';
      const desc = `${label} ${cond.param} ${operatorText} ${cond.value}${hStr} → aktuell: ${actual}`;
      return { passed, desc };
    });

    const shouldActivate = conditionResults.every(r => r.passed);
    if (!shouldActivate) {
      const failed = conditionResults.filter(r => !r.passed).map(r => r.desc).join(' UND ');
      continue;
    }

    const desiredState = rule.action;
    const ip = relayMap[rule.relay];
    if (!ip) {
      logger.warn(`[rule_engine] ⚠️ Keine IP für Relais "${rule.relay}".`);
      continue;
    }

    if (desiredState !== lastState) {
      const conditionStr = conditionResults.map(r => r.desc).join(' UND ');
      const emoji = desiredState === 'on' ? '🟢' : '🔴';

      const url = getShellyUrl(ip, desiredState);
      fetchWithTimeout(url)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          logger.info(`${emoji} Relais "${rule.relay}" wurde ${desiredState === 'on' ? 'eingeschaltet' : 'ausgeschaltet'}📄 Bedingungen: ${conditionStr}`);

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
        })
        .catch(err => {
          logger.error(`[rule_engine] ❌ Fehler beim Schalten von ${rule.relay}: ${err.message}`);
        });
    }
  }
}

// Lebenszeichen und Überwachung des Skripts
let tick = 0;
function runRuleEngineSafe() {
  try {
    logger.debug(`[rule_engine] ⏲ Lebenszeichen Tick ${++tick}`);
    runRuleEngine();
  } catch (err) {
    logger.error(`[rule_engine] ❌ Ungefangener Fehler: ${err.message}`);
  }
}

export function startRuleEngine() {
  logger.info('🚀 Regel-Engine gestartet (alle 10s)');
  runRuleEngineSafe();
  setInterval(runRuleEngineSafe, 10000);
}
