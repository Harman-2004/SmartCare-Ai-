self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open("smartcare-v1").then((cache) => cache.addAll([
            "/",
            "/static/style.css",
            "/static/script.js"
        ]))
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
