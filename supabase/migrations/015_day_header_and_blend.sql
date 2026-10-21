-- 015: a day column's header colour, and a second colour its background blends into (for transition days).
-- Run once in the Supabase SQL editor (safe to re-run).
alter table public.trip_days add column if not exists header_color text;
alter table public.trip_days add column if not exists blend_color text;
