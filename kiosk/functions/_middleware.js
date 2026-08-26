/* Runs before every Function. Adds the security headers helmet used to add,
 * answers CORS preflights, and keeps API errors as JSON rather than HTML.
 */

import { corsHeaders } from '../shared/http.js';

export async function onRequest(context) {
    const { request, env, next } = context;
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: cors });
    }

    let response;
    try {
        response = await next();
    } catch (err) {
        console.error('Unhandled function error:', err && err.stack ? err.stack : err);
        return new Response(JSON.stringify({ error: 'Unexpected server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...cors },
        });
    }

    const out = new Response(response.body, response);
    for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
    out.headers.set('X-Content-Type-Options', 'nosniff');
    out.headers.set('Referrer-Policy', 'no-referrer');
    out.headers.set('X-Frame-Options', 'DENY');
    return out;
}
