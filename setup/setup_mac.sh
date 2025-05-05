#!/bin/bash
# setup_mac.sh – Install newdrip.js as a launchd service on macOS

# Variables
WORKDIR="/Users/Peter_Pan/evo"
PLIST_PATH="/Library/LaunchDaemons/com.newdripEvo.service.plist"

# Create working directory
sudo mkdir -p "$WORKDIR"
sudo cp server.mjs "$WORKDIR"
cd "$WORKDIR"

# Install dependencies
npm install

# Ensure .env exists (edit with your settings)
if [ ! -f .env ]; then
  echo ".env file not found. Please create .env in $WORKDIR with your configuration."
  exit 1
fi

# Create launchd plist
sudo tee "$PLIST_PATH" > /dev/null <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "https://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.evodrip.service</string>
    <key>ProgramArguments</key>
    <array>
      <string>/usr/local/bin/node</string>
      <string>$WORKDIR/server.mjs</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$WORKDIR</string>
    <key>EnvironmentVariables</key>
    <dict>
      <key>PATH</key>
      <string>/usr/local/bin:/usr/bin:/bin</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
  </dict>
</plist>
EOF

# Load service
sudo launchctl load -w "$PLIST_PATH"
echo "Service installed and loaded. Use 'sudo launchctl list | grep com.evodrip.service' to verify."
