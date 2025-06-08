import { sendTelegramMessage } from './telegramService.mjs';
import { incrementDayWatering } from './statsService.mjs';
import logger from '../helper/logger.mjs';

/**
 * Führt eine Crop-Steering-Bewässerung für eine Phase (P1, P2, P3) durch
 * @param {Object} options - Enthält alle nötigen Funktionen und Einstellungen
 */
export async function checkAndWaterMineralSubstrate({
  fetchMoisture,
  triggerShelly,
  getLastTriggerTime,
  setLastTriggerTime,
  getTodayTotalWater,
  saveState,
  phase,
  settings
}) {
  const phaseCfg = settings?.[phase];
  if (!phaseCfg?.ENABLED) {
    logger.debug(`[${phase}] Phase ist deaktiviert.`);
    return;
  }

  const {
    START_HOUR,
    END_HOUR,
    MIN_MOISTURE,      // <-- Untere Schwelle (z.B. 28)
    MAX_MOISTURE,      // <-- Obere Schwelle (z.B. 40)
    MIN_TIME_BETWEEN_CYCLES_MIN,
    MAX_DAILY_WATER_VOLUME_ML,
    FLOW_RATE_ML_PER_MINUTE,
    DRIPPERS_PER_POT,
    POT_COUNT
  } = phaseCfg;

  const now = new Date();
  const hour = now.getHours();

  // Zeitfensterprüfung
  if (hour < START_HOUR || hour >= END_HOUR) {
    logger.debug(`🕒 [${phase}] Liegt außerhalb des Bewässerungszeitfensters.`);
    return;
  }

  // Verhindere Parallelzugriffe
  if (global.busy) return;
  global.busy = true;

  try {
    // Mindestabstand seit letzter Gießung
    const last = getLastTriggerTime(phase);
    if (last && Date.now() - last.getTime() < MIN_TIME_BETWEEN_CYCLES_MIN * 60_000) {
      logger.debug(`⏳ [${phase}] Mindestabstand noch nicht erreicht.`);
      return;
    }

    const moisture = await fetchMoisture();
    logger.info(`🌡 [${phase}] Feuchtigkeit: ${moisture}%`);

    // NEU: MIN_MOISTURE-Check
    if (moisture > MIN_MOISTURE) {
      logger.info(`💧 [${phase}] Noch ausreichend feucht (${moisture}% > ${MIN_MOISTURE}%) – keine Aktion.`);
      return;
    }

    // Optional: MAX_MOISTURE-Notbremse (z. B. Sensorfehler vermeiden)
    if (MAX_MOISTURE && moisture >= MAX_MOISTURE) {
      logger.info(`💧 [${phase}] Substrat zu feucht – keine Aktion.`);
      return;
    }

    const durationSeconds =
      (parseInt(settings?.[`${phase}_HOURS`] ?? 0) * 3600) +
      (parseInt(settings?.[`${phase}_MINUTES_RAW`] ?? 0) * 60) +
      (parseInt(settings?.[`${phase}_SECONDS`] ?? 0));

    const durationMinutes = durationSeconds / 60;
    const totalWater = FLOW_RATE_ML_PER_MINUTE * durationMinutes * DRIPPERS_PER_POT * POT_COUNT;
    const todayTotal = getTodayTotalWater?.() ?? 0;

    if (MAX_DAILY_WATER_VOLUME_ML && (todayTotal + totalWater > MAX_DAILY_WATER_VOLUME_ML)) {
      logger.warn(`🚫 [${phase}] Tageslimit überschritten.`);
      return;
    }

    logger.info(`💧 [${phase}] Starte Bewässerung mit ${totalWater} ml (${durationMinutes.toFixed(2)} min)`);
    await sendTelegramMessage(`💧 [${phase}] Gießung: ${totalWater} ml (${durationMinutes.toFixed(2)} min)`);

    await triggerShelly();
    await new Promise(r => setTimeout(r, durationSeconds * 1000));

    const after = await fetchMoisture();
    logger.info(`✅ [${phase}] Neue Feuchtigkeit: ${after}%`);
    await sendTelegramMessage(`✅ [${phase}] beendet. Neue Feuchte: ${after}%`);

    incrementDayWatering(totalWater);
    setLastTriggerTime(phase, new Date());
    saveState();

  } catch (err) {
    logger.error(`❌ [${phase}] Fehler: ${err.message}`);
  } finally {
    global.busy = false;
  }
}
