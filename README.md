# iku

A trip planner that combines a Pinterest-style ideas board, Trello-style day columns, a calendar and a map. Paste links and ideas, tag them, then drag them onto days. It installs as a PWA: phones get one pane at a time in portrait, and tablets/desktops in landscape get Ideas, Days and Map side by side.

## Run it

```sh
npm install
npm run dev
```

With no environment variables set it runs in **local mode**: sample trip data is saved in your browser only (shown by the "Local" badge).

## Connect Supabase (shared, password-protected)

1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
2. In **Authentication → Users → Add user**, create one user for the trip (e.g. `trip@yourdomain.com`) with the password you'll share with fellow travellers. Tick "Auto confirm".
3. Run the two inserts at the bottom of `schema.sql`: your trip, and that email in `trip_members`. Only listed emails can see the trip.
4. In **Authentication → Sign In / Providers**, turn off "Allow new users to sign up".
5. Copy `.env.example` to `.env` and fill in the URL and publishable key. `VITE_*` or `NEXT_PUBLIC_*` names both work.

The app then shows the unlock screen, asking for email and password. If you also set `VITE_TRIP_EMAIL`, it asks only for the password, but that email is then readable in the published site. Row-level security means nothing can be read without that sign-in, and changes sync live between devices.

## Deploy to GitHub Pages

`.github/workflows/deploy.yml` builds and publishes on every push to `main`.

1. Repo **Settings → Pages → Source: GitHub Actions**.
2. The Supabase URL and publishable key live in `.env.production`. They're public by design; never put the Supabase secret key there.
3. Push to `main`, or run the workflow from the Actions tab. The site is at `https://<user>.github.io/<repo>/`.

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
