// Hauptmodule importieren
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { ruleEngineLogger as logger } from '../helper/logger.mjs';

// Basisverzeichnisse und Pfade zu JSON-Dateien
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../sensor_data');

const rulesFile = path.join(dataDir, 'relay_rules.json');
const relaysFile = path.join(dataDir, 'relays.json');
const sensorFile = path.join(dataDir, 'last_entrys.json');
const relayLogFile = path.join(dataDir, 'relay_log.json');

const operatorMap = {
  '>': 'größer als',
  '<': 'kleiner als',
  '>=': 'größer oder gleich',
  '<=': 'kleiner oder gleich',
  '==': 'gleich'
};

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
async function fetchWithTimeout(url, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function getRelayState(ip) {
  try {
    const res = await fetchWithTimeout(`http://${ip}/rpc/Switch.GetStatus?id=0`);
    const data = await res.json();
    return data.output ? 'on' : 'off';
  } catch (err) {
    logger.warn(`[rule_engine] ⚠️ Statusabfrage bei ${ip} fehlgeschlagen: ${err.message}`);
    return null;
  }
}

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

function getShellyUrl(ip, state) {
  return `http://${ip}/relay/0?turn=${state}`;
}

function isWithinTimeWindow(startTime, endTime) {
  if (!startTime || !endTime) return true;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  const inWindow = startMinutes <= endMinutes
    ? nowMinutes >= startMinutes && nowMinutes <= endMinutes
    : nowMinutes >= startMinutes || nowMinutes <= endMinutes;

  logger.debug(`[zeitfenster] ${startTime}–${endTime} | now=${now.getHours()}:${now.getMinutes()} → ${inWindow}`);
  return inWindow;
}
function evaluateCondition(sensorData, { param, op, value, hysteresis }, currentState) {
  const actual = sensorData?.[param];
  const expected = parseFloat(value);
  if (actual == null || isNaN(expected)) return false;

  const h = parseFloat(hysteresis) || 0;

  switch (op) {
    case '>':  return currentState === 'off' ? actual > expected : actual > (expected - h);
    case '<':  return currentState === 'off' ? actual < expected : actual < (expected + h);
    case '>=': return currentState === 'off' ? actual >= expected : actual > (expected - h);
    case '<=': return currentState === 'off' ? actual <= expected : actual < (expected + h);
    case '==': return actual === expected;
    default:   return false;
  }
}
async function runRuleEngine() {
  const rules = loadJson(rulesFile);
  const relays = loadJson(relaysFile);
  const sensors = loadJson(sensorFile);

  const relayMap = Object.fromEntries(relays.map(r => [r.name, r.ip]));
  const sensorMap = Object.fromEntries(
    sensors.filter(s => s.sensor && typeof s === 'object').map(s => [s.sensor, s])
  );

  let checked = 0;
  let switched = 0;
  const pendingStates = {};

 for (const rule of rules) {
  // Standardmäßig ist eine Regel aktiviert, wenn 'enabled' fehlt oder true ist
  const isEnabled = rule.enabled !== false;
  if (!isEnabled) {
    logger.debug(`[rule_engine] ⏸️ Regel "${rule.name || '(ohne Namen)'}" deaktiviert – wird übersprungen`);
    continue;
  }
    const logic = (rule.logic || 'AND').toUpperCase();
    const relayNames = Array.isArray(rule.relays) ? rule.relays : [rule.relay];
    const inTimeWindow = isWithinTimeWindow(rule.activeFrom, rule.activeTo);

    const conditionResults = rule.conditions.map(cond => {
      const sensorData = sensorMap[cond.sensor];
      const actual = sensorData?.[cond.param];
      const passed = evaluateCondition(sensorData, cond, 'off'); // pauschal off, Details später
      const hStr = cond.hysteresis ? ` ±${cond.hysteresis}` : '';
      const label = cond.param === 'temperature' ? '🌡' :
                    cond.param === 'humidity' ? '💧' :
                    cond.param === 'vpd' ? '📈' : '📊';
      const opText = operatorMap[cond.op] || cond.op;
      const desc = `${label} ${cond.param} ${opText} ${cond.value}${hStr} @${cond.sensor} → aktuell: ${actual}`;
      return { passed, desc, cond };
    });

    const conditionsPassed = logic === 'OR'
      ? conditionResults.some(r => r.passed)
      : conditionResults.every(r => r.passed);

    const shouldActivate = inTimeWindow && conditionsPassed;
    checked++;

    if (!shouldActivate) {
      const reason = !inTimeWindow ? '⏰ Zeitfenster ungültig' : '❌ Bedingungen nicht erfüllt';
      logger.debug(`[rule_engine] Regel [${relayNames.join(', ')}] (${rule.action}) übersprungen – ${reason}`);
      continue;
    }

    for (const relayName of relayNames) {
      const already = pendingStates[relayName];
      if (already?.action === 'on') continue; // "on" hat Vorrang
      if (rule.action === 'on' || !already) {
        pendingStates[relayName] = {
          rule,
          action: rule.action,
          desc: conditionResults.filter(r => r.passed).map(r => r.desc).join(logic === 'OR' ? ' ODER ' : ' UND ')
        };
      }
    }
  }
  // Relais schalten
  for (const [relayName, { rule, action, desc }] of Object.entries(pendingStates)) {
    const ip = relayMap[relayName];
    if (!ip) {
      logger.warn(`[rule_engine] ⚠️ Keine IP für Relais "${relayName}".`);
      continue;
    }

    const actualState = await getRelayState(ip);
    if (actualState === action) {
      logger.debug(`[rule_engine] ${relayName} ist laut Shelly bereits ${action.toUpperCase()} – kein neuer Befehl`);
      continue;
    }

    const url = getShellyUrl(ip, action);
    const emoji = action === 'on' ? '🟢' : '🔴';

    logger.debug(`[rule_engine] Regel ${relayName} wird jetzt geschaltet – Zeitfenster gültig`);
    try {
      await safeSwitch(url);
      logger.info(`${emoji} ${relayName} → ${desc}`);
      saveRelayLogEntry({
        timestamp: new Date().toISOString(),
        relay: relayName,
        ip,
        state: action,
        sourceSensors: rule.conditions.map(c => c.sensor),
        conditions: rule.conditions,
        activeFrom: rule.activeFrom,
        activeTo: rule.activeTo
      });
      switched++;
    } catch (err) {
      logger.error(`[rule_engine] ❌ Fehler beim Schalten von ${relayName}: ${err.message}`);
    }
  }

  if (logger.isDebugEnabled()) {
    logger.debug(`[rule_engine] ✅ ${checked} Regeln geprüft, ${switched} geschaltet`);
  }
}
let tick = 0;
function runRuleEngineSafe() {
  logger.debug(`⏲ Tick ${++tick}`);
  runRuleEngine().catch(err =>
    logger.error(`❌ Ungefangener Fehler: ${err.message}`)
  );
}

export function startRuleEngine() {
  logger.info('🚀 Regel-Engine gestartet (alle 5s)');
  runRuleEngineSafe();
  setInterval(runRuleEngineSafe, 5000);
}
