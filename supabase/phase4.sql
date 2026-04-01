-- Phase 4: Storage bucket for editor images (paste / drag-drop).
-- Auth is still off in Phase 2 — policies allow anon read/write to this bucket only.
-- Tighten with auth + per-user paths in a later phase.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'images',
  'images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "images_public_read" on storage.objects;
create policy "images_public_read"
on storage.objects for select
to public
using (bucket_id = 'images');

drop policy if exists "images_anon_insert" on storage.objects;
create policy "images_anon_insert"
on storage.objects for insert
to public
with check (bucket_id = 'images');
