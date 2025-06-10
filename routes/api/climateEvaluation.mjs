import express from 'express';
import { evaluateClimate } from '../../services/climateEvaluation.mjs';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await evaluateClimate();
    res.json(result); // <- JSON, kein Render!
  } catch (err) {
    console.error('[API ERROR]', err);
    res.status(500).json({ error: 'Interner Fehler bei Klima-Auswertung' });
  }
});

export default router;
