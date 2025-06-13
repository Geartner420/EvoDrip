// config.mjs
import dotenv from 'dotenv';
import Joi from 'joi';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Leere Strings als undefined behandeln
for (const key in process.env) {
  if (process.env[key] === '') {
    process.env[key] = undefined;
  }
}

// Schema-Definition
const schema = Joi.object({
  // 🔐 Allgemeines
  ACCESS_TOKEN: Joi.string().required(),
  SHELLY_IP: Joi.string().ip({ version: ['ipv4'] }).required(),
  DEBUG: Joi.boolean().truthy('true').falsy('false').falsy('').default(false),

  // 💧 Feuchtigkeitskontrolle (organisch)
  MOISTURE_THRESHOLD: Joi.number().min(0).max(100).required(),
  TARGET_MOISTURE_AFTER_WATERING: Joi.number().min(0).max(100).default(60),
  CHECK_INTERVAL_MINUTES: Joi.number().min(1).default(5),
  COOLDOWN_AFTER_WATER_MINUTES: Joi.number().min(0).default(60),
  WAIT_AFTER_WATER_MINUTES: Joi.number().min(0).default(8),
  NIGHT_START_HOUR: Joi.number().min(0).max(23).default(22),
  NIGHT_END_HOUR: Joi.number().min(0).max(23).default(6),
  MAX_DATA_AGE_MINUTES: Joi.number().min(1).default(60),
  MOISTURE_SAVE_INTERVAL_MS: Joi.number().min(1000).default(60000),
  MOISTURE_SUMMARY_INTERVAL_MINUTES: Joi.number().min(1).default(60),

  // 🌡️ UI & Kommunikation
  UI_USERNAME: Joi.string().default('admin'),
  UI_PASSWORD: Joi.string().default('change_me'),
  TELEGRAM_BOT_TOKEN: Joi.string().required(),
  TELEGRAM_CHAT_ID: Joi.string().required(),
  PORT: Joi.number().default(3500),
  LEAF_TEMP_DIFF: Joi.number().min(-20).max(20).default(-2),

  // 🌱 Modus
  WATERING_MODE: Joi.string().valid('organisch', 'mineralisch').default('organisch'),

  // ⚙️ Gemeinsame mineralische Parameter
  POT_COUNT: Joi.number().min(1).default(5),
  DRIPPERS_PER_POT: Joi.number().min(1).default(6),
  FLOW_RATE_ML_PER_MINUTE: Joi.number().min(0.1).default(60),
  MAX_DAILY_WATER_VOLUME_ML: Joi.number().min(0).default(7500),
  MIN_TIME_BETWEEN_CYCLES_MIN: Joi.number().min(0).default(30),
  MAX_MOISTURE_MINERAL: Joi.number().min(0).max(100).default(60),

  // ⏱ Shelly Timer (organisch)
  SHELLY_TIMER_HOURS: Joi.number().min(0).default(0),
  SHELLY_TIMER_MINUTES: Joi.number().min(0).default(5),
  SHELLY_TIMER_SECONDS: Joi.number().min(0).default(0),

  // 🧠 Crop-Steering Phasen P1–P3
  ...['P1', 'P2', 'P3'].reduce((acc, phase) => ({
    ...acc,
    [`${phase}_ENABLED`]: Joi.boolean().truthy('true').falsy('false').default(false),
    [`${phase}_START_HOUR`]: Joi.number().min(0).max(23).required(),
    [`${phase}_END_HOUR`]: Joi.number().min(0).max(23).required(),
    [`${phase}_MIN_MOISTURE`]: Joi.number().min(0).max(100).required(),
    [`${phase}_MAX_MOISTURE`]: Joi.number().min(0).max(100).required(),
    [`${phase}_MIN_TIME_BETWEEN_CYCLES_MIN`]: Joi.number().min(0).default(60),
    [`SHELLY_TIMER_MINERAL_${phase}_MINUTES`]: Joi.number().min(0).required(),
    [`SHELLY_TIMER_MINERAL_${phase}_HOURS`]: Joi.number().min(0).default(0),
    [`SHELLY_TIMER_MINERAL_${phase}_SECONDS`]: Joi.number().min(0).default(0),
    [`SHELLY_TIMER_MINERAL_${phase}_MINUTES_RAW`]: Joi.number().min(0).default(0)
  }), {})
}).unknown(); // ← erlaubt zusätzliche Keys für spätere Erweiterung

// Validierung
const { error, value: config } = schema.validate(process.env, {
  abortEarly: false,
  convert: true
});

if (error) {
  console.error('❌ Fehler beim Laden der .env-Datei:');
  console.error(error.details.map(d => '– ' + d.message).join('\n'));
  process.exit(1);
}

export default config;
