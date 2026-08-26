/* Any /api/* path with no matching Function falls through to here, so a bad API
 * call returns JSON instead of the kiosk's index.html (which used to confuse
 * fetch callers with "Unexpected token '<'").
 */
export async function onRequest({ next }) {
    const res = await next();
    if (res.status === 404) {
        return new Response(JSON.stringify({ error: 'API route not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    return res;
}
