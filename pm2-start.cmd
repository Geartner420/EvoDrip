@echo off
REM 🌐 Node.js Umgebung aktivieren
call C:\Users\miche\AppData\Roaming\nvm\nvm.cmd use 18.17.1 >nul

REM 📁 In dein Projektverzeichnis wechseln
cd /d C:\Users\miche\EvoDrip

REM 🧠 PM2 mit explizitem Home starten
set PM2_HOME=C:\Users\miche\.pm2

REM 🔁 PM2 Prozesse wiederherstellen
call "C:\Program Files\nodejs\pm2.cmd" resurrect

REM 🟢 Logging
echo [%DATE% %TIME%] PM2 wurde gestartet >> C:\Users\miche\pm2-boot.log
