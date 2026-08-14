/**
 * Minimal Supabase PostgREST client using fetch and the service-role key.
 * The API server is the only component that talks to Supabase directly;
 * the browser never sees the service-role key.
 */

import { config } from "./config";

export class SupabaseError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "SupabaseError";
    this.status = status;
    this.body = body;
  }
}

function baseUrl(): string {
  return `${config.supabase.url.replace(/\/+$/, "")}/rest/v1`;
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: config.supabase.serviceRoleKey,
    Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

interface QueryOptions {
  select?: string;
  filters?: Record<string, string | number | boolean | null>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  /** e.g. "exact" for upsert conflict resolution. */
  prefer?: string;
  signal?: AbortSignal;
}

function buildQuery(options: QueryOptions): string {
  const params = new URLSearchParams();
  if (options.select) params.set("select", options.select);
  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      if (value === null || value === undefined) continue;
      params.set(key, String(value));
    }
  }
  if (options.order) {
    const dir = options.order.ascending === false ? "desc" : "asc";
    params.set("order", `${options.order.column}.${dir}`);
  }
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset) params.set("offset", String(options.offset));
  return params.toString();
}

export const supabase = {
  isConfigured: () => config.supabase.isConfigured,

  async get<T>(
    table: string,
    options: QueryOptions = {},
  ): Promise<T[]> {
    const query = buildQuery(options);
    const response = await fetch(`${baseUrl()}/${table}?${query}`, {
      headers: headers(),
      signal: options.signal,
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new SupabaseError(
        `Supabase GET ${table} failed: ${response.status}`,
        response.status,
        body.slice(0, 300),
      );
    }
    return (await response.json()) as T[];
  },

  async getOne<T>(table: string, options: QueryOptions = {}): Promise<T | null> {
    const rows = await supabase.get<T>(table, { ...options, limit: 1 });
    return rows[0] ?? null;
  },

  async rpc<TResult = unknown>(fn: string, payload: unknown): Promise<TResult> {
    const response = await fetch(`${baseUrl()}/rpc/${fn}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new SupabaseError(
        `Supabase RPC ${fn} failed: ${response.status}`,
        response.status,
        body.slice(0, 300),
      );
    }
    if (response.status === 204) return undefined as TResult;
    return (await response.json()) as TResult;
  },

  async insert<T>(table: string, rows: T | T[], prefer?: string): Promise<void> {
    const response = await fetch(`${baseUrl()}/${table}`, {
      method: "POST",
      headers: headers(prefer ? { Prefer: prefer } : {}),
      body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new SupabaseError(
        `Supabase INSERT ${table} failed: ${response.status}`,
        response.status,
        body.slice(0, 300),
      );
    }
  },

  async update<T>(
    table: string,
    match: Record<string, string>,
    changes: Partial<T>,
  ): Promise<void> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(match)) {
      params.set(key, `eq.${value}`);
    }
    const response = await fetch(`${baseUrl()}/${table}?${params}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify(changes),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new SupabaseError(
        `Supabase UPDATE ${table} failed: ${response.status}`,
        response.status,
        body.slice(0, 300),
      );
    }
  },

  async delete(table: string, match: Record<string, string>): Promise<void> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(match)) {
      params.set(key, `eq.${value}`);
    }
    const response = await fetch(`${baseUrl()}/${table}?${params}`, {
      method: "DELETE",
      headers: headers(),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new SupabaseError(
        `Supabase DELETE ${table} failed: ${response.status}`,
        response.status,
        body.slice(0, 300),
      );
    }
  },

  /**
   * Delete rows matching `match` whose `notInColumn` value is NOT in the
   * provided list. Used to replace child rows without a dangerous
   * delete-then-insert window. Values are passed through PostgREST's
   * `not.in.(...)` filter.
   */
  async deleteNotIn(
    table: string,
    match: Record<string, string>,
    notInColumn: string,
    notInValues: string[],
  ): Promise<void> {
    if (notInValues.length === 0) {
      // Nothing to keep — fall back to a plain match delete.
      await this.delete(table, match);
      return;
    }
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(match)) {
      params.set(key, `eq.${value}`);
    }
    const inList = notInValues.map((v) => `"${v.replace(/"/g, '\\"')}"`).join(",");
    params.set(notInColumn, `not.in.(${inList})`);
    const response = await fetch(`${baseUrl()}/${table}?${params}`, {
      method: "DELETE",
      headers: headers(),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new SupabaseError(
        `Supabase DELETE-NOT-IN ${table} failed: ${response.status}`,
        response.status,
        body.slice(0, 300),
      );
    }
  },
};
