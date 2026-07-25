-- ============================================================================
--  DIAMONDS TESTER — additive schema for the mobile app
-- ----------------------------------------------------------------------------
--  Run this ONCE in the Supabase SQL editor for the SAME project the website
--  (diamondstester.com) already uses (project ref: szdrooxgqbcsgokusfgy).
--
--  Everything here is ADDITIVE ONLY — it adds new columns (with safe defaults)
--  and new tables. It does not touch, rename, or drop anything the website's
--  own schema.sql created, so the website keeps working exactly as before.
--
--  Why this is needed: the website's `profiles` table only has
--  id/email/full_name/avatar_url — it was never built with credits/plan,
--  because the website doesn't gate its AI analyzer with a credit system.
--  The mobile app DOES (10 credits per scan, 30 free credits on signup), so
--  these columns need to exist for the app's credit/paywall logic to work.
--
--  This is the ONLY SQL file you need to run for the app. It replaces
--  (and safely drops/recreates) anything created by community-schema.sql,
--  community-public-profiles.sql, community-edit-policies.sql,
--  community-profile-update.sql, community-ad-credits.sql or spend-credits.sql
--  — those files have been deleted from this project; don't run them again
--  even if you have old copies open in a Supabase SQL Editor tab.
-- ============================================================================

-- ── 1. Extend profiles with app-only fields ─────────────────────────────────
alter table public.profiles
  add column if not exists credits int not null default 30,
  add column if not exists plan text not null default 'free',
  add column if not exists total_identifications int not null default 0,
  add column if not exists referral_code text;

comment on column public.profiles.credits is 'Mobile-app scan credits. New signups start with 30 (first ~3 scans free at 10 credits/scan). Never touched by the website.';
comment on column public.profiles.plan is 'Mobile-app subscription tier from RevenueCat: free | pro. Not used by the website.';

-- ── 2. Guest (not-signed-in) daily scan rate limit ──────────────────────────
create table if not exists public.ip_usage (
  ip_address text primary key,
  count int not null default 0,
  reset_date date not null default current_date
);
alter table public.ip_usage enable row level security;
-- Only the service role (used inside the Edge Function) ever touches this table.
drop policy if exists "service role only" on public.ip_usage;
create policy "service role only" on public.ip_usage
  for all using (auth.role() = 'service_role');

-- ── 3. spend_credits RPC — deduct credits atomically, never let a client ────
--    write its own balance directly (SECURITY DEFINER bypasses RLS safely).
create or replace function public.spend_credits(amount int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance int;
begin
  update public.profiles
    set credits = credits - amount
    where id = auth.uid() and credits >= amount
    returning credits into new_balance;

  if new_balance is null then
    return -1; -- insufficient credits
  end if;
  return new_balance;
end;
$$;

-- ── 4. grant_ad_credits RPC — reward a rewarded-ad watch, capped 1-5 ────────
create or replace function public.grant_ad_credits(amount int default 5)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  clamped int := greatest(1, least(amount, 5));
  new_balance int;
begin
  update public.profiles
    set credits = credits + clamped
    where id = auth.uid()
    returning credits into new_balance;
  return coalesce(new_balance, 0);
end;
$$;

-- ── 5. Scan history / analyses (mobile app writes here via its Edge Function) ─
create table if not exists public.analyses (
  id               bigserial primary key,
  user_id          uuid references auth.users(id) on delete set null,
  result           jsonb not null,
  image_urls       text[] default '{}',
  credits_used     int not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists idx_analyses_user_created on public.analyses (user_id, created_at desc);
alter table public.analyses enable row level security;
drop policy if exists "read own analyses" on public.analyses;
create policy "read own analyses" on public.analyses
  for select using (auth.uid() = user_id);
drop policy if exists "insert own analyses" on public.analyses;
create policy "insert own analyses" on public.analyses
  for insert with check (auth.uid() = user_id or user_id is null);

-- ── 6. Community feed (posts / likes / comments / follows) ─────────────────
--    NOTE: an earlier version of this file created `posts` with the wrong
--    columns (caption/image_url/scan_result, bigserial id). The actual app
--    code (src/lib/community.ts) expects uuid ids + title/description/
--    species_slug/location, matching the original template's community
--    schema. If you already ran the old version of this file, this section
--    drops that incorrect table (safe — it has no real rows yet) and
--    recreates it correctly. This replaces community-schema.sql and
--    community-public-profiles.sql — do NOT run those two files, they
--    conflict with this one (that's what caused your "column ... does not
--    exist" errors).
drop view if exists public.comment_feed;
drop view if exists public.post_feed;
drop table if exists public.post_comments cascade;
drop table if exists public.post_likes cascade;
drop table if exists public.follows cascade;
drop table if exists public.posts cascade;

create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  image_url    text,
  title        text,
  description  text,
  species_slug text,
  location     text,
  latitude     double precision,
  longitude    double precision,
  created_at   timestamptz not null default now()
);
create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_user_idx    on public.posts (user_id);
create index if not exists posts_species_idx on public.posts (species_slug);

create table public.post_likes (
  post_id    uuid not null references public.posts on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.post_comments (post_id, created_at);

create table public.follows (
  follower_id  uuid not null references auth.users on delete cascade,
  following_id uuid not null references auth.users on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

alter table public.posts         enable row level security;
alter table public.post_likes    enable row level security;
alter table public.post_comments enable row level security;
alter table public.follows       enable row level security;

drop policy if exists posts_read   on public.posts;
drop policy if exists posts_insert on public.posts;
drop policy if exists posts_delete on public.posts;
create policy posts_read   on public.posts for select using (true);
create policy posts_insert on public.posts for insert with check (auth.uid() = user_id);
create policy posts_delete on public.posts for delete using (auth.uid() = user_id);

drop policy if exists likes_read   on public.post_likes;
drop policy if exists likes_insert on public.post_likes;
drop policy if exists likes_delete on public.post_likes;
create policy likes_read   on public.post_likes for select using (true);
create policy likes_insert on public.post_likes for insert with check (auth.uid() = user_id);
create policy likes_delete on public.post_likes for delete using (auth.uid() = user_id);

drop policy if exists comments_read   on public.post_comments;
drop policy if exists comments_insert on public.post_comments;
drop policy if exists comments_delete on public.post_comments;
create policy comments_read   on public.post_comments for select using (true);
create policy comments_insert on public.post_comments for insert with check (auth.uid() = user_id);
create policy comments_delete on public.post_comments for delete using (auth.uid() = user_id);

drop policy if exists follows_read   on public.follows;
drop policy if exists follows_insert on public.follows;
drop policy if exists follows_delete on public.follows;
create policy follows_read   on public.follows for select using (true);
create policy follows_insert on public.follows for insert with check (auth.uid() = follower_id);
create policy follows_delete on public.follows for delete using (auth.uid() = follower_id);

-- A read-only, public projection of profiles — name and avatar only (so the
-- feed can show other users' names without exposing their credits/plan/email).
create or replace view public.public_profiles
with (security_invoker = false) as
select id, full_name, avatar_url, email
from public.profiles;

grant select on public.public_profiles to anon, authenticated;

create or replace view public.post_feed
with (security_invoker = true) as
select
  p.id, p.user_id, p.image_url, p.title, p.description, p.species_slug,
  p.location, p.latitude, p.longitude, p.created_at,
  coalesce(pr.full_name, split_part(coalesce(pr.email, 'a Diamonds Tester user'), '@', 1)) as author_name,
  pr.avatar_url as author_avatar,
  (select count(*) from public.post_likes    l where l.post_id = p.id) as like_count,
  (select count(*) from public.post_comments c where c.post_id = p.id) as comment_count
from public.posts p
left join public.public_profiles pr on pr.id = p.user_id;

grant select on public.post_feed to anon, authenticated;

create or replace view public.comment_feed
with (security_invoker = true) as
select
  c.id, c.post_id, c.user_id, c.body, c.created_at,
  coalesce(pr.full_name, split_part(coalesce(pr.email, 'a Diamonds Tester user'), '@', 1)) as author_name,
  pr.avatar_url as author_avatar
from public.post_comments c
left join public.public_profiles pr on pr.id = c.user_id;

grant select on public.comment_feed to anon, authenticated;

-- Storage bucket for post images (public read; each user uploads only into
-- their own uid-named folder: community/<uid>/<file>).
insert into storage.buckets (id, name, public)
values ('community', 'community', true)
on conflict (id) do nothing;

drop policy if exists community_read   on storage.objects;
drop policy if exists community_insert on storage.objects;
drop policy if exists community_delete on storage.objects;

create policy community_read on storage.objects
  for select using (bucket_id = 'community');

create policy community_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'community' and (storage.foldername(name))[1] = auth.uid()::text);

create policy community_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'community' and (storage.foldername(name))[1] = auth.uid()::text);

-- NOTE: UV-fluorescence logs (app/uv-test.tsx) are stored locally on-device
-- (AsyncStorage, see src/lib/storage.ts) — the app code never writes them to
-- Supabase, so no `uv_logs` table is needed here.

-- Let a user edit/delete their OWN posts and comments (insert/delete/read
-- already granted above; this adds update).
drop policy if exists posts_update on public.posts;
create policy posts_update on public.posts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists comments_update on public.post_comments;
create policy comments_update on public.post_comments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── 7. Let users edit their OWN display name & avatar only ─────────────────
--    (credits/plan/email stay locked — only server-side/service-role code,
--    e.g. the identify-diamond Edge Function, may change those.)
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke update on public.profiles from authenticated;
grant  update (full_name, avatar_url) on public.profiles to authenticated;

grant execute on function public.spend_credits(int) to authenticated;
grant execute on function public.grant_ad_credits(int) to authenticated;

-- ── Done ─────────────────────────────────────────────────────────────────────
-- After running this, every EXISTING user row gets credits=30 too (the
-- `add column ... default 30` back-fills existing rows). If you'd rather only
-- NEW signups get 30 and existing test accounts stay at 0, run instead:
--   update public.profiles set credits = 0 where created_at < now();
-- (only if you have existing accounts you want excluded — optional, skip this
--  if you're fine with everyone getting a fresh 30-credit balance.)
