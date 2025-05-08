// services/envService.mjs
import fs from 'fs';
import logger from '../helper/logger.mjs';

const ENV_PATH = '.env';

export function readEnv() {
  if (!fs.existsSync(ENV_PATH)) {
    return {};
  }

  const lines = fs.readFileSync(ENV_PATH, 'utf8').split('\n');
  const env = {};

  for (const line of lines) {
    const trimmed = line.trim();

    // Kommentare und leere Zeilen überspringen
    if (!trimmed || trimmed.startsWith('#')) continue;

    const [key, ...vals] = trimmed.split('=');
    if (!key) continue; // Fehlerhafte Zeile ignorieren

    env[key.trim()] = vals.join('=').trim();
  }

  return env;
}

export function writeEnv(updatedVars) {
  let lines = [];
  if (fs.existsSync(ENV_PATH)) {
    lines = fs.readFileSync(ENV_PATH, 'utf8').split('\n');
  }

  const keysWritten = new Set();

  const newLines = lines.map(line => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      // Kommentare und leere Zeilen einfach behalten
      return line;
    }

    const [key, ...vals] = trimmed.split('=');
    if (!key) return line; // Fehlerhafte Zeilen behalten

    const cleanKey = key.trim();
    if (updatedVars.hasOwnProperty(cleanKey)) {
      keysWritten.add(cleanKey);

      // Spezialbehandlung für DEBUG (Checkboxen)
      let value = updatedVars[cleanKey];
      if (cleanKey === 'DEBUG') {
        value = value === 'true' || value === true ? 'true' : 'false';
      }

      return `${cleanKey}=${value}`;
    }

    return line; // Unveränderte Zeile behalten
  });

  // Alle neuen Keys anhängen, die noch fehlen
  for (const key in updatedVars) {
    if (!keysWritten.has(key)) {
      let value = updatedVars[key];
      if (key === 'DEBUG') {
        value = value === 'true' || value === true ? 'true' : 'false';
      }
      newLines.push(`${key}=${value}`);
    }
  }

  try {
    fs.writeFileSync(ENV_PATH, newLines.join('\n'), 'utf8');
  } catch (err) {
    logger.error(`❌ Fehler beim Schreiben der .env-Datei: ${err.message}`);
  }
}