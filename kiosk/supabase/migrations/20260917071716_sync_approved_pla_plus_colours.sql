-- Make the Admin inventory the canonical source for the nine approved
-- Numakers PLA+ colours. Legacy rows are retained as unavailable so existing
-- spool foreign keys and historical orders remain valid.

begin;

insert into public.filament_colours
    (name, hex_color, storefront_state, sort_order)
values
    ('Imperial Red',      '#C93655', 'available', 10),
    ('Water Blue',        '#1D7D8D', 'available', 20),
    ('Terracotta Orange', '#D67842', 'available', 30),
    ('Pure White',        '#F1ECE1', 'available', 40),
    ('Pitch Black',       '#0E0E10', 'available', 50),
    ('Forest Green',      '#008351', 'available', 60),
    ('Army Green',        '#7C8A68', 'available', 70),
    ('Light Beige',       '#D7CAAB', 'available', 80),
    ('Lemon Yellow',      '#F9A800', 'available', 90)
on conflict ((lower(hex_color))) do update
set
    name = excluded.name,
    storefront_state = excluded.storefront_state,
    sort_order = excluded.sort_order,
    updated_at = now();

update public.filament_colours
set
    storefront_state = 'unavailable',
    updated_at = now()
where upper(hex_color) not in (
    '#C93655',
    '#1D7D8D',
    '#D67842',
    '#F1ECE1',
    '#0E0E10',
    '#008351',
    '#7C8A68',
    '#D7CAAB',
    '#F9A800'
)
and storefront_state <> 'unavailable';

commit;
