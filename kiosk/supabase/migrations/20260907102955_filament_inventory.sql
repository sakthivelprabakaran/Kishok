-- Canonical filament colour catalogue and manually managed spool inventory.
--
-- Storefront states:
--   available     - shown normally
--   made_to_order - shown with the fixed "Ships in 2–3 days" notice
--   unavailable   - hidden from new designs, retained for order history

create table if not exists public.filament_colours (
    id                 bigint generated always as identity primary key,
    name               text        not null,
    hex_color          text        not null,
    storefront_state   text        not null default 'available'
                                    check (storefront_state in ('available', 'made_to_order', 'unavailable')),
    sort_order         integer     not null default 0,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now(),
    check (hex_color ~ '^#[0-9A-Fa-f]{6}$')
);

create unique index if not exists filament_colours_hex_lower_uidx
    on public.filament_colours (lower(hex_color));
create index if not exists filament_colours_storefront_idx
    on public.filament_colours (storefront_state, sort_order, id);

create table if not exists public.filament_spools (
    id                 bigint generated always as identity primary key,
    colour_id          bigint      not null references public.filament_colours(id) on delete restrict,
    material           text        not null default 'PLA',
    brand              text        not null default '',
    lot_code           text        not null default '',
    initial_weight_g   numeric(10,2) not null check (initial_weight_g > 0),
    remaining_weight_g numeric(10,2) not null check (remaining_weight_g >= 0),
    purchase_date      date,
    cost               numeric(10,2) not null default 0 check (cost >= 0),
    status             text        not null default 'sealed'
                                    check (status in ('sealed', 'open', 'empty', 'retired')),
    notes              text        not null default '',
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now(),
    check (remaining_weight_g <= initial_weight_g)
);

create index if not exists filament_spools_colour_idx
    on public.filament_spools (colour_id, status, updated_at desc);

insert into public.filament_colours (name, hex_color, storefront_state, sort_order) values
    ('Orange', '#FF9933', 'available', 10),
    ('Purple', '#7B2FFF', 'available', 20),
    ('Blue',   '#3A88FE', 'available', 30),
    ('Red',    '#FF6251', 'available', 40),
    ('Green',  '#7ED957', 'available', 50),
    ('Pink',   '#FF61A6', 'available', 60),
    ('Gold',   '#FFD700', 'available', 70),
    ('Black',  '#000000', 'available', 80),
    ('White',  '#FFFFFF', 'available', 90)
on conflict ((lower(hex_color))) do nothing;

alter table public.filament_colours enable row level security;
alter table public.filament_spools  enable row level security;
