#!/bin/bash
# setup_mac.sh – Fix für LaunchDaemon-Erstellung

set -e

WORKDIR="/Users/$(whoami)/evo"
PLIST_PATH="/Library/LaunchDaemons/com.evodrip.service.plist"
NODE_PATH="/opt/homebrew/bin/node"
LOG_DIR="/tmp/evodrip"

echo "✅ Verwende Node unter: $NODE_PATH"

if [ ! -x "$NODE_PATH" ]; then
  echo "❌ Node nicht gefunden! Installiere mit: brew install node"
  exit 1
fi

echo "📁 Arbeitsverzeichnis: $WORKDIR"
mkdir -p "$WORKDIR"
cp server.mjs "$WORKDIR"

cd "$WORKDIR"
echo "📦 npm install..."
npm install

if [ ! -f .env ]; then
  echo "⚠️  .env Datei fehlt im Arbeitsverzeichnis!"
  exit 1
fi

mkdir -p "$LOG_DIR"

# Fix: feste Werte in sudo cat Block, keine Variablen
echo "🛠️  Schreibe LaunchDaemon-Plist..."

sudo bash -c 'cat > /Library/LaunchDaemons/com.evodrip.service.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "https://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.evodrip.service</string>
    <key>ProgramArguments</key>
    <array>
      <string>/opt/homebrew/bin/node</string>
      <string>/Users/Peter_Pan/evo/server.mjs</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/Peter_Pan/evo</string>
    <key>EnvironmentVariables</key>
    <dict>
      <key>PATH</key>
      <string>/opt/homebrew/bin:/usr/bin:/bin</string>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/evodrip/out.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/evodrip/err.log</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
  </dict>
</plist>
EOF'

echo "🔐 Setze Berechtigungen & starte Dienst..."
sudo chown root:wheel "$PLIST_PATH"
sudo chmod 644 "$PLIST_PATH"
sudo launchctl bootout system "$PLIST_PATH" 2>/dev/null || true
sudo launchctl bootstrap system "$PLIST_PATH"

echo ""
echo "✅ Dienst aktiv!"
echo "📄 Logs: tail -f /tmp/evodrip/*.log"
echo "🔍 Status: sudo launchctl list | grep com.evodrip.service"
