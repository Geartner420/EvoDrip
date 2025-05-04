import express from 'express';
import { getMoistureHistory } from '../services/moistureService.mjs';
import { readEnv } from '../services/envService.mjs';

const router = express.Router();

router.get('/status', (req, res) => {
  try {
    const history = getMoistureHistory();
    const env = readEnv();

    const lastEntry = history.length > 0 ? history[history.length - 1] : null;

    const status = {
      lastMoisture: lastEntry ? `${lastEntry.value}%` : 'Keine Daten',
      lastTimestamp: lastEntry ? new Date(lastEntry.timestamp).toLocaleString() : 'Keine Daten',
      totalEntries: history.length,
      moistureSaveIntervalSec: env.MOISTURE_SAVE_INTERVAL_MS
        ? parseInt(env.MOISTURE_SAVE_INTERVAL_MS, 10) / 1000
        : 'Unbekannt',
      moistureSummaryIntervalMin: env.MOISTURE_SUMMARY_INTERVAL_MINUTES || 'Unbekannt',
    };

    res.render('status', { status });
  } catch (err) {
    console.error('❌ Fehler im Status-Check:', err);
    res.status(500).send('<p>❌ Fehler beim Abrufen des Status.</p><a href="/">Zurück</a>');
  }
});

export default router;
