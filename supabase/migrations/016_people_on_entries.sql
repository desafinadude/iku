-- 016: people on an entry (who it's for / who's going), shown as face badges and used by the people filter.
-- Run once in the Supabase SQL editor (safe to re-run).
alter table public.items add column if not exists people text[] not null default '{}';
