import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../../helper/logger.mjs';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sensorDataPath = path.join(__dirname, '../../sensor_data/last_entrys.json');

router.get('/', (req, res) => {
  if (!fs.existsSync(sensorDataPath)) return res.json([]);
  try {
    const data = JSON.parse(fs.readFileSync(sensorDataPath, 'utf-8'));
    const sensors = data.map(d => d.sensor).filter(Boolean);
    res.json(sensors);
  } catch (err) {
    logger.error(`❌ Fehler beim Einlesen von ${sensorDataPath}: ${err.message}`);  
    res.status(500).json({ error: 'Fehler beim Einlesen von Sensordaten' });
  }
});

export default router;
