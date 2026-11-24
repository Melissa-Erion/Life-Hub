-- Family space: a shared area two (or more) people use together, next to each
-- person's private hub. Private data stays in public.docs (one owner per row).
-- Shared items live in public.shared_docs, readable and writable only by members.

create table if not exists public.spaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'Family',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.space_members (
  space_id     uuid not null references public.spaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'member',
  display_name text,
  joined_at    timestamptz not null default now(),
  primary key (space_id, user_id)
);

create table if not exists public.shared_docs (
  space_id   uuid not null references public.spaces(id) on delete cascade,
  coll       text not null,
  id         text not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  primary key (space_id, coll, id)
);

-- Membership checks run with the definer's rights so policies do not recurse.
create schema if not exists private;
create or replace function private.is_member(s uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.space_members m where m.space_id = s and m.user_id = (select auth.uid()))
$$;
create or replace function private.shares_space(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.space_members a
    join public.space_members b on a.space_id = b.space_id
    where a.user_id = (select auth.uid()) and b.user_id = other
  )
$$;
grant usage on schema private to authenticated;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.shares_space(uuid) to authenticated;

alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.shared_docs enable row level security;

create policy "members see their spaces" on public.spaces for select to authenticated using (private.is_member(id));
create policy "members rename their spaces" on public.spaces for update to authenticated using (private.is_member(id)) with check (private.is_member(id));
create policy "members see who is in their spaces" on public.space_members for select to authenticated using (private.is_member(space_id));
create policy "members update their own display name" on public.space_members for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "members read shared items" on public.shared_docs for select to authenticated using (private.is_member(space_id));
create policy "members add shared items" on public.shared_docs for insert to authenticated with check (private.is_member(space_id));
create policy "members change shared items" on public.shared_docs for update to authenticated using (private.is_member(space_id)) with check (private.is_member(space_id));
create policy "members delete shared items" on public.shared_docs for delete to authenticated using (private.is_member(space_id));

-- A family member can read the other's goals only when that goal is marked shared.
create policy "family reads goals shared with them" on public.docs for select to authenticated
  using (coll = 'goals' and (data->>'shared') = 'true' and private.shares_space(user_id));

revoke all on public.spaces, public.space_members, public.shared_docs from anon;
alter publication supabase_realtime add table public.shared_docs;

-- Members may only change their display name (not which space they are in, or their role),
-- and only rename a space. Spaces and memberships are created by the owner through Claude.
revoke update on public.space_members from authenticated;
grant update (display_name) on public.space_members to authenticated;
revoke update on public.spaces from authenticated;
grant update (name) on public.spaces to authenticated;
revoke insert, delete on public.spaces, public.space_members from authenticated;

-- Family files: Storage path files/family/<space_id>/<id>, readable and writable by members of that space.
create or replace function private.member_of_text(s text) returns boolean
language sql stable security definer set search_path to '' as $$
  select exists(select 1 from public.space_members m where m.user_id = (select auth.uid()) and m.space_id::text = s);
$$;
grant execute on function private.member_of_text(text) to authenticated;
create policy "family files: select" on storage.objects for select to authenticated
  using (bucket_id = 'files' and (storage.foldername(name))[1] = 'family' and private.member_of_text((storage.foldername(name))[2]));
create policy "family files: insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'files' and (storage.foldername(name))[1] = 'family' and private.member_of_text((storage.foldername(name))[2]));
create policy "family files: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'files' and (storage.foldername(name))[1] = 'family' and private.member_of_text((storage.foldername(name))[2]));
