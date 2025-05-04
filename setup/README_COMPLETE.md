
# 🌱 NewDrip – Intelligentes Bewässerungssystem

NewDrip ist ein Node.js-basiertes System zur automatisierten Pflanzenbewässerung mit einer stylischen Weboberfläche, Feuchtigkeitssensor-Anbindung (z. B. FYTA), Steuerung über Shelly-Relais und Logging.

## 🔧 Features

- Automatische Bewässerung anhand von Feuchtigkeitsdaten
- Unterstützung für Tag-/Nachtzeitbeschränkungen
- Webinterface für Einstellungen, Feuchtigkeitsdiagramm & Logs
- Persistente Speicherung via `.env`, `state.json` & `moisture.json`
- Als Systemdienst für Linux/macOS/Windows gedacht

---

## ⚙️ Voraussetzungen
- Node.js ≥ v18
- FYTA API-Token
- Shelly-Gerät im lokalen Netzwerk
- `.env`-Datei mit Konfiguration (wird beim ersten Start benötigt)

---

## 📦 Installation

### 1. Repository klonen

```bash
git clone https://github.com/dein-benutzername/newdrip.git
cd newdrip
npm install
```

Edit: Ich bin noch nicht bei GitHub

### 2. `.env` Datei anlegen

Erstelle eine `.env` im Projektverzeichnis mit deinen Werten:

```ini
ACCESS_TOKEN=dein_fyta_token
SHELLY_IP=192.168.1.100
MOISTURE_THRESHOLD=40
TARGET_MOISTURE_AFTER_WATERING=60
SHELLY_TIMER_MINUTES=0.5
WAIT_AFTER_WATER_MINUTES=5
CHECK_INTERVAL_MINUTES=15
COOLDOWN_AFTER_WATER_MINUTES=60
NIGHT_START_HOUR=22
NIGHT_END_HOUR=6
MAX_DATA_AGE_MINUTES=30
DEBUG=false
UI_USERNAME=admin
UI_PASSWORD=passwort
MOISTURE_SAVE_INTERVAL_MS=300000
```

---

## 🖥️ Installation als Dienst

### 🔹 Linux / Raspberry Pi

```bash
sudo bash setup_linux.sh
```

⏵ Danach verwalten mit:

```bash
sudo systemctl status newdrip.service
sudo systemctl restart newdrip.service
sudo journalctl -u newdrip.service -f
```

---

### 🍏 macOS

```bash
sudo bash setup_mac.sh
```

⏵ Danach verwalten mit:

```bash
sudo launchctl list | grep newdrip
sudo launchctl stop com.newdrip.service
sudo launchctl start com.newdrip.service
```

---

### 🪟 Windows

Starte die PowerShell als Administrator und führe folgendes aus:

```powershell
.\setup_windows.ps1
```

⏵ Danach verwalten mit:

```powershell
Get-Service newdrip
Restart-Service newdrip
Stop-Service newdrip
```

---

## 🌍 Remote-Zugriff (Portfreigabe)

Damit das Webinterface auch von außerhalb des Netzwerks erreichbar ist:

1. Öffne das Webinterface unter `http://localhost:3500`
2. Logge dich ein
3. Öffne deinen Router (z. B. FritzBox) und leite Port **3500 TCP** an deinen Raspberry Pi oder Rechner weiter.
4. Nutze dann `http://deine-öffentliche-ip:3500` aus dem Internet (mit DynDNS empfohlen)

**Achtung:** Du solltest ein starkes Passwort setzen, wenn du das Interface öffentlich zugänglich machst.

---

## 🧪 Debug & Logs

- Logs findest du unter `newdrip.log`
- Web-Zugriff unter `/log`
- Debug-Modus kann über `.env` aktiviert werden:

```ini
DEBUG=true
```

---

## ✨ Lizenz

MIT ©DerGärtnerGrÜÜÜn

---

## ❤️ Beitrag leisten

Pull Requests willkommen! 🎉
Pay_Pal: michel.wikinger@googlemail.com


---

