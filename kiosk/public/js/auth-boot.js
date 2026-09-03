/* Lazy auth bootstrap for pages that only need a SESSION, not a sign-in UI
 * (the designer, the catalogue badge).
 *
 * Why lazy: auth.js pulls supabase-js from a CDN (~100 KB). A walk-up kiosk
 * customer who has never signed in should not pay that on the designer. But a
 * customer who HAS signed in must not add designs into localStorage while their
 * cart lives on the server — which is exactly the "badge says 1, cart is empty"
 * bug: add-to-cart ran signed-out on customize.html while cart.html listed the
 * (empty) server cart.
 *
 * supabase-js persists its session under `sb-<ref>-auth-token` in localStorage,
 * so the presence of such a key is a reliable "worth loading auth" hint.
 */
export async function bootAuthIfSession() {
    let hasHint = false;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i) || '';
            if (key.startsWith('sb-') && key.includes('auth-token')) { hasHint = true; break; }
        }
    } catch (_) { /* storage unavailable */ }
    if (!hasHint) return false;

    try {
        const auth = await import('./auth.js?v=k1');
        await auth.initAuth();
        return auth.isSignedIn();
    } catch (err) {
        console.error('auth boot failed:', err.message);
        return false;
    }
}
