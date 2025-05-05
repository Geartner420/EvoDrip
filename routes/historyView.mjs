import express from 'express';
const router = express.Router();

// Seite rendern
router.get('/dashboard/history', (req, res) => {
  res.render('history-dashboard'); // Ohne .ejs-Endung
});

export default router;
