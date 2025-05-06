import { cta } from './services/connectAll.mjs';

console.log('[BLE Reader] startet...');
cta();

setInterval(() => {}, 1000); // Damit der Prozess am Leben bleibt
