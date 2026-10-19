# iku

A trip planner that combines a Pinterest-style ideas board, Trello-style day columns, a calendar and a map. Paste links and ideas, tag them, then drag them onto days. It installs as a PWA: phones get one pane at a time in portrait, and tablets/desktops in landscape get Ideas, Days and Map side by side.

## Run it

```sh
npm install
npm run dev
```

With no environment variables set it runs in **local mode**: sample trip data is saved in your browser only (shown by the "Local" badge).

## Connect Supabase (shared, password-protected)

1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor, then insert your trip (example at the bottom of the file).
2. In **Authentication → Users**, add one user for the trip (e.g. `trip@yourdomain.com`) with the password you'll share with fellow travellers. Turn off public sign-ups.
3. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_TRIP_EMAIL`.

The app then shows the unlock screen, asking only for the trip password. Row-level security means nothing can be read without that sign-in, and changes sync live between devices.

## Structure

- `src/data/backend.ts`: the storage interface, plus local and Supabase implementations
- `src/data/useTrip.ts`: trip state with optimistic saves
- `src/components/`: Ideas pane, Days board (landscape), Day plan (portrait), Map (Leaflet + OpenStreetMap), item and filter sheets, unlock screen
- `src/lib.ts`: filtering, dates and tag helpers

## Not built yet

- Link previews (titles/images from pasted URLs) need a small server function, e.g. a Supabase Edge Function
- Multiple trips and a trip switcher
- Month/calendar view
- Image uploads (Supabase Storage)
