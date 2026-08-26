/*
 * ClaimThunJai service worker.
 *
 * Deliberately conservative. This is a price-control system: showing a stale
 * quotation, labour rate or approval status would be worse than showing nothing,
 * so nothing that can change is ever served from cache. Only two things are
 * cached — the immutable, content-hashed build assets, and an offline fallback
 * page — which is enough to make the app installable and to fail gracefully.
 *
 * Bump CACHE_VERSION to force every client to drop its old cache on next load.
 */
const CACHE_VERSION = "v1";
const STATIC_CACHE = `ctj-static-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [OFFLINE_URL, "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      // Take over straight away: this app deploys often and users should never be
      // left on a superseded worker.
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Mutating requests must always hit the network.
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Leave cross-origin requests (e.g. Google Fonts) to the browser.
  if (url.origin !== self.location.origin) return;

  // Claim, quotation and price data: never cached, never intercepted.
  if (url.pathname.startsWith("/api/")) return;

  // Page loads: always try the network so the user sees live data; only fall back
  // to the offline page when the network is genuinely unreachable.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(OFFLINE_URL);
        return (
          cached ||
          new Response("Offline", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          })
        );
      })
    );
    return;
  }

  // Build output and brand assets are content-hashed or static, so a cache hit is
  // always correct and makes repeat launches fast.
  const isImmutableAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/logo/");

  if (isImmutableAsset) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
  }

  // Anything else falls through to the browser's default network handling.
});
