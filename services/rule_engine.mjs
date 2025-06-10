// Hauptmodule importieren
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { ruleEngineLogger as logger } from '../helper/logger.mjs';

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

// 🔁 JSON-Caching
const cache = {};
function loadJsonCached(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const mtime = stats.mtimeMs;

    if (cache[filePath] && cache[filePath].mtime === mtime) {
      return cache[filePath].data;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    cache[filePath] = { data, mtime };
    return data;
  } catch (err) {
    logger.error(`[rule_engine] Fehler beim Caching von ${filePath}: ${err.message}`);
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

function evaluateCondition(sensorData, { param, op, value, hysteresis }) {
  const actual = sensorData?.[param];
  const expected = parseFloat(value);
  const h = parseFloat(hysteresis) || 0;
  if (actual == null || isNaN(expected)) return false;

  switch (op) {
    case '>':  return actual > expected + h;
    case '<':  return actual < expected - h;
    case '>=': return actual >= expected + h;
    case '<=': return actual <= expected - h;
    case '==': return Math.abs(actual - expected) <= h;
    default:   return false;
  }
}


function formatConditionGroup(groups) {
  return groups
    .map(group => {
      const inner = group
        .map(cond => {
          const label = cond.param === 'temperature' ? '🌡' :
                        cond.param === 'humidity' ? '💧' :
                        cond.param === 'vpd' ? '📈' : '📊';
          const op = cond.op;
          const val = cond.value;
          const src = cond.sensor || '?';
          return `${label} ${cond.param} ${op} ${val} @${src}`;
        })
        .join(' AND ');
      return `(${inner})`;
    })
    .join(' OR ');
}

// 👇 ersetzt groupConditions()
function groupConditions(conditions, fallback = 'AND') {
  const groups = [];
  let currentGroup = [];

  for (let i = 0; i < conditions.length; i++) {
    const cond = { ...conditions[i] };
    const prevLogic = i > 0 ? (conditions[i - 1].logic || fallback).toUpperCase() : fallback;

    if (i > 0 && prevLogic === 'OR') {
      groups.push(currentGroup);
      currentGroup = [cond];
    } else {
      currentGroup.push(cond);
    }
  }

  if (currentGroup.length) {
    groups.push(currentGroup);
  }

  return groups;
}



async function runRuleEngine() {
  const rules = loadJsonCached(rulesFile);
  const relays = loadJsonCached(relaysFile);
  const sensors = loadJsonCached(sensorFile);

  // Zuordnung: Relaisname → IP, Sensor-ID → Sensordaten
  const relayMap = Object.fromEntries(relays.map(r => [r.name, r.ip]));
  const sensorMap = Object.fromEntries(
    sensors.filter(s => s.sensor && typeof s === 'object').map(s => [s.sensor, s])
  );

  let checked = 0;
  let switched = 0;
  const pendingStates = {}; // Zu schaltende Relais

  for (const rule of rules) {
    const ruleName = rule.name || '🛠 Unbenannte Regel';

    if (rule.enabled === false) {
      logger.debug(`[skip] ❎ ${ruleName} → deaktiviert`);
      continue;
    }

    const relayNames = Array.isArray(rule.relays) ? rule.relays : [rule.relay];
    const fallbackLogic = (rule.logic || 'AND').toUpperCase();

    // Zeitfenster prüfen
    const inTimeWindow = isWithinTimeWindow(rule.activeFrom, rule.activeTo);
    if (!inTimeWindow) {
      logger.debug(`[skip] 🕛 ${ruleName} → außerhalb Zeitfenster ${rule.activeFrom}-${rule.activeTo}`);
      continue;
    }

    // Bedingungen gruppieren (z. B. für OR-Logik)
    const groupedConditions = groupConditions(rule.conditions, fallbackLogic);
    logger.debug(`📐 Bedingungslogik für "${ruleName}": ${formatConditionGroup(groupedConditions)}`);

    // Bedingungen prüfen (ohne Relaiszustand – Hysterese direkt in evaluateCondition eingebaut)
    const groupResults = groupedConditions.map((group, i) => {
      const result = group.every(cond => evaluateCondition(sensorMap[cond.sensor], cond));
      logger.debug(`🔍 Gruppe ${i + 1} von ${ruleName} → ${result ? '✅ erfüllt' : '❌ nicht erfüllt'}`);
      return result;
    });

    const shouldActivate = groupResults.some(Boolean);
    checked++;

    if (!shouldActivate) {
      logger.debug(`[skip] 🚫 ${ruleName} → Keine Gruppe erfüllt (${groupResults.length} Gruppen)`);
      continue;
    }

    logger.debug(` [Schaltung]🔥 ${ruleName} → Zeit ok, Gruppe erfüllt → Schalte: ${rule.action.toUpperCase()}`);

    // Beschreibung für Logging erzeugen
    const passedConditionsFlat = groupedConditions
      .flat()
      .filter(cond => evaluateCondition(sensorMap[cond.sensor], cond));

    const descList = passedConditionsFlat.map(cond => {
      const sensorData = sensorMap[cond.sensor];
      const actual = sensorData?.[cond.param];
      const hStr = cond.hysteresis ? ` ±${cond.hysteresis}` : '';
      const label = cond.param === 'temperature' ? '🌡' :
                    cond.param === 'humidity' ? '💧' :
                    cond.param === 'vpd' ? '📈' : '📊';
      const opText = operatorMap[cond.op] || cond.op;
      return `${label} ${cond.param} ${opText} ${cond.value}${hStr} @${cond.sensor} → aktuell: ${actual}`;
    });

    // Schaltbefehl für jedes Zielrelais vorbereiten
    for (const relayName of relayNames) {
      const already = pendingStates[relayName];
      if (already?.action === 'on') continue; // ON-Befehle haben Priorität
      if (rule.action === 'on' || !already) {
        pendingStates[relayName] = {
          rule,
          action: rule.action,
          desc: descList.join(' UND/ODER ')
        };
      }
    }
  }

  // Relais nun tatsächlich schalten
  for (const [relayName, { rule, action, desc }] of Object.entries(pendingStates)) {
    const ip = relayMap[relayName];
    if (!ip) continue;

    const actualState = await getRelayState(ip);
    if (actualState === action) continue; // Keine Änderung nötig

    const url = getShellyUrl(ip, action);
    try {
      await safeSwitch(url);
      logger.info(`${action === 'on' ? '🟢' : '🔴'} ${relayName} → ${desc}`);
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

  const usedMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
  logger.debug(`[rule_engine] ✅ ${checked} Regeln geprüft, ${switched} geschaltet | RAM: ${usedMB} MB`);
}



let intervalRef = null;
let tick = 0;
function runRuleEngineSafe() {
  logger.debug(`⏲ Tick ${++tick}`);
  runRuleEngine().catch(err => logger.error(`❌ Ungefangener Fehler: ${err.message}`));
}

export function startRuleEngine() {
  if (intervalRef) {
    clearInterval(intervalRef);
    logger.warn('[rule_engine] Vorheriges Intervall gestoppt (Restart)');
  }
  logger.info('🚀 Regel-Engine gestartet (alle 5 s)');
  runRuleEngineSafe();
  intervalRef = setInterval(runRuleEngineSafe, 5000);
}
