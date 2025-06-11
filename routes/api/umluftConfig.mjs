// routes/api/umluftConfig.mjs
import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const configPath = path.resolve('sensor_data/umluft_config.json');

router.get('/', async (req, res) => {
  try {
    const data = await fs.readFile(configPath, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Laden der Konfiguration' });
  }
});

router.post('/', async (req, res) => {
  try {
    await fs.writeFile(configPath, JSON.stringify(req.body, null, 2));
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Speichern der Konfiguration' });
  }
});

export default router;
