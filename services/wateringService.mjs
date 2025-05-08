import { sendTelegramMessage } from './telegramService.mjs';
import { incrementDayWater } from './statsService.mjs';
import { incrementNightWater } from './statsService.mjs';
import logger from '../helper/logger.mjs';

export async function checkAndWater({
  fetchMoisture, triggerShelly, logger,
  MOISTURE_THRESHOLD, TARGET_MOISTURE_AFTER_WATERING,
  COOLDOWN_AFTER_WATER_MINUTES, WAIT_AFTER_WATER_MINUTES,
  NIGHT_START_HOUR, NIGHT_END_HOUR,
  saveState, isNightTime,
  getLastTriggerTime, setLastTriggerTime
}) {
  if (global.busy) return;
  global.busy = true;

  try {
    const lastTriggerTime = getLastTriggerTime();
    
    // Nachtmodus: Wenn es Nacht ist, überspringe die normale Logik und prüfe die Nachtlogik
    if (isNightTime(NIGHT_START_HOUR, NIGHT_END_HOUR)) {
      logger.info(`🌙 Nachtmodus aktiviert: Prüfe, ob Gießen erforderlich ist...`);
      
      let moisture = await fetchMoisture();
      logger.info(`💧 Boden-Feuchtigkeit in der Nacht: ${moisture}%`);
      
      // Gieße, wenn die Feuchtigkeit unter 40% fällt und maximal 2 Zyklen durchführen
      if (moisture < 40) {
        logger.warn(`💧❗️ Nachtmodus: Boden-Feuchtigkeit unter 40% – Bewässerung startet 🌙`);

        let attempts = 0;
        const maxAttempts = 2; // Maximal 2 Zyklen
        while (moisture < TARGET_MOISTURE_AFTER_WATERING && attempts < maxAttempts) {
          attempts++;
          await triggerShelly(); // Gießen auslösen
          logger.info(`⏳ Warte 2 Minuten (Zyklus ${attempts})`);
          
          await new Promise(r => setTimeout(r, 2 * 60000)); // 2 Minuten warten

          moisture = await fetchMoisture(); // Feuchtigkeit nach Gießen neu prüfen
          logger.info(`🔁 Versuch ${attempts}: Boden-Feuchtigkeit nach Gießen: ${moisture}%`);

          if (moisture >= TARGET_MOISTURE_AFTER_WATERING) {
            logger.info(`🏁 Ziel erreicht: ${moisture}%`);
            await sendTelegramMessage(`✅ Nacht-Gießen beendet, Ziel erreicht: ${moisture}%.`);
            break;
          }
        }

        if (moisture < TARGET_MOISTURE_AFTER_WATERING) {
          logger.error(`🏁❌ Ziel nicht erreicht nach ${attempts} Versuchen`);
          await sendTelegramMessage(`⚠️ Nacht-Gießen beendet. Ziel nicht erreicht. Letzter Wert: ${moisture}%.`);
          incrementNightWater;
        }
        
        // Nach der Nachtbewässerung speichern und den letzten Gießzeitpunkt setzen
        setLastTriggerTime(new Date());
        saveState();
        return;
      }
      logger.info('🌙 Nachtmodus: Boden-Feuchtigkeit ausreichend, kein Gießen notwendig.');
      return;
    }

    // Der normale Ablauf tagsüber
    if (lastTriggerTime && Date.now() - lastTriggerTime.getTime() < COOLDOWN_AFTER_WATER_MINUTES * 60000) {
      const left = Math.ceil((COOLDOWN_AFTER_WATER_MINUTES * 60000 - (Date.now() - lastTriggerTime.getTime())) / 60000);
      logger.info(`⏳ Cooldown aktiv – nächste Prüfung in ${left} Min`);
      return;
    }

    let moisture = await fetchMoisture();
    logger.info(`💧 Boden-Feuchtigkeit: ${moisture}%`);
    if (moisture >= MOISTURE_THRESHOLD) {
      logger.info('💧❗️ Ausreichend feucht – kein Gießen ❌💧');
      return;
    }

    logger.warn(`💧❗️ Unter ${MOISTURE_THRESHOLD}% – Bewässerung startet 💧✔`);
    await sendTelegramMessage(`💧 Bewässerung gestartet! Boden-Feuchtigkeit war zu niedrig.`);
    let attempts = 0;
    const maxAttempts = 5;
    while (moisture < TARGET_MOISTURE_AFTER_WATERING && attempts < maxAttempts) {
      attempts++;
      await triggerShelly();
      logger.info(`⏳ Warte ${WAIT_AFTER_WATER_MINUTES} Min`);
      await new Promise(r => setTimeout(r, WAIT_AFTER_WATER_MINUTES * 60000));
      moisture = await fetchMoisture();
      logger.info(`🔁 Versuch ${attempts}: ${moisture}%`);
    }

    if (moisture >= TARGET_MOISTURE_AFTER_WATERING) {
      logger.info(`🏁 Ziel erreicht (${moisture}%)`);
      await sendTelegramMessage(`✅ Ziel erreicht: ${moisture}%. Bewässerung beendet.`);
      incrementDayWater();
      setLastTriggerTime(new Date());
      saveState();
    } else {
      logger.error(`🏁❌ Ziel nicht erreicht nach ${attempts} Versuchen`);
      await sendTelegramMessage(`⚠️ Ziel nicht erreicht. Letzter Wert: ${moisture}%.`);
    }

  } catch (err) {
    logger.error(`❌ Fehler: ${err.message}`);
  } finally {
    global.busy = false;
  }
}
