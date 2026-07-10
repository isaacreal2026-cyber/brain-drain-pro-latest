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
