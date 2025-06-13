// routes/moistureDataRoute.mjs
import express from 'express';
import { getMoistureHistory } from '../services/moistureService.mjs';

const router = express.Router();

// Hilfsfunktionen
function calculateAverage(data, count) {
  const sliced = data.slice(-count);
  if (sliced.length === 0) return null;
  const sum = sliced.reduce((acc, val) => acc + val.value, 0);
  return (sum / sliced.length).toFixed(1);
}

function extractLastValues(data, count) {
  return data.slice(-count).map(entry => entry.value);
}

function findMinMax(data) {
  if (data.length === 0) return { min: null, max: null };
  let min = data[0].value;
  let max = data[0].value;
  for (const entry of data) {
    if (entry.value < min) min = entry.value;
    if (entry.value > max) max = entry.value;
  }
  return { min, max };
}

// Dynamische Farb-Hilfsfunktionen
function getColorForValue(value) {
  if (value == null) return '#333';
  const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
  const v = clamp(value, 0, 100);

  let r, g, b;
  if (v < 50) {
    const ratio = v / 50;
    r = 255;
    g = Math.round(165 * ratio);
    b = 0;
  } else {
    const ratio = (v - 50) / 50;
    r = Math.round(255 + (76 - 255) * ratio);
    g = Math.round(165 + (175 - 165) * ratio);
    b = Math.round(0 + (80 - 0) * ratio);
  }
  return `rgb(${r}, ${g}, ${b})`;
}

function getBackgroundForValue(value) {
  if (value == null) return 'rgba(200,200,200,0.3)';
  const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
  const v = clamp(value, 0, 100);

  if (v < 30) return 'rgba(255, 0, 0, 0.1)';
  if (v < 60) return 'rgba(255, 165, 0, 0.1)';
  return 'rgba(76, 175, 80, 0.1)';
}

// Hauptroute
router.get('/moisture-data', (req, res) => {
  const history = getMoistureHistory();
  const lastEntry = history.at(-1) || null;
  const firstEntry = history[0] || null;

  const averages = {
    last10: calculateAverage(history, 10),
    last50: calculateAverage(history, 50),
    last100: calculateAverage(history, 100),
  };

  const valuesLast10 = extractLastValues(history, 10);
  const valuesLast50 = extractLastValues(history, 50);
  const valuesLast100 = extractLastValues(history, 100);

  const { min, max } = findMinMax(history);

  const trendSteps = [10, 30, 50, 100, 200, 300];
  const avgTrendValues = trendSteps
    .map(n => calculateAverage(history, n))
    .map(v => v !== null ? parseFloat(v) : null);

  res.render('moistureData', {
    lastEntry,
    averages,
    min,
    max,
    firstEntry,
    valuesLast10,
    valuesLast50,
    valuesLast100,
    avgTrendValues,
    getColorForValue,
    getBackgroundForValue
  });
});

// CSV Export-Routen
router.get('/moisture-data/export-latest500', (req, res) => {
  const history = getMoistureHistory();
  const latest500 = history.slice(-500);
  exportCsv(latest500, res, 'moisture-latest500.csv');
});

router.get('/moisture-data/export-all', (req, res) => {
  const history = getMoistureHistory();
  exportCsv(history, res, 'moisture-all.csv');
});

function exportCsv(data, res, filename) {
  const csvLines = ['timestamp,value'];
  data.forEach(entry => {
    csvLines.push(`${entry.timestamp.toISOString()},${entry.value}`);
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvLines.join('\n'));
}

export default router;
