import { env } from "./env";

/**
 * Thrown when an API call fails after exhausting retries or receives a
 * non-OK response. Callers can branch on `status` for 401/429/5xx handling.
 */
export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions extends Omit<RequestInit, "signal"> {
  /** Per-request timeout in milliseconds. */
  timeoutMs?: number;
  /** Number of retries on network/5xx errors. Defaults to 0 (no retry). */
  retries?: number;
  /** AbortSignal from the caller. */
  signal?: AbortSignal;
  /** JSON body — serialized automatically. */
  json?: unknown;
}

interface ApiClient {
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  request<T>(path: string, options?: RequestOptions): Promise<T>;
}

const JSON_CONTENT_TYPE = "application/json";

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  // Same-origin by default: when VITE_API_BASE_URL is empty the browser calls
  // the same host that served the app (works behind the production reverse
  // proxy). When set, it points at the standalone API host.
  return `${env.apiBaseUrl}${normalizedPath}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes(JSON_CONTENT_TYPE)) {
    return response.json().catch(() => null);
  }
  return response.text().catch(() => "");
}

function shouldRetry(response: Response | null, attempt: number, retries: number): boolean {
  if (attempt >= retries) return false;
  if (!response) return true; // network error
  // Retry on rate limiting and server errors only.
  return response.status === 429 || response.status >= 500;
}

function createClient(): ApiClient {
  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const {
      timeoutMs = env.apiTimeoutMs,
      retries = 0,
      signal: externalSignal,
      json,
      headers,
      body,
      ...init
    } = options;

    const url = buildUrl(path);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    // Chain the caller's abort signal to our internal one.
    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else externalSignal.addEventListener("abort", onExternalAbort, { once: true });
    }

    const finalHeaders = new Headers(headers);
    let finalBody: BodyInit | undefined = body;
    if (json !== undefined) {
      finalHeaders.set("Content-Type", JSON_CONTENT_TYPE);
      finalBody = JSON.stringify(json);
    }

    let response: Response | null = null;
    let lastError: unknown;

    try {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          response = await fetch(url, {
            ...init,
            headers: finalHeaders,
            body: finalBody,
            signal: controller.signal,
          });

          if (response.ok) {
            if (response.status === 204) return undefined as T;
            return (await parseResponseBody(response)) as T;
          }

          if (!shouldRetry(response, attempt, retries)) {
            const parsed = await parseResponseBody(response);
            const message =
              (parsed as { error?: string } | null)?.error ||
              `Request failed with status ${response.status}`;
            throw new ApiError(message, response.status, parsed);
          }

          // Honor Retry-After when present, otherwise exponential backoff.
          const retryAfter = Number(response.headers.get("retry-after"));
          const backoff = Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : Math.min(200 * 2 ** attempt, 2000);
          await delay(backoff);
        } catch (error) {
          lastError = error;
          if (controller.signal.aborted) {
            throw new ApiError("Request timed out or was aborted", 0);
          }
          if (!shouldRetry(null, attempt, retries)) throw error;
          await delay(Math.min(200 * 2 ** attempt, 2000));
        }
      }

      if (response) {
        const parsed = await parseResponseBody(response);
        throw new ApiError(`Request failed with status ${response.status}`, response.status, parsed);
      }
      throw lastError instanceof Error
        ? new ApiError(lastError.message, 0)
        : new ApiError("Network request failed", 0);
    } finally {
      window.clearTimeout(timeoutId);
      externalSignal?.removeEventListener("abort", onExternalAbort);
    }
  }

  return {
    get<T>(path: string, options?: RequestOptions) {
      return request<T>(path, { ...options, method: "GET" });
    },
    post<T>(path: string, body?: unknown, options?: RequestOptions) {
      return request<T>(path, { ...options, method: "POST", json: body });
    },
    request,
  };
}

export const api = createClient();
