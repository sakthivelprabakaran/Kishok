/* Order status vocabulary for customer-facing pages.
 *
 * Labels and colours follow the brand kit's canonical lifecycle
 * (ecommerce-operations-kit-v001/00-standards/STATUS-SYSTEM.json), extended
 * with the kiosk's own states (Verified, Printed, PickedUp). The kit's rule is
 * baked into how these are rendered: never communicate status by colour alone —
 * always colour + icon + text. The chips here are a coloured dot + a glyph +
 * the label; the dot colour is decorative reinforcement, not the message.
 *
 * `tone` drives the glyph: ok ✓, active ●, attention !, terminal ✕.
 */
export const STATUS_META = {
    Pending:         { label: 'Order received',          color: '#00B5C8', tone: 'active',
                       customerNote: 'We have your order and are confirming payment.' },
    Verified:        { label: 'Payment confirmed',       color: '#16856B', tone: 'ok',
                       customerNote: 'Payment confirmed — your design is queued.' },
    Printed:         { label: 'Printed & ready',         color: '#16856B', tone: 'ok',
                       customerNote: 'Ready for collection at the counter.' },
    PickedUp:        { label: 'Collected',               color: '#16856B', tone: 'ok',
                       customerNote: 'Collected. Made to make you smile!' },
    PaymentFailed:   { label: 'Payment needs attention', color: '#FF1E36', tone: 'attention',
                       customerNote: 'The payment did not complete. No charge was made.' },
    Processing:      { label: 'In production',           color: '#F27A24', tone: 'active',
                       customerNote: 'Your design is being printed.' },
    QCHold:          { label: 'Quality check',           color: '#FF1E36', tone: 'attention',
                       customerNote: 'We spotted something and are re-checking your piece.' },
    QCPassed:        { label: 'Quality checked',         color: '#16856B', tone: 'ok',
                       customerNote: 'Checked and approved.' },
    Packed:          { label: 'Packed',                  color: '#172B35', tone: 'ok',
                       customerNote: 'Packed with care and awaiting dispatch.' },
    Shipped:         { label: 'Shipped',                 color: '#00B5C8', tone: 'active',
                       customerNote: 'On its way to you.' },
    OutForDelivery:  { label: 'Out for delivery',        color: '#F27A24', tone: 'active',
                       customerNote: 'Arriving today — keep your phone reachable.' },
    Delivered:       { label: 'Delivered',               color: '#16856B', tone: 'ok',
                       customerNote: 'Delivered. Made to make you smile!' },
    Cancelled:       { label: 'Cancelled',               color: '#FF1E36', tone: 'terminal',
                       customerNote: 'This order was cancelled. Nothing was charged.' },
    ReturnRequested: { label: 'Return requested',        color: '#172B35', tone: 'active',
                       customerNote: 'Return requested — we will confirm the next step.' },
    ReturnReceived:  { label: 'Return received',         color: '#172B35', tone: 'active',
                       customerNote: 'Your return arrived and is being checked.' },
    Refunded:        { label: 'Refund confirmed',        color: '#00B5C8', tone: 'ok',
                       customerNote: 'Refund confirmed — allow a few days for your bank.' },
};

/* The happy-path sequences shown as a progress timeline. Statuses outside the
 * order's flow (Cancelled, QCHold, returns…) replace the timeline with a single
 * prominent chip instead of pretending to be a step. */
export const PICKUP_FLOW = ['Pending', 'Verified', 'Printed', 'PickedUp'];
export const SHIP_FLOW = ['Pending', 'Verified', 'Processing', 'QCPassed', 'Packed',
    'Shipped', 'OutForDelivery', 'Delivered'];

export function metaFor(status) {
    return STATUS_META[status] || { label: status, color: '#172B35', tone: 'active', customerNote: '' };
}

export function flowFor(order) {
    return order.fulfilmentMethod === 'ship' ? SHIP_FLOW : PICKUP_FLOW;
}
