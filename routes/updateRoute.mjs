//updateRoute.mjs
import express from 'express';
import Joi from 'joi';
import { writeEnv, readEnv } from '../services/envService.mjs';
import logger from '../helper/logger.mjs';

const router = express.Router();

const envFields = [
  { key: 'WATERING_MODE', type: 'wateringmode', required: true },
  { key: 'ACCESS_TOKEN', type: 'string', required: true },
  { key: 'SHELLY_IP', type: 'ip', required: true },
  { key: 'MOISTURE_THRESHOLD', type: 'number', min: 0, max: 100, required: true },
  { key: 'TARGET_MOISTURE_AFTER_WATERING', type: 'number', min: 0, max: 100, required: true },
  { key: 'SHELLY_TIMER_HOURS', type: 'number', min: 0, required: true },
  { key: 'SHELLY_TIMER_MINUTES', type: 'number', min: 0, required: true },
  { key: 'SHELLY_TIMER_SECONDS', type: 'number', min: 0, required: true },
  { key: 'WAIT_AFTER_WATER_MINUTES', type: 'number', min: 0, required: true },
  { key: 'CHECK_INTERVAL_MINUTES', type: 'number', min: 1, required: true },
  { key: 'COOLDOWN_AFTER_WATER_MINUTES', type: 'number', min: 0, required: true },
  { key: 'NIGHT_START_HOUR', type: 'number', min: 0, max: 23, required: true },
  { key: 'NIGHT_END_HOUR', type: 'number', min: 0, max: 23, required: true },
  { key: 'MAX_DATA_AGE_MINUTES', type: 'number', min: 1, required: true },
  { key: 'MOISTURE_SAVE_INTERVAL_MS', type: 'number', min: 1, required: true },
  { key: 'MOISTURE_SUMMARY_INTERVAL_MINUTES', type: 'number', min: 1, required: true },
  { key: 'UI_USERNAME', type: 'string', required: true },
  { key: 'UI_PASSWORD', type: 'string', required: true },
  { key: 'DEBUG', type: 'boolean', required: false },
  { key: 'TELEGRAM_BOT_TOKEN', type: 'string', required: false },
  { key: 'TELEGRAM_CHAT_ID', type: 'string', required: false },
  { key: 'LEAF_TEMP_DIFF', type: 'number', min: -20, max: 20, required: false },

  // Mineral-Modus
  { key: 'POT_COUNT', type: 'number', min: 1, required: true },
  { key: 'DRIPPERS_PER_POT', type: 'number', min: 1, required: true },
  { key: 'FLOW_RATE_ML_PER_MINUTE', type: 'number', min: 0.1, required: true },
  { key: 'MAX_DAILY_WATER_VOLUME_ML', type: 'number', min: 0, required: true },

    // Crop-Steering Phase P1
  { key: 'P1_ENABLED', type: 'boolean', required: false },
  { key: 'P1_START_HOUR', type: 'number', min: 0, max: 23, required: true },
  { key: 'P1_END_HOUR', type: 'number', min: 0, max: 23, required: true },
  { key: 'P1_MAX_MOISTURE', type: 'number', min: 0, max: 100, required: true },
  { key: 'P1_MIN_TIME_BETWEEN_CYCLES_MIN', type: 'number', min: 1, required: true },
  { key: 'SHELLY_TIMER_MINERAL_P1_HOURS', type: 'number', min: 0, required: true },
  { key: 'SHELLY_TIMER_MINERAL_P1_MINUTES_RAW', type: 'number', min: 0, required: true },
  { key: 'SHELLY_TIMER_MINERAL_P1_SECONDS', type: 'number', min: 0, required: true },

  // Crop-Steering Phase P2
  { key: 'P2_ENABLED', type: 'boolean', required: false },
  { key: 'P2_START_HOUR', type: 'number', min: 0, max: 23, required: true },
  { key: 'P2_END_HOUR', type: 'number', min: 0, max: 23, required: true },
  { key: 'P2_MAX_MOISTURE', type: 'number', min: 0, max: 100, required: true },
  { key: 'P2_MIN_TIME_BETWEEN_CYCLES_MIN', type: 'number', min: 1, required: true },
  { key: 'SHELLY_TIMER_MINERAL_P2_HOURS', type: 'number', min: 0, required: true },
  { key: 'SHELLY_TIMER_MINERAL_P2_MINUTES_RAW', type: 'number', min: 0, required: true },
  { key: 'SHELLY_TIMER_MINERAL_P2_SECONDS', type: 'number', min: 0, required: true },

  // Crop-Steering Phase P3
  { key: 'P3_ENABLED', type: 'boolean', required: false },
  { key: 'P3_START_HOUR', type: 'number', min: 0, max: 23, required: true },
  { key: 'P3_END_HOUR', type: 'number', min: 0, max: 23, required: true },
  { key: 'P3_MAX_MOISTURE', type: 'number', min: 0, max: 100, required: true },
  { key: 'P3_MIN_TIME_BETWEEN_CYCLES_MIN', type: 'number', min: 1, required: true },
  { key: 'SHELLY_TIMER_MINERAL_P3_HOURS', type: 'number', min: 0, required: true },
  { key: 'SHELLY_TIMER_MINERAL_P3_MINUTES_RAW', type: 'number', min: 0, required: true },
  { key: 'SHELLY_TIMER_MINERAL_P3_SECONDS', type: 'number', min: 0, required: true },

];

function buildValidationSchema(fields) {
  const schema = {};

  for (const field of fields) {
    let rule;
    switch (field.type) {
      case 'string':
        rule = Joi.string();
        break;
      case 'number':
        rule = Joi.number();
        if (field.min !== undefined) rule = rule.min(field.min);
        if (field.max !== undefined) rule = rule.max(field.max);
        break;
      case 'boolean':
        rule = Joi.boolean().truthy('true').falsy('false').default(false);
        break;
      case 'ip':
        rule = Joi.string().ip({ version: ['ipv4'] });
        break;
      default:
        rule = Joi.any();
    }
    if (field.required) rule = rule.required();
    schema[field.key] = rule;
  }

  return Joi.object(schema);
}

router.post('/updateEnv', (req, res) => {
  logger.info('🛠 POST /updateEnv');

  const formSchema = buildValidationSchema(envFields);
  const { error, value } = formSchema.validate(req.body, { abortEarly: false, convert: true });

  if (error) {
    logger.error('❌ Joi Validation Error:', error.details);
    return res.status(400).send('Ungültige Eingaben:\n' + error.details.map(d => d.message).join('\n'));
  }

  // Timerberechnung für beide Modi
  const timerOrganischSecs = value.SHELLY_TIMER_HOURS * 3600 +
                             value.SHELLY_TIMER_MINUTES * 60 +
                             value.SHELLY_TIMER_SECONDS;

  const timerMineralSecs = value.SHELLY_TIMER_MINERAL_HOURS * 3600 +
                           value.SHELLY_TIMER_MINERAL_MINUTES * 60 +
                           value.SHELLY_TIMER_MINERAL_SECONDS;
                           // Tropfzeit für P1–P3 berechnen
  const timerP1Secs = value.SHELLY_TIMER_MINERAL_P1_HOURS * 3600 +
                      value.SHELLY_TIMER_MINERAL_P1_MINUTES_RAW * 60 +
                      value.SHELLY_TIMER_MINERAL_P1_SECONDS;

  const timerP2Secs = value.SHELLY_TIMER_MINERAL_P2_HOURS * 3600 +
                      value.SHELLY_TIMER_MINERAL_P2_MINUTES_RAW * 60 +
                      value.SHELLY_TIMER_MINERAL_P2_SECONDS;

  const timerP3Secs = value.SHELLY_TIMER_MINERAL_P3_HOURS * 3600 +
                      value.SHELLY_TIMER_MINERAL_P3_MINUTES_RAW * 60 +
                      value.SHELLY_TIMER_MINERAL_P3_SECONDS;


const updated = {
  ...value,

  // Organisch
  SHELLY_TIMER_MINUTES: (timerOrganischSecs / 60).toFixed(2),


  // P1
  SHELLY_TIMER_MINERAL_P1_MINUTES: (timerP1Secs / 60).toFixed(2),
  SHELLY_TIMER_MINERAL_P1_HOURS: value.SHELLY_TIMER_MINERAL_P1_HOURS,
  SHELLY_TIMER_MINERAL_P1_SECONDS: value.SHELLY_TIMER_MINERAL_P1_SECONDS,
  SHELLY_TIMER_MINERAL_P1_MINUTES_RAW: value.SHELLY_TIMER_MINERAL_P1_MINUTES_RAW,

  // P2
  SHELLY_TIMER_MINERAL_P2_MINUTES: (timerP2Secs / 60).toFixed(2),
  SHELLY_TIMER_MINERAL_P2_HOURS: value.SHELLY_TIMER_MINERAL_P2_HOURS,
  SHELLY_TIMER_MINERAL_P2_SECONDS: value.SHELLY_TIMER_MINERAL_P2_SECONDS,
  SHELLY_TIMER_MINERAL_P2_MINUTES_RAW: value.SHELLY_TIMER_MINERAL_P2_MINUTES_RAW,

  // P3
  SHELLY_TIMER_MINERAL_P3_MINUTES: (timerP3Secs / 60).toFixed(2),
  SHELLY_TIMER_MINERAL_P3_HOURS: value.SHELLY_TIMER_MINERAL_P3_HOURS,
  SHELLY_TIMER_MINERAL_P3_SECONDS: value.SHELLY_TIMER_MINERAL_P3_SECONDS,
  SHELLY_TIMER_MINERAL_P3_MINUTES_RAW: value.SHELLY_TIMER_MINERAL_P3_MINUTES_RAW,

  // Intervalle
  MOISTURE_SAVE_INTERVAL_MS: (parseInt(value.MOISTURE_SAVE_INTERVAL_MS) * 1000).toString(),
  MOISTURE_SUMMARY_INTERVAL_MINUTES: value.MOISTURE_SUMMARY_INTERVAL_MINUTES.toString(),
};



  writeEnv(updated);
  readEnv();

  res.render('updateSuccess');
});

export default router;
