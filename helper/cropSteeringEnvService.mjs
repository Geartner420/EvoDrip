import config from './config.mjs';

function parsePhase(name) {
  const timerMinutesKey = `SHELLY_TIMER_MINERAL_${name}_MINUTES`;

  return {
    ENABLED: config[`${name}_ENABLED`] === true,
    START_HOUR: parseInt(config[`${name}_START_HOUR`] ?? 0),
    END_HOUR: parseInt(config[`${name}_END_HOUR`] ?? 0),
    MAX_MOISTURE: parseFloat(config[`${name}_MAX_MOISTURE`] ?? 100),
    WATERING_DURATION_MINUTES: parseFloat(config[timerMinutesKey] ?? 1), // ← hier neue Quelle
    MIN_TIME_BETWEEN_CYCLES_MIN: parseInt(config[`${name}_MIN_TIME_BETWEEN_CYCLES_MIN`] ?? 30),
    MAX_DAILY_WATER_VOLUME_ML: parseInt(config.MAX_DAILY_WATER_VOLUME_ML ?? 5000),
    FLOW_RATE_ML_PER_MINUTE: parseFloat(config.FLOW_RATE_ML_PER_MINUTE ?? 60),
    DRIPPERS_PER_POT: parseInt(config.DRIPPERS_PER_POT ?? 6),
    POT_COUNT: parseInt(config.POT_COUNT ?? 5)
  };
}

export function getCropSteeringSettings() {
  return {
    P1: parsePhase('P1'),
    P2: parsePhase('P2'),
    P3: parsePhase('P3')
  };
}
