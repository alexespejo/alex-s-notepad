-- Auth (per-user data): pages RLS + private image storage + policies.
-- Works with any Supabase Auth provider (e.g. Google OAuth).
-- Dashboard: Authentication → Sign In / Providers → Google — enable, then set Google
--   OAuth Client ID + Client Secret (from Google Cloud Console). Save.
-- Google Cloud: Authorized redirect URI must be:
--   https://<your-project-ref>.supabase.co/auth/v1/callback
-- Supabase URL: Authentication → URL Configuration — add app redirect URLs, e.g.
--   http://localhost:3000/auth/callback
-- If the app shows "Unsupported provider" / "Provider is not enabled", Google is off or
-- NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY is for a different project.

-- ── pages.user_id + RLS ───────────────────────────────────────────────────

alter table public.pages
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

-- Rows created before this migration have null user_id; remove or assign manually in SQL.
-- Example (destructive): delete from public.pages where user_id is null;
delete from public.pages where user_id is null;

alter table public.pages
  alter column user_id set not null;

create or replace function public.pages_set_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

drop trigger if exists pages_assign_user_id on public.pages;
create trigger pages_assign_user_id
before insert on public.pages
for each row execute function public.pages_set_user_id();

alter table public.pages enable row level security;

drop policy if exists "pages_select_own" on public.pages;
drop policy if exists "pages_insert_own" on public.pages;
drop policy if exists "pages_update_own" on public.pages;
drop policy if exists "pages_delete_own" on public.pages;

create policy "pages_select_own"
on public.pages for select
to authenticated
using (user_id = auth.uid());

create policy "pages_insert_own"
on public.pages for insert
to authenticated
with check (user_id = auth.uid());

create policy "pages_update_own"
on public.pages for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "pages_delete_own"
on public.pages for delete
to authenticated
using (user_id = auth.uid());

-- ── Storage: private bucket, paths like {user_id}/pages/{pageId}/{file} ─────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'images',
  'images',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "images_public_read" on storage.objects;
drop policy if exists "images_anon_insert" on storage.objects;
drop policy if exists "images_select_own" on storage.objects;
drop policy if exists "images_insert_own" on storage.objects;
drop policy if exists "images_update_own" on storage.objects;
drop policy if exists "images_delete_own" on storage.objects;

create policy "images_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "images_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "images_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "images_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
