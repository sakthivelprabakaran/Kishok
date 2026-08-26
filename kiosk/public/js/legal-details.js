/* ─────────────────────────────────────────────────────────────
   YoursGifts — business details used by the legal pages.

   FILL THIS IN BEFORE GOING LIVE. Every legal page reads from here, so this is
   the only file to edit. While any value still starts with "TODO:", the pages
   render a loud draft banner instead of silently publishing blanks.

   Why these fields: the Consumer Protection (e-Commerce) Rules 2020 require a
   reachable seller identity and a named grievance officer, and the DPDP Act 2023
   requires a contactable person for data requests.
   ───────────────────────────────────────────────────────────── */

export const BUSINESS = {
    // Trading name shown to customers.
    brandName: 'YoursGifts',

    // Legal/registered name.
    legalName: 'YoursGifts',

    // Full address customers can reach.
    addressLines: [
        'Madippakkam',
        'Chennai, Tamil Nadu',
        '600091',
    ],

    // Contact channels. Both must actually be monitored.
    phone: '+91 87600 05259',
    email: 'yoursgiftsorders@gmail.com',

    // GST registration number, or the string 'Not GST registered'.
    gstin: 'Not GST registered',

    // Named grievance officer (may be the same person as the proprietor).
    // Any field left as an empty string is hidden from the page rather than
    // rendered blank — the officer is reachable on the business phone above.
    grievanceOfficer: {
        name:  'Sakthivel Prabakaran',
        email: 'yoursgiftsorders@gmail.com',
        phone: '',
    },

    // City whose courts govern disputes.
    jurisdictionCity: 'Chennai',

    // Bump when you materially change any policy.
    lastUpdated: '26 August 2026',

    // Typical time from payment to collection, used in the refund policy.
    fulfilmentWindow: '15–20 minutes',
};

/* ── Rendering helpers ── */

function isPlaceholder(value) {
    return typeof value === 'string' && value.trim().startsWith('TODO:');
}

/** Every unfilled field, flattened, for the draft banner. */
export function missingFields(b = BUSINESS) {
    const missing = [];
    const walk = (obj, prefix) => {
        for (const [k, v] of Object.entries(obj)) {
            const path = prefix ? `${prefix}.${k}` : k;
            if (Array.isArray(v)) {
                v.forEach((item, i) => { if (isPlaceholder(item)) missing.push(`${path}[${i}]`); });
            } else if (v && typeof v === 'object') {
                walk(v, path);
            } else if (isPlaceholder(v)) {
                missing.push(path);
            }
        }
    };
    walk(b, '');
    return missing;
}

/**
 * Replaces every [data-biz="key.path"] element with its value, renders the
 * address block, stamps the date, and shows a draft banner while anything is
 * still a TODO — so an incomplete policy can never quietly go out.
 */
export function renderLegalPage() {
    const get = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), BUSINESS);

    /* A field set to '' is intentionally omitted — drop its whole definition-list
       row (the <dd> and the <dt> labelling it) rather than showing an empty value. */
    const dropRow = (el) => {
        const dd = el.closest('dd') || el;
        const dt = dd.previousElementSibling;
        if (dt && dt.tagName === 'DT') dt.hidden = true;
        dd.hidden = true;
    };

    const isBlank = (v) => typeof v === 'string' && v.trim() === '';

    document.querySelectorAll('[data-biz]').forEach((el) => {
        const value = get(el.dataset.biz);
        if (value == null) return;
        if (isBlank(value)) { dropRow(el); return; }
        if (Array.isArray(value)) {
            el.innerHTML = value.map((line) => `<span class="biz-line">${line}</span>`).join('');
        } else {
            el.textContent = value;
        }
        if (isPlaceholder(value)) el.classList.add('biz-todo');
    });

    document.querySelectorAll('[data-biz-mailto]').forEach((el) => {
        const value = get(el.dataset.bizMailto);
        if (isBlank(value)) { dropRow(el); return; }
        el.textContent = value;
        if (!isPlaceholder(value)) el.href = 'mailto:' + value;
        else el.classList.add('biz-todo');
    });

    document.querySelectorAll('[data-biz-tel]').forEach((el) => {
        const value = get(el.dataset.bizTel);
        if (isBlank(value)) { dropRow(el); return; }
        el.textContent = value;
        if (!isPlaceholder(value)) el.href = 'tel:' + String(value).replace(/[^\d+]/g, '');
        else el.classList.add('biz-todo');
    });

    const missing = missingFields();
    const banner = document.getElementById('legalDraftBanner');
    if (banner) {
        if (missing.length) {
            banner.innerHTML =
                '<strong>⚠️ DRAFT — not ready to publish.</strong> ' + missing.length +
                ' business detail' + (missing.length === 1 ? '' : 's') +
                ' still unfilled in <code>js/legal-details.js</code>: ' +
                '<code>' + missing.join('</code>, <code>') + '</code>';
            banner.hidden = false;
        } else {
            banner.hidden = true;
        }
    }
}
