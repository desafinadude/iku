-- 006: custom types and tags with colours and icons.
-- Run once in the Supabase SQL editor (safe to re-run).

-- Types are no longer a fixed list.
alter table public.items drop constraint if exists items_type_check;

-- Style for a type or a tag. name matches items.type, or a tag such as '#must-do'.
create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  kind text not null check (kind in ('type', 'tag')),
  name text not null,
  color text,
  icon text,
  sort double precision not null default 0,
  created_at timestamptz not null default now(),
  unique (trip_id, kind, name)
);

alter table public.labels enable row level security;
drop policy if exists "trip members" on public.labels;
create policy "trip members" on public.labels for all to authenticated
  using (public.is_trip_member()) with check (public.is_trip_member());

-- Rename or merge a type/tag across every entry in the trip, in one step.
-- Runs as the caller, so row-level security still applies.
create or replace function public.rename_label(p_trip uuid, p_kind text, p_from text, p_to text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_kind = 'type' then
    update public.items set type = p_to where trip_id = p_trip and type = p_from;
  else
    update public.items
      set tags = (select coalesce(array_agg(distinct t), '{}') from unnest(array_replace(tags, p_from, p_to)) as t)
      where trip_id = p_trip and p_from = any(tags);
  end if;
  -- Keep the style of the label being merged into, if it already exists.
  if exists (select 1 from public.labels where trip_id = p_trip and kind = p_kind and name = p_to) then
    delete from public.labels where trip_id = p_trip and kind = p_kind and name = p_from;
  else
    update public.labels set name = p_to where trip_id = p_trip and kind = p_kind and name = p_from;
  end if;
end
$$;

-- Remove a tag from every entry.
create or replace function public.delete_tag(p_trip uuid, p_tag text)
returns void
language sql
set search_path = ''
as $$
  update public.items set tags = array_remove(tags, p_tag) where trip_id = p_trip and p_tag = any(tags);
  delete from public.labels where trip_id = p_trip and kind = 'tag' and name = p_tag;
$$;

do $$
begin
  alter publication supabase_realtime add table public.labels;
exception when duplicate_object then null;
end
$$;
