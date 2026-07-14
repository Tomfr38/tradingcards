# Trading Cards — Prototype

A prototype for a digital trading card platform: artists upload one piece of
art and the app auto-generates a full rarity set (Common → One of One) from
it with procedural frames/effects. Collectors buy packs (mock in-app coins,
no real payments) and build an album/inventory. One account can be both an
artist (Creator mode) and a collector (Collector mode) — a toggle in the
header switches between the two, mirroring Preply's tutor/student split.

```
tradingcards/
  frontend/     React + Vite SPA
  backend/      Node/Express API
  supabase/     schema.sql (tables + the open_pack() draw function)
```

## Setup (one-time)

### 1. Prerequisites

- [Node.js LTS](https://nodejs.org)
- A [Supabase](https://supabase.com) project (free tier is fine) — **you'll
  create this yourself** in the Supabase dashboard; nothing here creates or
  touches a project automatically.

### 2. Supabase

1. In your Supabase project dashboard → **SQL Editor**, paste and run the
   contents of [`supabase/schema.sql`](supabase/schema.sql). This creates all
   tables, the `artwork-originals` public storage bucket, and the
   `open_pack()` function used to atomically draw cards from a pack.
2. In **Project Settings → API**, note your Project URL, anon public key, and
   service role key — you'll paste these into your own local `.env` files in
   the next steps (never share the service role key outside your own machine;
   it bypasses all access control).

### 3. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your own Supabase URL + service role key:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3001
```

Start:
```bash
npm run dev
```

### 4. Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env` with your own Supabase URL + anon key:
```
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Start:
```bash
npm run dev
```

### 5. Seed demo data (optional but recommended)

Creates 2 creator + 2 collector accounts (each with 500 seeded coins), one
published card set per creator, and a "Launch Concert Pack" so the Shop isn't
empty on first run:

```bash
cd backend
npm run seed
```

This requires `SUPABASE_SERVICE_ROLE_KEY` to already be set in `backend/.env`
(same as step 3) since it uses the Supabase Auth admin API to create real
accounts. Prints the seeded account emails and a shared password at the end —
sign in with any of them on the Login page.

If you'd rather not run the seed script: sign up normally through the app's
Login page, then in the Supabase dashboard's **Table editor**, open
`profiles` and flip `is_creator` to `true` for your row to unlock Creator
mode.

## Rarity tiers

| Tier | Print-run cap | Pack weight |
|---|---|---|
| Common | Uncapped | 60 |
| Rare | Uncapped | 25 |
| Epic | Uncapped | 10 |
| Legendary | Uncapped | 4 |
| Ultra Rare (1 of 100) | 100 | 0.8 |
| One of One | 1 | 0.05 |

Every artwork upload generates one `card_templates` row per tier. Numbered
tiers (Ultra Rare, One of One) mint a specific `card_editions.edition_number`
on each pack draw and permanently drop out of the draw pool once their cap is
reached — enforced atomically in `open_pack()` in `schema.sql`, not in
application code, so it holds up under concurrent buyers.

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/profile/me` | Current user's profile |
| POST | `/profile/bootstrap` | Create profile + seed coins on first login (idempotent) |
| POST | `/artworks` | Upload artwork (multipart: `image`, `orientation`, `title`) |
| GET | `/artworks/mine` | Creator's uploaded artworks |
| POST | `/artworks/:id/generate-set` | Generate the 6-tier card set from a draft artwork |
| GET | `/card-sets/mine` | Creator's sets (draft + published) |
| GET | `/card-sets/:id` | One set with its templates, for the preview screen |
| POST | `/card-sets/:id/publish` | Publish a set into the shared concert pack |
| GET | `/packs` | Active packs available in the Shop |
| POST | `/packs/:id/open` | Buy + open a pack (deducts coins, mints editions) |
| GET | `/inventory/mine` | Owned cards, filterable by `?rarity=` / `?artist=` |

## Manual verification checklist

1. Sign up (or use a seeded account) as a creator.
2. In Creator mode, upload an image, pick orientation, generate the set —
   confirm all 6 tiers render with visibly different frames/effects.
3. Publish the set.
4. Switch to Collector mode → Shop → buy the Launch Concert Pack with seeded
   coins → confirm the coin balance in the header decreases and 5 cards
   appear in the reveal.
5. Check Album — cards should be grouped/filterable by artist and rarity.
6. Buy packs repeatedly until a numbered tier (e.g. One of One) is claimed,
   then confirm it no longer appears in subsequent pack openings.

## Known prototype limitations

- No real payments (coins are seeded/mock only) and no real image moderation
  or copyright verification on uploads — both would be required before any
  real launch.
- Card visuals are procedural CSS/SVG, not final production art direction.
- Auth email confirmation is enabled by default on new Supabase projects; for
  faster local testing you can disable "Confirm email" under **Authentication
  → Providers → Email** in your own Supabase project settings (this affects
  your Supabase project's auth behavior — apply it only if you understand the
  trade-off for a non-prototype environment).
