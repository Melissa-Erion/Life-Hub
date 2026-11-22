/* Life Hub service worker: caches the app shell so it opens fast and installs,
   and serves /_blob/<id> uploads from private Supabase Storage using the user's token. */
var CACHE = "lifehub-v2";
var SHELL = ["./", "index.html", "runtime.js", "vendor/supabase.js", "config.js", "library.json", "pathways.json", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});

function getAuth(clientId) {
  return self.clients.get(clientId).then(function (c) {
    if (!c) return self.clients.matchAll({ type: "window" }).then(function (l) { return l[0]; });
    return c;
  }).then(function (c) {
    if (!c) return null;
    return new Promise(function (res) {
      var ch = new MessageChannel();
      ch.port1.onmessage = function (m) { res(m.data); };
      c.postMessage({ type: "need-token" }, [ch.port2]);
      setTimeout(function () { res(null); }, 4000);
    });
  });
}

self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  var m = url.origin === self.location.origin && url.pathname.match(/\/_blob\/([A-Za-z0-9]+)$/);
  if (m) {
    e.respondWith(getAuth(e.clientId).then(function (a) {
      if (!a) return new Response("Sign in to view this file.", { status: 401 });
      return fetch(a.url + "/storage/v1/object/authenticated/files/" + a.uid + "/" + m[1], { headers: { Authorization: "Bearer " + a.token, apikey: a.key } });
    }));
    return;
  }
  if (url.origin !== self.location.origin) return; // fonts, supabase api, cdn: straight to network
  // app shell: network first so updates show up, cache as the offline fallback
  e.respondWith(fetch(req).then(function (r) {
    if (r.ok) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
    return r;
  }).catch(function () { return caches.match(req).then(function (r) { return r || caches.match("index.html"); }); }));
});
