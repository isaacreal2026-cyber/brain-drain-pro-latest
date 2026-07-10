# Backend Intelligence Roadmap

This roadmap keeps the current UI intact while moving Brain Drain Pro toward production-grade backend intelligence, speed, and ethical retention.

## Principle

The app should feel magnetic because it gives real value, not because it uses dark patterns.

Good retention signals:

- A mission needs review.
- A Brain helped someone.
- A mentor or circle replied.
- A topic the user cares about has useful activity.
- A pathway is ready for the next step.

Avoid:

- Fake notifications.
- Infinite low-value noise.
- Manipulative engagement loops.

## Current stage

The app now has:

- Local analytics in IndexedDB.
- Local recommendation ranking for feed, related topics, Brain ordering, notifications, and mission reminders.
- A backend `POST /api/events` endpoint that validates event batches.
- Frontend best-effort event delivery to the backend while keeping local IndexedDB as fallback.

## Backend endpoint added

### `POST /api/events`

Accepts batches of up to 50 analytics events.

Validated fields:

- `id`
- `type`
- `sessionId`
- `createdAt`
- `route`
- `payload`

Current backend behavior:

- Validates request shape with Zod.
- Sanitizes payload values.
- Logs accepted event counts and type counts.
- Keeps a small in-memory recent event buffer for future wiring.
- Returns `202 Accepted` with `{ accepted }`.

This is intentionally lightweight. It establishes the API contract without forcing a database decision yet.

## Frontend delivery behavior

The frontend now:

1. Stores analytics locally first.
2. Queues events for backend delivery.
3. Sends events in small batches.
4. Uses `sendBeacon` on page hide when available.
5. Silently falls back to local-only analytics when the backend is absent, such as static preview.
6. Never blocks user clicks or navigation for analytics.

## Recommended next stages

### Stage 1: durable event storage

Choose storage:

- Firestore collection: `analytics_events`
- Postgres table: `analytics_events`
- Hybrid: raw events in BigQuery later, aggregates in Postgres/Firestore

Recommended for now: start with Firestore if speed of development matters, or Postgres if ranking/query control matters more.

### Stage 2: server-side aggregates

Aggregate events into compact tables/documents:

- user topic affinity
- post engagement score
- Brain launch counts
- mission reminder performance
- notification open rate
- community activity score

This prevents heavy client-side ranking.

### Stage 3: backend recommendation endpoints

Add:

- `GET /api/feed`
- `GET /api/recommendations/topics`
- `GET /api/recommendations/brains`
- `GET /api/notifications/ranked`
- `GET /api/missions/next`

The UI can remain unchanged while data becomes smarter.

### Stage 4: sync and safety

Add real backend support for:

- Report/hide moderation
- Follow/follower graph
- Cross-device analytics sync
- Notification generation
- Message/group membership integrity
- Account export/delete policy

## Performance rules

- Batch events.
- Never block UI on analytics.
- Keep payloads small.
- Store metadata, not private content.
- Precompute recommendations server-side before the feed asks for them.
- Keep IndexedDB as cache/fallback.
- Use backend indexes for `userId`, `type`, `createdAt`, `topicId`, `postId`, and `brainId`.

## Free-value positioning

Brain Drain Pro should use backend intelligence to increase meaningful progress:

- better learning
- better missions
- better Brains
- better mentors
- better communities
- better knowledge graph

The app should compete by being useful and empowering, not by copying empty engagement loops.

## Implemented after selecting backend-first option

The API server now has a lightweight durable event-storage foundation.

### Added storage helper

- `api-server/src/lib/analytics-store.ts`

It provides:

- append-only JSONL event storage
- in-memory recent-event buffer
- aggregate counts by event type
- aggregate counts by route
- aggregate counts by payload key
- unique session count

Default event file path:

```text
api-server/data/analytics-events.jsonl
```

Config options:

```text
ANALYTICS_EVENTS_FILE=/custom/path/events.jsonl
ANALYTICS_DISABLE_FILE_STORAGE=true
```

If file storage is disabled, the endpoint still keeps in-memory summary data for the running server process.

### Added server summary endpoint

```text
GET /api/events/summary
```

Returns only aggregate counts, not raw event content.

This keeps the backend useful for debugging and optimization while avoiding a visible UI change.

### Why JSONL first

Firestore writes are currently blocked by existing Firestore rules and the API server does not yet have Firebase Admin credentials configured. JSONL storage gives a safe backend-side foundation now without requiring secrets or changing Firestore security rules.

Recommended future migration:

1. Keep the `/api/events` contract unchanged.
2. Add Firestore Admin or Postgres writer behind `storeAnalyticsEvents`.
3. Keep JSONL as a local/dev fallback.

## Implemented flexible intelligence API

The API server now exposes a non-SQL intelligence endpoint:

```text
GET /api/intelligence/summary
```

This endpoint is designed for product/backend review rather than direct UI rendering. It returns aggregate readiness signals only, not raw user content.

It includes:

- total event count
- unique session count
- active 24-hour event count
- top event types
- top routes
- top payload keys
- signal counts for search, topics, brains, posts, comments, messages, missions, and notifications
- recommendation readiness flags for feed, brains, missions, and notifications
- event volume health stage
- recommended next backend step

Privacy choice:

- Frontend still stores full local analytics for local recommendation logic.
- Backend delivery redacts raw search query text and sends `queryLength` instead.
- Backend intelligence endpoints expose aggregate counts, not raw events.

This gives the app a flexible, economical API foundation while keeping Supabase/Postgres as the recommended production source of truth behind the API later.

## Expanded intelligence summary contract

The flexible intelligence endpoint now also reports the architecture strategy and readiness scores:

```text
GET /api/intelligence/summary
```

Additional fields:

- `architecture.apiStyle = flexible-product-api`
- `architecture.primaryBackendTarget = supabase-postgres`
- `architecture.localCache = indexeddb`
- `architecture.currentServerStorage = file | memory`
- `architecture.optionalFutureServices = redis-cache, pgvector, full-text-search, queue-worker`
- `recommendationReadinessScores.feed`
- `recommendationReadinessScores.brains`
- `recommendationReadinessScores.missions`
- `recommendationReadinessScores.notifications`
- `recommendedActions[]`

This lets the backend communicate whether the app has enough signals to safely move specific recommendation systems from local ranking into Supabase/Postgres aggregates.

## Implemented Brain recommendations API

The API server now exposes:

```text
GET /api/recommendations/brains
```

This is the first recommendation endpoint behind the flexible product API layer.

Current behavior:

- Uses backend analytics signals from `brain_launch`, `post_created`, `post_share`, `comment_created`, and `comment_reaction` when those events include a Brain ID.
- Returns ranked Brain IDs, scores, confidence, reasons, signal counts, and readiness score.
- Does not require Supabase credentials yet.
- Does not expose raw user content.
- Keeps the current UI unchanged.

Current limitation:

- Because the API server does not yet have the full `brains` table, the endpoint returns Brain IDs and recommendation metadata only.
- Supabase should later hydrate this endpoint with Brain title, author, category, visibility, and access-control metadata.

Next production step:

```text
GET /api/recommendations/brains -> Supabase brain_scores + brains metadata
```

Keep the response contract stable so the frontend can adopt the endpoint later without redesigning Library or Brain cards.

## Implemented Supabase adapter interface with JSONL fallback

The analytics storage layer now supports a flexible adapter path:

```text
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are configured:
  write analytics events to Supabase REST table
else if file storage is enabled:
  write analytics events to JSONL
else:
  keep in-memory process aggregates
```

Environment variables:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=server-side-service-role-key
SUPABASE_ANALYTICS_TABLE=analytics_events
SUPABASE_REQUEST_TIMEOUT_MS=2500
ANALYTICS_DISABLE_SUPABASE=true
ANALYTICS_EVENTS_FILE=/custom/path/events.jsonl
ANALYTICS_DISABLE_FILE_STORAGE=true
```

Performance and reliability choices:

- Supabase writes are batched per `/api/events` request.
- Supabase requests use a short timeout to avoid slowing ingestion.
- If Supabase is unavailable, the API falls back to JSONL storage automatically.
- If JSONL storage is disabled or unavailable, process memory aggregates still work.
- The frontend still stores events locally first, so analytics never blocks the user experience.

This keeps the app economical for development, ready for Supabase production, and resilient if cloud services are temporarily unavailable.
