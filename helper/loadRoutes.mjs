import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function loadRoutes(app, routesDirRel = '../routes') {
  const routesDir = path.resolve(__dirname, routesDirRel);

  const files = fs.readdirSync(routesDir, { withFileTypes: true });

  for (const file of files) {
    if (file.isDirectory()) {
      // Rekursiv durch Unterordner gehen
      await loadRoutes(app, path.join(routesDirRel, file.name));
    } else if (file.name.endsWith('.mjs')) {
      const fullPath = path.join(routesDir, file.name);
      try {
        const routeModule = await import(pathToFileURL(fullPath).href);
        const route = routeModule.default;
        if (typeof route === 'function') {
          app.use(route);
          console.log(`✅ Route geladen: ${file.name}`);
        } else {
          console.warn(`⚠️  Keine gültige Express-Route in ${file.name}`);
        }
      } catch (err) {
        console.error(`❌ Fehler beim Laden der Route ${file.name}:`, err.message);
      }
    }
  }
}
