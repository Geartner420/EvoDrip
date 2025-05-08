// services/fytaservice.mjs
import fetch from 'node-fetch';
import config from '../helper/config.mjs';
import logger from '../helper/logger.mjs';

const {
  ACCESS_TOKEN,
  MAX_DATA_AGE_MINUTES
} = config;

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Accept': 'application/json'
    }
  });
  if (!res.ok) {
    logger.error(`Fehler beim Abrufen von ${url}: HTTP ${res.status}`);
    throw new Error(`Fehler beim Abrufen von ${url}: HTTP ${res.status}`);
  }
  return res.json();
}

function checkSensorAge(receivedAt) {
  const timestamp = new Date(receivedAt);
  if (isNaN(timestamp)) {
    logger.error('Ungültiger Zeitstempel von der Pflanze.');
    throw new Error('Ungültiger Zeitstempel von der Pflanze.');
  }
  const ageMin = (Date.now() - timestamp.getTime()) / 60000;
  if (ageMin > MAX_DATA_AGE_MINUTES) {
    logger.error(`Sensordaten zu alt: ${ageMin.toFixed(1)} Minuten (max erlaubt: ${MAX_DATA_AGE_MINUTES})`);
    throw new Error(`Sensordaten zu alt: ${ageMin.toFixed(1)} Minuten (max erlaubt: ${MAX_DATA_AGE_MINUTES})`);
  }
}

function extractMoisture(detail) {
  const raw = detail.plant?.measurements?.moisture?.values?.current;
  const moisture = parseFloat(raw);
  if (isNaN(moisture)) {
    logger.error(`Feuchtigkeitswert ist ungültig: ${raw}`);
    throw new Error(`Feuchtigkeitswert ist ungültig: ${raw}`);
  }
  return moisture;
}

export async function fetchMoisture() {
  const summary = await fetchJson('https://web.fyta.de/api/user-plant');

  if (!Array.isArray(summary.plants) || summary.plants.length === 0) {
    logger.error('Keine Pflanzen gefunden beim Benutzer.');
    throw new Error('Keine Pflanzen gefunden beim Benutzer.');
  }

  // Erste Pflanze auswählen, alternativ könnte man hier alle Pflanzen loopen
  const plant = summary.plants[0];

  if (!plant || !plant.id) {
    logger.error('Pflanzendaten unvollständig.');
    throw new Error('Pflanzendaten unvollständig.');
  }

  const detail = await fetchJson(`https://web.fyta.de/api/user-plant/${plant.id}`);

  checkSensorAge(detail.plant?.hub?.reached_hub_at);

  const moisture = extractMoisture(detail);
  logger.info(`💧🪴 Boden-Feuchtigkeit: ${moisture.toFixed(1)} %`);
  return moisture;

}
