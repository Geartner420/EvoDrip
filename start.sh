#!/bin/bash

cd /Users/Peter_Pan/evo

# Starte Server im Hintergrund
/opt/homebrew/bin/node server.mjs &
SERVER_PID=$!

# Warte 10s, dann BLE neu starten
sleep 10
/Users/Peter_Pan/evo/helper/restartBle.sh >> /Users/Peter_Pan/evo/logs/ble_restart.log 2>&1

# Warte darauf, dass BLE hochkommt
sleep 5

# Halte das Skript offen, bis Server stirbt
wait $SERVER_PID
