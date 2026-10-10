-- Private images used by personal Excalidraw notes. Files live under:
-- <user-id>/<note-id>/<file-id>
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'excalidraw-media',
  'excalidraw-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists excalidraw_media_select_own on storage.objects;
drop policy if exists excalidraw_media_insert_own on storage.objects;
drop policy if exists excalidraw_media_update_own on storage.objects;
drop policy if exists excalidraw_media_delete_own on storage.objects;

create policy excalidraw_media_select_own
on storage.objects for select to authenticated
using (
  bucket_id = 'excalidraw-media'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy excalidraw_media_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'excalidraw-media'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy excalidraw_media_update_own
on storage.objects for update to authenticated
using (
  bucket_id = 'excalidraw-media'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'excalidraw-media'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy excalidraw_media_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'excalidraw-media'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- Private Realtime Broadcast channels used only by a note owner on their own devices.
-- Topic format: flowy-excalidraw:<note-id>
drop policy if exists excalidraw_broadcast_receive_own on realtime.messages;
drop policy if exists excalidraw_broadcast_send_own on realtime.messages;

create policy excalidraw_broadcast_receive_own
on realtime.messages for select to authenticated
using (
  realtime.topic() like 'flowy-excalidraw:%'
  and exists (
    select 1
    from public.notes
    where notes.id::text = split_part(realtime.topic(), ':', 2)
      and notes.user_id = (select auth.uid())
      and notes.deleted_at is null
  )
);

create policy excalidraw_broadcast_send_own
on realtime.messages for insert to authenticated
with check (
  realtime.topic() like 'flowy-excalidraw:%'
  and exists (
    select 1
    from public.notes
    where notes.id::text = split_part(realtime.topic(), ':', 2)
      and notes.user_id = (select auth.uid())
      and notes.deleted_at is null
  )
);
