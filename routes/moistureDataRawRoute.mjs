// routes/moistureDataRawRoute.mjs
import express from 'express';
import { loadMoistureData, getMoistureHistory } from '../services/moistureService.mjs';

const router = express.Router();

router.get('/moisture-data-raw', (req, res) => {
  try {
    loadMoistureData();
    const moistureHistory = getMoistureHistory();
    if (moistureHistory.length === 0) {
      return res.status(404).json({ error: 'Keine Feuchtigkeitsdaten verfügbar' });
    }
    const moistureData = moistureHistory.map(entry => ({
      timestamp: entry.timestamp.toISOString(),
      value: entry.value
    }));
    res.json(moistureData);
  } catch (err) {
    console.error('❌ Fehler beim Laden von moisture.json:', err.message);
    res.status(500).json({ error: 'Fehler beim Laden der Feuchtigkeitsdaten.' });
  }
});

export default router;
