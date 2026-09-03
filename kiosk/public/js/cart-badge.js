/* Paints every [data-cart-count] badge on the page.
 *
 * Standalone on purpose: index.html does not load kiosk-app.js (it has no 3D
 * designer), so the badge logic cannot live there — an earlier version did
 * exactly that and the badge never painted anywhere.
 */
import * as Cart from './cart.js?v=k1';
import { bootAuthIfSession } from './auth-boot.js?v=k1';

function paint(n) {
    for (const b of document.querySelectorAll('[data-cart-count]')) {
        b.textContent = String(n);
        b.hidden = n === 0;
    }
}

function refresh() {
    paint(Cart.localCount());                       // synchronous, correct first paint
    if (Cart.isSignedIn()) {
        Cart.count().then(paint).catch(() => {});   // server figure when available
    }
}

Cart.onChange(refresh);
refresh();

// Signed-in browsers count the SERVER cart, not localStorage — same session
// boot as the designer, so the badge and the cart page agree.
bootAuthIfSession().then((signedIn) => {
    if (signedIn) refresh();
});
