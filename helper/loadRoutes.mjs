// helper/loadRoutes.mjs

import fs from 'fs';
import path from 'path';

export async function loadRoutes(app, folderPath) {
  const routesPath = path.resolve(folderPath);
  const files = fs.readdirSync(routesPath);

  for (const file of files) {
    if (file.endsWith('.mjs')) {
      try {
        const module = await import(path.join(routesPath, file));
        if (module && typeof module.default === 'function') {
          app.use(module.default);
          console.log(`✅ Route geladen: ${file}`);
        } else {
          console.warn(`⚠️  Datei ignoriert (kein gültiger Router): ${file}`);
        }
      } catch (error) {
        console.error(`❌ Fehler beim Laden der Route ${file}:`, error.message);
      }
    }
  }
}
