-- Iku schema. Run in the Supabase SQL editor.

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null,
  url text,
  note text,
  type text not null default 'Sight' check (type in ('Food','Sight','Stay','Transport','Nature','Shop')),
  tags text[] not null default '{}',
  day date,              -- null = unplanned idea
  time time,
  booked boolean not null default false,
  booking_ref text,
  place text,
  lat double precision,
  lng double precision,
  sort double precision not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists items_trip_day on public.items (trip_id, day);
create index if not exists items_tags on public.items using gin (tags);

-- Password protection: only signed-in users (the shared trip login) can read or write.
alter table public.trips enable row level security;
alter table public.items enable row level security;

drop policy if exists "trip members" on public.trips;
create policy "trip members" on public.trips for all to authenticated using (true) with check (true);
drop policy if exists "trip members" on public.items;
create policy "trip members" on public.items for all to authenticated using (true) with check (true);

-- Live updates between devices.
alter publication supabase_realtime add table public.items;

-- Your first trip:
-- insert into public.trips (name, start_date, end_date) values ('Japan, spring', '2027-04-12', '2027-04-20');
