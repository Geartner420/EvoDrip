// watchEnvStandalone.mjs
// -----------------------------------------
// Läuft ohne Windows-Dienst oder Task-Scheduler.
// Überwacht die .env-Datei des Projekts und startet
// sich selbst neu, sobald sich ihr Inhalt ändert.
// Optional kann der Sleep-Modus unter Windows
// blockiert werden (siehe keepAwake()).
//
//   Start:  node ./watchEnvStandalone.mjs
// -----------------------------------------

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import os from 'os';
import logger from '../helper/logger.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const envPath    = path.join(__dirname, '../.env');

// === Einstellungen ===
const WATCH_INTERVAL = 2_000;   // Millisekunden   (2 s)

// Hash der letzten bekannten .env – damit erkennen wir Änderungen.
let lastHash = null;

// ------------------------------------------------------------
// Helfer: SHA-256-Hash des aktuellen .env-Inhalts berechnen
// ------------------------------------------------------------
function getFileHash (filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (err) {
    logger.warn('[watchEnv] ❗ Fehler beim Lesen der .env:', err.message);
    return null;
  }
}

// ------------------------------------------------------------
// Haupt-Watcher: ändert sich die .env, => restartSelf()
// ------------------------------------------------------------
export function watchEnvAndRestart () {
  logger.info(`[watchEnv] 👁️ Überwache ${envPath} …`);

  setInterval(() => {
    const currentHash = getFileHash(envPath);
    if (!currentHash) return;          // .env fehlt o.Ä.

    if (!lastHash) {                   // erster Durchlauf
      lastHash = currentHash;
      return;
    }

    if (currentHash !== lastHash) {
      lastHash = currentHash;
      logger.warn('[watchEnv] ⚠️ .env geändert – Neustart wird ausgelöst …');
      restartSelf();
    }
  }, WATCH_INTERVAL);
}

// ------------------------------------------------------------
// Neustart: eigenen Prozess forken, dann sauber beenden
// ------------------------------------------------------------
function restartSelf () {
  const node   = process.argv[0];      // Pfad zu node.exe
  const script = process.argv[1];      // dieses File
  const args   = process.argv.slice(2);// zusätzliche CLI-Argumente übernehmen

  logger.info(`[watchEnv] 🔄 Starte neu: ${node} ${[script, ...args].join(' ')}`);

  const child = spawn(node, [script, ...args], {
    detached: true,
    stdio: 'inherit'
  });

  child.unref();   // Kindprozess unabhängig machen
  process.exit(0); // Eltern-Prozess beenden
}

// ------------------------------------------------------------
// Optional: Sleep-Modus (Windows) während Laufzeit blockieren
// ------------------------------------------------------------
function keepAwake () {
  if (os.platform() !== 'win32') return;          // nur Windows

  try {
    // Erfordert einmalig Admin-Rechte, bleibt bis zum Entfernen bestehen
    spawn('powercfg', ['/requestsoverride', 'PROCESS', 'node.exe', 'SYSTEM', 'DISPLAY'], {
      stdio: 'ignore'
    });
    logger.info('[watchEnv] 💡 Energiesparmodus für node.exe blockiert (Windows REQUESTSOVERRIDE)');
  } catch (err) {
    logger.warn('[watchEnv] ⚠️ Konnte Sleep-Block nicht setzen:', err.message);
  }
}

// ------------------------------------------------------------
//   Einstiegspunkt
// ------------------------------------------------------------
keepAwake();
watchEnvAndRestart();

logger.info('[watchEnv] ✅ Watcher gestartet.');