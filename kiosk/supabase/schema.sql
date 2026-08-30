-- YoursGifts kiosk — Supabase (Postgres) schema
--
-- Replaces the Google Apps Script / Sheets backend that kiosk/server.js talks to.
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste → Run.
--
-- Access model: the Cloudflare Pages Functions talk to PostgREST with the
-- service_role key, which bypasses RLS. RLS is still enabled with NO policies so
-- that the anon/publishable key (which ships to browsers) can read nothing even
-- if it leaks. Never put the service_role key in client code.

-- ─────────────────────────────────────────────────────────────
-- Orders
-- ─────────────────────────────────────────────────────────────

-- Human-friendly sequential order numbers. A sequence is atomic, unlike the
-- old read-the-last-row-then-add-one approach, which raced under concurrency.
create sequence if not exists public.order_num_seq start 1;

create table if not exists public.orders (
    id                bigint generated always as identity primary key,
    order_num         text        not null unique
                                  default lpad(nextval('public.order_num_seq')::text, 4, '0'),
    created_at        timestamptz not null default now(),

    customer_name     text        not null,
    phone             text        not null,

    product_type      text        not null,
    text_value        text        not null,
    -- Word Art backing panel: 'none' | 'solid' | 'hollow'.
    -- The Sheets backend had no column for this, so the choice never reached the
    -- operator. Postgres gets it from day one.
    wordart_base      text        not null default 'none'
                                  check (wordart_base in ('none', 'solid', 'hollow')),
    font              text        not null default 'Standard',
    base_color        text        not null default '#FFFFFF',
    font_color        text        not null default '#000000',

    weight_g          numeric(10,2) not null default 0,
    print_time_mins   numeric(10,2) not null default 0,
    material_cost     numeric(10,2) not null default 0,
    machine_cost      numeric(10,2) not null default 0,
    labor_cost        numeric(10,2) not null default 0,
    production_cost   numeric(10,2) not null default 0,
    final_amount      numeric(10,2) not null default 0,

    batch_size        integer     not null default 5,
    upi_txn_id        text        not null default '',
    status            text        not null default 'Pending'
                                  check (status in ('Pending', 'Verified', 'Printed', 'PickedUp', 'Cancelled'))
);

-- /api/orders/today and /api/summary/today filter by day, newest first.
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx     on public.orders (status);

-- ─────────────────────────────────────────────────────────────
-- Active filament batches (the "Batch Savings" colour combos)
-- ─────────────────────────────────────────────────────────────

create table if not exists public.batches (
    id          bigint generated always as identity primary key,
    base_color  text        not null,
    font_color  text        not null,
    name        text        not null,
    count       integer     not null default 5,
    updated_at  timestamptz not null default now(),
    unique (base_color, font_color)
);

-- Seed the two combos that were hardcoded in server.js.
insert into public.batches (base_color, font_color, name, count) values
    ('#FF6251', '#FFFFFF', 'RED/WHITE', 5),
    ('#000000', '#FFFFFF', 'BLACK/WHITE', 3)
on conflict (base_color, font_color) do nothing;

-- ─────────────────────────────────────────────────────────────
-- Admin login throttling
-- ─────────────────────────────────────────────────────────────
-- express-rate-limit kept counters in process memory, which does not exist on
-- Workers (every request may be a fresh isolate). A tiny table gives the same
-- 10-attempts-per-IP-per-15-minutes behaviour and costs one query per login.

create table if not exists public.login_attempts (
    id         bigint generated always as identity primary key,
    ip         text        not null,
    at         timestamptz not null default now()
);

create index if not exists login_attempts_ip_at_idx on public.login_attempts (ip, at desc);

-- ─────────────────────────────────────────────────────────────
-- Lock everything down (service_role bypasses this; anon key sees nothing)
-- ─────────────────────────────────────────────────────────────

alter table public.orders         enable row level security;
alter table public.batches        enable row level security;
alter table public.login_attempts enable row level security;

-- Housekeeping helper: drop login attempts older than a day. Call from a
-- Cloudflare cron if you want, or ignore — the table stays tiny either way.
create or replace function public.prune_login_attempts()
returns void
language sql
security definer
set search_path = public
as $$
    delete from public.login_attempts where at < now() - interval '1 day';
$$;

-- The cleanup endpoint is called by Cloudflare, not through public PostgREST.
-- Keep the SECURITY DEFINER helper private to prevent anonymous RPC execution.
revoke execute on function public.prune_login_attempts() from anon, authenticated;
revoke execute on function public.prune_login_attempts() from public;
