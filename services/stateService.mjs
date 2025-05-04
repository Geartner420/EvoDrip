import fs from 'fs';
import path from 'path';

const STATE_FILE = path.resolve(process.cwd(), 'state.json');

export function loadState() {
  try {
    const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return new Date(data.lastTriggerTime);
  } catch {
    return null;
  }
}

export function saveState(lastTriggerTime) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({ lastTriggerTime }), 'utf8');
}
