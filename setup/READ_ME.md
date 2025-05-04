// Setup
sudo ./setup_mac.sh
------------------------------------------------------------------------
❌ Dienst deaktivieren (z. B. für manuelles Testen)

sudo launchctl bootout system /Library/LaunchDaemons/com.newdrip.service.plist
------------------------------------------------------------------------
✅ Dienst wieder aktivieren

sudo launchctl bootstrap system /Library/LaunchDaemons/com.newdrip.service.plist

------------------------------------------------------------------------
Logs

tail -f newdrip.log
