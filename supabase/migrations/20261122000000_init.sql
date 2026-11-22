-- Life Hub: one document table (keeps the app's Firestore-style collections as they are)
-- plus a private file bucket. Every row and file belongs to one signed-in user.

create table if not exists public.docs (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  coll       text not null,
  id         text not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, coll, id)
);

alter table public.docs enable row level security;

create policy "own docs: select" on public.docs for select to authenticated using (user_id = (select auth.uid()));
create policy "own docs: insert" on public.docs for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own docs: update" on public.docs for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own docs: delete" on public.docs for delete to authenticated using (user_id = (select auth.uid()));

alter publication supabase_realtime add table public.docs;

-- Private bucket for uploads. Files live at <user id>/<file id>.
insert into storage.buckets (id, name, public, file_size_limit)
values ('files', 'files', false, 20971520)
on conflict (id) do nothing;

create policy "own files: select" on storage.objects for select to authenticated
  using (bucket_id = 'files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own files: insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own files: update" on storage.objects for update to authenticated
  using (bucket_id = 'files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own files: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'files' and (storage.foldername(name))[1] = (select auth.uid())::text);
