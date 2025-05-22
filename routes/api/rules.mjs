import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import logger from '../../helper/logger.mjs';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../sensor_data');
const rulesFile = path.join(dataDir, 'relay_rules.json');

// GET Ping
router.get('/ping', (req, res) => res.json({ pong: true }));

// Regeln laden (einfaches Array)
function loadRules() {
  try {
    if (fs.existsSync(rulesFile)) {
      const raw = JSON.parse(fs.readFileSync(rulesFile, 'utf-8'));

      if (Array.isArray(raw)) return raw;

      // Falls versehentlich altes Programmschema vorhanden ist
      if (typeof raw === 'object' && (raw.programs || raw.singleRules)) {
        const rules = [];

        if (Array.isArray(raw.singleRules)) rules.push(...raw.singleRules);
        if (Array.isArray(raw.programs)) {
          for (const prog of raw.programs) {
            if (Array.isArray(prog.rules)) rules.push(...prog.rules);
          }
        }

        return rules;
      }

      return [];
    }
  } catch (err) {
    logger.error(`❌ Fehler beim Laden der Regeln: ${err.message}`);
  }

  return [];
}

// Regeln speichern
function saveRules(rules) {
  try {
    fs.writeFileSync(rulesFile, JSON.stringify(rules, null, 2), 'utf-8');
    logger.info(`💾 Regeln gespeichert (${rules.length} Einträge)`);
  } catch (err) {
    logger.error(`❌ Fehler beim Speichern der Regeln: ${err.message}`);
  }
}

// GET alle Regeln
router.get('/', (req, res) => {
  const rules = loadRules();
  res.json(rules);
});

// POST neue Regel hinzufügen
router.post('/add', (req, res) => {
  try {
    const newRule = req.body;
    const rules = loadRules();
    rules.push(newRule);
    saveRules(rules);
    logger.info('➕ Neue Regel hinzugefügt:', newRule);
    res.json({ success: true });
  } catch (err) {
    logger.error(`❌ Fehler beim Hinzufügen einer Regel: ${err.message}`);
    res.status(500).json({ error: 'Regel konnte nicht hinzugefügt werden.' });
  }
});

// POST Regel löschen
router.post('/delete', (req, res) => {
  try {
    const ruleToDelete = req.body;
    let rules = loadRules();
    const before = rules.length;

    rules = rules.filter(rule => JSON.stringify(rule) !== JSON.stringify(ruleToDelete));
    saveRules(rules);

    logger.info(`🗑️ Regel gelöscht (${before - rules.length} entfernt)`);
    res.json({ success: true });
  } catch (err) {
    logger.error(`❌ Fehler beim Löschen einer Regel: ${err.message}`);
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

// Hilfsfunktion zur Normalisierung
function normalizeRule(rule) {
  return {
    ...rule,
    conditions: [...rule.conditions]
      .map(cond => ({
        ...cond,
        value: String(parseFloat(cond.value)),
        hysteresis: cond.hysteresis !== undefined && cond.hysteresis !== ''
          ? String(parseFloat(cond.hysteresis))
          : ''
      }))
      .sort((a, b) => a.param.localeCompare(b.param))
  };
}

// POST Regel aktualisieren
router.post('/updateRule', (req, res) => {
  try {
    const { oldRule, newRule } = req.body;

    if (!oldRule || !newRule) {
      throw new Error('❌ Ungültiger Body: oldRule oder newRule fehlt');
    }

    const rules = loadRules();
    const normOld = normalizeRule(oldRule);
    const normNew = normalizeRule(newRule);

    const index = rules.findIndex((rule, i) => {
      const normRule = normalizeRule(rule);
      return (
        normRule.sensor === normOld.sensor &&
        normRule.relay === normOld.relay &&
        normRule.action === normOld.action &&
        normRule.activeFrom === normOld.activeFrom &&
        normRule.activeTo === normOld.activeTo &&
        JSON.stringify(normRule.conditions) === JSON.stringify(normOld.conditions)
      );
    });

    if (index === -1) {
      logger.warn(`⚠️ Regel nicht gefunden zum Aktualisieren`);
      res.status(404).json({ error: 'Regel nicht gefunden' });
      return;
    }

    rules[index] = normNew;
    saveRules(rules);
    logger.info(`✏️ Regel aktualisiert: ${normOld.sensor} → ${normNew.sensor}`);
    res.json({ success: true });

  } catch (err) {
    logger.error(`❌ Fehler beim Aktualisieren einer Regel: ${err.message}`);
    res.status(500).json({ error: 'Fehler beim Aktualisieren', detail: err.message });
  }
});

export default router;
