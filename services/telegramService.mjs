// services/telegramService.mjs
import fetch from 'node-fetch';
import config from '../helper/config.mjs';
import logger from '../helper/logger.mjs';

export async function sendTelegramMessage(text) {
  const url = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id: config.TELEGRAM_CHAT_ID,
    text,
    parse_mode: 'Markdown'
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.description);
    logger.info(`📨 Telegram gesendet: ${text}`);
  } catch (err) {
    logger.error(`❌ Telegram-Fehler: ${err.message}`);
  }
}
/*
async function getUpdates() {
  const url = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/getUpdates`;
  const res = await fetch(url);
  const json = await res.json();
  console.log('🔎 getUpdates Antwort:\n', JSON.stringify(json, null, 2));
}

getUpdates();

sendTelegramMessage('🔔 Test vom Telegram-Service').then(() => {
  console.log('✅ Testnachricht wurde abgeschickt (wenn alles korrekt war).');
});
*/
