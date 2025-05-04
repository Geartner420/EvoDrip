// deleteFile.mjs

import fs from 'fs';

/**
 * Löscht eine Datei unter einem bestimmten Pfad
 * @param {string} filePath '/Users/Peter_Pan/newdrip/moisture.json'
 */
export function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Datei erfolgreich gelöscht: ${filePath}`);
    } else {
      console.log(`⚠️ Datei existiert nicht: ${filePath}`);
    }
  } catch (err) {
    console.error(`❌ Fehler beim Löschen der Datei '${filePath}': ${err.message}`);
  }
}
