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

## Maps: Google, with an OpenStreetMap fallback

With a Google Maps key, the map is Google Maps, and the Place field searches Google Places. Entries picked from Google show live details (rating, today's hours, website, phone). Every entry with a location gets **Google Maps** and **Directions** links, with or without a key.

Without a key, or if Google rejects it, the app uses OpenStreetMap tiles and [Photon](https://photon.komoot.io) search instead, automatically.

**Setting up the key**
1. In [Google Cloud console](https://console.cloud.google.com), create a project and turn on billing. Google's monthly free usage covers a trip planner comfortably.
2. Under **APIs & Services → Library**, enable **Maps JavaScript API** and **Places API (New)**.
3. Under **APIs & Services → Credentials**, create an API key and restrict it:
   - **Application restrictions → Websites:** `https://desafinadude.github.io/*` and `http://localhost:5173/*`.
   - **API restrictions:** Maps JavaScript API and Places API (New) only.
4. Optional: under **APIs & Services → Quotas**, cap daily requests so a surprise bill is impossible.
5. Optional: under **Map Management**, create a Map ID (JavaScript, vector) and set `VITE_GOOGLE_MAP_ID`.
6. In the GitHub repo, go to **Settings → Secrets and variables → Actions → Secrets** tab → **New repository secret**. Name it `VITE_GOOGLE_MAPS_API_KEY` and paste the key (optionally add `VITE_GOOGLE_MAP_ID` too). Use **Repository secrets**, not an environment's secrets. Then re-run the deploy (Actions → Deploy to GitHub Pages → Run workflow). This keeps the key out of git, but browser keys always end up readable in the published site, so the website restriction is what really protects it. For local development, put it in `.env.local`, which git ignores.
7. Run `supabase/migrations/005_google_places.sql`, so entries remember their Google place.

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
