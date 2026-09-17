-- Singleton operational control for accepting or pausing all new orders.
-- Existing orders remain untouched and continue through production normally.
begin;

create table public.storefront_settings (
    id                smallint    primary key default 1 check (id = 1),
    accepting_orders  boolean     not null default true,
    pause_message     text        not null default ''
                                 check (char_length(pause_message) <= 240),
    resume_at         timestamptz,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

insert into public.storefront_settings (id, accepting_orders)
values (1, true)
on conflict (id) do nothing;

alter table public.storefront_settings enable row level security;
revoke all on table public.storefront_settings from anon, authenticated;
grant select, insert, update, delete on table public.storefront_settings to service_role;

commit;
