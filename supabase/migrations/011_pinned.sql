-- 011: pin an entry to the top of its day (or of the ideas), e.g. a hotel booking with no time.
-- Run once in the Supabase SQL editor (safe to re-run).
alter table public.items add column if not exists pinned boolean not null default false;
