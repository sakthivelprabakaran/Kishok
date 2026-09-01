/* Shared HTTP helpers for the Pages Functions.
 *
 * Replaces what Express gave us for free: json responses, CORS, the security
 * headers helmet added, the x-admin-pin gate, and the login rate limiter.
 */

import { db, DbError } from './db.js';

export function json(data, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            ...extraHeaders,
        },
    });
}

export function fail(message, status = 500) {
    return json({ error: message }, status);
}

/** Turn a thrown DbError (or anything else) into a sane JSON response. */
export function errorResponse(err) {
    if (err instanceof DbError) return fail(err.message, err.status);
    return fail(err && err.message ? err.message : 'Unexpected server error', 500);
}

/** Wrap a handler so no exception ever escapes as an HTML error page. */
export function guard(handler) {
    return async (ctx) => {
        try {
            return await handler(ctx);
        } catch (err) {
            console.error('API error:', err && err.stack ? err.stack : err);
            return errorResponse(err);
        }
    };
}

export async function readJson(request) {
    try {
        return (await request.json()) || {};
    } catch (_) {
        return {};
    }
}

/* ── Admin auth ── */

const VALID_PIN_RE = /^\d{4}$/;

/** Timing-safe-ish comparison so response time does not leak the PIN. */
export function pinMatches(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

export function adminConfigured(env) {
    return VALID_PIN_RE.test(String(env.ADMIN_PIN || ''));
}

/** Returns null when authorised, or a Response to return immediately. */
export function requireAdmin(request, env) {
    if (!adminConfigured(env)) {
        return fail('Admin authentication is not configured', 503);
    }
    const pin = String(request.headers.get('x-admin-pin') || '').trim();
    if (VALID_PIN_RE.test(pin) && pinMatches(pin, String(env.ADMIN_PIN))) return null;
    return fail('Unauthorized — admin PIN required', 401);
}

/* ── Login throttle: 10 attempts per IP per 15 minutes ──
 * express-rate-limit used process memory, which does not survive on Workers.
 * A tiny Postgres table gives the same behaviour across every isolate.
 */

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

export function clientIp(request) {
    return request.headers.get('CF-Connecting-IP')
        || request.headers.get('x-forwarded-for')
        || 'unknown';
}

/** True when this IP has burned its attempts. Fails open if the count query breaks. */
export async function loginBlocked(env, ip) {
    try {
        const since = new Date(Date.now() - LOGIN_WINDOW_MS).toISOString();
        const rows = await db(env).select(
            'login_attempts',
            `select=id&ip=eq.${encodeURIComponent(ip)}&at=gte.${encodeURIComponent(since)}&limit=${LOGIN_MAX_ATTEMPTS}`
        );
        return Array.isArray(rows) && rows.length >= LOGIN_MAX_ATTEMPTS;
    } catch (err) {
        // Don't lock admins out of their own kiosk because the counter is down.
        console.error('login throttle check failed, allowing:', err.message);
        return false;
    }
}

export async function recordLoginAttempt(env, ip) {
    try {
        await db(env).insertQuiet('login_attempts', { ip });
    } catch (err) {
        console.error('login attempt log failed:', err.message);
    }
}

/* ── CORS ── */

export function corsHeaders(request, env) {
    const allowed = env.ALLOWED_ORIGIN || '';
    const origin = request.headers.get('Origin') || '';
    // Same-origin (the kiosk itself) needs no ACAO header; only echo an origin we
    // have been told to trust, so this never becomes an open CORS proxy.
    const allow = allowed && origin === allowed ? origin : '';
    const headers = {
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,x-admin-pin',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
    };
    if (allow) headers['Access-Control-Allow-Origin'] = allow;
    return headers;
}
