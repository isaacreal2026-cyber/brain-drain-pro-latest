/* Brain Drain Pro — offline service worker.
 *
 * Strategy:
 *  - Same-origin static assets (hashed JS/CSS/images): cache-first, then
 *    fall back to network. These are content-addressed so caching is safe.
 *  - Navigations (HTML): network-first, falling back to cached index.html so
 *    the app shell still loads offline. This avoids serving a stale shell
 *    when the network is available.
 *  - Cross-origin and API/auth requests are always passed through untouched.
 */

const CACHE_VERSION = "v2";
const STATIC_CACHE = `brain-builder-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `brain-builder-runtime-${CACHE_VERSION}`;
const APP_SHELL = ["/", "/index.html", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isSuccessfulResponse(response) {
  return response && response.status === 200 && response.type === "basic";
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Never intercept APIs, auth, sockets, or non-http(s) schemes.
  if (
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("identitytoolkit.googleapis.com") ||
    url.hostname.includes("securetoken.googleapis.com") ||
    url.hostname.includes("firebase") ||
    url.hostname.includes("supabase") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("socket") ||
    (url.protocol !== "http:" && url.protocol !== "https:")
  ) {
    return;
  }

  // Cross-origin requests: only cache same-origin to avoid opaque surprises.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Navigations: network-first for a fresh shell, offline fallback.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (isSuccessfulResponse(response)) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put("/index.html", copy));
          }
          return response;
        })
        .catch(() => caches.match("/index.html").then((cached) => cached || caches.match("/"))),
    );
    return;
  }

  // Static assets: cache-first.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (isSuccessfulResponse(response)) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
    }),
  );
});
