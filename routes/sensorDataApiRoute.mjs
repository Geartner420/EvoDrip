import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Verzeichnis, in dem die Sensor-Daten gespeichert sind
const DATA_DIR = path.join('./sensor_data');

// Diese Route liefert alle Sensordaten als JSON zurück
router.get('/api/sensordata', (req, res) => {
  const sensorData = {};

  // Gehe alle Dateien im DATA_DIR durch und lade sie, wenn sie Sensordaten sind
  fs.readdirSync(DATA_DIR).forEach(file => {
    // Überspringe die Datei sensor_IDs.json
    if (file === 'sensor_ids.json') return;

    if (file.startsWith('sensor_') && file.endsWith('.json')) {
      const sensorId = file.split('_')[1].split('.')[0]; // Extrahiere die Sensor-ID aus dem Dateinamen
      const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
      try {
        const data = JSON.parse(content);
        sensorData[sensorId] = data; // Speichere die Daten im Objekt unter der Sensor-ID
      } catch (err) {
        console.error(`❌ Fehler beim Parsen der Datei ${file}:`, err.message);
      }
    }
  });

  // Gib die gesammelten Sensordaten als JSON zurück
  res.json(sensorData);
});

export default router;
