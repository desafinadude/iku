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

## Ideas board, view mode and Pinterest

- **Ideas board:** on tablets and desktop, switch **Plan / Ideas / Map** in the top bar (Map gives a full-width map with day chips: pick a day or All days) for a full-width Pinterest-style board of your ideas (tick *Include planned* to see everything). Click a card and it opens on the right half while the board narrows to four columns.
- **View mode:** tapping an entry anywhere shows it read-only: image, tags, when, booking, place with Google Maps and Directions, link, notes with clickable links, attachments and who added it. **Edit** opens the editor, and saving returns you to the view.
- **Pinterest:** paste a pin link (`pin.it/…` or `pinterest.com/pin/…`) and the entry gets the pin's image, its caption as the title and note, and the pin's original link (Instagram, a blog…) as its link, with "Pinned from …" kept in the note. This runs through the `unfurl` Edge Function, because Pinterest doesn't allow browsers to fetch it directly. Redeploy the function after updating.

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

The Days area has three views, switched at the top (Columns / Parts / Month on wide screens, List / Parts / Month on phones):

- **Columns / List:** a card per entry, with photos.
- **Parts:** the selected day in loose blocks: *All day* (stays, and entries with no particular time), then *Morning* (until noon), *Afternoon* (12–5pm), *Evening* (5–9pm) and *Night* (after 9pm). Entries with a time sit in their block and show it. Drag an idea or entry into a block to place it there without committing to an hour (an exact time that doesn't fit that block is cleared), or tap a block's + to add something there. In the editor, an entry with no time has a *Time of day* choice. Elsewhere such entries show their part (e.g. "Morning") instead of a time and sort within the day by it. Run `supabase/migrations/012_day_parts.sql` to save parts.
- **Month:** a calendar of the trip. Stays run as bars, entries show their icon or photo, and you can drop ideas onto a date. Tap a date to open its hours.

**Display options** (in the filter sheet, per device): *Hide repeats on later days* shows a multi-day entry such as a hotel only on its first day; *Show tags on repeats* keeps all tags visible on every day it covers.

## Arranging, sorting and card size

- **Arranging:** drag a card onto another card to drop it just before or after it (a line shows where). It works within a day, within the ideas, and from the ideas straight into a spot in a day. The order is saved for everyone.
- **Sorting:** the **⋯** menu on the Days and Ideas headers sorts the cards. Days can go by time (entries with no time last), Custom (your dragged order) or title. Ideas can go newest or oldest first, Custom, title, or grouped by tag. Dragging a card switches that list to Custom. The choice is kept per device.
- **What cards show:** the card button next to **⋯** has checkboxes for any mix of picture, title, details (time, notes, link, booking), tags along the bottom, and tag icons along the top (a coloured square with each tag's icon). There are presets too: Everything, Titles, Pictures, Icons + titles. Days and Ideas each have their own. At least one part always stays ticked; a card with nothing else to show falls back to its title.
- **Tile size:** the − 100% + control on the Ideas header makes the idea tiles smaller or bigger (80–175%); tap the percentage to reset.
- **Ideas and map on or off:** in Plan view on tablets and desktop, the ideas and map buttons on the Columns, Parts and Month headers hide or show those panes.
- **Putting ideas on days without dragging:** open any idea and use **Add to a day** (it shows the day once set; choose *Back to ideas* to unplan it). On a phone, **Add from Ideas** under a day opens a list: tap ideas to add them to that day.
- **Pinning:** tap **Pin to top** on an entry (or tick *Pin to the top* when editing) to keep it above everything else in its day, or at the top of the ideas, whatever the sort. Handy for hotels with no time. Run `supabase/migrations/011_pinned.sql` to save pins.
- **Pane widths:** on tablets and desktop, drag the thin handles between the ideas, days and map (or beside an open idea on the Ideas board) to resize them. Double-click a handle to reset it. The ideas tile into as many columns as fit, down to one. Widths are kept per device.
- **Whole screen:** on tablets and desktop, the expand arrow on the Columns, Parts and Month views hides the ideas and map so the days get the full width. Press it again, or Esc, to go back.

## Day titles, tags and colours

Tap the pencil on a day column (next to the date on phones, or in the Parts header) to give a day a **title** (say "Tokyo → Kyoto"), a **day tag** (say Kyoto) and a **colour**. Use **Same for the following days, through** to set a run of days in one go, which helps when you move between cities. The column is tinted with the colour and its header shows the day, date, title and tag. Month cells, the phone day strip and the full-screen map chips show it too. Leave the colour on "tag colour" to borrow the day tag's colour from Manage tags. **Opening image:** add a picture (upload or link) to show at the top of the day, like the opening of a chapter. It stays on that day only, even when you set a run of days. Run `supabase/migrations/010_day_images.sql` to save it. Run `supabase/migrations/009_trip_days.sql` to save day settings.

## Tags

The filter bar has search, a **Tags** dropdown (coloured tags with checkboxes, a finder, and *only entries with all chosen tags*), the chosen tags as removable chips, and **More filters** for people and status.

Colours come in four shades (pastel, light, bright, deep) for tags, people and days. Text and icons switch to dark on pale colours so they stay readable.

Entries just have tags (plain words, no `#`). Open **Manage tags** from the filter sheet, or **Edit tags** in an entry. All tags are in one list: tap a row's swatch to pick a colour or its icon to pick any [Material Symbol](https://fonts.google.com/icons), edit the name in place (renaming to an existing name merges the two), delete with the bin, and add new tags in the box at the bottom. Drag the ⋮⋮ handle (or focus it and use the arrow keys) to reorder; the order is used in the Tags filter and tag suggestions. Changes save straight away.

- **An entry's look:** its first coloured tag sets the colour and icon of its card label, blocks in the hours and month views, and its map pin. Its other tags show as chips.
- **Stays:** multi-day entries tagged Stay, Hotel, Ryokan, Airbnb or similar get Check-in / Night / Check-out wording.
- **Upgrading from types:** `supabase/migrations/008_tags_only.sql` turns each entry's old type into its first tag, strips `#` from all tags, and keeps the type colours and icons as tag styles. Until it runs, the app does the same conversion as data loads.

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
