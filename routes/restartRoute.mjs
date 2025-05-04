// routes/restartRoute.mjs

import express from 'express';
import logger from '../helper/logger.mjs';

const router = express.Router();

router.post('/restart', (req, res) => {
  res.send('Server wird neu gestartet...');
  logger.info('🔁 Restart initiiert');
  setTimeout(() => {
    process.exit(0);
  }, 500);
});

export default router;
