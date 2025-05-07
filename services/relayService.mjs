import Joi from 'joi';

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
    return { success: false, message: error.details };
  }
  return { success: true, value };
};
