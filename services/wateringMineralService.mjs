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

/**
 * Führt die Gießlogik für eine Steuerungsphase (P1–P3) aus.
 * Wenn Feuchtigkeit unter MIN liegt, wird bewässert.
 * Nach dem Gießen erfolgt keine erneute Feuchtigkeitsmessung.
 */
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
    logger.debug(`[${phase}] ⚠️ Phase deaktiviert.`);
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
    POT_COUNT,
    WATERING_DURATION_MINUTES,
    MAX_DAILY_WATER_VOLUME_ML
  } = phaseCfg;

  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  // 📊 Automatischer Tagesbericht um END_HOUR:00
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

  // 🕒 Phase aktiv? (Uhrzeit im gültigen Bereich)
  if (hour < START_HOUR || hour >= END_HOUR) {
    logger.debug(`🕒 [${phase}] Nicht im Zeitfenster (${hour} Uhr nicht zwischen ${START_HOUR}–${END_HOUR}).`);
    return;
  }

  // ⛔ Schutz: parallele Gießung verhindern
  if (global.busy) {
    logger.debug(`⏳ [${phase}] Bereits aktive Gießung – Abbruch.`);
    return;
  }

  global.busy = true;

  try {
    // 🔁 Mindestabstand zur letzten Gießung prüfen
    const last = getLastTriggerTime(phase);
    if (last) {
      const diffMin = (Date.now() - last.getTime()) / 60000;
      if (diffMin < MIN_TIME_BETWEEN_CYCLES_MIN) {
        logger.debug(`⏳ [${phase}] Mindestabstand nicht erreicht (${diffMin.toFixed(1)} < ${MIN_TIME_BETWEEN_CYCLES_MIN} Min).`);
        return;
      }
    }

    // 💧 Aktuelle Bodenfeuchtigkeit lesen
    const moisture = await fetchMoisture();
    logger.info(`🌡 [${phase}] Aktuelle Feuchtigkeit: ${moisture}%`);

    // ✅ Zielbereich bereits erreicht → nichts tun
    if (moisture >= MAX_MOISTURE) {
      logger.info(`🟢 [${phase}] Keine Aktion: Feuchtigkeit ≥ ${MAX_MOISTURE}%`);
      return;
    }

    // 🟡 Zwischenbereich → noch kein Gießbedarf
    if (moisture > MIN_MOISTURE) {
      logger.info(`💧 [${phase}] Kein Gießbedarf (${moisture}% liegt zwischen ${MIN_MOISTURE}% und ${MAX_MOISTURE}%).`);
      return;
    }

    // 🔥 Feuchtigkeit ≤ MIN → Gießen!
    logger.info(`💧 [${phase}] Untergrenze erreicht (${moisture}% ≤ ${MIN_MOISTURE}%) – starte Gießung.`);

    const durationMinutes = WATERING_DURATION_MINUTES;
    if (!durationMinutes || durationMinutes <= 0) {
      logger.warn(`⚠️ [${phase}] Ungültige Gießdauer: ${durationMinutes} Minuten`);
      return;
    }

    const durationSeconds = Math.round(durationMinutes * 60);
    const volume = FLOW_RATE_ML_PER_MINUTE * durationMinutes * DRIPPERS_PER_POT * POT_COUNT;
    const todayTotal = getTodayTotalWater();

    logger.info(`📏 [${phase}] Gießung vorbereitet:
• Dauer: ${durationSeconds} s
• Tropfer: ${DRIPPERS_PER_POT} × Töpfe: ${POT_COUNT}
• Durchflussrate: ${FLOW_RATE_ML_PER_MINUTE} ml/min
• Volumen: ${volume.toFixed(1)} ml
• Heute bisher: ${todayTotal} ml
• Tageslimit: ${MAX_DAILY_WATER_VOLUME_ML} ml`);

    if (MAX_DAILY_WATER_VOLUME_ML && (todayTotal + volume > MAX_DAILY_WATER_VOLUME_ML)) {
      logger.warn(`🚫 [${phase}] Tageslimit überschritten: ${(todayTotal + volume).toFixed(1)} > ${MAX_DAILY_WATER_VOLUME_ML} ml`);
      return;
    }

    // 🚰 Gießung auslösen
    await sendTelegramMessage(`💧 [${phase}] Gießung gestartet: ${volume.toFixed(1)} ml (${durationMinutes.toFixed(2)} Min).`);
    await triggerShellyMineral(durationSeconds);
    logger.debug(`⚙️ [${phase}] Shelly läuft – warte ${durationSeconds} s...`);
    await new Promise(r => setTimeout(r, durationSeconds * 1000));

    // ⛔ KEINE NACHMESSUNG MEHR – bewusst weggelassen
    logger.info(`✅ [${phase}] Gießung abgeschlossen.`);
    await sendTelegramMessage(`✅ [${phase}] Gießung abgeschlossen: ${volume.toFixed(1)} ml.`);

    // 📊 Tageswerte aktualisieren
    incrementDayWatering(volume);
    setLastTriggerTime(phase, new Date());
    saveState();

  } catch (err) {
    logger.error(`❌ [${phase}] Fehler bei der Gießung: ${err.message}`);
  } finally {
    global.busy = false;
  }
}
