-- 002: named trip members with avatars, and who added / edited each item.
-- Run once in the Supabase SQL editor (safe to re-run).

-- Profile fields on trip_members. avatar holds a small resized image as a data URL (~10 KB).
alter table public.trip_members add column if not exists name text;
alter table public.trip_members add column if not exists avatar text;
alter table public.trip_members add column if not exists color text;

-- Members can see each other; each person can edit only their own profile.
-- Adding or removing members stays an SQL-editor job.
drop policy if exists "members read" on public.trip_members;
create policy "members read" on public.trip_members for select to authenticated
  using (public.is_trip_member());
drop policy if exists "edit own profile" on public.trip_members;
create policy "edit own profile" on public.trip_members for update to authenticated
  using (email = auth.jwt() ->> 'email') with check (email = auth.jwt() ->> 'email');

-- Authorship, stamped by the database so nobody can fake it.
alter table public.items add column if not exists created_by text;
alter table public.items add column if not exists updated_by text;
alter table public.items add column if not exists updated_at timestamptz;

create or replace function public.stamp_item_author()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.jwt() ->> 'email', new.created_by);
  else
    new.created_by := old.created_by;
  end if;
  new.updated_by := coalesce(auth.jwt() ->> 'email', new.updated_by);
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists stamp_item_author on public.items;
create trigger stamp_item_author before insert or update on public.items
  for each row execute function public.stamp_item_author();

-- Profile changes show up live on other devices.
do $$
begin
  alter publication supabase_realtime add table public.trip_members;
exception when duplicate_object then null;
end
$$;
