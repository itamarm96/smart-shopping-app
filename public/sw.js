const CACHE_VERSION = 3;
const CACHE_NAME = `smart-shopping-v${CACHE_VERSION}`;

// Files to cache for offline use
const STATIC_ASSETS = [
    "/",
    "/manifest.json",
    "/icon-512.png",
];

// Install: pre-cache static assets
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: clean up old caches and notify clients of update
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        }).then(() => {
            // Notify all clients that a new version is active
            return self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({
                        type: "SW_UPDATED",
                        version: CACHE_VERSION,
                    });
                });
            });
        })
    );
    self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // Don't cache API requests
    if (url.pathname.startsWith("/api/")) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response(
                    JSON.stringify({ error: "אין חיבור לאינטרנט. הפעולה דורשת רשת." }),
                    {
                        status: 503,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            })
        );
        return;
    }

    // For page navigations and static assets: network first, fall back to cache
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then((cached) => {
                    if (cached) return cached;
                    if (event.request.mode === "navigate") {
                        return caches.match("/");
                    }
                    return new Response("Offline", { status: 503 });
                });
            })
    );
});
