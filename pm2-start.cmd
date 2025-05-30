@echo off
REM === Node Version Manager aktivieren ===
call C:\Users\miche\AppData\Roaming\nvm\nvm.cmd use 18.17.1 >nul

REM === PM2 direkt über absoluten Pfad starten ===
REM Ersetze ggf. diesen Pfad mit dem echten Speicherort von pm2.cmd:
call "C:\Program Files\nodejs\pm2.cmd" resurrect
