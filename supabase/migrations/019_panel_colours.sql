-- Colours for the Ideas, Days and Map panels, shared by everyone on the trip:
-- {"ideas": "#RRGGBB" | "#a>#b", "days": ..., "map": ...}; a missing key uses the app's default.
alter table public.trips add column if not exists panels jsonb;
