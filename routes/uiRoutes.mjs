// routes/uiRoutes.mjs
import express from 'express';
import fs from 'fs';
import config from '../helper/config.mjs';
import logger from '../helper/logger.mjs';

const router = express.Router();

function readEnv() {
  if (!fs.existsSync('.env')) {
    logger.warn('.env Datei nicht gefunden.');
    return {};
  }

  const env = Object.fromEntries(
    fs.readFileSync('.env', 'utf8')
      .split('\n')
      .filter(l => l.trim() && !l.trim().startsWith('#'))
      .map(l => l.split('=').map(s => s.trim()))
  );

  logger.debug('🖥️ Konfigurations-UI geladen');
  return env;
}

const felder = [
  {
    title: '🌱 Allgemeine Einstellungen',
    fields: [
      ['NIGHT_START_HOUR', 'Nacht Start (h)', 'number'],
      ['NIGHT_END_HOUR', 'Nacht Ende (h)', 'number'],
      ['CHECK_INTERVAL_MINUTES', 'Prüf-Intervall (Min)', 'number'],
      ['LEAF_TEMP_DIFF', 'Delta Blatt-Temperatur', 'number'],
      ['MOISTURE_SAVE_INTERVAL_MS', 'Speicherintervall (Sek)', 'number'],
      ['MOISTURE_SUMMARY_INTERVAL_MINUTES', 'Zusammenfassung (Min)', 'number']
    ]
  },

  {
    title: '🌿 Organischer Modus',
    fields: [
      ['MOISTURE_THRESHOLD', 'Feuchtigkeitsgrenzwert (%)', 'number'],
      ['TARGET_MOISTURE_AFTER_WATERING', 'Ziel-Feuchte Biologisch', 'number'],
      ['COOLDOWN_AFTER_WATER_MINUTES', 'Cooldown (Min)', 'number'],
      ['WAIT_AFTER_WATER_MINUTES', 'Wartezeit nach Gießen (Min)', 'number'],
      ['TIMER', 'Tropfzeit', 'timer']
    ]
  },
  {
    title: '🧪 Mineralischer Modus',
    fields: [
      ['POT_COUNT', 'Anzahl Töpfe', 'number'],
      ['DRIPPERS_PER_POT', 'Tropfer pro Topf', 'number'],
      ['FLOW_RATE_ML_PER_MINUTE', 'Durchflussrate (ml/min)', 'number'],
      ['MAX_DAILY_WATER_VOLUME_ML', 'Tägliches Limit (ml)', 'number']
    ]
  },
 

  {
    title: '📨 Telegram',
    fields: [
      ['TELEGRAM_CHAT_ID', 'Telegram Chat ID', 'text'],
      ['TELEGRAM_BOT_TOKEN', 'Telegram Bot Token', 'text']
    ]
  },
  {
    title: '⚙️ System & Zugang',
    fields: [
      ['MAX_DATA_AGE_MINUTES', 'Max. Datenalter (Min)', 'number'],
      ['SHELLY_IP', 'Lokale Shelly-IP', 'text'],
      ['ACCESS_TOKEN', 'FYTA API-Token', 'text'],
      ['UI_USERNAME', 'Benutzername', 'text'],
      ['UI_PASSWORD', 'Passwort', 'password'],
      ['DEBUG', 'Debug-Modus', 'checkbox']
    ]
  }
];

router.get('/', (req, res) => {
  const cfg = readEnv();

  // Organisch
  const totalSec = Math.round(parseFloat(cfg.SHELLY_TIMER_MINUTES || 0) * 60);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  // Mineralisch
  const mineralSec = Math.round(parseFloat(cfg.SHELLY_TIMER_MINUTES_MINERAL || 0) * 60);
  const hm = Math.floor(mineralSec / 3600);
  const mm = Math.floor((mineralSec % 3600) / 60);
  const sm = mineralSec % 60;

  // Crop-Steering P1
const hm_p1 = parseInt(cfg.SHELLY_TIMER_MINERAL_P1_HOURS || 0);
const mm_p1 = parseInt(cfg.SHELLY_TIMER_MINERAL_P1_MINUTES_RAW || 0);
const sm_p1 = parseInt(cfg.SHELLY_TIMER_MINERAL_P1_SECONDS || 0);

const hm_p2 = parseInt(cfg.SHELLY_TIMER_MINERAL_P2_HOURS || 0);
const mm_p2 = parseInt(cfg.SHELLY_TIMER_MINERAL_P2_MINUTES_RAW || 0);
const sm_p2 = parseInt(cfg.SHELLY_TIMER_MINERAL_P2_SECONDS || 0);

const hm_p3 = parseInt(cfg.SHELLY_TIMER_MINERAL_P3_HOURS || 0);
const mm_p3 = parseInt(cfg.SHELLY_TIMER_MINERAL_P3_MINUTES_RAW || 0);
const sm_p3 = parseInt(cfg.SHELLY_TIMER_MINERAL_P3_SECONDS || 0);


  const saveIntervalSec = config.MOISTURE_SAVE_INTERVAL_MS / 1000;

  res.render('ui', {
    cfg,
    saveIntervalSec,
    h, m, s,
    hm, mm, sm,
    hm_p1, mm_p1, sm_p1,
    hm_p2, mm_p2, sm_p2,
    hm_p3, mm_p3, sm_p3,
    felder
  });
});


export default router;
