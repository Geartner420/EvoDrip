import fetch from 'node-fetch'; // oder axios

export async function triggerShellyMineral(durationSeconds = 60) {
  const ip = process.env.SHELLY_IP;
  if (!ip) throw new Error('SHELLY_IP nicht definiert');
  const url = `http://${ip}/relay/0?turn=on&timer=${durationSeconds}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Shelly Fehler: ${res.statusText}`);
}
