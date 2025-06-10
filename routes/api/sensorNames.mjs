// routes/api/sensorNames.mjs
import express from 'express';
import fs from 'fs/promises';
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const raw = await fs.readFile('./sensor_data/sensorNames.json', 'utf8');
    res.json(JSON.parse(raw));
  } catch (err) {
    console.error('[API] Fehler beim Laden der sensorNames.json:', err);
    res.status(500).json({});
  }
});

export default router;
