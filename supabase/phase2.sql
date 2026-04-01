-- Phase 2 (Auth Disabled): Pages table for nested documents
-- Apply this in Supabase SQL Editor.

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid null references public.pages (id) on delete set null,
  title text not null default 'Untitled',
  icon text null,
  cover_image text null,
  content jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pages_parent_id_idx on public.pages (parent_id);
create index if not exists pages_updated_at_idx on public.pages (updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pages_set_updated_at on public.pages;
create trigger pages_set_updated_at
before update on public.pages
for each row execute function public.set_updated_at();

-- Phase 2 choice: auth disabled, so keep RLS off.
alter table public.pages disable row level security;

