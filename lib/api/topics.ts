import type { Topic } from "../types";
import { api, ApiError } from "../api-client";

export interface TopicsResponse {
  topics: CloudTopic[];
  source: string;
}

export type CloudTopic = Topic;

export interface CreateTopicInput {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

export async function fetchTopics(signal?: AbortSignal): Promise<TopicsResponse> {
  return api.get<TopicsResponse>("/api/topics", { signal, retries: 1 });
}

export async function createTopic(
  input: CreateTopicInput,
  authToken?: string | null,
): Promise<{ topic: Topic }> {
  return api.post<{ topic: Topic }>("/api/topics", input, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
  });
}

export function isTopicsError(error: unknown, status?: number): error is ApiError {
  return error instanceof ApiError && (status === undefined || error.status === status);
}

export async function followTopic(
  topicId: string,
  authToken?: string | null,
): Promise<void> {
  await api.post(
    "/api/topics/follow",
    { topicId },
    {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    },
  );
}
