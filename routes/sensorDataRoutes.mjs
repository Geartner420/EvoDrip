// routes/sensorDataRoutes.mjs
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getLatestSensorValues } from '../services/connectAll.mjs'; // Sensordatenfunktion

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = path.join(__dirname, '../sensor_data');
const SENSOR_NAMES_FILE = path.join(DATA_DIR, 'sensorNames.json');

const router = express.Router();

router.get('/sensorData', (req, res) => {
  const sensorData = getLatestSensorValues(); // Hole die letzten Sensordaten
  res.render('sensorData', { sensorData });
});

// Route zum Laden der aktuellen Sensor-Namen
router.get('/api/sensor-names', (req, res) => {
  try {
    const names = JSON.parse(fs.readFileSync(SENSOR_NAMES_FILE, 'utf8'));
    res.json(names);
  } catch (err) {
    console.error('Fehler beim Laden der Namen:', err.message);
    res.json({});
  }
});

// Route zum Aktualisieren eines Sensor-Namens
router.post('/api/sensor-names', express.json(), (req, res) => {
  const { id, name } = req.body;
  if (!id || typeof name !== 'string') {
    return res.status(400).json({ error: 'Ungültige Eingabe' });
  }

  let currentNames = {};
  try {
    currentNames = JSON.parse(fs.readFileSync(SENSOR_NAMES_FILE, 'utf8'));
  } catch (err) {
    console.warn('sensorNames.json nicht gefunden oder leer – wird neu erstellt.');
  }

  currentNames[id] = name;

  try {
    fs.writeFileSync(SENSOR_NAMES_FILE, JSON.stringify(currentNames, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error('Fehler beim Speichern:', err.message);
    res.status(500).json({ error: 'Fehler beim Speichern' });
  }
});

export default router;
