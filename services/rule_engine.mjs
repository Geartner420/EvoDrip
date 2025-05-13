// Hauptmodule importieren
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { ruleEngineLogger as logger } from '../helper/logger.mjs';

// Basisverzeichnisse und Pfade zu JSON-Dateien
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../sensor_data');

const rulesFile = path.join(dataDir, 'relay_rules.json');      // Regeln für Relaissteuerung
const relaysFile = path.join(dataDir, 'relays.json');          // Relaiskonfiguration (Name, IP)
const sensorFile = path.join(dataDir, 'last_entrys.json');     // Letzte Sensorwerte
const relayLogFile = path.join(dataDir, 'relay_log.json');     // Log aller Schaltvorgänge


// Vergleichsoperatoren für sprechende Log-Ausgaben
const operatorMap = {
  '>': 'größer als',
  '<': 'kleiner als',
  '>=': 'größer oder gleich',
  '<=': 'kleiner oder gleich',
  '==': 'gleich'
};

// JSON-Datei sicher laden
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

// Neuen Eintrag ins Schaltlog schreiben
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

  log.unshift(entry);                  // Neuester Eintrag nach oben
  if (log.length > 5000) log = log.slice(0, 5000);  // Log auf 5000 Einträge begrenzen

  try {
    fs.writeFileSync(relayLogFile, JSON.stringify(log, null, 2), 'utf-8');
  } catch (err) {
    logger.error(`[rule_engine] Fehler beim Schreiben von relay_log.json: ${err.message}`);
  }
}

// HTTP-Anfrage mit Timeout absichern
async function fetchWithTimeout(url, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// Aktuellen Zustand eines Shelly Gen3 Geräts abfragen
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

// Relais mit Wiederholversuchen sicher schalten
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

// Bedingung bewerten (mit Hysterese)
function evaluateCondition(sensorValue, { param, op, value, hysteresis }, currentState) {
  const actual = sensorValue[param];
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

// Schalt-URL für Shelly erstellen
function getShellyUrl(ip, state) {
  return `http://${ip}/relay/0?turn=${state}`;
}

// Prüfen, ob aktuelle Uhrzeit im definierten Zeitfenster liegt
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

// Zentrale Logik der Regel-Engine
async function runRuleEngine() {
  const rules = loadJson(rulesFile);     // Regeldefinitionen laden
  const relays = loadJson(relaysFile);   // Relais mit IP-Adressen
  const sensors = loadJson(sensorFile);  // Aktuelle Sensordaten

  const relayMap = Object.fromEntries(relays.map(r => [r.name, r.ip]));
  const sensorMap = Object.fromEntries(
    sensors.filter(s => s.sensor && typeof s === 'object').map(s => [s.sensor, s])
  );

  let checked = 0;
  let switched = 0;
  const pendingStates = {};  // Zwischenspeicher für Schaltvorgänge (pro Tick)

  for (const rule of rules) {
    const sensorData = sensorMap[rule.sensor];
    if (!sensorData) {
      logger.warn(`[rule_engine] ❗ Sensor "${rule.sensor}" nicht gefunden.`);
      continue;
    }

    const inTimeWindow = isWithinTimeWindow(rule.activeFrom, rule.activeTo);
    const currentState = await getRelayState(relayMap[rule.relay]);

    const conditionResults = rule.conditions.map(cond => {
      const actual = sensorData[cond.param];
      const passed = evaluateCondition(sensorData, cond, currentState);
      const hStr = cond.hysteresis ? ` ±${cond.hysteresis}` : '';
      const label = cond.param === 'temperature' ? '🌡' :
                    cond.param === 'humidity' ? '💧' :
                    cond.param === 'vpd' ? '📈' : '📊';
      const opText = operatorMap[cond.op] || cond.op;
      const desc = `${label} ${cond.param} ${opText} ${cond.value}${hStr} → aktuell: ${actual}`;
      return { passed, desc };
    });

    const logic = (rule.logic || 'AND').toUpperCase();
    const conditionsPassed = logic === 'OR'
      ? conditionResults.some(r => r.passed)
      : conditionResults.every(r => r.passed);

    const shouldActivate = inTimeWindow && conditionsPassed;
    checked++;

    if (!shouldActivate) {
      const reason = !inTimeWindow ? '⏰ Zeitfenster ungültig' : '❌ Bedingungen nicht erfüllt';
      logger.debug(`[rule_engine] Regel ${rule.relay} (${rule.action}) übersprungen – ${reason}`);
      continue;
    }

    // Verhindere doppelte Schaltungen in einem Tick
    const existing = pendingStates[rule.relay];
    if (existing?.action === 'on') continue;
    if (rule.action === 'on' || !existing) {
      pendingStates[rule.relay] = {
        rule,
        action: rule.action,
        desc: logic === 'OR'
          ? conditionResults.filter(r => r.passed).map(r => r.desc).join(' ODER ')
          : conditionResults.map(r => r.desc).join(' UND ')
      };
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
      logger.info(`[rule_engine] ${relayName} ist laut Shelly bereits ${action.toUpperCase()} – kein neuer Befehl`);
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
        sourceSensor: rule.sensor,
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

// Safe Wrapper mit Tick-Zähler
let tick = 0;
function runRuleEngineSafe() {
  logger.debug(`⏲ Tick ${++tick}`);
  runRuleEngine().catch(err =>
    logger.error(`❌ Ungefangener Fehler: ${err.message}`)
  );
}

// Engine-Startfunktion (alle 5 Sekunden)
export function startRuleEngine() {
  logger.info('🚀 Regel-Engine gestartet (alle 5s)');
  runRuleEngineSafe();
  setInterval(runRuleEngineSafe, 5000);
}
