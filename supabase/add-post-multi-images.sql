-- ── Multi-image posts (up to 6 photos per post) ─────────────────────────────
-- Additive migration on top of diamonds-tester-additions.sql. Safe to run
-- multiple times. Adds an `image_urls text[]` column alongside the existing
-- single `image_url` column (kept for backward compatibility — older rows and
-- any code that still reads `image_url` continue to work; `image_urls[1]`
-- always mirrors `image_url` for new posts). Run this AFTER
-- diamonds-tester-additions.sql.

-- Guaranteed present regardless of which earlier version of
-- diamonds-tester-additions.sql you ran (older drafts used different
-- column names) — safe no-op if it already exists.
alter table public.posts
  add column if not exists image_url text;

alter table public.posts
  add column if not exists image_urls text[] not null default '{}';

-- Backfill existing single-image rows into the new array column.
update public.posts
set image_urls = array[image_url]
where image_url is not null and image_urls = '{}';

-- Recreate post_feed to also project the new column.
create or replace view public.post_feed
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
