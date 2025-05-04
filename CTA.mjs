import noble from 'noble-mac';
import fs from 'fs';
import path from 'path';

const deviceToSensorId = new Map();
const lastUpdateTime = new Map();
let sensorCounter = 1;

const WRITE_THROTTLE_MS = 30_000; // Min. Zeit zwischen zwei Writes pro Sensor

function decodeAdvertisement(manufacturerData) {
  if (!manufacturerData || manufacturerData.length < 7) return null;

  const tempRaw = manufacturerData.readUInt16LE(1); // Byte 1+2 = Temperatur * 10
  const temperature = tempRaw / 10;

  const humidity = manufacturerData[3]; // Byte 3 = Luftfeuchtigkeit

  return {
    temperature: parseFloat(temperature.toFixed(1)),
    humidity: Math.round(humidity)
  };
}

function writeSensorData(sensorId, data) {
  const now = Date.now();
  const lastWrite = lastUpdateTime.get(sensorId) || 0;

  if (now - lastWrite < WRITE_THROTTLE_MS) return; // Throttle
  lastUpdateTime.set(sensorId, now);

  const filename = `sensor_${sensorId}.json`;
  const filepath = path.join('./', filename);

  const payload = {
    timestamp: new Date().toISOString(),
    temperature: data.temperature,
    humidity: data.humidity
  };

  fs.writeFile(filepath, JSON.stringify(payload, null, 2), (err) => {
    if (err) {
      console.error(`❌ Fehler beim Schreiben von ${filename}:`, err.message);
    } else {
      console.log(`💾 Gespeichert in ${filename}`);
    }
  });
}

noble.on('stateChange', (state) => {
  if (state === 'poweredOn') {
    console.log('🟢 Bluetooth aktiv – starte BLE-Werbepaket-Scan...');
    noble.startScanning([], true); // true = allow duplicates
  } else {
    console.log('🔴 Bluetooth nicht bereit:', state);
    noble.stopScanning();
  }
});

noble.on('discover', (peripheral) => {
  const name = peripheral.advertisement.localName || '';
  const uuid = peripheral.uuid;
  const manufacturerData = peripheral.advertisement.manufacturerData;

  if (!name.includes('TP357S')) return;

  // Sensor-ID zuweisen oder wiederverwenden
  if (!deviceToSensorId.has(uuid)) {
    const sensorId = sensorCounter++;
    deviceToSensorId.set(uuid, sensorId);
    console.log(`🎯 Neuer TP357S erkannt: Sensor ${sensorId} (${uuid})`);
  }

  const sensorId = deviceToSensorId.get(uuid);
  const decoded = decodeAdvertisement(manufacturerData);
  if (!decoded) return;

  console.log(`📡 [Sensor ${sensorId}] 🌡️ ${decoded.temperature} °C | 💧 ${decoded.humidity} %`);
  writeSensorData(sensorId, decoded);
});
