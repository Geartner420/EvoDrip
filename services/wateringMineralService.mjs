import { sendTelegramMessage } from './telegramService.mjs';
import { incrementDayWatering, getTodayTotalWater, getTodayWaterCount } from './statsService.mjs';
import { getTodayMoistureValues } from './stateService.mjs';
import logger from '../helper/logger.mjs';
import { triggerShellyMineral } from './triggerShelly.mjs';
import fs from 'fs';
import path from 'path';

const summaryLogFile = path.join('./sensor_data/phase_report_log.json');

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

export async function checkAndWaterMineralSubstrate({
  fetchMoisture,
  getLastTriggerTime,
  setLastTriggerTime,
  saveState,
  phase,
  settings
}) {
  const phaseCfg = settings?.[phase];
  if (!phaseCfg?.ENABLED) {
    logger.debug(`[${phase}] ⚠️ Phase ist deaktiviert (ENABLED = false).`);
    return;
  }

  const {
    START_HOUR,
    END_HOUR,
    MIN_MOISTURE,
    MAX_MOISTURE,
    MIN_TIME_BETWEEN_CYCLES_MIN,
    FLOW_RATE_ML_PER_MINUTE,
    DRIPPERS_PER_POT,
    POT_COUNT
  } = phaseCfg;

  let MAX_DAILY_WATER_VOLUME_ML = phaseCfg.MAX_DAILY_WATER_VOLUME_ML;

  if (!MAX_DAILY_WATER_VOLUME_ML) {
    const perPotStr = process.env.MAX_DAILY_WATER_VOLUME_PER_POT_ML;
    const perPot = perPotStr ? parseFloat(perPotStr) : 0;

    if (perPot > 0 && POT_COUNT) {
      MAX_DAILY_WATER_VOLUME_ML = perPot * POT_COUNT;
      logger.info(`🧮 [${phase}] Tageslimit berechnet: ${perPot} ml × ${POT_COUNT} Töpfe = ${MAX_DAILY_WATER_VOLUME_ML} ml`);
    } else {
      logger.warn(`⚠️ [${phase}] Kein gültiges Tageslimit gefunden – Limitprüfung wird deaktiviert`);
      MAX_DAILY_WATER_VOLUME_ML = null;
    }
  }

  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  // 📊 Tagesbericht am Ende der Phase senden
  const today = getTodayDate();
  let sentMap = {};
  if (fs.existsSync(summaryLogFile)) {
    sentMap = JSON.parse(fs.readFileSync(summaryLogFile));
  }

  if (hour === END_HOUR && minute === 0 && sentMap[phase] !== today) {
    const vol = getTodayTotalWater();
    const count = getTodayWaterCount();
    const values = getTodayMoistureValues() ?? [];
    const last = values.at(-1) ?? '-';
    const min = values.length ? Math.min(...values) : '-';
    const max = values.length ? Math.max(...values) : '-';
    const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10 : '-';

    const msg = `📊 [${phase}] Phasenbericht ${today}
• Gießzyklen: ${count}
• Gesamtvolumen: ${vol} ml
• Letzter Feuchtigkeitswert: ${last} %
• Feuchtigkeit min/max: ${min} % / ${max} %
• Durchschnittliche Feuchtigkeit: ${avg} %`;

    await sendTelegramMessage(msg);
    sentMap[phase] = today;
    fs.writeFileSync(summaryLogFile, JSON.stringify(sentMap, null, 2));
    logger.info(`[${phase}] 📊 Tageszusammenfassung gesendet.`);
  }

  // ⏱ Zeitfensterprüfung
  if (hour < START_HOUR || hour >= END_HOUR) {
    logger.debug(`🕒 [${phase}] Außerhalb des Zeitfensters: ${hour} Uhr liegt nicht zwischen ${START_HOUR}–${END_HOUR}.`);
    return;
  }

  if (global.busy) {
    logger.debug(`⏳ [${phase}] Vorgang blockiert – bereits laufende Gießung aktiv.`);
    return;
  }
  global.busy = true;

  try {
    const last = getLastTriggerTime(phase);
    const nowTime = Date.now();
    if (last) {
      const diffMin = (nowTime - last.getTime()) / 60000;
      logger.debug(`🕓 [${phase}] Letzte Gießung vor ${diffMin.toFixed(2)} Min.`);
      if (diffMin < MIN_TIME_BETWEEN_CYCLES_MIN) {
        logger.debug(`⏳ [${phase}] Mindestabstand ${MIN_TIME_BETWEEN_CYCLES_MIN} Min noch nicht erreicht.`);
        return;
      }
    }

    const moisture = await fetchMoisture();
    logger.info(`🌡 [${phase}] Aktuelle Feuchtigkeit: ${moisture}%`);

    if (moisture > MIN_MOISTURE) {
      logger.info(`💧 [${phase}] Noch ausreichend feucht (${moisture}% > Zielwert ${MIN_MOISTURE}%) – keine Gießung.`);
      return;
    }

    if (MAX_MOISTURE && moisture >= MAX_MOISTURE) {
      logger.warn(`🚫 [${phase}] Sensorwert ${moisture}% ≥ MAX_MOISTURE (${MAX_MOISTURE}%) – Vorgang abgebrochen.`);
      return;
    }

    const minutesKey = `SHELLY_TIMER_MINERAL_${phase}_MINUTES`;
    const durationMinutes = parseFloat(process.env?.[minutesKey]);

    if (!durationMinutes || durationMinutes <= 0) {
      logger.warn(`⚠️ [${phase}] Ungültige Gießzeit: ${minutesKey} = ${durationMinutes} – Abbruch.`);
      return;
    }

    const durationSeconds = Math.round(durationMinutes * 60);
    const totalWater = FLOW_RATE_ML_PER_MINUTE * durationMinutes * DRIPPERS_PER_POT * POT_COUNT;
    const todayTotal = getTodayTotalWater?.() ?? 0;

    logger.info(`📏 [${phase}] Berechnet:`);
    logger.info(`  • ${minutesKey} = ${durationMinutes} Min`);
    logger.info(`  • Dauer: ${durationSeconds} Sek. (${durationMinutes.toFixed(2)} Min)`);
    logger.info(`  • Tropfer: ${DRIPPERS_PER_POT} pro Topf, Töpfe: ${POT_COUNT}`);
    logger.info(`  • Durchflussrate: ${FLOW_RATE_ML_PER_MINUTE} ml/min`);
    logger.info(`  • Geplantes Volumen: ${totalWater.toFixed(1)} ml`);
    logger.info(`  • Heute bereits gegossen: ${todayTotal} ml`);
    logger.info(`  • Tageslimit: ${MAX_DAILY_WATER_VOLUME_ML} ml`);

    if (MAX_DAILY_WATER_VOLUME_ML && (todayTotal + totalWater > MAX_DAILY_WATER_VOLUME_ML)) {
      logger.warn(`🚫 [${phase}] Tageslimit überschritten: ${(todayTotal + totalWater).toFixed(1)} ml > ${MAX_DAILY_WATER_VOLUME_ML} ml.`);
      return;
    }

    logger.info(`💧 [${phase}] Starte Bewässerung mit ${totalWater.toFixed(1)} ml (${durationMinutes.toFixed(2)} Min).`);
    await sendTelegramMessage(`💧 [${phase}] Gießung gestartet: ${totalWater.toFixed(1)} ml (${durationMinutes.toFixed(2)} Min).`);

    await triggerShellyMineral(durationSeconds);
    logger.debug(`⚙️ [${phase}] Shelly aktiviert – Warte ${durationSeconds} Sekunden...`);
    await new Promise(r => setTimeout(r, durationSeconds * 1000));

    const after = await fetchMoisture();
    logger.info(`✅ [${phase}] Gießung abgeschlossen. Letzter Feuchtigkeitswert (evtl. veraltet): ${after}%`);
    await sendTelegramMessage(`✅ [${phase}] Gießung abgeschlossen: ${totalWater.toFixed(1)} ml.\n⚠️ Feuchtigkeit (${after} %) stammt evtl. von vor der Gießung.`);

    incrementDayWatering(totalWater);
    setLastTriggerTime(phase, new Date());
    saveState();

  } catch (err) {
    logger.error(`❌ [${phase}] Fehler während der Bewässerung: ${err.message}`);
  } finally {
    global.busy = false;
  }
}
