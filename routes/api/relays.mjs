import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../sensor_data');
const relaysFile = path.join(dataDir, 'relays.json');

router.get('/', (req, res) => {
  if (fs.existsSync(relaysFile)) {
    const data = JSON.parse(fs.readFileSync(relaysFile, 'utf-8'));
    res.json(data);
  } else {
    res.json([]);
  }
});

router.post('/', (req, res) => {
  const relays = req.body;
  fs.writeFileSync(relaysFile, JSON.stringify(relays, null, 2), 'utf-8');
  res.json({ success: true });
});

export default router;
