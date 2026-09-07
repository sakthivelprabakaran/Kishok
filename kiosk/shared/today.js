/* Calendar ranges for the kiosk use the operator's local day, not UTC.
 * The old server ran in whatever timezone Vercel gave it; make the offset
 * explicit so a late-evening IST order never lands on the previous day.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ORDER_RANGES = new Set(['today', '7d', '30d', 'all', 'custom']);

function offsetMinutes(env = {}) {
    const parsed = parseInt(env.KIOSK_UTC_OFFSET_MINUTES || '330', 10); // default IST (+05:30)
    return Number.isFinite(parsed) && parsed >= -720 && parsed <= 840 ? parsed : 330;
}

function localTodayParts(offset, now = new Date()) {
    const local = new Date(now.getTime() + offset * 60000);
    return {
        year: local.getUTCFullYear(),
        month: local.getUTCMonth(),
        day: local.getUTCDate(),
    };
}

function localMidnightIso(year, month, day, offset) {
    return new Date(Date.UTC(year, month, day) - offset * 60000).toISOString();
}

function parseDate(value) {
    const match = DATE_RE.exec(String(value || '').trim());
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month, day));
    if (
        date.getUTCFullYear() !== year
        || date.getUTCMonth() !== month
        || date.getUTCDate() !== day
    ) return null;
    return { year, month, day, value: match[0] };
}

export function todayRangeIso(env = {}) {
    const offset = offsetMinutes(env);
    const today = localTodayParts(offset);
    const start = localMidnightIso(today.year, today.month, today.day, offset);
    const end = new Date(new Date(start).getTime() + DAY_MS).toISOString();
    return { start, end };
}

/**
 * Resolve an admin order range into inclusive-start/exclusive-end timestamps.
 * Returns { error } for invalid custom input so API handlers can return 400.
 */
export function adminOrderRangeIso(input = {}, env = {}, defaultRange = '30d') {
    const requested = String(input.range || defaultRange).trim().toLowerCase();
    const range = ORDER_RANGES.has(requested) ? requested : defaultRange;
    const offset = offsetMinutes(env);

    if (range === 'all') return { range, start: '', end: '' };

    if (range === 'custom') {
        const from = parseDate(input.from);
        const to = parseDate(input.to);
        if (!from || !to) {
            return { error: 'Choose valid From and To dates in YYYY-MM-DD format.' };
        }
        const fromUtc = Date.UTC(from.year, from.month, from.day);
        const toUtc = Date.UTC(to.year, to.month, to.day);
        if (fromUtc > toUtc) return { error: 'From date cannot be after To date.' };
        return {
            range,
            from: from.value,
            to: to.value,
            start: localMidnightIso(from.year, from.month, from.day, offset),
            end: localMidnightIso(to.year, to.month, to.day + 1, offset),
        };
    }

    const days = range === 'today' ? 1 : range === '7d' ? 7 : 30;
    const today = localTodayParts(offset);
    const end = localMidnightIso(today.year, today.month, today.day + 1, offset);
    const start = new Date(new Date(end).getTime() - days * DAY_MS).toISOString();
    return { range, start, end };
}
