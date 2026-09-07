/* Header profile control.
 *
 * Replaces the old account button, which showed the ACTION with the identity
 * bolted on — "Sign out (sakthivel)". That reads backwards: the header should
 * tell you WHO you are, and hide the destructive action one tap deeper. It also
 * ellipsised at 9.5rem on a phone, so long addresses turned into "Sign out (a…".
 *
 * Signed in  → 44px avatar circle (Google photo, else first initial) that opens
 *              a small menu carrying the name, the email and Sign out.
 * Signed out → plain "Sign in" button.
 *
 * Stays lazy: renders the signed-out state with NO supabase-js on the page, and
 * only imports auth (~100 KB from a CDN) when a session hint exists in
 * localStorage or when the visitor actually clicks Sign in.
 */
import { hasSessionHint, loadAuth } from './auth-boot.js?v=k1';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/** Best-effort display name from a supabase user. */
function displayName(user) {
    const meta = (user && user.user_metadata) || {};
    const name = meta.full_name || meta.name || '';
    if (name) return name;
    const email = (user && user.email) || '';
    return email ? email.split('@')[0] : 'Account';
}

function avatarUrl(user) {
    const meta = (user && user.user_metadata) || {};
    return meta.avatar_url || meta.picture || '';
}

function initial(user) {
    return (displayName(user).trim()[0] || '?').toUpperCase();
}

function renderSignedOut(host, onSignIn) {
    host.innerHTML = '<button type="button" class="header-auth-btn" data-auth-state="out">Sign in</button>';
    host.querySelector('button').onclick = onSignIn;
}

function renderSignedIn(host, user, onSignOut) {
    const name = displayName(user);
    const email = user.email || '';
    const photo = avatarUrl(user);
    const face = photo
        ? `<img class="profile-avatar-img" src="${esc(photo)}" alt="" referrerpolicy="no-referrer" width="34" height="34">`
        : `<span class="profile-avatar-initial" aria-hidden="true">${esc(initial(user))}</span>`;

    host.innerHTML = `
        <button type="button" class="profile-chip" data-auth-state="in"
                aria-haspopup="true" aria-expanded="false"
                aria-label="Your profile — ${esc(name)}" title="${esc(name)}">
            ${face}
        </button>
        <div class="profile-menu" role="menu" hidden>
            <div class="profile-menu-id">
                <strong>${esc(name)}</strong>
                ${email ? `<span>${esc(email)}</span>` : ''}
            </div>
            <a class="profile-menu-link" role="menuitem" href="my-orders.html">My orders</a>
            <button type="button" class="profile-menu-signout" role="menuitem">Sign out</button>
        </div>`;

    const chip = host.querySelector('.profile-chip');
    const menu = host.querySelector('.profile-menu');

    const close = () => {
        menu.hidden = true;
        chip.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', onDocClick, true);
        document.removeEventListener('keydown', onKey, true);
    };
    const onDocClick = (e) => { if (!host.contains(e.target)) close(); };
    const onKey = (e) => { if (e.key === 'Escape') { close(); chip.focus(); } };

    chip.onclick = (e) => {
        e.stopPropagation();
        if (menu.hidden) {
            menu.hidden = false;
            chip.setAttribute('aria-expanded', 'true');
            document.addEventListener('click', onDocClick, true);
            document.addEventListener('keydown', onKey, true);
        } else {
            close();
        }
    };
    host.querySelector('.profile-menu-signout').onclick = onSignOut;
}

/**
 * Mount the profile control.
 * @param {HTMLElement|string} target element or selector for the host container
 */
export async function mountProfileChip(target) {
    const host = typeof target === 'string' ? document.querySelector(target) : target;
    if (!host) return;

    let auth = null;

    const signIn = async () => {
        try {
            if (!auth) auth = await loadAuth();
            if (!auth.isConfigured()) throw new Error('Sign-in is not configured yet.');
            await auth.signInWithGoogle();
        } catch (err) {
            alert(err && err.message ? err.message : 'Could not start sign-in.');
        }
    };

    const signOut = async () => {
        try {
            if (!auth) auth = await loadAuth();
            await auth.signOut();
            window.location.reload();
        } catch (err) {
            alert(err && err.message ? err.message : 'Could not sign out.');
        }
    };

    // Paint the cheap state first so the header never sits empty.
    renderSignedOut(host, signIn);

    if (!hasSessionHint()) return;

    try {
        auth = await loadAuth();
        const paint = () => {
            if (auth.isSignedIn()) renderSignedIn(host, auth.getUser() || {}, signOut);
            else renderSignedOut(host, signIn);
        };
        paint();
        auth.onAuthChange(paint);
    } catch (err) {
        console.error('profile chip: auth unavailable:', err.message);
    }
}
