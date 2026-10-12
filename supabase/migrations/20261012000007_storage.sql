-- Attendee photos: private bucket, 500 KB hard cap (1000+ attendees stay well inside the
-- free plan's 1 GB). The client should compress to ~150-300 KB before upload.
-- Path: {workspace_id}/{event_id}/{registration_link_token}/{file}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attendee-photos', 'attendee-photos', false, 512000, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Anyone holding a valid registration link may upload (no overwrite: there is no update policy).
create policy "attendee_photos_insert_with_link" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'attendee-photos' and public.can_upload_registration_photo(name));

-- Workspace members may view their workspace's photos (via signed URLs or authenticated download).
create policy "attendee_photos_select_member" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attendee-photos'
    and case when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
             then public.has_workspace_role(((storage.foldername(name))[1])::uuid)
             else false end
  );

create policy "attendee_photos_delete_admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'attendee-photos'
    and case when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
             then public.has_workspace_role(((storage.foldername(name))[1])::uuid, '{admin}')
             else false end
  );
