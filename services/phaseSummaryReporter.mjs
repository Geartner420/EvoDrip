// services/phaseSummaryReporter.mjs
import { getDayData, resetDayData } from './stateService.mjs';
import { sendTelegramMessage } from './telegramService.mjs';
import logger from '../helper/logger.mjs';

export async function sendPhaseSummary(phase) {
  const { count, totalWater, moistureReadings } = getDayData(phase);

  if (count === 0 && moistureReadings.length === 0) {
    logger.info(`ℹ️ [${phase}] Keine Tagesdaten für Zusammenfassung.`);
    return;
  }

  const min = Math.min(...moistureReadings);
  const max = Math.max(...moistureReadings);
  const avg = (moistureReadings.reduce((a, b) => a + b, 0) / moistureReadings.length).toFixed(1);
  const last = moistureReadings[moistureReadings.length - 1];
  const date = new Date().toLocaleDateString('de-DE');

  const msg = `📊 [${phase}] Phasenbericht ${date}
• Gießzyklen: ${count}
• Gesamtvolumen: ${totalWater.toFixed(1)} ml
• Letzter Feuchtigkeitswert: ${last} %
• Feuchtigkeit min/max: ${min} % / ${max} %
• Durchschnittliche Feuchtigkeit: ${avg} %`;

  logger.info(`📬 [${phase}] Sende Tagesbericht:\n${msg}`);
  await sendTelegramMessage(msg);

  resetDayData(phase);
}
