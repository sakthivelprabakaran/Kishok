-- Per-item production tracking for multi-product checkouts.
-- Payment and fulfilment continue to live on the parent orders row.

alter table public.order_items
    add column if not exists production_status text,
    add column if not exists production_updated_at timestamptz not null default now();

update public.order_items oi
set production_status = case
    when o.status in ('Packed', 'Shipped', 'OutForDelivery', 'Delivered', 'PickedUp') then 'packed'
    when o.status = 'QCPassed' then 'qc_passed'
    when o.status = 'QCHold' then 'qc_hold'
    when o.status = 'Printed' then 'printed'
    when o.status = 'Processing' then 'printing'
    else 'queued'
end
from public.orders o
where o.order_num = oi.order_num
  and oi.production_status is null;

alter table public.order_items
    alter column production_status set default 'queued',
    alter column production_status set not null;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'order_items_production_status_valid'
          and conrelid = 'public.order_items'::regclass
    ) then
        alter table public.order_items
            add constraint order_items_production_status_valid
            check (production_status in ('queued', 'printing', 'printed', 'qc_hold', 'qc_passed', 'packed'));
    end if;
end $$;

create index if not exists order_items_production_idx
    on public.order_items (production_status, order_num);
