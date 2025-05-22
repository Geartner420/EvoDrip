#!/bin/bash 

# Verzögerung, bevor der Dienst gestoppt wird
sleep 10

# Stoppen von bluetoothd
echo "[BLE] Stoppe bluetoothd..."
pkill bluetoothd

# Warten, bis bluetoothd vollständig gestoppt ist (maximal 10 Sekunden)
timeout=10
while pgrep bluetoothd > /dev/null; do
  echo "[BLE] Warte auf das Beenden von bluetoothd..."
  sleep 1
  ((timeout--))
  if [ $timeout -le 0 ]; then
    echo "[BLE] ❗ Timeout beim Warten auf das Stoppen von bluetoothd."
    break
  fi
done

# Neustarten von bluetoothd
echo "[BLE] Starte bluetoothd neu..."
/usr/sbin/bluetoothd &

# Warten, bis bluetoothd stabil läuft (maximal 15 Sekunden)
timeout=15
while ! pgrep bluetoothd > /dev/null; do
  echo "[BLE] Warte darauf, dass bluetoothd neu startet..."
  sleep 1
  ((timeout--))
  if [ $timeout -le 0 ]; then
    echo "[BLE] ❗ Timeout beim Warten auf bluetoothd."
    break
  fi
done

# Sicherstellen, dass bluetoothd jetzt aktiv ist
if pgrep bluetoothd > /dev/null; then
  echo "[BLE] ✅ bluetoothd läuft erfolgreich"
else
  echo "[BLE] ❌ bluetoothd wurde nicht erfolgreich gestartet"
fi
