-- ============================================================================
--  DIAMONDS TESTER — schema alignment fix
-- ----------------------------------------------------------------------------
--  Run this ONCE in the Supabase SQL editor (project szdrooxgqbcsgokusfgy).
--  Additive and safe to re-run. It fixes two mismatches found by a live check:
--
--   1. The app writes posts.image_urls (multi-photo posts, up to 6) but that
--      column was never added — creating a post with the current app build
--      would fail. This adds it, backfills existing rows, and updates post_feed.
--
--   2. The shared `analyses` table (created by the website) has image_url
--      (singular) but not image_urls / credits_used, which the app and the
--      identify-diamond Edge Function write. This adds them so server-side scan
--      history syncs. (Website is unaffected — these are new, additive columns.)
-- ============================================================================

-- ── Fix 1: multi-image posts ────────────────────────────────────────────────
alter table public.posts add column if not exists image_url  text;
alter table public.posts add column if not exists image_urls text[] not null default '{}';

update public.posts
   set image_urls = array[image_url]
 where image_url is not null and image_urls = '{}';

-- Drop first: adding image_urls in the middle changes the view's column order,
-- which `create or replace view` refuses ("cannot change name of view column").
drop view if exists public.post_feed;

create view public.post_feed
with (security_invoker = true) as
select
  p.id, p.user_id, p.image_url, p.image_urls, p.title, p.description, p.species_slug,
  p.location, p.latitude, p.longitude, p.created_at,
  coalesce(pr.full_name, split_part(coalesce(pr.email, 'a Diamonds Tester user'), '@', 1)) as author_name,
  pr.avatar_url as author_avatar,
  (select count(*) from public.post_likes    l where l.post_id = p.id) as like_count,
  (select count(*) from public.post_comments c where c.post_id = p.id) as comment_count
from public.posts p
left join public.public_profiles pr on pr.id = p.user_id;

grant select on public.post_feed to anon, authenticated;

-- ── Fix 2: analyses columns the app + Edge Function write ────────────────────
alter table public.analyses add column if not exists image_urls   text[] default '{}';
alter table public.analyses add column if not exists credits_used int not null default 0;

-- Done. You should see "Success. No rows returned".
