/**
 * Customer cart + checkout routes (Supabase Auth JWT + PostgREST).
 *
 * Checkout claims the cart (delete+return) before creating an order so a
 * double-tap cannot place two orders from the same lines. Cart POST will not
 * create a second line for an identical design — it bumps quantity instead.
 */
module.exports = function mountCustomerRoutes(app, deps) {
  const fetchWithTimeout = deps.fetchWithTimeout;
  const bearerToken = deps.bearerToken;
  const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  function requireCustomerToken(req) {
    const token = bearerToken(req);
    if (!token) {
      const err = new Error('Sign in to continue');
      err.status = 401;
      throw err;
    }
    return token;
  }

  async function supabaseAuthUser(accessToken) {
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/auth/v1/user`,
      {
        method: 'GET',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
      },
      8000
    );
    if (!res.ok) return null;
    return res.json();
  }

  async function supabaseRest(accessToken, method, path, body, prefer) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      const err = new Error('Supabase is not configured on the server');
      err.status = 503;
      throw err;
    }
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
    if (prefer) headers.Prefer = prefer;
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/${path}`,
      {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      10000
    );
    const raw = await res.text();
    if (!res.ok) {
      let msg = raw;
      try { msg = JSON.parse(raw).message || JSON.parse(raw).error || raw; } catch (_) {}
      const err = new Error(msg || `Database error (${res.status})`);
      err.status = res.status >= 400 && res.status < 600 ? res.status : 500;
      throw err;
    }
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_) { return null; }
  }

  async function supabaseAdmin(method, path, body, prefer) {
    const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !key) {
      const err = new Error('Supabase service key is not configured on the server');
      err.status = 503;
      throw err;
    }
    const headers = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    };
    if (prefer) headers.Prefer = prefer;
    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/${path}`,
      {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      10000
    );
    const raw = await res.text();
    if (!res.ok) {
      let msg = raw;
      try { msg = JSON.parse(raw).message || raw; } catch (_) {}
      const err = new Error(msg || `Database error (${res.status})`);
      err.status = res.status >= 400 && res.status < 600 ? res.status : 500;
      throw err;
    }
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_) { return null; }
  }

  const CART_SELECT = 'id,product_type,text_value,quantity,design,preview,unit_price,weight_g,created_at';
  const PREVIEW_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
  const PREVIEW_MAX_CHARS = 160000;
  const VALID_PRODUCT_TYPES = [
    'keychain', 'wordart', 'loveseries', 'tilekey', 'linked_initials',
    'nametag', 'girly_keychain', 'supported_text', 'flower_keychain',
    'led_word_stand', 'led_word_art', 'bordered_keychain', 'bubble_keychain',
    'nameplate', 'desk_organizer', 'name_beads',
  ];

  function cleanPreview(value) {
    const s = typeof value === 'string' ? value : '';
    if (!s || s.length > PREVIEW_MAX_CHARS || !PREVIEW_RE.test(s)) return '';
    return s;
  }

  function designKey(productType, text, design) {
    let d = '{}';
    try { d = JSON.stringify(design || {}); } catch (_) { d = '{}'; }
    return String(productType) + '\0' + String(text) + '\0' + d;
  }

  function dedupeCartRows(rows) {
    const map = new Map();
    for (const r of rows || []) {
      const key = designKey(r.product_type, r.text_value, r.design);
      if (map.has(key)) {
        const prev = map.get(key);
        prev.quantity = Math.min(20, (Number(prev.quantity) || 0) + (Number(r.quantity) || 0));
      } else {
        map.set(key, { ...r, quantity: Number(r.quantity) || 1 });
      }
    }
    return Array.from(map.values());
  }

  function cartRowToItem(r) {
    return {
      id: r.id,
      productType: r.product_type,
      text: r.text_value,
      quantity: Number(r.quantity),
      design: r.design || {},
      preview: cleanPreview(r.preview),
      unitPrice: Number(r.unit_price),
      weightG: Number(r.weight_g),
      createdAt: r.created_at,
    };
  }

  app.get('/api/cart', async (req, res) => {
    try {
      const token = requireCustomerToken(req);
      const rows = await supabaseRest(token, 'GET', `cart_items?select=${CART_SELECT}&order=created_at.desc`);
      const items = Array.isArray(rows) ? rows.map(cartRowToItem) : [];
      return res.json({
        items,
        count: items.reduce((n, i) => n + i.quantity, 0),
      });
    } catch (err) {
      console.error('cart GET error:', err);
      const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
      return res.status(status).json({ error: err.message || 'Failed to load cart' });
    }
  });

  app.post('/api/cart', async (req, res) => {
    try {
      const token = requireCustomerToken(req);
      const body = req.body || {};
      const productType = String(body.productType || '').trim();
      const text = String(body.text || '').trim();
      const quantity = parseInt(body.quantity, 10);

      if (!VALID_PRODUCT_TYPES.includes(productType)) {
        return res.status(400).json({ error: 'Unknown product type' });
      }
      if (!text) return res.status(400).json({ error: 'The design needs some text' });
      if (text.length > 200) return res.status(400).json({ error: 'Text is too long (max 200 characters)' });
      if (!Number.isFinite(quantity) || quantity < 1 || quantity > 20) {
        return res.status(400).json({ error: 'Quantity must be between 1 and 20' });
      }

      const design = (body.design && typeof body.design === 'object' && !Array.isArray(body.design))
        ? body.design : {};

      const existingRows = await supabaseRest(
        token,
        'GET',
        `cart_items?select=${CART_SELECT}&product_type=eq.${encodeURIComponent(productType)}&text_value=eq.${encodeURIComponent(text)}&order=created_at.asc`
      );
      if (Array.isArray(existingRows) && existingRows.length > 0) {
        const match = existingRows.find((r) => designKey(r.product_type, r.text_value, r.design) === designKey(productType, text, design));
        if (match) {
          const newQty = Math.min(20, (Number(match.quantity) || 0) + quantity);
          const updated = await supabaseRest(
            token,
            'PATCH',
            `cart_items?id=eq.${match.id}`,
            { quantity: newQty },
            'return=representation'
          );
          const row = Array.isArray(updated) ? updated[0] : updated;
          return res.status(200).json({ item: cartRowToItem(row), merged: true });
        }
      }

      const existing = await supabaseRest(token, 'GET', 'cart_items?select=id&limit=26');
      if (Array.isArray(existing) && existing.length >= 25) {
        return res.status(409).json({ error: 'A cart holds at most 25 designs' });
      }

      const saved = await supabaseRest(
        token,
        'POST',
        'cart_items',
        {
          product_type: productType,
          text_value: text,
          quantity,
          design,
          preview: cleanPreview(body.preview),
          unit_price: Number(body.unitPrice) || 0,
          weight_g: Number(body.weightG) || 0,
        },
        'return=representation'
      );
      const row = Array.isArray(saved) ? saved[0] : saved;
      return res.status(201).json({ item: cartRowToItem(row) });
    } catch (err) {
      console.error('cart POST error:', err);
      const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
      return res.status(status).json({ error: err.message || 'Failed to add to cart' });
    }
  });

  app.patch('/api/cart', async (req, res) => {
    try {
      const token = requireCustomerToken(req);
      const body = req.body || {};
      const id = parseInt(body.id, 10);
      const quantity = parseInt(body.quantity, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Which line?' });
      if (!Number.isFinite(quantity) || quantity < 1 || quantity > 20) {
        return res.status(400).json({ error: 'Quantity must be between 1 and 20' });
      }
      const rows = await supabaseRest(
        token,
        'PATCH',
        `cart_items?id=eq.${id}`,
        { quantity },
        'return=representation'
      );
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(404).json({ error: 'Line not found' });
      }
      return res.json({ item: cartRowToItem(rows[0]) });
    } catch (err) {
      console.error('cart PATCH error:', err);
      const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
      return res.status(status).json({ error: err.message || 'Failed to update cart' });
    }
  });

  app.delete('/api/cart', async (req, res) => {
    try {
      const token = requireCustomerToken(req);
      if (String(req.query.all || '') === '1') {
        await supabaseRest(token, 'DELETE', 'cart_items?id=gt.0');
        return res.json({ success: true, items: [], count: 0 });
      }
      const id = parseInt(req.query.id, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Which line?' });
      await supabaseRest(token, 'DELETE', `cart_items?id=eq.${id}`);
      return res.json({ success: true });
    } catch (err) {
      console.error('cart DELETE error:', err);
      const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
      return res.status(status).json({ error: err.message || 'Failed to update cart' });
    }
  });

  app.post('/api/checkout', async (req, res) => {
    try {
      const token = requireCustomerToken(req);
      const user = await supabaseAuthUser(token);
      if (!user || !user.id) {
        return res.status(401).json({ error: 'Your session has expired — please sign in again.' });
      }

      const body = req.body || {};
      const method = body.fulfilmentMethod === 'ship' ? 'ship' : 'pickup';
      const contactName = String(body.contactName || '').trim().slice(0, 100);
      const contactPhone = String(body.contactPhone || '').replace(/\D/g, '');
      if (!contactName) return res.status(400).json({ error: 'We need a name for the order' });
      if (!/^[0-9]{10}$/.test(contactPhone)) {
        return res.status(400).json({ error: 'Phone must be exactly 10 digits' });
      }

      let address = {};
      if (method === 'ship') {
        const a = body.address || {};
        address = {
          recipient_name: String(a.recipientName || '').trim().slice(0, 100),
          phone: String(a.phone || '').replace(/\D/g, ''),
          line1: String(a.line1 || '').trim().slice(0, 200),
          line2: String(a.line2 || '').trim().slice(0, 200),
          city: String(a.city || '').trim().slice(0, 100),
          state: String(a.state || '').trim().slice(0, 100),
          pincode: String(a.pincode || '').replace(/\D/g, ''),
          country: 'IN',
        };
        const problems = [];
        if (!address.recipient_name) problems.push('recipient name');
        if (!/^[0-9]{10}$/.test(address.phone)) problems.push('a 10-digit phone number');
        if (!address.line1) problems.push('address line 1');
        if (!address.city) problems.push('city');
        if (!address.state) problems.push('state');
        if (!/^[1-9][0-9]{5}$/.test(address.pincode)) problems.push('a valid 6-digit PIN code');
        if (problems.length) {
          return res.status(400).json({ error: `To ship this order we still need ${problems.join(', ')}.` });
        }
      }

      // Claim cart first so concurrent checkout cannot place a second order.
      const claimed = await supabaseAdmin(
        'DELETE',
        `cart_items?user_id=eq.${encodeURIComponent(user.id)}`,
        undefined,
        'return=representation'
      );
      let cartRows = Array.isArray(claimed) ? claimed : [];
      cartRows = dedupeCartRows(cartRows);
      if (cartRows.length === 0) {
        return res.status(409).json({ error: 'Your cart is empty' });
      }

      async function restoreCart(rows) {
        try {
          await supabaseAdmin(
            'POST',
            'cart_items',
            rows.map((r) => ({
              user_id: user.id,
              product_type: r.product_type,
              text_value: r.text_value,
              quantity: Number(r.quantity) || 1,
              design: r.design || {},
              preview: r.preview || '',
              unit_price: Number(r.unit_price) || 0,
              weight_g: Number(r.weight_g) || 0,
            })),
            'return=minimal'
          );
        } catch (restoreErr) {
          console.error('cart restore after failed checkout:', restoreErr.message);
        }
      }

      let quote;
      try {
        const { priceOrder } = await import('./public/js/pricing.js');
        quote = priceOrder(cartRows.map((r) => ({
          productType: r.product_type,
          text: r.text_value,
          design: r.design || {},
          preview: r.preview || '',
          quantity: Number(r.quantity),
          weightG: Number(r.weight_g),
        })));
      } catch (priceErr) {
        // Pricing must NEVER silently degrade: the old fallback used the cart's
        // cached unit_price, which is a client-supplied number — a deploy
        // misconfiguration would have quietly become customer-named prices.
        // Put the designs back and fail loudly instead.
        console.error('pricing module unavailable — refusing to checkout:', priceErr.message);
        await restoreCart(cartRows);
        return res.status(500).json({ error: 'Could not price your order — nothing was charged. Please try again.' });
      }

      const first = quote.lines[0];
      const orderRow = {
        user_id: user.id,
        customer_name: contactName,
        phone: contactPhone,
        product_type: first.productType,
        text_value: first.text,
        wordart_base: (first.design && first.design.wordartBase) || 'none',
        font: (first.design && first.design.font) || 'Standard',
        base_color: (first.design && first.design.colors && first.design.colors.base) || '#FFFFFF',
        font_color: (first.design && first.design.colors && first.design.colors.font) || '#000000',
        weight_g: quote.lines.reduce((n, l) => n + (Number(l.weightG) || 0) * (l.breakdown ? l.breakdown.quantity : 1), 0),
        final_amount: quote.total,
        quantity: quote.itemCount,
        shipping_fee: quote.shippingFee,
        fulfilment_method: method,
        status: 'Pending',
      };
      if (method === 'ship') {
        Object.assign(orderRow, {
          ship_recipient_name: address.recipient_name,
          ship_phone: address.phone,
          ship_line1: address.line1,
          ship_line2: address.line2,
          ship_city: address.city,
          ship_state: address.state,
          ship_pincode: address.pincode,
          ship_country: address.country,
        });
      }

      let order;
      try {
        const saved = await supabaseAdmin('POST', 'orders', orderRow, 'return=representation');
        order = Array.isArray(saved) ? saved[0] : saved;
      } catch (orderErr) {
        await restoreCart(cartRows);
        throw orderErr;
      }
      if (!order || !order.order_num) {
        await restoreCart(cartRows);
        return res.status(500).json({ error: 'Could not create order' });
      }

      try {
        await supabaseAdmin(
          'POST',
          'order_items',
          quote.lines.map((line) => ({
            order_num: order.order_num,
            product_type: line.productType,
            text_value: line.text,
            quantity: line.breakdown ? line.breakdown.quantity : 1,
            design: line.design || {},
            preview: line.preview || '',
            unit_price: line.unitPrice,
            line_total: line.lineTotal,
            weight_g: line.weightG || 0,
          })),
          'return=minimal'
        );
      } catch (itemErr) {
        console.error('order_items insert failed, cancelling', order.order_num, itemErr.message);
        try {
          await supabaseAdmin('PATCH', `orders?order_num=eq.${encodeURIComponent(order.order_num)}`, { status: 'Cancelled' });
        } catch (_) {}
        await restoreCart(cartRows);
        return res.status(500).json({ error: 'Could not save your order — nothing was charged. Please try again.' });
      }

      return res.status(201).json({
        success: true,
        orderNum: order.order_num,
        fulfilmentMethod: method,
        paid: false,
        totals: {
          subtotal: quote.subtotal,
          shippingFee: quote.shippingFee,
          total: quote.total,
          itemCount: quote.itemCount,
        },
      });
    } catch (err) {
      console.error('checkout error:', err);
      const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
      return res.status(status).json({ error: err.message || 'Failed to place order' });
    }
  });
};
