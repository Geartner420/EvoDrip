#!/bin/bash
# setup_linux.sh – Install newdrip.js as a systemd service on Linux/Raspberry Pi

# Variables
WORKDIR="/opt/newdrip"
SERVICE_PATH="/etc/systemd/system/newdrip.service"

# Create working directory
sudo mkdir -p "$WORKDIR"
sudo cp newdrip.js "$WORKDIR"
cd "$WORKDIR"

# Install dependencies
npm install

# Ensure .env exists
if [ ! -f .env ]; then
  echo ".env file not found. Please create .env in $WORKDIR with your configuration."
  exit 1
fi

# Create systemd service
sudo tee "$SERVICE_PATH" > /dev/null <<EOF
[Unit]
Description=NewDrip Plant Watering Service
After=network.target

[Service]
ExecStart=/usr/bin/node $WORKDIR/newdrip.js
WorkingDirectory=$WORKDIR
Restart=on-failure
User=$(whoami)
EnvironmentFile=$WORKDIR/.env

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable newdrip.service
sudo systemctl start newdrip.service
echo "Service installed and started. Use 'systemctl status newdrip.service' to verify."
