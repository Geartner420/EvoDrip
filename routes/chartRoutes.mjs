import express from 'express';

const router = express.Router();

router.get('/chart', (req, res) => {
  res.render('chart');
});

export default router;
