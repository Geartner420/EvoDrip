// services/timeService.mjs

/**
 * Prüft, ob aktuell Nachtzeit ist.
 * @param {number} NIGHT_START_HOUR - Stunde, ab wann Nacht beginnt (0-23)
 * @param {number} NIGHT_END_HOUR - Stunde, bis wann Nacht endet (0-23)
 * @returns {boolean} true, wenn aktuell Nacht ist, sonst false
 */
export function isNightTime(NIGHT_START_HOUR, NIGHT_END_HOUR) {
  const currentHour = new Date().getHours();

  if (NIGHT_START_HOUR > NIGHT_END_HOUR) {
    // Nacht geht über Mitternacht, z.B. 22 -> 6
    return currentHour >= NIGHT_START_HOUR || currentHour < NIGHT_END_HOUR;
  } else {
    // Nacht innerhalb eines Tages, z.B. 22 -> 23
    return currentHour >= NIGHT_START_HOUR && currentHour < NIGHT_END_HOUR;
  }
}
