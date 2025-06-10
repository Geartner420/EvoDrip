import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.render('climateEvaluation'); // Datei: /views/climateEvaluation.ejs
});

export default router;
