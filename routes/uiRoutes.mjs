import express from 'express';
import fs from 'fs';
import config from '../helper/config.mjs';

const router = express.Router();

function readEnv() {
  return Object.fromEntries(
    fs.readFileSync('.env', 'utf8').split('\n')
      .filter(l => l.trim() && !l.trim().startsWith('#'))
      .map(l => l.split('=').map(s => s.trim()))
  );
}

const felder = [
  ['MOISTURE_THRESHOLD', 'Feuchtigkeitsgrenzwert (%)', 'number'],
  ['NIGHT_START_HOUR', 'Nacht Start (h)', 'number'],
  ['TELEGRAM_CHAT_ID', 'Telegram Chat ID', 'text'],

  ['TARGET_MOISTURE_AFTER_WATERING', 'Ziel-Feuchtigkeit (%)', 'number'],
  ['NIGHT_END_HOUR', 'Nacht Ende (h)', 'number'],
  ['TELEGRAM_BOT_TOKEN', 'Telegram Bot Token', 'text'],

  ['COOLDOWN_AFTER_WATER_MINUTES', 'Cooldown (Min)', 'number'],
  ['ACCESS_TOKEN', 'FYTA API-Token', 'text'],
  ['MOISTURE_SAVE_INTERVAL_MS', 'Speicherintervall (Sek)', 'number'],

  ['MAX_DATA_AGE_MINUTES', 'Max. Datenalter (Min)', 'number'],
  ['SHELLY_IP', 'Lokale Shelly-IP', 'text'],
  ['CHECK_INTERVAL_MINUTES', 'Prüf-Intervall (Min)', 'number'],

  ['TIMER', 'Tropfzeit', 'timer'],
  ['UI_USERNAME', 'Benutzername', 'text'],
  ['MOISTURE_SUMMARY_INTERVAL_MINUTES', 'Zusammenfassung (Min)', 'number'],

  ['WAIT_AFTER_WATER_MINUTES', 'Wartezeit nach Gießen (Min)', 'number'],
  ['UI_PASSWORD', 'Passwort', 'password'],
  ['DEBUG', 'Debug-Modus', 'checkbox'],
];

router.get('/', (req, res) => {
  const cfg = readEnv();
  const totalSec = Math.round(parseFloat(cfg.SHELLY_TIMER_MINUTES) * 60);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const saveIntervalSec = config.MOISTURE_SAVE_INTERVAL_MS / 1000;

  res.render('ui', { cfg, saveIntervalSec, h, m, s, felder });
});

export default router;
