/* Kootzy customer auth — Supabase Auth (Google OAuth).
 *
 * Wires into cart.js via setTokenProvider so cart / my-orders / checkout
 * keep working with a single session source. No second auth system.
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { setTokenProvider } from './cart.js?v=kootzy1';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js?v=auth1';

const CONFIGURED =
    SUPABASE_URL &&
    !SUPABASE_URL.includes('YOUR_PROJECT_REF') &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY');

export const supabase = CONFIGURED
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
              flowType: 'pkce',
          },
      })
    : null;

let currentSession = null;
const listeners = new Set();

function emit() {
    for (const fn of listeners) {
        try {
            fn(currentSession);
        } catch (err) {
            console.error('auth listener failed:', err);
        }
    }
}

function applySession(session) {
    currentSession = session || null;
    setTokenProvider(() => currentSession?.access_token ?? null);
    emit();
}

/** Subscribe to auth changes. Returns unsubscribe. */
export function onAuthChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function isConfigured() {
    return Boolean(supabase);
}

export function isSignedIn() {
    return Boolean(currentSession?.access_token);
}

export function getSession() {
    return currentSession;
}

export function getUser() {
    return currentSession?.user ?? null;
}

/** Call once per page (early). Safe to call multiple times. */
export async function initAuth() {
    if (!supabase) {
        applySession(null);
        return null;
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) console.error('auth getSession:', error.message);
    applySession(data?.session ?? null);

    supabase.auth.onAuthStateChange((_event, session) => {
        applySession(session);
    });

    return currentSession;
}

/**
 * Start Google OAuth. Redirects away from the page.
 * @param {string} [redirectTo] absolute URL to land on after Google (default: /auth/callback.html)
 */
export async function signInWithGoogle(redirectTo) {
    if (!supabase) {
        throw new Error('Sign-in is not configured yet. Add your Supabase URL and anon key.');
    }

    const target =
        redirectTo ||
        `${window.location.origin}/auth/callback.html`;

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: target,
            queryParams: {
                access_type: 'offline',
                prompt: 'select_account',
            },
        },
    });

    if (error) throw error;
    return data;
}

export async function signOut() {
    if (!supabase) {
        applySession(null);
        return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    applySession(null);
}

/** Friendly message for UI — never dump raw OAuth internals. */
export function friendlyAuthError(err) {
    if (!err) return 'Something went wrong. Please try again.';
    const msg = String(err.message || err).toLowerCase();
    if (msg.includes('not configured') || msg.includes('your_project')) {
        return 'Sign-in is not set up yet. Please try again later.';
    }
    if (msg.includes('popup') || msg.includes('blocked')) {
        return 'The sign-in window was blocked. Allow pop-ups and try again.';
    }
    if (msg.includes('network') || msg.includes('fetch')) {
        return 'Network problem. Check your connection and try again.';
    }
    if (msg.includes('cancel') || msg.includes('dismiss')) {
        return 'Sign-in was cancelled.';
    }
    return 'Could not start Google sign-in. Please try again.';
}
