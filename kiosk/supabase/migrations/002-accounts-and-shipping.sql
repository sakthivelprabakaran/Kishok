-- ============================================================================
-- Kootzy — customer accounts, shipping addresses and the shipped-order lifecycle
--
-- Run AFTER schema.sql, in the Supabase SQL editor. Idempotent: safe to re-run.
-- This file is additive. It does not drop or rewrite anything that exists, so
-- the kiosk flow keeps working untouched while the shipping flow is built.
--
-- WHY THESE SHAPES
--
-- 1. Orders reference auth.users, not a table we manage. Supabase Auth owns
--    identity (Google sign-in included), so profiles hang off auth.users rather
--    than duplicating it.
--
-- 2. Addresses are stored twice on purpose: the customer's reusable address book
--    (public.addresses) AND a frozen copy on the order (ship_* columns). If a
--    customer later edits or deletes an address, historical orders, invoices and
--    packing slips must still show where the parcel actually went. Pointing an
--    order at a mutable address row would silently rewrite history.
--
-- 3. order_status is a real enum-checked column extended to the brand kit's
--    lifecycle (00-standards/STATUS-SYSTEM.json). The kiosk's original five
--    values are preserved so existing rows stay valid.
--
-- 4. RLS finally gets policies. Today RLS is enabled with none, which is safe
--    only because every query uses the service_role key and bypasses it. Once
--    customers read their own orders from the browser, those requests must use
--    the anon key plus the user's JWT so these policies actually apply.
--    See shared/db.js — it needs a user-scoped mode; service_role would ignore
--    all of this.
-- ============================================================================

-- ── 1. Customer profile ─────────────────────────────────────────────────────
-- Auth data lives in auth.users. This holds only what the shop needs.
create table if not exists public.profiles (
    id            uuid        primary key references auth.users(id) on delete cascade,
    full_name     text        not null default '',
    phone         text        not null default '',
    marketing_opt_in boolean  not null default false,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

-- ── 2. Address book ─────────────────────────────────────────────────────────
create table if not exists public.addresses (
    id             bigint      generated always as identity primary key,
    user_id        uuid        not null references auth.users(id) on delete cascade,
    label          text        not null default 'Home',
    recipient_name text        not null,
    phone          text        not null,
    line1          text        not null,
    line2          text        not null default '',
    city           text        not null,
    state          text        not null,
    pincode        text        not null,
    country        text        not null default 'IN',
    is_default     boolean     not null default false,
    created_at     timestamptz not null default now(),

    -- India Post PIN codes are exactly six digits and never start with 0.
    constraint addresses_pincode_valid check (pincode ~ '^[1-9][0-9]{5}$'),
    constraint addresses_phone_valid   check (phone ~ '^[0-9]{10}$')
);

create index if not exists addresses_user_idx on public.addresses (user_id);

-- At most one default address per customer.
create unique index if not exists addresses_one_default_per_user
    on public.addresses (user_id) where is_default;

-- ── 3. Orders: ownership, fulfilment and the frozen shipping snapshot ───────
alter table public.orders add column if not exists user_id uuid references auth.users(id) on delete set null;

-- 'pickup' keeps the original kiosk behaviour; 'ship' is the new path.
alter table public.orders add column if not exists fulfilment_method text not null default 'pickup';
alter table public.orders add column if not exists quantity integer not null default 1;

-- Frozen copy of the destination at order time (see note 2 above).
alter table public.orders add column if not exists ship_recipient_name text not null default '';
alter table public.orders add column if not exists ship_phone          text not null default '';
alter table public.orders add column if not exists ship_line1          text not null default '';
alter table public.orders add column if not exists ship_line2          text not null default '';
alter table public.orders add column if not exists ship_city           text not null default '';
alter table public.orders add column if not exists ship_state          text not null default '';
alter table public.orders add column if not exists ship_pincode        text not null default '';
alter table public.orders add column if not exists ship_country        text not null default 'IN';

-- Money owed on top of the item. Kept separate so the item price stays auditable.
alter table public.orders add column if not exists shipping_fee numeric(10,2) not null default 0;

-- Dispatch tracking.
alter table public.orders add column if not exists courier         text not null default '';
alter table public.orders add column if not exists tracking_number text not null default '';
alter table public.orders add column if not exists dispatched_at   timestamptz;
alter table public.orders add column if not exists delivered_at    timestamptz;

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'orders_fulfilment_valid') then
        alter table public.orders add constraint orders_fulfilment_valid
            check (fulfilment_method in ('pickup', 'ship'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'orders_quantity_positive') then
        alter table public.orders add constraint orders_quantity_positive check (quantity >= 1);
    end if;

    -- A shipped order is meaningless without a destination. Enforced in the
    -- database so a bug in the API cannot create an undeliverable parcel.
    if not exists (select 1 from pg_constraint where conname = 'orders_ship_needs_address') then
        alter table public.orders add constraint orders_ship_needs_address check (
            fulfilment_method <> 'ship'
            or (length(ship_recipient_name) > 0
                and length(ship_line1) > 0
                and length(ship_city) > 0
                and length(ship_pincode) > 0)
        );
    end if;
end
$$;

-- ── 4. Extend the status vocabulary ─────────────────────────────────────────
-- The original five kiosk values are kept so existing rows remain valid.
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in (
    -- kiosk lifecycle (unchanged)
    'Pending', 'Verified', 'Printed', 'PickedUp', 'Cancelled',
    -- shipped lifecycle, mirroring 00-standards/STATUS-SYSTEM.json
    'PaymentFailed', 'Processing', 'QCHold', 'QCPassed', 'Packed',
    'Shipped', 'OutForDelivery', 'Delivered',
    'ReturnRequested', 'ReturnReceived', 'Refunded'
));

create index if not exists orders_user_idx   on public.orders (user_id);
create index if not exists orders_status_idx2 on public.orders (status);

-- ── 5. Row Level Security policies ──────────────────────────────────────────
-- Until now RLS was enabled with no policies, which denies everything to anon
-- and authenticated while service_role bypassed it. These policies let a signed
-- in customer see exactly their own data and nothing else.

alter table public.profiles  enable row level security;
alter table public.addresses enable row level security;

drop policy if exists "own profile read"   on public.profiles;
drop policy if exists "own profile write"  on public.profiles;
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile write"  on public.profiles for update using (auth.uid() = id)
                                                       with check (auth.uid() = id);

drop policy if exists "own addresses read"   on public.addresses;
drop policy if exists "own addresses insert" on public.addresses;
drop policy if exists "own addresses write"  on public.addresses;
drop policy if exists "own addresses delete" on public.addresses;
create policy "own addresses read"   on public.addresses for select using (auth.uid() = user_id);
create policy "own addresses insert" on public.addresses for insert with check (auth.uid() = user_id);
create policy "own addresses write"  on public.addresses for update using (auth.uid() = user_id)
                                                          with check (auth.uid() = user_id);
create policy "own addresses delete" on public.addresses for delete using (auth.uid() = user_id);

-- Orders: read-only to the owner. Customers must never be able to write an
-- order row directly — price, status and dispatch fields are server-owned, so
-- inserts keep going through the Function with the service_role key.
drop policy if exists "own orders read" on public.orders;
create policy "own orders read" on public.orders for select using (auth.uid() = user_id);

-- ── 6. Profile row on signup ────────────────────────────────────────────────
-- Google sign-in creates the auth.users row; mirror the useful bits across so
-- checkout can prefill a name without a second round trip.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, full_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ── 7. Verify ───────────────────────────────────────────────────────────────
-- select column_name, data_type from information_schema.columns
--  where table_name = 'orders' order by ordinal_position;
-- select tablename, policyname from pg_policies where schemaname = 'public';
