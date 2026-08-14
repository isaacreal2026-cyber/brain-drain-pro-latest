<div align="center">

# 🧠 Brain Drain

**Build, run, and share interactive decision brains — offline-first.**

</div>

A social knowledge app for creating yes/no decision trees ("brains"), following learning pathways, joining communities, and tracking progress. It works fully offline with IndexedDB and optionally syncs to Supabase.

## Run locally

**Prerequisites:** Node.js 20+ and pnpm 9

```bash
# 1. Install dependencies
pnpm install

# 2. Start the frontend dev server
pnpm dev          # http://localhost:3000
```

The app opens in guest mode by default and stores everything in your browser's IndexedDB. No environment variables are required to explore it.

### Run the API server (optional)

```bash
cd api-server
pnpm install
pnpm dev          # builds and starts the API (default http://localhost:3099)
```

Set `VITE_API_BASE_URL` in `.env.local` to point the frontend at your API.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the Vite dev server |
| `pnpm build` | Type-check and build for production |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm typecheck` | Run the TypeScript compiler |

## Project structure

- `pages/` — route screens (Home, Search, Library, Missions, Profile, etc.)
- `hooks/` — TanStack Query data hooks
- `lib/` — IndexedDB, API client, validators, and sync logic
- `layout/` — app shell, sidebars, mobile navigation
- `ui/` — design-system components
- `api-server/` — optional Express API (feed, topics, brains)
- `supabase/` — database schema and Row Level Security migrations

## Documentation

- [SUPABASE_SETUP.md](SUPABASE_SETUP.md) — backend, database, cloud sync, and deployment
- [PERFORMANCE.md](PERFORMANCE.md) — bundle analysis and performance results
- [PLAY_STORE_SIMULATION.md](PLAY_STORE_SIMULATION.md) — demographic review and improvement plan

## Tech stack

React, TypeScript, Vite, Tailwind CSS, TanStack Query, IndexedDB, Express, Supabase, Firebase Auth, Vitest.
