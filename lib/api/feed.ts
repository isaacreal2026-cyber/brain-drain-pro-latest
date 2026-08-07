import type { Post } from "../types";
import { api, ApiError } from "../api-client";

export interface FeedResponse {
  posts: CloudPost[];
  hasMore: boolean;
  source: string;
}

/**
 * Post shape returned by the cloud API. It is a strict superset of the local
 * Post fields so it can be cached in IndexedDB and rendered directly.
 */
export type CloudPost = Post & {
  authorName?: string;
  authorAvatar?: string | null;
  topicName?: string;
};

export interface FeedParams {
  mode?: "foryou" | "following" | "trending";
  topic?: string | null;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}

/**
 * Fetches a page of posts from the API. Throws ApiError on failure so the
 * caller can fall back to IndexedDB.
 */
export async function fetchFeed(params: FeedParams = {}): Promise<FeedResponse> {
  const query = new URLSearchParams();
  if (params.mode) query.set("mode", params.mode);
  if (params.topic) query.set("topic", params.topic);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  const qs = query.toString();
  return api.get<FeedResponse>(`/api/feed${qs ? `?${qs}` : ""}`, {
    signal: params.signal,
    retries: 1,
  });
}

export interface CreatePostInput {
  id: string;
  topicId: string;
  content: string;
  postType?: "post" | "question" | "answer";
  event?: Post["event"];
  mediaUrls?: string[];
  brainId?: string;
  createdAt?: number;
}

/** Creates a post on the server. Requires a valid auth token. */
export async function createPost(
  input: CreatePostInput,
  authToken?: string | null,
): Promise<{ post: Post }> {
  return api.post<{ post: Post }>("/api/posts", input, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
  });
}

export interface ReactionResponse {
  postId: string;
  reactions: { upvote: number; downvote: number; repost: number };
}

/** Toggles a reaction on a post. Requires a valid auth token. */
export async function reactToPost(
  postId: string,
  reactionType: "upvote" | "downvote" | "repost",
  authToken?: string | null,
): Promise<ReactionResponse> {
  return api.post<ReactionResponse>(
    `/api/posts/${encodeURIComponent(postId)}/react`,
    { reactionType },
    {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    },
  );
}

export function isApiError(error: unknown, status?: number): error is ApiError {
  return error instanceof ApiError && (status === undefined || error.status === status);
}
