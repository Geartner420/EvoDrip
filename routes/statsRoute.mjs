// routes/statsRoute.mjs
import express from 'express';
import { loadStats } from '../services/statsService.mjs';

const router = express.Router();

router.get('/stats', (req, res) => {
  const stats = loadStats();
  res.render('stats', {
    nightWaterCount: stats.nightWaterCount,
    dayWaterCount: stats.dayWaterCount
  });
});

export default router;
