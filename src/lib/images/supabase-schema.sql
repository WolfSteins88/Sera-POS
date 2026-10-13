-- Image bucket for Supabase Storage (IMAGE_DRIVER=supabase).
-- `node scripts/upload-images-to-supabase.mjs` creates it for you; this is the manual equivalent.
-- The app uploads with the service role key on the server, so no storage policies are needed.
-- Run in the Supabase SQL editor, not with npm run db:setup.
insert into storage.buckets (id, name, public, file_size_limit)
values ('pos-images', 'pos-images', true, 2097152)
on conflict (id) do nothing;
