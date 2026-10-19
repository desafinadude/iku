# iku

A trip planner that combines a Pinterest-style ideas board, Trello-style day columns, a calendar and a map. Paste links and ideas, tag them, then drag them onto days. It installs as a PWA: phones get one pane at a time in portrait, and tablets/desktops in landscape get Ideas, Days and Map side by side.

## Run it

```sh
npm install
npm run dev
```

With no environment variables set it runs in **local mode**: sample trip data is saved in your browser only (shown by the "Local" badge).

## Connect Supabase (shared, password-protected)

1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor, then each file in `supabase/migrations/` in order.
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

## Link previews

Pasting a link fills in its title and picture, Pinterest-style. YouTube thumbnails and Google Maps coordinates are read straight from the link. Everything else goes through the `unfurl` Supabase Edge Function (`supabase/functions/unfurl/`), which fetches the page and reads its `og:image` / `og:title` tags. Sites that block preview bots (TripAdvisor, Airbnb, Instagram…) fall back to Microlink's free API, about 50 lookups a day.

Deploy it once:

```sh
npx supabase login
npx supabase functions deploy unfurl --project-ref <your-project-ref>
```

Keep "Verify JWT" on (the default), so only signed-in trip members can use it. Run `supabase/migrations/003_link_previews.sql` to store the images.

## Attachments, docs and offline

Any entry can carry files: tickets, booking PDFs, photos of paper receipts. The **Docs** area (a tab on phones, a button on wider screens) holds trip-wide documents like passports and insurance, and lists every file attached to an entry.

- **Storage:** files live in a private Supabase Storage bucket (`attachments`, 50 MB per file). Only people in `trip_members` can upload or open them. Files open through signed links that expire after an hour.
- **Photos** are shrunk to about 2000px before upload. Other files upload as they are.
- **Offline:** the download button on a file keeps a copy on that device (browser Cache Storage). The app also keeps its last synced copy of the trip, so with no signal you can still browse the plan and open saved files. Signing out with the lock button clears both from the device.

Run `supabase/migrations/004_attachments_and_spans.sql` to create the bucket, its access rules and the `attachments` table.

## Multi-day entries

Entries can run across several days (a hotel stay, a car rental, a multi-day hike). Set **From** and **To** (**Check-in** and **Check-out** for stays) with the date pickers; leave **To** empty for a single day. The entry shows on every day it covers, labelled "Check-in · 3 nights", "Night 2 of 3" and "Check-out" for stays, or "Day 2 of 3" for anything else. Dragging it to another day keeps its length.

## Place search

The Place field suggests matches as you type, using [Photon](https://photon.komoot.io), an OpenStreetMap search built for type-ahead. It's free and needs no key, and results near the selected day's stops come first. Picking one puts the entry on the map. (Nominatim's usage policy doesn't allow search-as-you-type, so it isn't used. Google Places would find more businesses, but it needs a billed API key, which would be visible in the published site.)

## Trip members

Each person signs in with their own Supabase user, listed in `trip_members`. On first sign-in they're asked for a name, and can add a photo and pick a colour. Photos are shrunk in the browser to a 160×160 JPEG (a few KB) and stored as text on their `trip_members` row, so there's no Storage bucket to set up. Every item records who added it and who last edited it. The database sets these, so they can't be faked, and you can filter by person.

## Structure

- `src/data/backend.ts`: the storage interface, plus local and Supabase implementations
- `src/data/useTrip.ts`: trip state with optimistic saves
- `src/components/`: Ideas pane, Days board (landscape), Day plan (portrait), Map (Leaflet + OpenStreetMap), item and filter sheets, unlock screen
- `src/lib.ts`: filtering, dates and tag helpers

## Not built yet

- Multiple trips and a trip switcher
- Month/calendar view
