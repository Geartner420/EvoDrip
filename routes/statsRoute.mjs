import express from 'express';
import { getStats, resetTodayStats } from '../services/statsService.mjs';

const router = express.Router();

router.get('/', (req, res) => {
  const stats = getStats();
  res.render('stats', {
    nightWaterCount: stats.nightWaterCount,
    dayWaterCount: stats.dayWaterCount,
    nightWatering: stats.nightWatering,
    dayWatering: stats.dayWatering,
    lastReset: stats.lastReset || null
  });
});

router.post('/reset', (req, res) => {
  resetTodayStats();
  res.redirect('/stats');
});

export default router;
