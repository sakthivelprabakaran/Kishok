-- Operational product catalogue. Geometry remains code-owned; these rows only
-- control customer visibility, order acceptance and storefront presentation.
begin;

create table public.product_catalog (
    product_type          text        primary key,
    display_name          text        not null,
    category              text        not null check (category in ('keychain', 'desk')),
    lifecycle_state       text        not null default 'draft'
                                      check (lifecycle_state in ('draft', 'active', 'paused', 'hidden', 'retired')),
    sort_order            integer     not null default 0 check (sort_order >= 0),
    display_time_minutes  integer     not null default 0 check (display_time_minutes >= 0),
    badge                 text        not null default '' check (char_length(badge) <= 40),
    pause_message         text        not null default '' check (char_length(pause_message) <= 180),
    resume_at             timestamptz,
    is_featured           boolean     not null default false,
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now(),
    check (product_type ~ '^[a-z][a-z0-9_]{0,39}$'),
    check (char_length(display_name) between 1 and 80)
);

create index product_catalog_storefront_idx
    on public.product_catalog (lifecycle_state, category, sort_order, product_type);

insert into public.product_catalog
    (product_type, display_name, category, lifecycle_state, sort_order, display_time_minutes)
values
    ('bubble_keychain',   'Bubble Badge',      'keychain', 'active',  10, 20),
    ('keychain',          'Classic Keychain',  'keychain', 'active',  20, 15),
    ('flower_keychain',   'Flower Initial',    'keychain', 'active',  30, 25),
    ('nametag',           'Wavy Nametag',      'keychain', 'active',  40, 22),
    ('girly_keychain',    'Girly Keychain',    'keychain', 'active',  50, 25),
    ('tilekey',           'Letter Tiles',      'keychain', 'active',  60, 30),
    ('linked_initials',   'Linked Initials',   'keychain', 'active',  70, 18),
    ('name_beads',        'Name Beads',        'keychain', 'active',  80, 15),
    ('supported_text',    'Supported Name',    'desk',     'active',  90, 35),
    ('wordart',           'Word Art',          'desk',     'active', 100, 45),
    ('loveseries',        'LOVE Series',       'desk',     'active', 110, 40),
    ('nameplate',         'Desk Nameplate',    'desk',     'active', 120, 40),
    ('led_word_stand',    'LED Word Stand',    'desk',     'active', 130, 60),
    ('desk_organizer',    'Desk Organizer',    'desk',     'active', 140, 75),
    ('led_word_art',      'LED Word Art',      'desk',     'active', 150, 45),
    ('bordered_keychain', 'Bordered Keychain', 'keychain', 'hidden', 160, 25);

alter table public.product_catalog enable row level security;
revoke all on table public.product_catalog from anon, authenticated;
grant select, insert, update, delete on table public.product_catalog to service_role;

commit;
