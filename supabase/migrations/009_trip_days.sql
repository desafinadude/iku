-- 009: per-day title, tag and colour (e.g. "Kyoto"), shown on day columns and the calendar.
-- Run once in the Supabase SQL editor (safe to re-run).
create table if not exists public.trip_days (
  trip_id uuid not null references public.trips(id) on delete cascade,
  day date not null,
  title text,
  tag text,
  color text,
  primary key (trip_id, day)
);

alter table public.trip_days enable row level security;
drop policy if exists "trip members" on public.trip_days;
create policy "trip members" on public.trip_days for all to authenticated
  using (public.is_trip_member()) with check (public.is_trip_member());

do $$
begin
  alter publication supabase_realtime add table public.trip_days;
exception when duplicate_object then null;
end
$$;
