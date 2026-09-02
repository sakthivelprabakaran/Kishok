-- ============================================================================
-- Kootzy — shopping cart
--
-- Run AFTER 002-accounts-and-shipping.sql. Idempotent, additive.
--
-- WHY THESE SHAPES
--
-- 1. One implicit cart per customer: cart_items keyed by user_id. A separate
--    carts table would buy us multiple concurrent carts, which no requirement
--    asks for, at the cost of a join on every read.
--
-- 2. The design spec lives in a jsonb column. A Kootzy line item is not a SKU —
--    it is text plus a font plus up to four colours plus product-specific
--    geometry (word-art backing, bead shape and spacing, organizer layout, LED
--    cover options). Modelling that relationally would mean a wide sparse table
--    that changes shape every time a product is added. The columns that are
--    queried or validated stay first-class; the rest is jsonb.
--
-- 3. unit_price is stored but must be treated as a CACHE for display, never as
--    the price charged. It is recomputed server-side at checkout from weight and
--    the cost model. A client that can name its own price is a client that will.
--    (Note the existing bug this guards against: /api/order currently accepts
--    finalAmount straight from the browser.)
--
-- 4. Carts are user-owned and fully writable by their owner under RLS — unlike
--    orders, which are read-only to customers because status and dispatch are
--    server-owned.
-- ============================================================================

create table if not exists public.cart_items (
    id            bigint      generated always as identity primary key,
    user_id       uuid        not null references auth.users(id) on delete cascade,

    -- First-class because they are validated, filtered or shown in every list.
    product_type  text        not null,
    text_value    text        not null,
    quantity      integer     not null default 1,

    -- Everything else about the design: font, colours, backing, bead params,
    -- organizer layout, LED options. Shape mirrors the viewer's params payload.
    design        jsonb       not null default '{}'::jsonb,

    -- Display cache only. Recomputed at checkout. See note 3.
    unit_price    numeric(10,2) not null default 0,
    weight_g      numeric(10,2) not null default 0,

    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),

    constraint cart_items_quantity_valid check (quantity between 1 and 20),
    constraint cart_items_text_len       check (char_length(text_value) <= 200),
    constraint cart_items_product_valid  check (product_type in (
        'keychain', 'wordart', 'loveseries', 'tilekey', 'linked_initials',
        'nametag', 'girly_keychain', 'supported_text', 'flower_keychain',
        'led_word_stand', 'led_word_art', 'bordered_keychain', 'bubble_keychain',
        'nameplate', 'desk_organizer', 'name_beads'
    ))
);

create index if not exists cart_items_user_idx on public.cart_items (user_id);

-- Keep updated_at honest so "your cart from 3 days ago" reminders are possible.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists cart_items_touch on public.cart_items;
create trigger cart_items_touch
    before update on public.cart_items
    for each row execute function public.touch_updated_at();

-- ── Order line items ────────────────────────────────────────────────────────
-- Once a cart becomes an order it must be frozen, for the same reason addresses
-- are snapshotted: editing a design later must not rewrite what was produced or
-- invoiced. The kiosk's single-design columns on public.orders are left intact
-- so the quick-order path keeps working unchanged; multi-item orders read their
-- lines from here.
create table if not exists public.order_items (
    id            bigint      generated always as identity primary key,
    order_num     text        not null references public.orders(order_num) on delete cascade,

    product_type  text        not null,
    text_value    text        not null,
    quantity      integer     not null default 1,
    design        jsonb       not null default '{}'::jsonb,

    -- Frozen at order time. These are the numbers that were charged.
    unit_price    numeric(10,2) not null default 0,
    line_total    numeric(10,2) not null default 0,
    weight_g      numeric(10,2) not null default 0,

    created_at    timestamptz not null default now(),

    constraint order_items_quantity_valid check (quantity >= 1)
);

create index if not exists order_items_order_idx on public.order_items (order_num);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.cart_items  enable row level security;
alter table public.order_items enable row level security;

-- The cart is the one place a customer legitimately writes rows directly.
drop policy if exists "own cart read"   on public.cart_items;
drop policy if exists "own cart insert" on public.cart_items;
drop policy if exists "own cart update" on public.cart_items;
drop policy if exists "own cart delete" on public.cart_items;
create policy "own cart read"   on public.cart_items for select using (auth.uid() = user_id);
create policy "own cart insert" on public.cart_items for insert with check (auth.uid() = user_id);
create policy "own cart update" on public.cart_items for update using (auth.uid() = user_id)
                                                      with check (auth.uid() = user_id);
create policy "own cart delete" on public.cart_items for delete using (auth.uid() = user_id);

-- Order lines are read-only to the customer, via ownership of the parent order.
drop policy if exists "own order items read" on public.order_items;
create policy "own order items read" on public.order_items for select using (
    exists (
        select 1 from public.orders o
        where o.order_num = order_items.order_num
          and o.user_id = auth.uid()
    )
);

-- ── Verify ──────────────────────────────────────────────────────────────────
-- select tablename, policyname, cmd from pg_policies
--  where tablename in ('cart_items','order_items') order by tablename, policyname;
