// wateringMineralService.mjs
import { sendTelegramMessage } from './telegramService.mjs';
import { incrementDayWatering } from './statsService.mjs'; // Muss implementiert sein: Summiert die Tageswassermenge!
import logger from '../helper/logger.mjs';


export async function checkAndWaterMineralSubstrate({
  fetchMoisture,
  triggerShelly,
  POT_COUNT,
  DRIPPERS_PER_POT,
  FLOW_RATE_ML_PER_MINUTE,
  WATERING_DURATION_MINUTES,
  MIN_TIME_BETWEEN_CYCLES_MIN,
  MAX_DAILY_WATER_VOLUME_ML,
  MAX_MOISTURE,
  getLastTriggerTime,
  setLastTriggerTime,
  getTodayTotalWater,
  saveState
}) {
  // Verhindert parallele Gießvorgänge
  if (global.busy) return;
  global.busy = true;

  try {
    // Zeitfenster prüfen
    const now = new Date();
    const hour = now.getHours();
    if (isNightTime(NIGHT_START_HOUR, NIGHT_END_HOUR)) {
    logger.debug("🌙 Nachtzeit erkannt – keine Bewässerung.");
    return;
    }


    // Mindestabstand seit letzter Bewässerung
    const last = getLastTriggerTime();
    if (last && Date.now() - last.getTime() < MIN_TIME_BETWEEN_CYCLES_MIN * 60_000) {
      logger.debug("⏳ Mindestpause zwischen Gaben noch aktiv.");
      return;
    }

    // Feuchte messen
    let moisture = await fetchMoisture();
    logger.info(`🌡 Aktuelle Feuchtigkeit: ${moisture}%`);

    // Wenn Substrat bereits ausreichend feucht, keine Aktion
    if (moisture >= MAX_MOISTURE) {
      logger.info("💧 Substrat ist ausreichend feucht, keine Gabe nötig.");
      return;
    }

    // Wassermenge berechnen (ml)
    const waterPerDripper = FLOW_RATE_ML_PER_MINUTE * WATERING_DURATION_MINUTES;
    const totalWater = waterPerDripper * DRIPPERS_PER_POT * POT_COUNT;

    // Tageslimit prüfen
    const dailyTotal = getTodayTotalWater?.() ?? 0;
    if (
      MAX_DAILY_WATER_VOLUME_ML &&
      (dailyTotal + totalWater > MAX_DAILY_WATER_VOLUME_ML)
    ) {
      logger.warn("🚫 Tageslimit erreicht – kein weiterer Gießzyklus.");
      return;
    }

    // Telegram- und Log-Ausgabe, Start
    logger.warn(`💧 Gieße ${totalWater} ml (⏳ ${WATERING_DURATION_MINUTES} Min) für mineralisches Substrat`);
    await sendTelegramMessage(
      `💧 Mineral-Gießung gestartet: ${totalWater} ml (${WATERING_DURATION_MINUTES} min, Feuchte: ${moisture}%)`
    );

    // Bewässerung auslösen
    const totalSeconds =
    SHELLY_TIMER_MINERAL_HOURS * 3600 +
    SHELLY_TIMER_MINERAL_MINUTES * 60 +
    SHELLY_TIMER_MINERAL_SECONDS;

    const wateringDurationMs = totalSeconds * 1000;

// Bewässerung auslösen
    await triggerShelly();
    await new Promise(r => setTimeout(r, wateringDurationMs));
        logger.info(`⏳ Bewässerung für ${WATERING_DURATION_MINUTES} Minuten gestartet...`);

    // Nach der Gabe Feuchte messen und loggen
    const afterMoisture = await fetchMoisture();
    logger.info(`🌡 Neue Feuchtigkeit: ${afterMoisture}%`);
    await sendTelegramMessage(
      `✅ Mineral-Gießung beendet. Neue Feuchtigkeit: ${afterMoisture}%.`
    );

    // Tageszähler hochzählen, Zeitstempel speichern, Systemzustand sichern
    incrementDayWatering(totalWater);
    setLastTriggerTime(new Date());
    saveState();

  } catch (err) {
    logger.error(`❌ Fehler bei mineralischem Gießmodus: ${err.message}`);
  } finally {
    global.busy = false; // Gieß-Flag wieder freigeben
  }
}

// Dieses Modul enthält die Kernlogik für die mineralische Tropfbewässerung.
// Es prüft Feuchte, Zeitabstände, Tageslimit und führt die Steuerung samt Logging und Telegram-Alarmierung aus.
// Die Funktion wird am besten von einem externen Scheduler/Timer regelmäßig aufgerufen.
// Sie ist so gestaltet, dass sie nicht blockiert und parallele Aufrufe verhindert.
// Die Parameter sollten aus der Konfiguration geladen werden, um Flexibilität zu gewährleisten.