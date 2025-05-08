// routes/moistureRoutes.mjs

import express from 'express';
import { clearMoistureHistory } from '../services/moistureService.mjs';
import { deleteFile } from '../services/deleteFile.mjs';
import fs from 'fs';

const router = express.Router();

router.delete('/delete-moisture-file', (req, res) => {
  const filePath = '/Users/Peter_Pan/evo/sensor_data/moisture.json';

  try {
    clearMoistureHistory();
    deleteFile(filePath);
    fs.writeFileSync(filePath, '[]', 'utf8');

    res.status(200).send({ message: '✅ Datei gelöscht und neue Datei erstellt.' });
  } catch (err) {
    console.error('❌ Fehler beim Löschen oder Anlegen der Datei:', err);
    res.status(500).send({ error: 'Fehler beim Löschen oder Anlegen.' });
  }
});

export default router;
