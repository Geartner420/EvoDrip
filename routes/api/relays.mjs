// routes/api/relays.mjs
import express from 'express';
import fs from 'fs';
import path from 'path';
import logger from '../../helper/logger.mjs';

const router = express.Router();
const CONFIG_FILE = path.resolve('./sensor_data/umluft_config.json');
const STATUS_FILE = path.resolve('./sensor_data/umluft_status.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    return { global: {}, relays: [] };
  }
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    logger.error('❌ Fehler beim Laden der Konfiguration:', err.message);
    return { global: {}, relays: [] };
  }
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    logger.info('💾 Konfiguration gespeichert.');
  } catch (err) {
    logger.error('❌ Fehler beim Speichern der Konfiguration:', err.message);
  }
}

function writeStatus(status) {
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
  } catch (err) {
    logger.warn('⚠️ Status konnte nicht geschrieben werden:', err.message);
  }
}

function readStatus() {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
    }
  } catch (err) {
    logger.warn('⚠️ Status konnte nicht gelesen werden:', err.message);
  }
  return { status: 'unbekannt' };
}

// Konfiguration
router.get('/', (req, res) => res.json(loadConfig()));
router.post('/', (req, res) => {
  const config = req.body;
  if (!config || typeof config !== 'object' || !Array.isArray(config.relays)) {
    return res.status(400).json({ error: 'Ungültige Konfiguration.' });
  }
  saveConfig(config);
  res.status(200).json({ success: true });
});

// Relaisliste verwalten
router.put('/relays/:index', (req, res) => {
  const config = loadConfig();
  const idx = parseInt(req.params.index);
  if (isNaN(idx) || !config.relays[idx]) return res.status(404).json({ error: 'Relais nicht gefunden.' });
  config.relays[idx] = req.body;
  saveConfig(config);
  res.json(config.relays[idx]);
});

router.delete('/relays/:index', (req, res) => {
  const config = loadConfig();
  const idx = parseInt(req.params.index);
  if (isNaN(idx) || !config.relays[idx]) return res.status(404).json({ error: 'Relais nicht gefunden.' });
  const removed = config.relays.splice(idx, 1);
  saveConfig(config);
  res.json({ success: true, removed });
});

router.post('/relays', (req, res) => {
  const config = loadConfig();
  const newRelay = req.body;
  if (!newRelay.name || !newRelay.ip) {
    return res.status(400).json({ error: 'Name und IP sind erforderlich.' });
  }
  config.relays.push(newRelay);
  saveConfig(config);
  res.status(201).json(newRelay);
});

// Globale Einstellungen
router.put('/global', (req, res) => {
  const config = loadConfig();
  config.global = req.body;
  saveConfig(config);
  res.json({ success: true });
});

// Steuerung neustarten (nur Marker schreiben – echtes Neustarten extern lösen)
router.post('/restart-umluft', (req, res) => {
  const status = readStatus();
  status.restartRequested = true;
  status.timestamp = new Date().toISOString();
  writeStatus(status);
  logger.info('🔁 Neustart der Umluftsteuerung angefordert.');
  res.json({ success: true });
});

// Status abfragen
router.get('/status', (req, res) => {
  const status = readStatus();
  res.json(status);
});

export default router;
