# iku

A trip planner that combines a Pinterest-style ideas board, Trello-style day columns, a calendar and a map. Paste links and ideas, tag them, then drag them onto days. It installs as a PWA: phones get one pane at a time in portrait, and tablets/desktops in landscape get Ideas, Days and Map side by side.

## Run it

```sh
npm install
npm run dev
```

With no environment variables set it runs in **local mode**: sample trip data is saved in your browser only (shown by the "Local" badge).

## Install on your phone

Iku is an installable app (PWA):

- **Android / Chrome / Edge:** an **Install** banner appears at the top (also in your profile sheet). Or use the browser menu → *Install app*.
- **iPhone / iPad:** open the site in **Safari**, tap **Share**, then **Add to Home Screen**. The banner's **How?** button shows the same steps.

Once installed it opens full screen with its own icon. It works offline using the last synced trip and any files you saved to the device. Long-press the icon for shortcuts to **Today's plan** and **Map**. Updates install themselves the next time you open it.

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

## Card images

Every entry can have an image, even when a link doesn't provide one:

- **In an entry:** **Add photo** (camera on phones), **Image link**, or paste an image anywhere in the sheet. **Replace** and **Remove** sit on the preview; tap it for full screen.
- **Picture cards:** paste an image into the Ideas box, drop image files onto Ideas, or use the photo button in the box. Each becomes a card right away. With no title, a card is just the picture, shown whole and uncropped, with its tags and who added it on top.
- **Storage:** uploaded images are shrunk to about 2000px and stored in the private `attachments` bucket (migration 004). They're shown through signed links, never public URLs. Replaced or removed images, and those on deleted entries, are deleted from storage.

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

## Day views

The Days area has three views, switched at the top (Columns / Hours / Month on wide screens, List / Hours / Month on phones):

- **Columns / List:** a card per entry, with photos.
- **Hours:** the selected day hour by hour. Stays and other multi-day or untimed entries sit in an "All day" strip above the hours. Entries with an end time (**From / Until** in the entry) fill their slot, and overlapping entries sit side by side. Drag an idea or entry onto an hour to schedule it, or tap an empty hour to add something there. Run `supabase/migrations/007_end_time.sql` to save end times.
- **Month:** a calendar of the trip. Stays run as bars, entries show their icon or photo, and you can drop ideas onto a date. Tap a date to open its hours.

**Display options** (in the filter sheet, per device): *Hide repeats on later days* shows a multi-day entry such as a hotel only on its first day; *Show tags on repeats* keeps all tags visible on every day it covers.

## Types & tags

Open **Manage types & tags** from the filter sheet, or **Edit types** in an entry.

- **Types:** every entry has one. Rename them, change their colour (12 colours chosen to keep white icons readable) or icon (any [Material Symbol](https://fonts.google.com/icons), with travel icons suggested first), add your own (e.g. *Onsen*), or delete one and move its entries to another type. Until you edit them, a trip uses the built-in six.
- **Tags:** give a tag a colour and/or icon. Coloured tags show as solid chips on cards, filters and the map legend. Rename a tag to an existing one to merge them, or delete a tag from every entry.
- **On the map:** pins show the type's icon in its colour, with the day number as a badge. The full-screen map has a **By type / By tag** switch with a legend.

Renames and merges update every entry in one step, using database functions. Run `supabase/migrations/006_labels.sql`.

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
