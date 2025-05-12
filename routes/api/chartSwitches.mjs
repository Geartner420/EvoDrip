import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const dataDir = path.resolve('./sensor_data');
const logFile = path.join(dataDir, 'relay_log.json');

router.get('/relay-switches-log', (req, res) => {
  if (!fs.existsSync(logFile)) return res.json([]);
  try {
    const raw = fs.readFileSync(logFile, 'utf-8');
    const entries = JSON.parse(raw);
    const result = entries.map(entry => ({
      timestamp: entry.timestamp,
      relay: entry.relay,
      state: entry.state,
      sensor: entry.sourceSensor || null, // <--- wichtig!
      reason: entry.conditions?.map(cond => {
        const icon = cond.param === 'temperature' ? '🌡' :
                     cond.param === 'humidity' ? '💧' :
                     cond.param === 'vpd' ? '📈' : '📊';
        return `${icon} ${cond.param} ${cond.op} ${cond.value}${cond.hysteresis ? ' ±' + cond.hysteresis : ''}`;
      }).join(' UND ') || 'ohne Angabe'
    }));
    res.json(result);
  } catch (err) {
    console.error('Fehler beim Laden von relay_log.json:', err);
    res.status(500).json({ error: 'Fehler beim Laden der Relaisdaten.' });
  }
});


export default router;
