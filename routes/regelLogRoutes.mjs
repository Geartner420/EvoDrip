import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ruleEngineLogger as logger } from '../helper/logger.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

const logPath = path.resolve(__dirname, '../logs/rule_engine.log');

// Hilfsfunktion: letzte X Zeilen extrahieren
function getLastLines(data, limit = 300) {
  return data
    .split('\n')
    .filter(Boolean)
    .reverse()
    .slice(0, limit)
    .reverse()
    .join('\n');
}

// 🧾 /rulelog – HTML-Ansicht mit limitierter Log-Ausgabe
router.get('/rulelog', (req, res) => {
  fs.readFile(logPath, 'utf8', (err, data) => {
    if (err) {
      logger.error(`❌ Fehler beim Laden der Logdatei: ${err.message}`);
      return res.status(500).send('Fehler beim Laden der Logdatei.');
    }

    const limitedLog = getLastLines(data, 300)
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    res.render('rulelog', { logContent: limitedLog });
  });
});

// 🔄 /rulelog/raw?limit=200 – API-JSON-Ausgabe für AJAX oder andere Tools
router.get('/rulelog/raw', (req, res) => {
  const limit = Number(req.query.limit) || 200;
  fs.readFile(logPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: err.message });

    const lines = data
      .split('\n')
      .filter(Boolean)
      .reverse()
      .slice(0, limit);

    res.json(lines);
  });
});

export default router;
