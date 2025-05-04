// newdrip.js – Verbesserte Bewässerungssteuerung

import express from 'express';
import path from 'path';
import fs from 'fs';
import bodyParser from 'body-parser';
import basicAuth from 'express-basic-auth';
import { fetchMoisture } from './services/fytaservice.mjs';
import { triggerShelly } from './services/shellyService.mjs';
import { loadState, saveState } from './services/stateService.mjs';
import { loadMoistureData, saveMoistureData } from './services/moistureService.mjs';
import { isNightTime } from './services/timeService.mjs';
import { checkAndWater } from './services/wateringService.mjs';
import { loadRoutes } from './helper/loadRoutes.mjs';
import { watchEnvAndRestart } from './services/watchEnv.mjs';
import { buildWateringOptions } from './helper/wateringOptions.mjs';
import config from './helper/config.mjs';
import logger from './helper/logger.mjs';
import { cta } from './services/connectAll.mjs';
import {getLatestSensorValues} from './services/connectAll.mjs'
import sensorDataRoutes from './routes/sensorDataRoutes.mjs';

const {
  UI_USERNAME,
  UI_PASSWORD,
  CHECK_INTERVAL_MINUTES,
  MOISTURE_SAVE_INTERVAL_MS
} = config;

async function startServer() {
  const app = express();

  // Middleware
  app.set('view engine', 'ejs');
  app.set('views', './views');
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(basicAuth({ users: { [UI_USERNAME]: UI_PASSWORD }, challenge: true }));
  app.use('/', sensorDataRoutes);

  // Feuchtigkeitsdaten initial laden
  let lastTriggerTime = loadState();
  loadMoistureData();

  // Routen automatisch laden
  await loadRoutes(app, './routes');

  // Gießüberwachung starten
  global.busy = false;
  const getLastTriggerTime = () => lastTriggerTime;
  const setLastTriggerTime = (ts) => { lastTriggerTime = ts; };

  const wateringOptions = buildWateringOptions(getLastTriggerTime, setLastTriggerTime, logger);
  checkAndWater(wateringOptions);
  setInterval(() => checkAndWater(wateringOptions), CHECK_INTERVAL_MINUTES * 60000);

  // Feuchtigkeitsdaten regelmäßig speichern
  setInterval(saveMoistureData, MOISTURE_SAVE_INTERVAL_MS);

  // Server starten
  const PORT = process.env.PORT || 3600;
  app.listen(PORT, () => logger.info(`🛜 Interface läuft auf http://localhost:${PORT}`));

  logger.info(`💾 Feuchtigkeitsdaten werden alle ${MOISTURE_SAVE_INTERVAL_MS / 1000} Sekunden gespeichert`);
}

// Server starten
startServer();
getLatestSensorValues();
cta();
watchEnvAndRestart();
