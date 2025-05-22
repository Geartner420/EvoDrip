// logger.mjs
import winston from 'winston';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config(); // Lade .env-Datei

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Gemeinsames Log-Format
const logFormat = winston.format.printf(({ timestamp, level, message }) =>
  `[${timestamp}] ${level.toUpperCase()}: ${message}`
);

// Haupt-Logger (newdrip.log)
const debugMode = ['1', 'true', 'yes'].includes((process.env.DEBUG || '').toLowerCase())

const logger = winston.createLogger({
  level: debugMode ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'DD.MM.YYYY HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(__dirname, '../newdrip.log') })
  ]
});

// Zusätzlicher Logger speziell für die Regel-Engine (rule_engine.log)
const ruleEngineLogger = winston.createLogger({
   level: debugMode ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'DD.MM.YYYY HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(__dirname, '../logs/rule_engine.log') })
  ]
});

export { logger as default, ruleEngineLogger };
