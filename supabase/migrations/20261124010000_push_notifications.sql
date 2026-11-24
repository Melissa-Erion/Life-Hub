-- Web Push: one row per device that switched notifications on.
create table if not exists public.push_subs(
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  p256dh text not null, auth text not null, ua text, created_at timestamptz not null default now());
alter table public.push_subs enable row level security;
create policy "own subs: select" on public.push_subs for select to authenticated using (user_id = (select auth.uid()));
create policy "own subs: insert" on public.push_subs for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own subs: update" on public.push_subs for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own subs: delete" on public.push_subs for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.push_subs from anon;

-- Server-only secrets (the VAPID signing key). The values are inserted directly
-- in the database and are not kept in this repository.
create table if not exists private.app_secrets(name text primary key, value text not null);
revoke all on private.app_secrets from public, anon, authenticated;
create or replace function public.lh_secret(n text) returns text language sql stable security definer set search_path to '' as $$ select value from private.app_secrets where name = n $$;
revoke execute on function public.lh_secret(text) from public, anon, authenticated;
grant execute on function public.lh_secret(text) to service_role;
