# Supabase Backend Plan for Brain Drain Pro

This plan keeps the current app UI and feature layout unchanged. The goal is to move the invisible backend/UX intelligence toward production readiness while preserving the existing product identity.

## Core recommendation

Use a hybrid architecture:

```text
React app = current UI and local fast cache
IndexedDB = offline/local fallback and drafts
API server = stable app-facing non-SQL API layer
Supabase/Postgres = production source of truth
Optional non-SQL services later = cache/search/vector intelligence
```

The frontend should not need to know SQL. The frontend should call clean API routes such as:

```text
POST /api/events
GET /api/feed
GET /api/recommendations/brains
GET /api/notifications
POST /api/moderation/report
```

The API server can use Supabase/Postgres internally.

## Why Supabase fits this app

Brain Drain Pro is relational by nature:

- users own profiles
- users create posts
- posts belong to topics
- posts have comments and reactions
- Brains can attach to posts, missions, pathways, and users
- missions belong to users and have milestones
- communities have members, check-ins, and mentor matching
- notifications are generated from activity
- recommendation scores depend on many connected signals

Postgres/Supabase is a strong fit for this because it supports joins, indexes, full-text search, JSONB, row-level security, and pgvector later.

## What should remain local

Keep local IndexedDB for:

- offline drafts
- local fallback analytics
- cached posts/brains/topics
- optimistic UI updates
- local export support
- temporary sessions when backend is unavailable

This helps the app feel fast and resilient.

## What should move to Supabase

Move these to Supabase over time:

- profiles
- posts
- comments
- reactions
- topics
- brains metadata
- missions
- milestones
- conversations
- messages
- notifications
- communities
- check-ins
- analytics events
- aggregate recommendation scores

## Phase 1: analytics events

This is the safest first Supabase integration because the current UI does not need to change.

### Table: analytics_events

```sql
create table analytics_events (
  id text primary key,
  user_id uuid null,
  session_id text not null,
  type text not null,
  route text not null,
  payload jsonb,
  client_created_at timestamptz not null,
  server_created_at timestamptz not null default now()
);
```

### Recommended indexes

```sql
create index analytics_events_type_idx on analytics_events (type);
create index analytics_events_user_id_idx on analytics_events (user_id);
create index analytics_events_session_id_idx on analytics_events (session_id);
create index analytics_events_client_created_at_idx on analytics_events (client_created_at desc);
create index analytics_events_route_idx on analytics_events (route);
```

### RLS recommendation

Do not let the public client insert analytics directly into this table at first. Use the API server to validate and insert events.

```text
frontend -> POST /api/events -> API validates -> Supabase service role inserts
```

This protects data quality and avoids exposing write policies too early.

## Phase 2: aggregate tables

Raw events are useful, but the app should not query raw events for every feed request. Add aggregate tables.

### Table: user_topic_affinity

```sql
create table user_topic_affinity (
  user_id uuid not null,
  topic_id text not null,
  score numeric not null default 0,
  last_signal_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);
```

Purpose:

- personalize For You feed
- improve topic recommendations
- improve mission/community matching

### Table: post_scores

```sql
create table post_scores (
  post_id text primary key,
  engagement_score numeric not null default 0,
  freshness_score numeric not null default 0,
  relevance_score numeric not null default 0,
  updated_at timestamptz not null default now()
);
```

Purpose:

- feed ranking
- trending ranking
- notification relevance

### Table: brain_scores

```sql
create table brain_scores (
  brain_id text primary key,
  launch_count integer not null default 0,
  save_count integer not null default 0,
  share_count integer not null default 0,
  recommendation_score numeric not null default 0,
  updated_at timestamptz not null default now()
);
```

Purpose:

- Library ordering
- Brain suggestions
- topic-to-Brain recommendations

### Table: mission_scores

```sql
create table mission_scores (
  mission_id text primary key,
  urgency_score numeric not null default 0,
  progress_risk_score numeric not null default 0,
  reminder_score numeric not null default 0,
  updated_at timestamptz not null default now()
);
```

Purpose:

- smarter mission reminders
- next-action suggestions
- retention without spam

## Phase 3: app data tables

These should be added after analytics ingestion is stable.

### profiles

```sql
create table profiles (
  id uuid primary key,
  username text unique not null,
  display_name text not null,
  bio text,
  avatar_url text,
  follower_count integer not null default 0,
  following_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### posts

```sql
create table posts (
  id text primary key,
  user_id uuid not null references profiles(id),
  topic_id text not null,
  content text not null,
  media_urls text[],
  brain_id text,
  comment_count integer not null default 0,
  repost_count integer not null default 0,
  created_at timestamptz not null default now()
);
```

### comments

```sql
create table comments (
  id text primary key,
  post_id text not null references posts(id) on delete cascade,
  parent_id text references comments(id) on delete cascade,
  user_id uuid not null references profiles(id),
  content text not null,
  created_at timestamptz not null default now()
);
```

### reactions

```sql
create table reactions (
  id text primary key,
  target_type text not null,
  target_id text not null,
  user_id uuid not null references profiles(id),
  reaction_type text not null,
  created_at timestamptz not null default now(),
  unique (target_type, target_id, user_id, reaction_type)
);
```

### topics

```sql
create table topics (
  id text primary key,
  name text unique not null,
  description text,
  follower_count integer not null default 0,
  category text,
  created_at timestamptz not null default now()
);
```

### brains

```sql
create table brains (
  id text primary key,
  author_id uuid references profiles(id),
  title text not null,
  category text not null,
  description text,
  root_node_id text,
  is_public boolean not null default false,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### brain_nodes

```sql
create table brain_nodes (
  id text primary key,
  brain_id text not null references brains(id) on delete cascade,
  node_type text not null,
  question_text text,
  result_text text,
  next_steps text,
  if_true_node_id text,
  if_false_node_id text,
  position jsonb,
  attachments jsonb
);
```

### missions

```sql
create table missions (
  id text primary key,
  user_id uuid not null references profiles(id),
  title text not null,
  description text,
  category text not null,
  status text not null default 'active',
  target_date timestamptz,
  progress integer not null default 0,
  xp_reward integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### notifications

```sql
create table notifications (
  id text primary key,
  user_id uuid not null references profiles(id),
  type text not null,
  actor_name text not null,
  content text not null,
  post_id text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
```

### conversations and messages

```sql
create table conversations (
  id text primary key,
  last_message text,
  last_message_at timestamptz,
  unread_count integer not null default 0,
  is_brain boolean not null default false,
  created_at timestamptz not null default now()
);

create table conversation_participants (
  conversation_id text not null references conversations(id) on delete cascade,
  user_id uuid not null references profiles(id),
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table messages (
  id text primary key,
  conversation_id text not null references conversations(id) on delete cascade,
  sender_id uuid references profiles(id),
  content text not null,
  created_at timestamptz not null default now()
);
```

## API routes to expose to the frontend

The UI should continue using clean app-level APIs, not raw database logic.

### Events

```text
POST /api/events
GET /api/events/summary
```

### Feed

```text
GET /api/feed?mode=foryou
GET /api/feed?mode=following
GET /api/feed?mode=trending
```

### Recommendations

```text
GET /api/recommendations/topics
GET /api/recommendations/brains
GET /api/recommendations/missions
GET /api/recommendations/communities
```

### Notifications

```text
GET /api/notifications
POST /api/notifications/:id/read
POST /api/notifications/read-all
```

### Moderation

```text
POST /api/moderation/report
POST /api/moderation/hide
```

### Search

```text
GET /api/search?q=...
```

## Non-SQL API layer

Even though Supabase is SQL underneath, the frontend should treat the server as a non-SQL product API.

Good frontend calls:

```ts
await api.trackEvent(event)
await api.getFeed('foryou')
await api.getBrainRecommendations()
await api.getRankedNotifications()
```

Avoid frontend raw SQL thinking.

## Optional non-SQL support services later

### Redis / Upstash

Use for:

- trending cache
- feed cache
- rate limiting
- presence
- notification queues

### Supabase pgvector

Use for:

- semantic Brain similarity
- post/topic similarity
- mentor matching
- search-by-meaning

### Search engine later

Start with Postgres full-text search. Later consider:

- Meilisearch
- Typesense
- Algolia

## Security/RLS direction

Recommended RLS pattern:

- Users can read public posts/topics/brains.
- Users can write their own posts/comments/missions.
- Users can read/write their own private profile settings.
- Users cannot write analytics directly; API server ingests analytics.
- Moderation tables should be server-write or restricted.
- Messages should be readable only by participants.

## Migration strategy

1. Keep IndexedDB stores and current UI intact.
2. Add Supabase tables and RLS.
3. Modify API server to write analytics events to Supabase.
4. Add aggregate background jobs or API-level aggregators.
5. Move feed reads to `GET /api/feed`.
6. Move notifications to `GET /api/notifications`.
7. Move posts/comments/reactions to Supabase.
8. Keep IndexedDB as cache/offline fallback.

## Recommended immediate next step

Implement Supabase client configuration in the API server, but do not require credentials yet.

Then add a storage adapter:

```text
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY exist:
  write events to Supabase analytics_events
else:
  write events to JSONL local file
```

This keeps development safe and production-ready without breaking local preview.

## Adapter interface implemented

The API server now has a Supabase-ready analytics adapter without requiring credentials during local development.

Storage order:

1. Supabase REST insert when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured.
2. JSONL fallback when Supabase is missing or unavailable.
3. Memory-only fallback when file storage is disabled/unavailable.

This means local development remains economical and production can move to Supabase by setting environment variables, without changing the frontend or endpoint contract.

Recommended first Supabase table remains:

```sql
create table analytics_events (
  id text primary key,
  user_id uuid null,
  session_id text not null,
  type text not null,
  route text not null,
  payload jsonb,
  client_created_at timestamptz not null,
  server_created_at timestamptz not null default now()
);
```

The adapter inserts these columns now:

- `id`
- `type`
- `session_id`
- `route`
- `payload`
- `client_created_at`

`server_created_at` is expected to use the database default.
