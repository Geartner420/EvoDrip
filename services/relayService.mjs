import Joi from 'joi';
import logger from '../helper/logger.mjs';

const relayControlSchema = Joi.object({
  initialOffset: Joi.number().optional(),
  minOnDuration: Joi.number().optional(),
  maxOnDuration: Joi.number().optional(),
  minOffDuration: Joi.number().optional(),
  maxOffDuration: Joi.number().optional(),
  simultaneousCycleInterval: Joi.number().optional()
});

// Funktion zum Validieren der Relaissteuerung
export const validateRelayControl = (data) => {
  const { error, value } = relayControlSchema.validate(data);
  if (error) {
    logger.error('❌ Fehler beim Validieren der Relaissteuerung:', error.details);
    return { success: false, message: error.details };
  }
  logger.infor('✅ Relaissteuerung erfolgreich validiert.');
  return { success: true, value };
};
