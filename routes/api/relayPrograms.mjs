// routes/api/relayPrograms.mjs
import express from 'express';
import fs from 'fs';
import path from 'path';
import logger from '../../helper/logger.mjs';

const router = express.Router();
const FILE = path.resolve('./sensor_data/relay_rules.json'); // gleiches File, aber neue Struktur

function loadPrograms() {
  if (!fs.existsSync(FILE)) return { programs: [] };
  const content = fs.readFileSync(FILE, 'utf-8');
  try {
    const data = JSON.parse(content);
    return data.programs ? data : { programs: [] };
  } catch (err) {
    logger.error(`[relayPrograms] Fehler beim Lesen von relay_rules.json: ${err.message}`);
    return { programs: [] };
  }
}

function savePrograms(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// 🔹 GET alle Programme
router.get('/', (req, res) => {
  const data = loadPrograms();
  res.json(data.programs);
});

// 🔹 POST neues Programm hinzufügen
router.post('/', (req, res) => {
  const data = loadPrograms();
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Programmname fehlt.' });

  const newProgram = {
    name,
    enabled: true,
    rules: []
  };
  data.programs.push(newProgram);
  savePrograms(data);
  logger.info(`➕ Neues Programm angelegt: ${name}`);
  res.status(201).json(newProgram);
});

// 🔹 PUT: Programm umbenennen oder togglen
router.put('/:index', (req, res) => {
  const data = loadPrograms();
  const idx = parseInt(req.params.index);
  if (isNaN(idx) || !data.programs[idx]) {
    return res.status(404).json({ error: 'Programm nicht gefunden.' });
  }

  const { name, enabled } = req.body;
  if (typeof name !== 'undefined') data.programs[idx].name = name;
  if (typeof enabled !== 'undefined') data.programs[idx].enabled = enabled;

  savePrograms(data);
  logger.info(`✏️ Programm aktualisiert: ${data.programs[idx].name}`);
  res.json(data.programs[idx]);
});

// 🔹 DELETE Programm
router.delete('/:index', (req, res) => {
  const data = loadPrograms();
  const idx = parseInt(req.params.index);
  if (isNaN(idx) || !data.programs[idx]) {
    return res.status(404).json({ error: 'Programm nicht gefunden.' });
  }
  const removed = data.programs.splice(idx, 1)[0];
  savePrograms(data);
  logger.info(`🗑️ Programm gelöscht: ${removed.name}`);
  res.json({ success: true });
});

// 🔹 POST Regel zu Programm hinzufügen
router.post('/:index/rules', (req, res) => {
  const data = loadPrograms();
  const idx = parseInt(req.params.index);
  if (isNaN(idx) || !data.programs[idx]) {
    return res.status(404).json({ error: 'Programm nicht gefunden.' });
  }

  const rule = req.body;
  if (!rule || typeof rule !== 'object') {
    return res.status(400).json({ error: 'Ungültige Regel.' });
  }

  data.programs[idx].rules.push(rule);
  savePrograms(data);
  logger.info(`➕ Regel zu Programm ${data.programs[idx].name} hinzugefügt`);
  res.status(201).json(rule);
});

export default router;
