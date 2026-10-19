-- 005: remember which Google place an entry is, for live details (rating, hours) and map links.
alter table public.items add column if not exists place_id text;
