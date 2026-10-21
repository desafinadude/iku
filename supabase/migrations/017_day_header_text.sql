-- 017: the text colour on a day column's header (white, black or any colour; empty picks automatically).
-- Run once in the Supabase SQL editor (safe to re-run).
alter table public.trip_days add column if not exists header_text text;
