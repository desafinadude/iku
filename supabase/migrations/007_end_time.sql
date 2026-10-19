-- 007: optional end time, so entries fill their slot in the hour-by-hour view.
alter table public.items add column if not exists end_time time;
