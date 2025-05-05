// Datei: routes/historyRoute.mjs (oder ähnlich)
import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

const HISTORY_FILE = path.join('./sensor_data/history_entrys.json');

router.get('/api/history', (req, res) => {
  if (!fs.existsSync(HISTORY_FILE)) {
    return res.status(404).json({ error: 'Datei nicht gefunden' });
  }

  try {
    const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
    const data = JSON.parse(raw);

    const grouped = {};

    for (const entry of data) {
      const sensorId = entry.sensor.replace('sensor_', '').replace('.json', '');

      if (!grouped[sensorId]) grouped[sensorId] = [];
      grouped[sensorId].push(entry);
    }

    res.json(grouped); // { "1": [...], "2": [...], ... }
  } catch (err) {
    console.error('❌ Fehler beim Laden von history_entries:', err.message);
    res.status(500).json({ error: 'Fehler beim Parsen der Datei' });
  }
});

export default router;
