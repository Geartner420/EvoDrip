import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../helper/logger.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

const logPath = path.resolve(__dirname, '../newdrip.log');

// Hilfsfunktion: Letzte X Zeilen holen
function getLastLines(data, limit = 300) {
  return data
    .split('\n')
    .filter(Boolean)
    .reverse()  // ⬅️ neueste oben
    .slice(0, limit)
    .map(line =>
      line.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    )
    .join('\n');
}


// 🧾 /log → gerendertes HTML mit begrenztem Log
router.get('/log', (req, res) => {
  fs.readFile(logPath, 'utf8', (err, data) => {
    if (err) {
      logger.error(`❌ Fehler beim Laden der Logdatei: ${err.message}`);
      return res.status(500).send('Fehler beim Laden der Logdatei.');
    }

    const limitedLog = getLastLines(data, 300)
      .replace(/</g, '&lt;') // Sicherheit: Kein HTML einschleusen
      .replace(/>/g, '&gt;');

    res.render('log', { logContent: limitedLog });
  });
});

// 🔄 /log/raw?limit=200 → JSON-Array für API oder Live-Viewer
router.get('/log/raw', (req, res) => {
  const limit = Number(req.query.limit) || 200;
  fs.readFile(logPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const lines = data
      .split('\n')
      .filter(Boolean)
      .reverse()
      .slice(0, limit);

    res.json(lines);
  });
});

export default router;
