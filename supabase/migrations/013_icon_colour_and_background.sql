-- 013: a tag's icon (and text) colour, and a background colour or image for the whole trip.
-- Run once in the Supabase SQL editor (safe to re-run).
alter table public.labels add column if not exists icon_color text;
alter table public.trips add column if not exists background text;

-- (Trip members can already update their trip: see the "trip members" policy in schema.sql.)
