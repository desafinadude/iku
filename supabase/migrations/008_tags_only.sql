-- 008: tags only. Types become tags, and tags lose their leading '#'.
-- Run once in the Supabase SQL editor (safe to re-run).

-- 1. Entries: put the old type first as a tag, strip '#', drop duplicates (keeping order), clear type.
-- type is cleared so the app never re-adds a tag you removed.
update public.items i
set type = '', tags = coalesce((
  select array_agg(t order by first_pos)
  from (
    select t, min(pos) as first_pos
    from (
      select nullif(btrim(regexp_replace(x, '^#+', '')), '') as t, pos
      from unnest(array[i.type] || i.tags) with ordinality as u(x, pos)
    ) cleaned
    where t is not null
    group by t
  ) d
), '{}');

-- 2. Tag styles: strip '#' (merging into an existing style of the same name).
delete from public.labels l
where l.kind = 'tag' and l.name like '#%'
  and exists (select 1 from public.labels o where o.trip_id = l.trip_id and o.kind = 'tag' and o.name = regexp_replace(l.name, '^#+', ''));
update public.labels set name = regexp_replace(name, '^#+', '') where kind = 'tag' and name like '#%';

-- 3. Type styles become tag styles (a tag style of the same name wins).
delete from public.labels l
where l.kind = 'type'
  and exists (select 1 from public.labels o where o.trip_id = l.trip_id and o.kind = 'tag' and o.name = l.name);
update public.labels set kind = 'tag' where kind = 'type';

-- 4. The built-in types' colours and icons, for trips that never customised them.
insert into public.labels (trip_id, kind, name, color, icon, sort)
select distinct i.trip_id, 'tag', d.name, d.color, d.icon, d.sort
from public.items i
join (values
  ('Food', '#B4461F', 'restaurant', 0), ('Sight', '#0E6B60', 'photo_camera', 1), ('Stay', '#3A5BA0', 'hotel', 2),
  ('Transport', '#5F4FA0', 'train', 3), ('Nature', '#3F6B22', 'landscape', 4), ('Shop', '#8A5A0B', 'shopping_bag', 5)
) as d(name, color, icon, sort) on d.name = any(i.tags)
on conflict (trip_id, kind, name) do nothing;

-- items.type is no longer used by the app.
alter table public.items alter column type set default '';
