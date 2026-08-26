/* "Today" for the kiosk means the operator's local day, not UTC.
 * The old server ran in whatever timezone Vercel gave it; make it explicit so a
 * late-evening IST order never lands on the previous day's sheet.
 */
export function todayRangeIso(env) {
    const offsetMinutes = parseInt(env.KIOSK_UTC_OFFSET_MINUTES || '330', 10); // default IST (+05:30)
    const now = new Date();
    const local = new Date(now.getTime() + offsetMinutes * 60000);
    const startLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
    const start = new Date(startLocal - offsetMinutes * 60000);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start: start.toISOString(), end: end.toISOString() };
}
