/* Life Hub runtime.
   Replaces the claude.ai artifact runtime (window.claude.use) with Supabase, so the
   app runs on its own. The UI in index.html is unchanged: it still asks for
   "db", "assets", "sample", "downloads" and "user", and this file answers.

   Needs config.js (SUPABASE_URL, SUPABASE_ANON_KEY). The anon key is meant to be
   public; every row is protected by row-level security (see supabase/migrations). */
(function () {
  "use strict";
  var cfg = window.LIFEHUB_CONFIG || {};
  if (!cfg.SUPABASE_URL || !window.supabase) return; // not configured: leave window.claude undefined (app shows its own notice)

  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  /* ---------- PWA ---------- */
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(function () {});
    navigator.serviceWorker.addEventListener("message", function (e) {
      // the service worker asks for the current token when it serves /_blob/<id>
      if (e.data && e.data.type === "need-token" && e.ports && e.ports[0]) {
        sb.auth.getSession().then(function (r) {
          var s = r.data.session;
          e.ports[0].postMessage(s ? { token: s.access_token, uid: s.user.id, url: cfg.SUPABASE_URL, key: cfg.SUPABASE_ANON_KEY } : null);
        });
      }
    });
  }

  /* ---------- sign in ---------- */
  var session = null;
  var authReady = new Promise(function (resolve) {
    var done = false;
    function ok(s) { session = s; if (s && !done) { done = true; hideLogin(); resolve(s); } }
    sb.auth.getSession().then(function (r) { if (r.data.session) ok(r.data.session); else showLogin(); });
    sb.auth.onAuthStateChange(function (ev, s) {
      if (ev === "SIGNED_OUT") { location.reload(); return; }
      if (s) ok(s);
    });
  });

  var overlay;
  function showLogin() {
    if (overlay) return;
    var wait = function () { if (!document.body) return setTimeout(wait, 20); build(); };
    wait();
    function build() {
      overlay = document.createElement("div");
      overlay.setAttribute("style", "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;background:var(--bg,#F1F1EF);color:var(--ink,#343432);font-family:var(--body,system-ui,sans-serif)");
      overlay.innerHTML =
        '<form id="lh-login" style="width:100%;max-width:380px;background:var(--surface,#F8F8F6);border:1px solid var(--line,#DCDCD8);border-radius:18px;padding:28px">' +
        '<h1 style="font-family:var(--display,sans-serif);font-weight:900;text-transform:uppercase;letter-spacing:.06em;font-size:1.4rem;margin:0 0 4px">Life Hub</h1>' +
        '<p style="margin:0 0 18px;color:var(--muted,#75756F)">Sign in to open your hub.</p>' +
        '<label style="display:block;font-size:.8rem;margin-bottom:6px" for="lh-email">Email</label>' +
        '<input id="lh-email" type="email" autocomplete="email" required style="width:100%;box-sizing:border-box;height:40px;border-radius:12px;border:1px solid var(--line,#DCDCD8);background:var(--field,#FCFCFA);color:inherit;padding:0 12px;font:inherit;margin-bottom:12px">' +
        '<div id="lh-pwrow"><label style="display:block;font-size:.8rem;margin-bottom:6px" for="lh-pw">Password</label>' +
        '<input id="lh-pw" type="password" autocomplete="current-password" style="width:100%;box-sizing:border-box;height:40px;border-radius:12px;border:1px solid var(--line,#DCDCD8);background:var(--field,#FCFCFA);color:inherit;padding:0 12px;font:inherit;margin-bottom:12px"></div>' +
        '<button type="submit" id="lh-go" style="width:100%;height:42px;border-radius:12px;border:0;background:var(--accent,#3A3A38);color:var(--on-accent,#F8F8F6);font:inherit;font-weight:700;cursor:pointer">Sign in</button>' +
        '<button type="button" id="lh-link" style="width:100%;margin-top:8px;height:40px;border-radius:12px;border:1px solid var(--line,#DCDCD8);background:transparent;color:inherit;font:inherit;cursor:pointer">Email me a sign-in link instead</button>' +
        '<p id="lh-msg" role="status" style="min-height:1.2em;margin:14px 0 0;font-size:.85rem;color:var(--muted,#75756F)"></p></form>';
      document.body.appendChild(overlay);
      var f = overlay.querySelector("#lh-login"), em = f.querySelector("#lh-email"), pw = f.querySelector("#lh-pw"), msg = f.querySelector("#lh-msg");
      function say(t, bad) { msg.textContent = t; msg.style.color = bad ? "var(--signal,#C4483C)" : "var(--muted,#75756F)"; }
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!pw.value) { say("Enter your password, or use the email link below.", true); return; }
        say("Signing in…");
        sb.auth.signInWithPassword({ email: em.value.trim(), password: pw.value }).then(function (r) {
          if (r.error) say("That email and password did not match.", true);
        });
      });
      f.querySelector("#lh-link").addEventListener("click", function () {
        if (!em.value.trim()) { say("Type your email first.", true); return; }
        say("Sending…");
        sb.auth.signInWithOtp({ email: em.value.trim(), options: { shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname } }).then(function (r) {
          if (r.error) say("Could not send the link. Check the email address.", true);
          else say("Check your email and open the link on this device.");
        });
      });
    }
  }
  function hideLogin() { if (overlay) { overlay.remove(); overlay = null; } }

  /* ---------- db: Firestore-style API over one `docs` table ---------- */
  var cache = {};      // coll -> {id: data}
  var listeners = {};  // coll -> [fn]
  var loaded = false, loading = null;

  function emit(coll) {
    (listeners[coll] || []).forEach(function (fn) { fn(); });
  }
  function snap(coll) {
    var c = cache[coll] || {};
    return { docs: Object.keys(c).map(function (id) { return { id: id, data: function () { return JSON.parse(JSON.stringify(c[id])); } }; }) };
  }
  function loadAll() {
    if (loading) return loading;
    loading = (async function () {
      var out = {}, from = 0, size = 1000;
      for (;;) {
        var r = await sb.from("docs").select("coll,id,data").eq("user_id", session.user.id).order("coll").order("id").range(from, from + size - 1);
        if (r.error) throw r.error;
        r.data.forEach(function (row) { (out[row.coll] = out[row.coll] || {})[row.id] = row.data; });
        if (r.data.length < size) break;
        from += size;
      }
      cache = out; loaded = true;
      Object.keys(listeners).forEach(emit);
      subscribe();
    })();
    loading.catch(function () { loading = null; });
    return loading;
  }
  function subscribe() {
    sb.channel("docs-" + session.user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "docs", filter: "user_id=eq." + session.user.id }, function (p) {
        var row = p.eventType === "DELETE" ? p.old : p.new;
        if (!row || !row.coll) return;
        if (p.eventType === "DELETE") { if (cache[row.coll]) delete cache[row.coll][row.id]; }
        else (cache[row.coll] = cache[row.coll] || {})[row.id] = row.data;
        emit(row.coll);
      }).subscribe();
  }
  function put(coll, id, data) {
    return sb.from("docs").upsert({ user_id: session.user.id, coll: coll, id: id, data: data, updated_at: new Date().toISOString() }, { onConflict: "user_id,coll,id" }).then(function (r) {
      if (r.error) throw r.error;
      (cache[coll] = cache[coll] || {})[id] = JSON.parse(JSON.stringify(data));
      emit(coll);
    });
  }
  function del(coll, id) {
    return sb.from("docs").delete().eq("user_id", session.user.id).eq("coll", coll).eq("id", id).then(function (r) {
      if (r.error) throw r.error;
      if (cache[coll]) delete cache[coll][id];
      emit(coll);
    });
  }
  function listen(coll, cb, onErr) {
    var fire = function () { cb(coll === "meta" ? null : snap(coll)); };
    (listeners[coll] = listeners[coll] || []).push(fire);
    loadAll().then(function () { fire(); }, function (e) { if (onErr) onErr(e); });
  }
  var db = {
    collection: function (c) {
      return {
        onSnapshot: function (cb, err) { listen(c, function () { cb(snap(c)); }, err); },
        doc: function (id) { return { set: function (d) { return put(c, id, d); }, delete: function () { return del(c, id); } }; },
      };
    },
    doc: function (path) {
      var parts = path.split("/"), c = parts[0], id = parts.slice(1).join("/");
      return {
        set: function (d) { return put(c, id, d); },
        delete: function () { return del(c, id); },
        onSnapshot: function (cb, err) {
          var fire = function () {
            var has = cache[c] && Object.prototype.hasOwnProperty.call(cache[c], id);
            cb({ exists: !!has, data: function () { return has ? JSON.parse(JSON.stringify(cache[c][id])) : undefined; } });
          };
          (listeners[c] = listeners[c] || []).push(fire);
          loadAll().then(fire, function (e) { if (err) err(e); });
        },
      };
    },
  };

  /* ---------- family: shared space (public.shared_docs) and goals family members share ---------- */
  var fam = { loading: null, loaded: false, space: null, name: "Family", members: [], cache: {}, listeners: {}, partner: {}, plisteners: [], ilisteners: [] };
  function famEmit(coll) { (fam.listeners[coll] || []).forEach(function (fn) { fn(); }); }
  function famInfo() {
    return { space: fam.space, name: fam.name, me: session.user.id, members: fam.members.map(function (m) { return { user_id: m.user_id, name: m.display_name || "Member", role: m.role, me: m.user_id === session.user.id }; }) };
  }
  function partnerList() {
    var names = {}; fam.members.forEach(function (m) { names[m.user_id] = m.display_name || "Family member"; });
    return Object.keys(fam.partner).map(function (k) { var x = fam.partner[k]; return { owner: x.user_id, ownerName: names[x.user_id] || "Family member", id: x.id, data: JSON.parse(JSON.stringify(x.data)) }; });
  }
  function emitPartner() { var l = partnerList(); fam.plisteners.forEach(function (fn) { fn(l); }); }
  function emitInfo() { var i = famInfo(); fam.ilisteners.forEach(function (fn) { fn(i); }); }
  async function loadPartnerGoals() {
    var others = fam.members.filter(function (m) { return m.user_id !== session.user.id; }).map(function (m) { return m.user_id; });
    var next = {};
    if (others.length) {
      var g = await sb.from("docs").select("user_id,id,data").eq("coll", "goals").in("user_id", others);
      if (g.error) throw g.error;
      g.data.forEach(function (row) { if (row.data && row.data.shared) next[row.user_id + ":" + row.id] = row; });
    }
    fam.partner = next; emitPartner();
  }
  function famLoad() {
    if (fam.loading) return fam.loading;
    fam.loading = (async function () {
      var m = await sb.from("space_members").select("space_id,user_id,role,display_name");
      if (m.error) throw m.error;
      var mine = m.data.filter(function (x) { return x.user_id === session.user.id; })[0];
      fam.space = mine ? mine.space_id : null;
      fam.members = m.data.filter(function (x) { return x.space_id === fam.space; });
      if (fam.space) {
        var sp = await sb.from("spaces").select("name").eq("id", fam.space).maybeSingle();
        if (sp.data && sp.data.name) fam.name = sp.data.name;
        var out = {}, from = 0, size = 1000;
        for (;;) {
          var r = await sb.from("shared_docs").select("coll,id,data").eq("space_id", fam.space).order("coll").order("id").range(from, from + size - 1);
          if (r.error) throw r.error;
          r.data.forEach(function (row) { (out[row.coll] = out[row.coll] || {})[row.id] = row.data; });
          if (r.data.length < size) break;
          from += size;
        }
        fam.cache = out;
        await loadPartnerGoals();
        sb.channel("shared-" + fam.space).on("postgres_changes", { event: "*", schema: "public", table: "shared_docs", filter: "space_id=eq." + fam.space }, function (p) {
          var row = p.eventType === "DELETE" ? p.old : p.new;
          if (!row || !row.coll) return;
          if (p.eventType === "DELETE") { if (fam.cache[row.coll]) delete fam.cache[row.coll][row.id]; }
          else (fam.cache[row.coll] = fam.cache[row.coll] || {})[row.id] = row.data;
          famEmit(row.coll);
        }).subscribe();
        fam.members.forEach(function (mm) {
          if (mm.user_id === session.user.id) return;
          sb.channel("pgoals-" + mm.user_id).on("postgres_changes", { event: "*", schema: "public", table: "docs", filter: "user_id=eq." + mm.user_id }, function () { loadPartnerGoals().catch(function () {}); }).subscribe();
        });
        // a goal that is unshared stops arriving, so refresh now and then
        document.addEventListener("visibilitychange", function () { if (!document.hidden) loadPartnerGoals().catch(function () {}); });
        setInterval(function () { loadPartnerGoals().catch(function () {}); }, 120000);
      }
      fam.loaded = true;
      Object.keys(fam.listeners).forEach(famEmit); emitInfo();
    })();
    fam.loading.catch(function () { fam.loading = null; });
    return fam.loading;
  }
  function fsnap(coll) { var c = fam.cache[coll] || {}; return { docs: Object.keys(c).map(function (id) { return { id: id, data: function () { return JSON.parse(JSON.stringify(c[id])); } }; }) }; }
  function fput(coll, id, data) {
    if (!fam.space) return Promise.reject(new Error("No family space"));
    return sb.from("shared_docs").upsert({ space_id: fam.space, coll: coll, id: id, data: data, updated_at: new Date().toISOString(), updated_by: session.user.id }, { onConflict: "space_id,coll,id" }).then(function (r) {
      if (r.error) throw r.error;
      (fam.cache[coll] = fam.cache[coll] || {})[id] = JSON.parse(JSON.stringify(data)); famEmit(coll);
    });
  }
  function fdel(coll, id) {
    if (!fam.space) return Promise.reject(new Error("No family space"));
    return sb.from("shared_docs").delete().eq("space_id", fam.space).eq("coll", coll).eq("id", id).then(function (r) {
      if (r.error) throw r.error;
      if (fam.cache[coll]) delete fam.cache[coll][id]; famEmit(coll);
    });
  }
  var family = {
    collection: function (c) {
      return {
        onSnapshot: function (cb, err) { (fam.listeners[c] = fam.listeners[c] || []).push(function () { cb(fsnap(c)); }); famLoad().then(function () { cb(fsnap(c)); }, function (e) { if (err) err(e); }); },
        doc: function (id) { return { set: function (d) { return fput(c, id, d); }, delete: function () { return fdel(c, id); } }; },
      };
    },
    onInfo: function (cb) { fam.ilisteners.push(cb); famLoad().then(function () { cb(famInfo()); }, function () { cb(null); }); },
    onPartnerGoals: function (cb) { fam.plisteners.push(cb); famLoad().then(function () { cb(partnerList()); }, function () { cb([]); }); },
    setName: function (name) { return sb.from("space_members").update({ display_name: name }).eq("space_id", fam.space).eq("user_id", session.user.id).then(function (r) { if (r.error) throw r.error; fam.members.forEach(function (m) { if (m.user_id === session.user.id) m.display_name = name; }); emitInfo(); emitPartner(); }); },
  };

  /* ---------- assets: files in a private Storage bucket, shown at /_blob/<id> ---------- */
  function uid() { return (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)).replace(/-/g, ""); }
  var assets = {
    upload: function (file) {
      var id = uid();
      return sb.storage.from("files").upload(session.user.id + "/" + id, file, { contentType: file.type || "application/octet-stream", upsert: false }).then(function (r) {
        if (r.error) throw r.error;
        return { id: id, contentType: file.type || "application/octet-stream", sizeBytes: file.size };
      });
    },
  };

  /* ---------- sample: "Ask Claude" goes through the `claude` edge function ---------- */
  function sample(prompt, opts) {
    return sb.functions.invoke("claude", { body: { prompt: prompt, tier: (opts && opts.modelTier) || "default" } }).then(function (r) {
      if (r.error) throw r.error;
      return { text: (r.data && r.data.text) || "" };
    });
  }

  /* ---------- downloads ---------- */
  var downloads = {
    save: function (o) {
      return new Promise(function (resolve) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([o.data], { type: "application/json" }));
        a.download = o.filename;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); resolve(); }, 1000);
      });
    },
  };

  /* ---------- window.claude ---------- */
  window.claude = {
    use: function (name) {
      return authReady.then(function () {
        if (name === "db") return db;
        if (name === "assets") return assets;
        if (name === "sample") return sample;
        if (name === "downloads") return downloads;
        if (name === "user") return { can: function () { return Promise.resolve(true); } };
        if (name === "family") return family;
        return null;
      });
    },
  };

  /* ---------- small status note that survives the app redrawing the page ---------- */
  function toast(m) {
    var t = document.getElementById("lh-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "lh-toast";
      t.setAttribute("role", "status");
      t.setAttribute("style", "position:fixed;left:50%;transform:translateX(-50%);bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:30;max-width:min(92vw,420px);padding:12px 16px;border-radius:14px;background:var(--ink,#343432);color:var(--bg,#F1F1EF);font:600 .9rem var(--body,system-ui,sans-serif);box-shadow:0 8px 24px rgba(0,0,0,.18)");
      document.body.appendChild(t);
    }
    t.textContent = m;
    t.style.display = "block";
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.style.display = "none"; }, /…$/.test(m) ? 60000 : 6000);
  }
  window.lhToast = toast;

  /* ---------- Backup page: sign out, import ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest('[data-lh="signout"]');
    if (t) sb.auth.signOut();
  });
  document.addEventListener("submit", function (e) {
    var f = e.target;
    if (!f || !f.matches || !f.matches('[data-lh-form="setpw"]')) return;
    e.preventDefault();
    var i = document.getElementById("lh-newpw"), m = document.getElementById("lh-pw-msg");
    if (!i || !m) return;
    if (i.value.length < 10) { m.textContent = "Use at least 10 characters."; return; }
    m.textContent = "Saving…";
    sb.auth.updateUser({ password: i.value }).then(function (res) {
      if (res.error) { m.textContent = "Could not set the password: " + res.error.message; return; }
      i.value = "";
      m.textContent = "Password set. You can now sign in with your email and password.";
    });
  });
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (!t || !t.matches || !t.matches('[data-lh="import"]') || !t.files[0]) return;
    var say = function (m) { var el = document.getElementById("lh-import-msg"); if (el) el.textContent = m; toast(m); };
    var reader = new FileReader();
    reader.onload = function () {
      var j;
      try { j = JSON.parse(reader.result); } catch (x) { say("That file is not a Life Hub backup."); return; }
      var rows = [];
      Object.keys(j).forEach(function (coll) {
        var v = j[coll];
        if (!v || typeof v !== "object" || Array.isArray(v)) return;
        if (coll === "taxonomy" || coll === "levels") { rows.push({ coll: "meta", id: coll, data: v }); return; }
        if (coll === "exportedAt" || coll === "app") return;
        Object.keys(v).forEach(function (id) { rows.push({ coll: coll, id: id, data: v[id] }); });
      });
      if (!rows.length) { say("Nothing to import in that file."); return; }
      say("Importing " + rows.length + " items…");
      var uidv = session.user.id, i = 0;
      (function next() {
        if (i >= rows.length) { say("Imported " + rows.length + " items."); return; }
        var now = new Date().toISOString();
        var chunk = rows.slice(i, i + 200).map(function (r) { return { user_id: uidv, coll: r.coll, id: r.id, data: r.data, updated_at: now }; });
        sb.from("docs").upsert(chunk, { onConflict: "user_id,coll,id" }).then(function (r) {
          if (r.error) { say("Import stopped: " + r.error.message); return; }
          chunk.forEach(function (x) { (cache[x.coll] = cache[x.coll] || {})[x.id] = x.data; emit(x.coll); });
          i += 200; say("Imported " + Math.min(i, rows.length) + " of " + rows.length + "…"); next();
        });
      })();
    };
    reader.readAsText(t.files[0]);
    t.value = "";
  });
})();
