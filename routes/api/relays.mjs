import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import logger from '../../helper/logger.mjs';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../sensor_data');
const relaysFile = path.join(dataDir, 'relays.json');

router.get('/', (req, res) => {
  try {
    if (fs.existsSync(relaysFile)) {
      const data = JSON.parse(fs.readFileSync(relaysFile, 'utf-8'));
      return res.json(data);
    }
    res.json([]);
  } catch (err) {
    logger.error(`❌ Fehler beim Lesen von relays.json: ${err.message}`);
    res.status(500).json({ error: 'Fehler beim Lesen der Relaisdaten' });
  }
});

router.post('/', (req, res) => {
  try {
    const relays = req.body;

    // einfache Validierung
    if (!Array.isArray(relays)) {
      return res.status(400).json({ error: 'Ungültiges Format' });
    }

    fs.writeFileSync(relaysFile, JSON.stringify(relays, null, 2), 'utf-8');
    logger.info(`💾 Relaisdaten gespeichert (${relays.length} Einträge)`);
    res.json({ success: true });
  } catch (err) {
    logger.error(`❌ Fehler beim Schreiben von relays.json: ${err.message}`);
    res.status(500).json({ error: 'Fehler beim Speichern' });
  }
});

export default router;
