// Life Hub notifications. Sends Web Push messages to the devices people have
// switched notifications on for (table push_subs). The signing key (VAPID) is
// kept in private.app_secrets and read with the service role only.
// Supabase checks the caller's JWT before this runs (verify_jwt is on).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

  const auth = req.headers.get("Authorization") ?? "";
  const asUser = createClient(URL, ANON, { global: { headers: { Authorization: auth } } });
  const { data: u } = await asUser.auth.getUser();
  const me = u?.user;
  if (!me) return json({ error: "not signed in" }, 401);

  let body: { kind?: string; id?: string };
  try { body = await req.json(); } catch { return json({ error: "bad request" }, 400); }
  const admin = createClient(URL, SERVICE);

  const pub = (await admin.rpc("lh_secret", { n: "vapid_public" })).data as string;
  const priv = (await admin.rpc("lh_secret", { n: "vapid_private" })).data as string;
  if (!pub || !priv) return json({ error: "push keys missing" }, 500);
  webpush.setVapidDetails("https://melissa-erion.github.io/Life-Hub/", pub, priv);

  let to: string[] = [];
  let msg: { title: string; body: string; url: string; tag: string };

  if (body.kind === "test") {
    to = [me.id];
    msg = { title: "Notifications are on", body: "This device will get Life Hub notifications.", url: "./index.html#help", tag: "lh-test" };
  } else if (body.kind === "feedback" && body.id) {
    const mem = await admin.from("space_members").select("space_id,display_name").eq("user_id", me.id).limit(1).maybeSingle();
    if (!mem.data) return json({ error: "no family space" }, 403);
    const sp = mem.data.space_id;
    const doc = await admin.from("shared_docs").select("data").eq("space_id", sp).eq("coll", "f_feedback").eq("id", String(body.id)).maybeSingle();
    const d = doc.data?.data as Record<string, string> | undefined;
    if (!d || d.by !== me.id) return json({ error: "not your report" }, 403);
    const owners = await admin.from("space_members").select("user_id").eq("space_id", sp).eq("role", "owner").neq("user_id", me.id);
    to = (owners.data ?? []).map((r) => r.user_id as string);
    const who = mem.data.display_name || "Someone";
    msg = {
      title: (d.kind === "idea" ? "New idea from " : "New problem report from ") + who,
      body: String(d.text ?? "").slice(0, 140),
      url: "./index.html#help",
      tag: "fb-" + body.id,
    };
  } else return json({ error: "unknown kind" }, 400);

  if (!to.length) return json({ sent: 0, note: "nobody to notify" });
  const subs = await admin.from("push_subs").select("endpoint,p256dh,auth").in("user_id", to);
  let sent = 0;
  const failed: number[] = [];
  for (const s of subs.data ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 86400 });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode ?? 0;
      failed.push(code);
      if (code === 404 || code === 410) await admin.from("push_subs").delete().eq("endpoint", s.endpoint);
    }
  }
  return json({ sent, failed, devices: (subs.data ?? []).length });
});
