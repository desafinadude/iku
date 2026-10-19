-- 004: file attachments (on entries or trip-wide) and multi-day entries.
-- Run once in the Supabase SQL editor (safe to re-run).

-- Multi-day entries: an entry runs from `day` to `end_day` (inclusive). For a stay, end_day is check-out day.
alter table public.items add column if not exists end_day date;
alter table public.items drop constraint if exists items_end_after_start;
alter table public.items add constraint items_end_after_start check (end_day is null or (day is not null and end_day >= day));

-- What's attached to what. item_id null = a trip-wide document (passport, insurance…).
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  item_id uuid references public.items(id) on delete cascade,
  path text not null unique,       -- object path in the "attachments" storage bucket
  name text not null,
  mime text,
  size bigint,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists attachments_trip on public.attachments (trip_id);
create index if not exists attachments_item on public.attachments (item_id);

alter table public.attachments enable row level security;
drop policy if exists "trip members" on public.attachments;
create policy "trip members" on public.attachments for all to authenticated
  using (public.is_trip_member()) with check (public.is_trip_member());

create or replace function public.stamp_attachment_author()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_by := coalesce(auth.jwt() ->> 'email', new.created_by);
  return new;
end
$$;
drop trigger if exists stamp_attachment_author on public.attachments;
create trigger stamp_attachment_author before insert on public.attachments
  for each row execute function public.stamp_attachment_author();

-- The files themselves: a private bucket (50 MB per file). Nothing in it is public;
-- the app opens files with short-lived signed links, for trip members only.
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists "iku members read files" on storage.objects;
create policy "iku members read files" on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and public.is_trip_member());
drop policy if exists "iku members upload files" on storage.objects;
create policy "iku members upload files" on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and public.is_trip_member());
drop policy if exists "iku members delete files" on storage.objects;
create policy "iku members delete files" on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and public.is_trip_member());

do $$
begin
  alter publication supabase_realtime add table public.attachments;
exception when duplicate_object then null;
end
$$;
