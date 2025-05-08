// services/watchEnv.mjs
import chokidar from 'chokidar';
import { exec } from 'child_process';
import path from 'path';
import logger from '../helper/logger.mjs'; // Falls du ein zentrales Logging nutzt

// Konfiguration: Label des launchd-Services
const LAUNCHD_LABEL = 'com.evodrip.service';

// Falls dein Dienst als User-Agent läuft, auf false setzen:
const IS_SYSTEM_SERVICE = true;

export function watchEnvAndRestart() {
  const envPath = path.resolve(process.cwd(), '.env');

  chokidar.watch(envPath, { awaitWriteFinish: true }).on('change', () => {
    logger.info('🔁 .env geändert – versuche launchd-Dienst neu zu starten…');

    const launchctlCommand = IS_SYSTEM_SERVICE
      ? `launchctl kickstart -k system/${LAUNCHD_LABEL}`
      : `launchctl kickstart -k gui/$(id -u)/${LAUNCHD_LABEL}`;

    exec(launchctlCommand, (err, stdout, stderr) => {
      if (err) {
        logger.error(`❌ Fehler beim Neustart via launchctl: ${stderr || err.message}`);
      } else {
        logger.info(`✅ launchd-Dienst ${LAUNCHD_LABEL} wurde neu gestartet.`);
      }
    });
  });
}
