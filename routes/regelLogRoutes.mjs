import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ruleEngineLogger as logger } from '../helper/logger.mjs';


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

router.get('/rulelog', (req, res) => {
  const logPath = path.resolve(__dirname, '../logs/rule_engine.log');
  fs.readFile(logPath, 'utf8', (err, data) => {
    if (err) {
      logger.error(`❌ Fehler beim Laden der Logdatei: ${err.message}`);
      return res.status(500).send('Fehler beim Laden der Logdatei.');
    }

    router.get('/log/raw', (req, res) => {
      const limit = Number(req.query.limit) || 200;
      fs.readFile(logPath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        const lines = data
          .split('\\n')
          .filter(Boolean)
          .reverse()        // neueste zuerst
          .slice(0, limit);   // begrenzen
        res.json(lines);      // Array zurück
      });
    });
    

    const reversedLog = data
    .split('\n')
    .filter(line => line)
    .reverse() // 🧠 Neueste zuerst!
    .join('\n')
    .replace(/</g, '&lt;');
  

    res.render('rulelog', { logContent: reversedLog });
  });
});

export default router;
