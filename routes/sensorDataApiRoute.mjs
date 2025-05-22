import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const DATA_DIR = path.join('./sensor_data');

router.get('/api/sensordata', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 100;
  const sensorData = {};

  try {
    fs.readdirSync(DATA_DIR).forEach(file => {
      if (
        file === 'sensor_ids.json' ||
        !file.startsWith('sensor_') ||
        !file.endsWith('.json')
      ) return;

      const sensorId = file.split('_')[1].split('.')[0];
      const filePath = path.join(DATA_DIR, file);
      const raw = fs.readFileSync(filePath, 'utf-8');

      try {
        let data = JSON.parse(raw);

        // Nur die letzten N Einträge (neueste)
        if (Array.isArray(data)) {
          data = data.slice(-limit);
          sensorData[sensorId] = data;
        } else {
          console.warn(`⚠️ sensor_${sensorId}.json enthält keine Array-Daten`);
        }
      } catch (err) {
        console.error(`❌ Fehler beim Parsen der Datei ${file}:`, err.message);
      }
    });

    res.json(sensorData);
  } catch (err) {
    console.error('❌ Fehler beim Lesen des Sensorverzeichnisses:', err.message);
    res.status(500).json({ error: 'Fehler beim Laden der Sensordaten' });
  }
});

export default router;
