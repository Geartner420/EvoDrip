// ./routes/api/sensorStatus.mjs
import express from 'express';
import { getLatestSensorValues } from '../../services/connectAll.mjs'; // Pfad ggf. anpassen
import { loadSensorIdMapping } from '../../services/connectAll.mjs';
import  logger  from '../../helper/logger.mjs';

loadSensorIdMapping(); // Laden der Zuordnung

const router = express.Router();

router.get('/', (req, res) => {
  const data = getLatestSensorValues();
logger.debug('Daten aus der API:', data);  // Debugging
  res.json(data);
});


export default router;
