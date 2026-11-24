/* Life Hub service worker: caches the app shell so it opens fast and installs,
   and serves /_blob/<id> uploads from private Supabase Storage using the user's token. */
var CACHE = "lifehub-v5";
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
  var fm = url.origin === self.location.origin && url.pathname.match(/\/_blob\/fam\/([0-9a-f-]{36})\/([A-Za-z0-9]+)$/);
  if (fm) {
    e.respondWith(getAuth(e.clientId).then(function (a) {
      if (!a) return new Response("Sign in to view this file.", { status: 401 });
      return fetch(a.url + "/storage/v1/object/authenticated/files/family/" + fm[1] + "/" + fm[2], { headers: { Authorization: "Bearer " + a.token, apikey: a.key } });
    }));
    return;
  }
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

/* Notifications sent by the notify function */
self.addEventListener("push", function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: "Life Hub", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Life Hub", {
    body: d.body || "", tag: d.tag || undefined, icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: d.url || "./index.html" }
  }));
});
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var target = new URL((e.notification.data && e.notification.data.url) || "./index.html", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) { if ("focus" in list[i]) { list[i].navigate(target).catch(function () {}); return list[i].focus(); } }
    return self.clients.openWindow(target);
  }));
});
