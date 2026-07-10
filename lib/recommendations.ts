import { AnalyticsEvent } from "./analytics";
import { Brain, Mission, Notification as AppNotification, Post, Topic } from "./types";

export type FeedMode = "foryou" | "following" | "trending";

interface RankHomeFeedInput {
  posts: Post[];
  topics: Topic[];
  events: AnalyticsEvent[];
  mode: FeedMode;
  selectedTopicId: string | null;
  currentUserId?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function ageDecay(createdAt: number) {
  const ageDays = Math.max((Date.now() - createdAt) / DAY_MS, 0);
  return 1 / (1 + ageDays / 14);
}

function engagementScore(post: Post) {
  const reactions = Object.values(post.reactions || {}).reduce((sum, count) => sum + count, 0);
  return reactions + (post.commentCount || 0) * 1.5 + (post.repostCount || post.reactions?.repost || 0) * 2;
}

function trendingScore(post: Post) {
  const ageHours = Math.max((Date.now() - post.createdAt) / HOUR_MS, 1);
  return engagementScore(post) / Math.pow(ageHours + 2, 0.72);
}

function buildTopicScores(events: AnalyticsEvent[], posts: Post[], topics: Topic[]) {
  const scores: Record<string, number> = {};
  const postsById = new Map(posts.map((post) => [post.id, post]));
  const topicsById = new Map(topics.map((topic) => [topic.id, topic]));

  for (const topic of topics) {
    if (topic.isFollowed) scores[topic.id] = (scores[topic.id] || 0) + 8;
  }

  const addTopic = (topicId: string, points: number, createdAt: number) => {
    if (!topicId || !topicsById.has(topicId)) return;
    scores[topicId] = (scores[topicId] || 0) + points * ageDecay(createdAt);
  };

  const addPostTopic = (postId: string, points: number, createdAt: number) => {
    const post = postsById.get(postId);
    if (post) addTopic(post.topicId, points, createdAt);
  };

  for (const event of events) {
    const payload = event.payload || {};

    switch (event.type) {
      case "post_created":
        addTopic(asString(payload.topicId), asBoolean(payload.hasBrain) ? 10 : 8, event.createdAt);
        break;
      case "post_reaction":
        addPostTopic(asString(payload.postId), asBoolean(payload.active) ? 6 : -2, event.createdAt);
        break;
      case "post_share":
        addPostTopic(asString(payload.postId), 7, event.createdAt);
        break;
      case "comment_created":
        addPostTopic(asString(payload.postId), asBoolean(payload.isReply) ? 5 : 7, event.createdAt);
        break;
      case "comment_reaction":
        addPostTopic(asString(payload.postId), 3, event.createdAt);
        break;
      case "topic_selected":
        addTopic(asString(payload.topicId), 5, event.createdAt);
        break;
      case "search_submitted":
      case "search_recent_selected": {
        const query = asString(payload.query).toLowerCase();
        if (!query) break;
        for (const topic of topics) {
          if (query.includes(topic.name.toLowerCase())) {
            addTopic(topic.id, 5, event.createdAt);
          }
        }
        for (const post of posts) {
          const topic = topicsById.get(post.topicId);
          if (
            post.content.toLowerCase().includes(query) ||
            (topic && query.includes(topic.name.toLowerCase()))
          ) {
            addTopic(post.topicId, 1.5, event.createdAt);
          }
        }
        break;
      }
      case "page_view": {
        const route = event.route || "";
        const topicMatch = route.match(/\/topics\/([^/?#]+)/);
        if (topicMatch?.[1]) addTopic(decodeURIComponent(topicMatch[1]), 4, event.createdAt);
        break;
      }
      case "brain_launch": {
        const brainId = asString(payload.brainId);
        for (const post of posts) {
          if (post.brainId === brainId) addTopic(post.topicId, 8, event.createdAt);
        }
        break;
      }
      default:
        break;
    }
  }

  return scores;
}

function forYouScore(post: Post, topicScores: Record<string, number>) {
  const recencyBoost = ageDecay(post.createdAt) * 8;
  const engagementBoost = Math.log1p(engagementScore(post)) * 3;
  const interestBoost = topicScores[post.topicId] || 0;
  const brainBoost = post.brainId ? 1.5 : 0;
  return recencyBoost + engagementBoost + interestBoost + brainBoost;
}

export function rankHomeFeedPosts({ posts, topics, events, mode, selectedTopicId, currentUserId = "me" }: RankHomeFeedInput) {
  const topicFiltered = selectedTopicId ? posts.filter((post) => post.topicId === selectedTopicId) : posts;

  if (mode === "trending") {
    return [...topicFiltered].sort((a, b) => trendingScore(b) - trendingScore(a) || b.createdAt - a.createdAt);
  }

  const topicScores = buildTopicScores(events, posts, topics);

  if (mode === "following") {
    const followedTopicIds = new Set(topics.filter((topic) => topic.isFollowed).map((topic) => topic.id));
    const highInterestTopicIds = new Set(
      Object.entries(topicScores)
        .filter(([, score]) => score >= 5)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([topicId]) => topicId),
    );
    const filtered = topicFiltered.filter(
      (post) => followedTopicIds.has(post.topicId) || highInterestTopicIds.has(post.topicId) || post.userId === currentUserId,
    );
    return filtered.length > 0 ? filtered : topicFiltered;
  }

  const hasInterestSignal = Object.keys(topicScores).length > 0;
  if (!hasInterestSignal) return topicFiltered;

  return [...topicFiltered].sort((a, b) => forYouScore(b, topicScores) - forYouScore(a, topicScores) || b.createdAt - a.createdAt);
}

export function rankRelatedTopics(posts: Post[], topics: Topic[], events: AnalyticsEvent[]) {
  const counts = posts.reduce((acc, post) => {
    acc[post.topicId] = (acc[post.topicId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topicScores = buildTopicScores(events, posts, topics);

  return [...topics]
    .map((topic) => ({
      topic,
      score: (counts[topic.id] || 0) * 3 + (topicScores[topic.id] || 0) + (topic.isFollowed ? 4 : 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ topic }) => topic);
}

export function rankBrainsByLocalSignals(brains: Brain[], events: AnalyticsEvent[]) {
  const queryTerms = events
    .filter((event) => event.type === "search_submitted" || event.type === "search_recent_selected")
    .map((event) => asString(event.payload?.query).toLowerCase())
    .filter(Boolean);

  const launchedBrainScores = events.reduce((acc, event) => {
    if (event.type === "brain_launch") {
      const brainId = asString(event.payload?.brainId);
      if (brainId) acc[brainId] = (acc[brainId] || 0) + 10 * ageDecay(event.createdAt);
    }
    return acc;
  }, {} as Record<string, number>);

  const scoreBrain = (brain: Brain) => {
    const searchable = `${brain.title} ${brain.category} ${brain.description}`.toLowerCase();
    const searchBoost = queryTerms.reduce((score, query) => {
      if (!query) return score;
      if (searchable.includes(query)) return score + 6;
      return score + query.split(/\s+/).filter((term) => term.length > 2 && searchable.includes(term)).length * 1.5;
    }, 0);

    const favoriteBoost = brain.isFavorite ? 8 : 0;
    const launchedBoost = launchedBrainScores[brain.id] || 0;
    const recencyBoost = ageDecay(brain.created_at || Date.now()) * 2;

    return searchBoost + favoriteBoost + launchedBoost + recencyBoost;
  };

  return [...brains].sort((a, b) => scoreBrain(b) - scoreBrain(a) || (b.created_at || 0) - (a.created_at || 0));
}

export function rankNotificationsByRelevance(notifications: AppNotification[], events: AnalyticsEvent[]) {
  const recentSearches = events
    .filter((event) => event.type === "search_submitted" || event.type === "search_recent_selected")
    .slice(-20)
    .map((event) => asString(event.payload?.query).toLowerCase())
    .filter(Boolean);

  const typeWeight: Record<AppNotification["type"], number> = {
    mention: 14,
    reply: 12,
    brain_run: 10,
    reaction: 7,
  };

  const scoreNotification = (notification: AppNotification) => {
    const unreadBoost = notification.read ? 0 : 20;
    const recencyBoost = ageDecay(notification.createdAt) * 10;
    const content = `${notification.actorName} ${notification.content}`.toLowerCase();
    const searchBoost = recentSearches.some((query) => query && content.includes(query)) ? 5 : 0;
    return unreadBoost + recencyBoost + typeWeight[notification.type] + searchBoost;
  };

  return [...notifications].sort((a, b) => scoreNotification(b) - scoreNotification(a) || b.createdAt - a.createdAt);
}

export function rankMissionReminders(missions: Mission[], events: AnalyticsEvent[]) {
  const activeMissions = missions.filter((mission) => mission.status === "active");
  const recentSearchText = events
    .filter((event) => event.type === "search_submitted" || event.type === "search_recent_selected")
    .slice(-30)
    .map((event) => asString(event.payload?.query).toLowerCase())
    .join(" ");

  const scoreMission = (mission: Mission) => {
    const targetDateBoost = mission.targetDate ? Math.max(0, 12 - Math.max((mission.targetDate - Date.now()) / DAY_MS, 0)) : 0;
    const progressBoost = mission.progress < 50 ? 6 : mission.progress < 85 ? 3 : 1;
    const categoryBoost = recentSearchText.includes(mission.category.toLowerCase()) ? 4 : 0;
    const titleBoost = mission.title
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 3 && recentSearchText.includes(term)).length;

    return targetDateBoost + progressBoost + categoryBoost + titleBoost;
  };

  return [...activeMissions].sort((a, b) => scoreMission(b) - scoreMission(a) || (a.targetDate || Number.MAX_SAFE_INTEGER) - (b.targetDate || Number.MAX_SAFE_INTEGER));
}
