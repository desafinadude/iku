-- 010: an opening image for a day (e.g. the first day in a new city), shown at the top of its column.
-- Run once in the Supabase SQL editor (safe to re-run). Needs 009_trip_days.sql first.
alter table public.trip_days add column if not exists image text;
