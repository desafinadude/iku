-- 018: how strong a day column's automatic colour is (a percentage of the header colour; empty uses the default).
-- Run once in the Supabase SQL editor (safe to re-run).
alter table public.trip_days add column if not exists column_strength real;
