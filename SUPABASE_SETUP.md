# Production Setup: Supabase + API + Static Frontend

This app ships as three pieces:

```text
Static frontend  (Netlify / Cloudflare Pages / Vercel / Firebase Hosting)
        │  HTTPS
        ▼
Express API     (api-server/, deployed to Railway / Render / Fly / Cloud Run)
        │  service role
        ▼
Supabase / Postgres  (auth + database + RLS)
```

The frontend keeps IndexedDB as a fast local cache and offline fallback, but
Supabase is the source of truth for production.

---

## 1. Create the Supabase project

1. Create a project at https://supabase.com.
2. In **SQL Editor**, run `supabase/migrations/0001_initial_schema.sql`
   (or use `supabase db push` with the CLI).
3. Note your project URL and keys:
   - Project URL → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server only!)
   - `anon` key is used by Firebase for now; if you later move auth to
     Supabase, wire it into `lib/firebase-app.ts`.

The migration creates all tables, indexes, the auto-profile trigger, and
Row Level Security policies.

---

## 2. Google sign-in

This app currently uses **Firebase Authentication** with Google. Keep using it
for the fastest launch:

1. Create a Firebase project and enable Google sign-in.
2. Download the web config and save it as `firebase-applet-config.json`
   (it is git-ignored). The shape matches `firebase-applet-config.json.example`.
3. In production, also set the Firebase config via build-time environment
   variables if your host supports it (see `lib/firebase-app.ts`).

> The `apiKey` in a Firebase web config is **not** a secret — it identifies
> your Firebase project and is safe to ship in client code. Security comes
> from Firebase Auth and the Firestore/RLS rules.

---

## 3. Deploy the API server

The API server is in `api-server/`.

```bash
cd api-server
pnpm install
pnpm build
PORT=8080 \
SUPABASE_URL=https://YOUR-PROJECT.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY \
CORS_ORIGIN=https://your-frontend.example.com \
NODE_ENV=production \
node dist/index.mjs
```

### Required environment variables

| Variable | Purpose |
|---|---|
| `PORT` | Port to listen on (required). |
| `SUPABASE_URL` | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key; used to write analytics bypassing RLS. |
| `CORS_ORIGIN` | Comma-separated list of allowed frontend origins. |
| `NODE_ENV` | Set to `production`. |
| `BODY_LIMIT` | Max JSON body size (default `256kb`). |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | Tunable rate limiting. |
| `SUPABASE_REQUEST_TIMEOUT_MS` | Supabase insert timeout (default 2500). |
| `FIREBASE_PROJECT_ID` | Firebase project ID used to verify client ID tokens. |
| `ANALYTICS_DISABLE_FILE_STORAGE` | Set `true` in production to avoid disk writes. |
| `LOG_LEVEL` | `info`, `warn`, `error`. |

Verify:

```bash
curl https://api.example.com/api/healthz   # → {"status":"ok"}
```

---

## 4. Deploy the static frontend

Build the site and publish `dist/` to any static host.

```bash
pnpm install
VITE_API_BASE_URL=https://api.example.com \
VITE_ENABLE_ANALYTICS=true \
pnpm build
```

Upload the generated `dist/` folder.

### Frontend environment variables (build-time)

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Full origin of the API server (no trailing `/`). Leave empty for same-origin proxy. |
| `VITE_API_TIMEOUT` | Per-request timeout in ms (default 15000). |
| `VITE_ENABLE_ANALYTICS` | `true`/`false` — sends events to `/api/events`. |
| `VITE_ENABLE_NOTIFICATIONS` | Feature flag. |
| `VITE_ENABLE_SOCIAL_FEATURES` | Feature flag. |

### Same-origin reverse proxy (recommended)

If you serve the frontend and API from one domain, leave
`VITE_API_BASE_URL` empty and have your host proxy `/api/*` to the API server.
This avoids CORS entirely and lets the service worker stay offline-capable.

Example Netlify redirect (`public/_redirects`):

```text
/api/*  https://api.example.com/api/:splat  200
/*      /index.html                          200
```

---

## 5. SPA routing + service worker

- The service worker (`public/sw.js`) uses network-first for navigations so
  deploys are picked up immediately and stale shells are never served.
- All unknown routes must fall back to `/index.html` (SPA).

---

## 6. Cloud-synced feed, topics, and brains

The API serves production data from Supabase while the client keeps IndexedDB
as an instant cache and offline fallback:

- `GET /api/feed?mode=foryou|following|trending&topic=&limit=&offset=` —
  posts aggregated with author, topic, and vote counts. When Supabase is not
  configured it returns `{ "source": "degraded" }` and the client renders its
  local cache.
- `POST /api/posts` — create a post (requires a Firebase ID token).
- `POST /api/posts/:id/react` — toggle an upvote/downvote/repost.
- `GET /api/topics` / `POST /api/topics` / `POST /api/topics/follow`.
- `GET /api/brains?mine=&limit=&offset=` — list public brains, or the signed-in
  user's own brains with `?mine=true`.
- `GET /api/brains/:id` — returns `{ brain, nodes }`; private brains are only
  visible to their author.
- `POST /api/brains` — upsert a brain and replace its nodes (auth required).
- `DELETE /api/brains/:id` — author-only delete; cascades to nodes.

The client hooks (`use-social`, `use-topics`, `use-database`) write
optimistically to IndexedDB, sync to the API when online, and fall back to
local data on any network/auth error. Seeded/offline content stays visible, so
the UI is never empty. Offline-created content remains local and syncs on the
next session when the user is signed in.

## 7. Data migration from IndexedDB

There is no automatic import of local-only data in this release. The Settings
page provides **Export Account Data** (JSON) and **Refresh Local Data**
(admin phrase: `im admin`) to reset the local cache once cloud sync is
trusted. A future migration can POST exported JSON to the API.

---

## 8. Monitoring

- Uncaught frontend errors are posted to `POST /api/client-errors` and logged
  by the API (pino). Ship those logs to your platform's log drain.
- `GET /api/intelligence/summary` reports analytics ingestion health.
- Add an uptime check against `/api/healthz`.

---

## 9. Security checklist before going live

- [ ] `CORS_ORIGIN` is set to exactly the production frontend origin(s).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set only on the API server, never on the client.
- [ ] Firestore security rules (`firestore.rules`) are deployed.
- [ ] The `firebase-applet-config.json` is correct for the production project.
- [ ] `NODE_ENV=production` on the API.
- [ ] Rate limit values match expected traffic.
- [ ] HTTPS is enforced by the static host.
- [ ] Google OAuth authorized domains include the production domain.
