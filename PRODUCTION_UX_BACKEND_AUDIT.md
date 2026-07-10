# Production UX / Backend Intelligence Audit

This audit is scoped to the product direction you clarified: keep the existing UI, feature layout, and visual identity intact while strengthening the invisible UX/backend systems that make the app feel alive, useful, and retention-oriented.

## Current product identity

Brain Drain Pro currently reads as a social knowledge network with these pillars:

- Home feed for knowledge posts
- Topics and a visible knowledge graph
- Brain/logic modules users can create, run, share, and organize
- Missions/pathways for personal progress
- Civilization/community circles for group learning and check-ins
- Mentor Network messaging
- Notifications, profile identity, reputation, saved items, and settings

The UI already communicates a futuristic knowledge/community app. The production gap is not primarily visual; it is the invisible intelligence layer behind the UI.

## Production UX principle

Do not copy Facebook, TikTok, Instagram, Netflix, Reddit, GitHub, or Quora visually. Instead, apply the same product principle they use:

> The system learns what the user values, remembers context, ranks the next useful item, and pulls the user back with meaningful social/progress signals.

For Brain Drain Pro, that means recommendations should be based on topics, Brains, missions, check-ins, comments, searches, and mentor/community activity.

## Current backend/UX depth by area

| Area | Current state | Production gap | Safe next backend improvement | UI impact |
|---|---|---|---|---|
| Home feed | Local posts sorted mostly by time | No personalized relevance ranking | Track feed/post interactions, then rank by interests and engagement | None |
| Posts/reactions | Local IndexedDB interactions | Limited event memory | Track post creation, reaction, share, and comments | None |
| Comments | Local comment tree | Comment count and discussion signals need analytics | Track comment creation/reaction and use it as engagement signal | None |
| Search | Recent searches local | No learning from searches | Track submitted and selected searches | None |
| Brain modules | Brains can be created/launched | Launch behavior is not used for recommendations | Track Brain launches and link them to topics/missions later | None |
| Missions | Strong UI concept | No adaptive retention logic yet | Track mission actions later, recommend next milestone | None |
| Community | Strong circle/check-in concept | Matching is mostly simulated/local | Track check-ins and circle activity later | None |
| Messages | Local conversations | No social graph intelligence | Track message send volume, not content | None |
| Notifications | Local notifications | No intelligent trigger/ranking layer | Later rank notifications by relevance and urgency | None |
| Profile/reputation | Profile and contribution surfaces exist | Identity is not fully event-driven | Later derive contribution metrics from analytics/events | None |
| Settings/export | Local export exists | Needs visibility into local analytics | Include analytics events in export | None |

## First invisible analytics patch implemented

This patch adds local event tracking without changing UI, layout, colors, component structure, or feature names.

### New local store

IndexedDB version increased from 5 to 6 with a new object store:

- `analytics_events`

Indexes:

- `type`
- `sessionId`
- `createdAt`
- `route`

### New files

- `lib/analytics.ts`
- `hooks/use-analytics.ts`

### Events tracked now

- `session_start`
- `session_end`
- `app_visible`
- `app_hidden`
- `page_view`
- `post_created`
- `post_reaction`
- `post_share`
- `post_moderation_waiting`
- `comment_created`
- `comment_reaction`
- `message_sent`
- `search_submitted`
- `search_recent_selected`
- `brain_launch`

### Privacy and safety choices

- Analytics are local-only in IndexedDB.
- Analytics failures never block the app.
- Message/post/comment content is not stored in analytics; only content length and metadata are tracked.
- Search query text is stored locally because it is needed for future relevance; it is not sent anywhere.
- Report/Hide still waits for backend moderation support as requested.

## Why this matters

This gives the app the first backend/UX foundation needed for future production intelligence:

- feed ranking
- topic recommendations
- mission reminders
- Brain suggestions
- mentor/community matching
- notification relevance
- retention analysis

No visible UI changes are required for this foundation.

## Recommended next phase

After this patch, the next safe backend step is a local recommendation layer that reads `analytics_events` and existing stores to rank existing content without changing UI:

1. Build a user-interest profile from topic views, post reactions, searches, Brain launches, and comments.
2. Use that profile to rank Home Feed posts behind the existing For You tab.
3. Use it to improve Related Topics and suggested Brains.
4. Keep all UI unchanged.

## Manual decisions still needed

These should not be guessed:

- Backend moderation design for Report/Hide
- Real follow/follower graph
- Account deletion backend policy
- Board data model
- Mission attachment schema
- Mentor marketplace invite/message rules
- Cross-device analytics sync policy

## Second invisible UX/backend patch: local recommendation layer

This follow-up patch keeps the same Home Feed UI and existing tabs, but gives those tabs backend meaning through local recommendation logic.

### New files

- `lib/recommendations.ts`
- `hooks/use-recommendations.ts`

### What changed invisibly

- The existing `For You` tab now ranks posts by a local interest profile when enough local signals exist.
- The existing `Following` tab now uses followed topics plus high-interest topics inferred from local interactions, with fallback to the original feed if there is not enough signal.
- The existing `Trending` tab now ranks posts by engagement velocity over time.
- Existing related-topic chips now rank by post count plus local interest signals.
- Topic chip selection and feed tab selection are tracked as local analytics events.

### What did not change

- No visible UI redesign.
- No layout change.
- No renamed features.
- No new visible screen.
- No external analytics service.
- No network calls.

### Signals used by the local recommendation layer

- Topic selection
- Feed tab selection
- Page views, especially topic routes
- Post creation
- Post reactions
- Post shares
- Comment creation/reaction
- Search submissions/recent search selection
- Brain launches
- Followed topics, when available

### Production value

This is the first step toward Netflix/TikTok/Facebook-style product intelligence while preserving the app's current UI. The app can now begin learning locally which topics, posts, and Brains matter to a user, then use that to make the existing feed surfaces feel more relevant.

## Third invisible UX/backend patch: mission, Brain, and notification intelligence

This patch continues the backend/UX direction without visible redesign.

### Brain suggestions without new UI

The existing Library/Dashboard brain list now orders Brains with local relevance signals:

- Favorite Brains receive priority.
- Recently launched Brains receive priority.
- Brains matching recent local search intent receive priority.
- Recency remains a fallback.

This makes the existing Library feel more personally useful without adding new visible recommendation cards.

### Notification relevance without new UI

The existing Notifications list now orders notifications by relevance rather than pure time only:

- Unread notifications receive priority.
- Mentions and replies receive stronger priority than low-signal reactions.
- Brain-run notifications remain important because they indicate others are using the user's knowledge modules.
- Recent local search intent can modestly boost related notifications.

No notification UI was changed.

### Mission reminders without new UI

The existing mission reminder system now ranks active missions before showing reminders:

- Active missions are prioritized by deadline proximity, lower progress, and local search/category interest.
- At most one ranked mission reminder is shown per check cycle to reduce noisy/toast spam.
- A `mission_reminder` analytics event is recorded locally when a reminder is shown.

No mission UI was changed.

### New tracked events

- `notification_opened`
- `mission_reminder`

### Production value

This moves the app closer to the invisible product loops used by strong consumer apps: not by redesigning screens, but by making existing surfaces feel more personally timed, relevant, and useful.
