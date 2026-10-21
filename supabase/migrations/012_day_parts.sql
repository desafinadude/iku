-- 012: a rough time of day for entries without an exact time (morning, afternoon, evening or night).
-- Run once in the Supabase SQL editor (safe to re-run).
alter table public.items add column if not exists part text;
alter table public.items drop constraint if exists items_part_check;
alter table public.items add constraint items_part_check check (part is null or part in ('morning', 'afternoon', 'evening', 'night'));
