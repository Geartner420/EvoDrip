import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../helper/logger.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

router.get('/log', (req, res) => {
  const logPath = path.resolve(__dirname, '../newdrip.log');
  fs.readFile(logPath, 'utf8', (err, data) => {
    if (err) {
      logger.error(`❌ Fehler beim Laden der Logdatei: ${err.message}`);
      return res.status(500).send('Fehler beim Laden der Logdatei.');
    }

    const reversedLog = data
      .split('\n')
      .filter(line => line)
      .reverse()
      .join('\n')
      .replace(/</g, '&lt;');  // Sicherheitsersatz für spitze Klammern!

    res.render('log', { logContent: reversedLog });
  });
});

export default router;
