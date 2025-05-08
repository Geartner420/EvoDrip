// deleteFile.mjs

import fs from 'fs';
import logger from '../helper/logger.mjs';

/**
 * Löscht eine Datei unter einem bestimmten Pfad
 * @param {string} filePath '/Users/Peter_Pan/newdrip/moisture.json'
 */
export function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`🗑️ Datei erfolgreich gelöscht: ${filePath}`);
    } else {
      logger.warn(`⚠️ Datei existiert nicht: ${filePath}`);
    }
  } catch (err) {
    logger.error(`❌ Fehler beim Löschen der Datei '${filePath}': ${err.message}`);
  }
}
