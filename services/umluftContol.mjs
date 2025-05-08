import fetch from 'node-fetch';
import logger from '../helper/logger.mjs';

// Konfiguration der Relais
const relays = [
    {
        name: 'Umluft 1',
        ip: '192.168.178.67',
        relayUrlOn: 'http://192.168.178.67/relay/0?turn=on',
        relayUrlOff: 'http://192.168.178.67/relay/0?turn=off',
        isOn: false,
        timer: null,
        cycleCount: 0,
        initialOffset: 10000 // z. B. 10 Sekunden Versatz
    },
    {
        name: 'Umluft 2',
        ip: '192.168.178.69',
        relayUrlOn: 'http://192.168.178.69/relay/0?turn=on',
        relayUrlOff: 'http://192.168.178.69/relay/0?turn=off',
        isOn: false,
        timer: null,
        cycleCount: 0,
        initialOffset: 30000 // z. B. 30 Sekunden Versatz
    }
];

// Mindest- und Höchstdauer für Einschalt- und Ausschaltzeiten in Millisekunden
const MIN_ON_DURATION = 4 * 60 * 1000; 
const MAX_ON_DURATION = 8 * 60 * 1000;   
const MIN_OFF_DURATION = 2 * 60 * 1000; 
const MAX_OFF_DURATION = 5 * 60 * 1000; 
let SIMULTANEOUS_CYCLE_INTERVAL = getRandomInterval(5, 20);

// Mittelwert und Standardabweichung für Einschalt- und Ausschaltzeiten definieren
const MEAN_ON = 4 * 60 * 1000;    // 3,5 Minuten
const STDDEV_ON = 2 * 60 * 1000;  // 0,5 Minuten

const MEAN_OFF = 2 * 60 * 1000;     // 4 Minuten
const STDDEV_OFF = 1 * 60 * 1000;    // 1 Minute

async function sendRequest(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            logger.error(`❌ Fehler beim Senden der Anfrage an ${url}: ${response.statusText}`);
        } else {
            logger.debug(`✅ Anfrage erfolgreich gesendet an ${url}`);
        }
    } catch (error) {
       logger.error(`❌ Fehler beim Senden der Anfrage an ${url}:`, error);
    }
}

async function turnOn(relay) {
    await sendRequest(relay.relayUrlOn);
    relay.isOn = true;
   logger.info(`🟢 ${relay.name} eingeschaltet.`);
}

async function turnOff(relay) {
    await sendRequest(relay.relayUrlOff);
    relay.isOn = false;
    logger.info(`🔴 ${relay.name} ausgeschaltet.`);
}

function getRandomNormal(mean, stdDev) {
    let u = 1 - Math.random();
    let v = Math.random();
    let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mean + z * stdDev;
}

function getNormalDuration(mean, stdDev, min, max) {
    let duration;
    do {
        duration = getRandomNormal(mean, stdDev);
    } while (duration < min || duration > max);
    return Math.floor(duration);
}

function getRandomInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function startRelayCycle(relay) {
    if (relay.initialOffset && relay.initialOffset > 0) {
        logger.info(` Warte initial ${relay.initialOffset / 1000} Sekunden bevor ${relay.name} startet.`);
        await sleep(relay.initialOffset);
    }

    while (true) {
        if (relay.isOn) {
            await turnOff(relay);
            relay.cycleCount++;

            if (relay.cycleCount % SIMULTANEOUS_CYCLE_INTERVAL === 0) {
                logger.info(`Zyklusintervall erreicht. Beide Relais werden gleichzeitig eingeschaltet.`);
                await ensureSimultaneousOn();
                SIMULTANEOUS_CYCLE_INTERVAL = getRandomInterval(5, 10);
                logger.info(`Neues Zyklusintervall für gleichzeitige Einschaltung: ${SIMULTANEOUS_CYCLE_INTERVAL}`);
            }

            const offDuration = getNormalDuration(MEAN_OFF, STDDEV_OFF, MIN_OFF_DURATION, MAX_OFF_DURATION);
            logger.info(`[${new Date().toLocaleTimeString()}] ${relay.name} bleibt für ${Math.round(offDuration / 60000 * 10) / 10} Minuten ausgeschaltet.`);
            await sleep(offDuration);

        } else {
            await turnOn(relay);

            const onDuration = getNormalDuration(MEAN_ON, STDDEV_ON, MIN_ON_DURATION, MAX_ON_DURATION);
            logger.info(`[${new Date().toLocaleTimeString()}] ${relay.name} bleibt für ${Math.round(onDuration / 60000 * 10) / 10} Minuten eingeschaltet.`);
            await sleep(onDuration);
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function ensureSimultaneousOn(duration = 4 * 60 * 1000) {
    logger.info(`Beide Relais werden gleichzeitig für mindestens 4 Minuten eingeschaltet.`);
    await Promise.all(relays.map(relay => turnOn(relay)));
    await sleep(duration);
}

async function controlRelays() {
    relays.forEach(relay => {
        startRelayCycle(relay).catch(error => {
            logger.error(`Fehler im Zyklus von ${relay.name}:`, error);
        });
    });
}

export { controlRelays };
