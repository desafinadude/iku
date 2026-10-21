-- 014: title cards. A title card is an entry shown as a big picture with its title, marking the start of a new
-- chapter (e.g. arriving in Nagano) at the point in the day it happens. Replaces the day's "opening image".
-- Run once in the Supabase SQL editor (safe to re-run).
alter table public.items add column if not exists chapter boolean not null default false;

-- Turn existing day opening images into title cards on the same day (in "All day"), then clear them.
insert into public.items (trip_id, title, image_url, day, chapter, sort, tags, type)
select d.trip_id, coalesce(nullif(d.title, ''), nullif(d.tag, ''), ''), d.image, d.day, true, -1, '{}', ''
from public.trip_days d
where d.image is not null and d.image <> '';
update public.trip_days set image = null where image is not null;
