// routes/api/relaysRules.mjs
import express from 'express';
import fs from 'fs';
import path from 'path';
import logger from '../../helper/logger.mjs';

const router = express.Router();
const RELAYS_FILE = path.resolve('./sensor_data/relays.json');

function loadRelays() {
  if (!fs.existsSync(RELAYS_FILE)) return [];
  return JSON.parse(fs.readFileSync(RELAYS_FILE));
}

function saveRelays(relays) {
  fs.writeFileSync(RELAYS_FILE, JSON.stringify(relays, null, 2));
}

// Alle Relais abrufen
router.get('/', (req, res) => {
  const relays = loadRelays();
  res.json(relays);
});

// Neues Relais hinzufügen
router.post('/', (req, res) => {
  const relays = loadRelays();
  const newRelay = req.body;
  if (!newRelay.name || !newRelay.ip) {
    return res.status(400).json({ error: 'Name und IP sind erforderlich.' });
  }
  relays.push(newRelay);
  saveRelays(relays);
  logger.info(`➕ Neues Relais hinzugefügt: ${newRelay.name}`);
  res.status(201).json(newRelay);
});

// Relais aktualisieren
router.put('/:id', (req, res) => {
  const relays = loadRelays();
  const idx = parseInt(req.params.id);
  if (isNaN(idx) || !relays[idx]) {
    return res.status(404).json({ error: 'Relais nicht gefunden.' });
  }
  relays[idx] = req.body;
  saveRelays(relays);
  logger.info(`✏️ Relais aktualisiert: ${relays[idx].name}`);
  res.json(relays[idx]);
});

// Relais löschen
router.delete('/:id', (req, res) => {
  const relays = loadRelays();
  const idx = parseInt(req.params.id);
  if (isNaN(idx) || !relays[idx]) {
    return res.status(404).json({ error: 'Relais nicht gefunden.' });
  }
  const removed = relays.splice(idx, 1)[0];
  saveRelays(relays);
  logger.info(`🗑️ Relais gelöscht: ${removed.name}`);
  res.json({ success: true });
});



export default router;