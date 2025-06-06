import dotenv from 'dotenv';
import Joi from 'joi';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Leere Strings in undefined wandeln
for (const key in process.env) {
  if (process.env[key] === '') {
    process.env[key] = undefined;
  }
}

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
  SHELLY_TIMER_MINUTES_MINERAL: Joi.number().min(0).default(5), // 🆕 hinzugefügt
  WAIT_AFTER_WATER_MINUTES: Joi.number().min(0).default(8),
  DEBUG: Joi.boolean().truthy('true').falsy('false').falsy('').default(false),
  UI_USERNAME: Joi.string().default('admin'),
  UI_PASSWORD: Joi.string().default('change_me'),
  MOISTURE_SAVE_INTERVAL_MS: Joi.number().min(1000).default(60000),
  PORT: Joi.number().default(3500),
  TELEGRAM_BOT_TOKEN: Joi.string().required(),
  TELEGRAM_CHAT_ID: Joi.string().required(),
  LEAF_TEMP_DIFF: Joi.number().min(-20).max(20).default(-2),

  // Optional für Zyklussteuerung etc.
  initialOffset: Joi.number().optional(),
  minOnDuration: Joi.number().optional(),
  maxOnDuration: Joi.number().optional(),
  minOffDuration: Joi.number().optional(),
  maxOffDuration: Joi.number().optional(),
  simultaneousCycleInterval: Joi.number().optional(),

  // 🧪 Mineral-Modus
  POT_COUNT: Joi.number().min(1).default(5),
  DRIPPERS_PER_POT: Joi.number().min(1).default(6),
  FLOW_RATE_ML_PER_MINUTE: Joi.number().min(0.1).default(60),
  WATERING_DURATION_MINUTES: Joi.number().min(0.1).default(1),
  MIN_TIME_BETWEEN_CYCLES_MIN: Joi.number().min(1).default(30),
  MAX_DAILY_WATER_VOLUME_ML: Joi.number().min(0).default(6000),
  MAX_MOISTURE_MINERAL: Joi.number().min(0).max(100).default(60),

  // 🌱 Modus-Umschaltung
  WATERING_MODE: Joi.string().valid('organisch', 'mineralisch').default('organisch')
}).unknown();

const { error, value: config } = schema.validate(process.env, {
  abortEarly: false,
  convert: true
});

if (error) {
  console.error('❌ Fehler beim Laden der .env-Datei:');
  console.error(error.details.map(d => '– ' + d.message).join('\n'));
  process.exit(1);
}

console.log('[DEBUG] config geladen:', config.UI_USERNAME);
export default config;
