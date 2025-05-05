import dotenv from 'dotenv';
import Joi from 'joi';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Leere Strings in process.env auf undefined setzen
for (const key in process.env) {
  if (process.env[key] === '') {
    process.env[key] = undefined;
  }
}

// Joi-Schema für Umgebungsvariablen definieren
const schema = Joi.object({
  ACCESS_TOKEN: Joi.string().required(),
  SHELLY_IP: Joi.string().ip({ version: ['ipv4'] }).required(),
  MOISTURE_THRESHOLD: Joi.number().min(0).max(100).required(),
  TARGET_MOISTURE_AFTER_WATERING: Joi.number().min(0).max(100).default(60),
  CHECK_INTERVAL_MINUTES: Joi.number().min(1).default(5),
  COOLDOWN_AFTER_WATER_MINUTES: Joi.number().min(0).default(60),
  NIGHT_START_HOUR: Joi.number().min(0).max(23).default(22),
  NIGHT_END_HOUR: Joi.number().min(0).max(23).default(6),
  MAX_DATA_AGE_MINUTES: Joi.number().min(1).default(60),
  SHELLY_TIMER_MINUTES: Joi.number().min(0).default(5),
  WAIT_AFTER_WATER_MINUTES: Joi.number().min(0).default(8),
  DEBUG: Joi.boolean().truthy('true').falsy('false').falsy('').default(false),
  UI_USERNAME: Joi.string().default('admin'),
  UI_PASSWORD: Joi.string().default('change_me'),
  MOISTURE_SAVE_INTERVAL_MS: Joi.number().min(1000).default(60000),
  PORT: Joi.number().default(3500),
  TELEGRAM_BOT_TOKEN: Joi.string().required(),       
  TELEGRAM_CHAT_ID: Joi.string().required(),
  LEAF_TEMP_DIFF: Joi.number().min(-20).max(20).default(-2),
}).unknown();

// Validierung der Umgebungsvariablen
const { error, value: config } = schema.validate(process.env, {
  abortEarly: false, // Alle Fehler anzeigen, nicht nur den ersten
  convert: true // Variablen werden in den entsprechenden Typ konvertiert (z. B. String -> Number)
});

// Fehlerbehandlung
if (error) {
  console.error('❌ Fehler beim Laden der .env-Datei:');
  console.error(error.details.map(d => '– ' + d.message).join('\n'));
  process.exit(1); // Bei Fehlern das Skript stoppen
}

// Debug-Ausgabe der geladenen Konfiguration
console.log('[DEBUG] config geladen:', config.UI_USERNAME); 

// Konfiguration exportieren
export default config;
