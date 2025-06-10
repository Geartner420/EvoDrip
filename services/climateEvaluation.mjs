// climateEvaluation.mjs
import fs from 'fs';
import path from 'path';
import logger from '../helper/logger.mjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔧 Korrigierte absolute Pfade
const RULES_PATH = path.join(__dirname, '../sensor_data/relay_rules.json');
const LOG_PATH = path.join(__dirname, '../sensor_data/relay_log.json');
const SENSOR_LOG_PATH = path.join(__dirname, '../sensor_data/history_entrys.json');

console.log('[ClimateEval] Skript gestartet...');

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function getTimeWindowForRule(rule) {
  return {
    startHour: parseInt(rule.activeFrom?.split(':')[0] || '0'),
    endHour: parseInt(rule.activeTo?.split(':')[0] || '23')
  };
}

function isTimestampInTimeWindow(timestamp, rule) {
  const date = new Date(timestamp);
  const hour = date.getHours();
  const { startHour, endHour } = getTimeWindowForRule(rule);
  return hour >= startHour && hour <= endHour;
}

export function evaluateClimate() {
  const rules = loadJson(RULES_PATH);
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const sensorLog = loadJson(SENSOR_LOG_PATH).filter(e => new Date(e.timestamp).getTime() > oneDayAgo);
  const relayLog = loadJson(LOG_PATH).filter(e => new Date(e.timestamp).getTime() > oneDayAgo);

  logger.info(`[ClimateEval] Gelesene Regeln: ${rules.length}`);
  logger.info(`[ClimateEval] Sensorwerte: ${sensorLog.length}`);
  logger.info(`[ClimateEval] Relais-Schaltungen: ${relayLog.length}`);

  const climateTargets = {};
  const evaluation = {};

  for (const rule of rules) {
    if (rule.enabled === false || !Array.isArray(rule.conditions)) continue;

    for (const condition of rule.conditions) {
      const { sensor, param, op, value } = condition;
      if (!sensor || !op || value === undefined) continue;

      if (!param) {
        logger.warn(`[ClimateEval] ⚠️ Regel mit fehlendem Param ignoriert: ${JSON.stringify(condition)}`);
        continue;
      }

      if (!climateTargets[sensor]) climateTargets[sensor] = {};
      if (!climateTargets[sensor][param]) climateTargets[sensor][param] = { min: null, max: null };

      const numericValue = parseFloat(value);
      const currentMin = climateTargets[sensor][param].min;
      const currentMax = climateTargets[sensor][param].max;

      if (op.includes('>')) {
        climateTargets[sensor][param].max = currentMax === null ? numericValue : Math.min(currentMax, numericValue);
      }
      if (op.includes('<')) {
        climateTargets[sensor][param].min = currentMin === null ? numericValue : Math.max(currentMin, numericValue);
      }

      const correctedMin = climateTargets[sensor][param].min;
      const correctedMax = climateTargets[sensor][param].max;
      if (correctedMin !== null && correctedMax !== null && correctedMin > correctedMax) {
        climateTargets[sensor][param].min = correctedMax;
        climateTargets[sensor][param].max = correctedMin;
        logger.warn(`[ClimateEval] ⚠️ Vertauschte Grenzwerte bei ${sensor}/${param} korrigiert: min=${correctedMax}, max=${correctedMin}`);
      }
    }
  }

  for (const sensorId in climateTargets) {
    const sensorData = sensorLog.filter(e => e.sensor === sensorId);
    const relevantRelayEvents = relayLog.filter(e =>
      e.state === 'on' &&
      Array.isArray(e.sourceSensors) &&
      e.sourceSensors.includes(sensorId)
    );

    evaluation[sensorId] = {};

    for (const param in climateTargets[sensorId]) {
      const { min, max } = climateTargets[sensorId][param];
      const values = [];

      for (const event of relevantRelayEvents) {
        const eventTime = new Date(event.timestamp);

        const readings = sensorData.filter(entry => {
          const entryTime = new Date(entry.timestamp);
          return (
            typeof entry[param] === 'number' &&
            Math.abs(entryTime - eventTime) <= 15 * 60 * 1000
          );
        });

        readings.forEach(entry => values.push(entry[param]));
      }

      if (values.length === 0) {
        evaluation[sensorId][param] = {
          target: { min, max },
          actualAvg: null,
          result: '❓ Keine Daten im Schaltzeitraum'
        };
        continue;
      }

      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const inRange = (min === null || avg >= min) && (max === null || avg <= max);

     let suggestion = null;

      if (!inRange) {
        suggestion = {};

        if (min !== null && avg < min) {
          const delta = min - avg;
          const severity = delta / min;
          const correctionRatio = Math.min(1, Math.max(0.4, severity));
          suggestion.newMin = parseFloat((min - delta * correctionRatio).toFixed(2));
          suggestion._correctionRatio = correctionRatio;
        }

        if (max !== null && avg > max) {
          const delta = avg - max;
          const severity = delta / max;
          const correctionRatio = Math.min(1, Math.max(0.4, severity));
          suggestion.newMax = parseFloat((max - delta * correctionRatio).toFixed(2));
          suggestion._correctionRatio = correctionRatio;
        }

        if (Object.keys(suggestion).filter(k => !k.startsWith('_')).length === 0) {
          suggestion = null;
        }
      }

      evaluation[sensorId][param] = {
        target: { min, max },
        actualAvg: parseFloat(avg.toFixed(2)),
        result: inRange ? '✅ Zielbereich erreicht' : '❌ Ziel verfehlt',
        suggestion
      };
    }
  }

  return { climateTargets, evaluation };
}

// Optional: Direkt ausführbar via node climateEvaluation.mjs
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = evaluateClimate();
    logger.info('[ClimateEval] Klima-Zielbereiche:\n' + JSON.stringify(result.climateTargets, null, 2));
    logger.info('[ClimateEval] Bewertung:\n' + JSON.stringify(result.evaluation, null, 2));
    setTimeout(() => process.exit(0), 500);
  } catch (err) {
    logger.error('[ClimateEval] Fehler bei der Auswertung: ' + err.message);
    process.exit(1);
  }
}
