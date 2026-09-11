const CACHE = "carnet-v1";
// Les photos partagées depuis la galerie transitent par ce cache : le POST du
// partage n'a pas la session de l'auteur, c'est la page qui les enverra.
const PARTAGE = "carnet-partage";

// ---------- Notifications push ----------
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Les aventures de Maxou", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Les aventures de Maxou";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "carnet",
    data: { url: data.url || "/" },
    requireInteraction: !!data.requireInteraction,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ---------- Cache offline (réseau d'abord, repli sur le cache) ----------
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const cible = new URL(req.url);

  // ---------- Partage depuis la galerie (share_target) ----------
  // Android poste ici les photos choisies dans la galerie. On ne peut pas les
  // téléverser d'ici : /api/upload exige le jeton de l'auteur, que ce POST n'a
  // pas. On les met de côté et on renvoie le journal, qui viendra les chercher.
  if (req.method === "POST" && cible.pathname === "/partage") {
    event.respondWith(
      (async () => {
        let combien = 0;
        try {
          const form = await req.formData();
          const fichiers = form.getAll("fichiers").filter((f) => f && f.size > 0);
          const cache = await caches.open(PARTAGE);
          // un partage chasse l'autre : pas de reliquat d'un envoi abandonné
          for (const k of await cache.keys()) await cache.delete(k);
          for (const f of fichiers) {
            await cache.put(
              new Request(`/partage-photo/${combien++}`),
              new Response(f, {
                headers: {
                  "content-type": f.type || "image/jpeg",
                  "x-nom": encodeURIComponent(f.name || "photo"),
                },
              })
            );
          }
        } catch (e) {}
        return Response.redirect(`/journal?partage=${combien}`, 303);
      })()
    );
    return;
  }

  if (req.method !== "GET") return;
  const url = cible;
  if (url.origin !== self.location.origin) return; // pas de cache cross-origin (Supabase, Mapbox…)
  if (url.pathname.startsWith("/api/")) return; // ne pas cacher les réponses d'API

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req))
  );
});

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
      clients.claim(),
    ])
  )
);
