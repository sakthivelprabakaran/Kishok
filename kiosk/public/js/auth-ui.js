/* Shared header / button wiring for Google sign-in.
 * Safe on pages that only need a header control or a dedicated Google button.
 */
import {
    initAuth,
    isSignedIn,
    isConfigured,
    signInWithGoogle,
    signOut,
    getUser,
    onAuthChange,
    friendlyAuthError,
} from './auth.js?v=auth1';

function googleIconSvg() {
    return `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.1 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.1 5.5l.1.1 6.2 5.2C39.2 37.1 44 32 44 24c0-1.3-.1-2.5-.4-3.5z"/>
    </svg>`;
}

/**
 * Wire a button to start Google OAuth.
 * @param {HTMLButtonElement|HTMLElement|null} btn
 * @param {{ errorEl?: HTMLElement|null }} [opts]
 */
export function bindGoogleButton(btn, opts = {}) {
    if (!btn) return;

    btn.addEventListener('click', async () => {
        if (btn.disabled) return;
        btn.disabled = true;
        const prev = btn.innerHTML;
        btn.setAttribute('aria-busy', 'true');
        btn.innerHTML = '<span>Connecting…</span>';

        try {
            if (!isConfigured()) {
                throw new Error('not configured');
            }
            await signInWithGoogle();
            // Browser navigates away; if not, re-enable below after a beat
        } catch (err) {
            btn.disabled = false;
            btn.removeAttribute('aria-busy');
            btn.innerHTML = prev;
            const msg = friendlyAuthError(err);
            if (opts.errorEl) {
                opts.errorEl.textContent = msg;
                opts.errorEl.hidden = false;
            } else {
                alert(msg);
            }
        }
    });
}

/** Paint #authAccountBtn (or [data-auth-account]) as Sign in / Sign out. */
export function bindAccountControl(el) {
    if (!el) return;

    function paint() {
        if (isSignedIn()) {
            const user = getUser();
            const label = user?.email ? `Sign out (${user.email.split('@')[0]})` : 'Sign out';
            el.textContent = label;
            el.setAttribute('data-auth-state', 'in');
            el.onclick = async () => {
                try {
                    await signOut();
                    window.location.reload();
                } catch (err) {
                    alert(friendlyAuthError(err));
                }
            };
        } else {
            el.textContent = 'Sign in';
            el.setAttribute('data-auth-state', 'out');
            el.onclick = async () => {
                try {
                    if (!isConfigured()) throw new Error('not configured');
                    await signInWithGoogle();
                } catch (err) {
                    alert(friendlyAuthError(err));
                }
            };
        }
    }

    paint();
    onAuthChange(paint);
}

export async function bootAuthUi() {
    await initAuth();
    bindAccountControl(document.getElementById('authAccountBtn'));
    bindGoogleButton(
        document.getElementById('googleSignInBtn'),
        { errorEl: document.getElementById('authError') }
    );
}
