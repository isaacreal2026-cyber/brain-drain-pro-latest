import type { Brain, Node } from "../types";
import { api, ApiError } from "../api-client";

export interface CloudBrain extends Brain {
  authorId?: string | null;
  isPublic?: boolean;
}

export interface ListBrainsResponse {
  brains: CloudBrain[];
  hasMore: boolean;
  source: string;
}

export interface BrainDetailResponse {
  brain: CloudBrain;
  nodes: Node[];
  source: string;
}

export interface UpsertBrainInput {
  brain: Omit<Brain, "created_at"> & {
    is_public?: boolean;
    is_favorite?: boolean;
  };
  nodes: Node[];
}

export function isBrainsError(error: unknown, status?: number): error is ApiError {
  return error instanceof ApiError && (status === undefined || error.status === status);
}

export async function listBrains(
  options: { mine?: boolean; limit?: number; offset?: number; signal?: AbortSignal } = {},
): Promise<ListBrainsResponse> {
  const params = new URLSearchParams();
  if (options.mine) params.set("mine", "true");
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset) params.set("offset", String(options.offset));
  const qs = params.toString();
  return api.get<ListBrainsResponse>(`/api/brains${qs ? `?${qs}` : ""}`, {
    signal: options.signal,
    retries: 1,
  });
}

export async function getBrain(
  id: string,
  signal?: AbortSignal,
): Promise<BrainDetailResponse> {
  return api.get<BrainDetailResponse>(`/api/brains/${encodeURIComponent(id)}`, {
    signal,
    retries: 1,
  });
}

export async function saveBrain(
  input: UpsertBrainInput,
  authToken?: string | null,
): Promise<void> {
  await api.post(
    "/api/brains",
    {
      brain: {
        ...input.brain,
        is_public: input.brain.is_public ?? false,
      },
      nodes: input.nodes,
    },
    {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    },
  );
}

export async function deleteBrain(
  id: string,
  authToken?: string | null,
): Promise<void> {
  await api.request(`/api/brains/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
  });
}
