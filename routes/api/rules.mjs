import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../sensor_data');
const rulesFile = path.join(dataDir, 'relay_rules.json');

function loadRules() {
  if (fs.existsSync(rulesFile)) {
    return JSON.parse(fs.readFileSync(rulesFile, 'utf-8'));
  }
  return [];
}

function saveRules(rules) {
  fs.writeFileSync(rulesFile, JSON.stringify(rules, null, 2), 'utf-8');
}

router.get('/', (req, res) => {
  res.json(loadRules());
});

router.post('/add', (req, res) => {
  const newRule = req.body;
  const rules = loadRules();
  rules.push(newRule);
  saveRules(rules);
  res.json({ success: true });
});

router.post('/delete', (req, res) => {
  const ruleToDelete = req.body;
  let rules = loadRules();
  rules = rules.filter(rule => JSON.stringify(rule) !== JSON.stringify(ruleToDelete));
  saveRules(rules);
  res.json({ success: true });
});

router.post('/update', (req, res) => {
  const { oldRule, newRule } = req.body;
  let rules = loadRules();

  const index = rules.findIndex(rule =>
    rule.sensor === oldRule.sensor &&
    rule.relay === oldRule.relay &&
    rule.action === oldRule.action &&
    rule.activeFrom === oldRule.activeFrom &&
    rule.activeTo === oldRule.activeTo &&
    JSON.stringify(rule.conditions) === JSON.stringify(oldRule.conditions)
  );

  if (index !== -1) {
    rules[index] = newRule;
    saveRules(rules);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Regel nicht gefunden' });
  }
});

export default router;
