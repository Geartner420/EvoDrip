// logger.mjs
import winston from 'winston';
import dotenv from 'dotenv';
dotenv.config(); // Lade .env Datei

const logger = winston.createLogger({
  level: process.env.DEBUG === 'true' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'DD.MM.YYYY HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) =>
      `[${timestamp}] ${level.toUpperCase()}: ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'newdrip.log' })
  ]
});

export default logger;
