import chokidar from 'chokidar';
import path from 'path';
import logger from '../helper/logger.mjs';

export function watchEnvAndRestart() {
  chokidar.watch(path.resolve(process.cwd(), '.env'), { awaitWriteFinish: true })
    .on('change', () => {
      logger.info('🔁 .env geändert – Server wird neu gestartet');
      process.exit(0);
    });
}
