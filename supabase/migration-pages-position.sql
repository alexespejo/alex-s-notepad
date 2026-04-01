-- Manual sort order for sidebar tree (apply in Supabase SQL Editor after phase2/auth migrations).

alter table public.pages add column if not exists position double precision;

update public.pages p
set position = sub.n
from (
  select id,
    (row_number() over (
      partition by parent_id
      order by created_at asc, id asc
    ))::double precision as n
  from public.pages
) sub
where p.id = sub.id and (p.position is null);

alter table public.pages alter column position set default 0;
alter table public.pages alter column position set not null;

create index if not exists pages_parent_position_idx on public.pages (parent_id, position);
