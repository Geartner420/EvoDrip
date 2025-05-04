import express from 'express';
import Joi from 'joi';
import { writeEnv, readEnv } from '../services/envService.mjs'; // Wir importieren jetzt auch readEnv

const router = express.Router();

const envFields = [
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

    if (field.required) {
      rule = rule.required();
    }

    schema[field.key] = rule;
  }

  return Joi.object(schema);
}

router.post('/update', (req, res) => {
  console.log('🛠 Eingehender POST /update');

  const formSchema = buildValidationSchema(envFields);

  const { error, value } = formSchema.validate(req.body, {
    abortEarly: false,
    convert: true
  });

  if (error) {
    console.error('❌ Joi Validation Error:', error.details);
    return res.status(400).send('Ungültige Eingaben:\n' + error.details.map(d => d.message).join('\n'));
  }

  const secs = value.SHELLY_TIMER_HOURS * 3600 +
               value.SHELLY_TIMER_MINUTES * 60 +
               value.SHELLY_TIMER_SECONDS;

  const updated = {
    ...value,
    SHELLY_TIMER_MINUTES: (secs / 60).toFixed(2),
    MOISTURE_SAVE_INTERVAL_MS: (parseInt(value.MOISTURE_SAVE_INTERVAL_MS) * 1000).toString(),
    MOISTURE_SUMMARY_INTERVAL_MINUTES: value.MOISTURE_SUMMARY_INTERVAL_MINUTES.toString()
  };

  // .env Datei aktualisieren
  writeEnv(updated);

  // Neue ENV-Variablen laden
  readEnv(); // 🔥 Hier laden wir die neuen ENV-Werte

  res.render('updateSuccess'); // Update-Erfolg anzeigen
});

export default router;
