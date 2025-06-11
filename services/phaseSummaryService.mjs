import { sendTelegramMessage } from './telegramService.mjs';
import { getTodayTotalWater, getTodayWaterCount } from './statsService.mjs';
import { fetchMoisture } from './sensorService.mjs'; // deinen Sensor-Fetch anpassen
import logger from '../helper/logger.mjs';

export async function sendPhaseSummary(phase, endHour) {
  const now = new Date();
  if (now.getHours() !== endHour || now.getMinutes() !== 0) return; // nur exakt zur vollen Endstunde

  const volume = getTodayTotalWater();     // z. B. 6228 ml
  const count = getTodayWaterCount();      // z. B. 2
  const moisture = await fetchMoisture();  // letzter Wert (ggf. Sensor-ID mitgeben)

  const msg = `📊 [${phase}] Phasenergebnis:
• Gießzyklen: ${count}
• Gesamtvolumen: ${volume} ml
• Letzter Feuchtigkeitswert: ${moisture} %`;

  await sendTelegramMessage(msg);
  logger.info(`[${phase}] 📊 Tageszusammenfassung gesendet.`);
}
