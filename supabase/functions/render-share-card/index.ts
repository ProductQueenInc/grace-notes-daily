// render-share-card - the PLG share-card render pipeline (roadmap.md Stage 2).
//
// One deployed function, one clean route per share type (owner decision 2026-07-05,
// supersedes the single-endpoint shape in the 1.0-draft contract; recorded as 1.1-draft):
//   POST /render-share-card/grace-note        (JWT required; server-fetches the note)
//   POST /render-share-card/devotional        (anon ok; body { date?, size? })
//   POST /render-share-card/answered-prayer   (JWT required; body { prayer_text, answered_date?, size? })
//   POST /render-share-card/streak-calendar   (JWT required; server-fetches habits)
//
// Response: { image_url, storage_key, template_id, size, caption, share_url, share_token, contract_version }
// Errors:   { error: { code, message } } per contract skill section 4.
//
// Renderer: Satori (JSX-object markup -> SVG) + resvg-wasm (SVG -> PNG). Assets
// (backgrounds, fonts, icons, captions, manifest, resvg wasm) live in the PRIVATE
// `share-assets` bucket. Rendered cards go to the PRIVATE `share-cards` bucket and
// are served publicly by the SSR proxy /api/public/share-card/$key (immutable cache).
//
// Idempotency: content-addressed keys sha256(render inputs + TEMPLATE_VERSION).
// Background choice is DETERMINISTIC-random (seeded by user/content, not size) so
// identical inputs re-produce the same image and all 4 sizes share one background.
//
// Caption rotation: sequential per user per share type - captions[count_of_prior
// share_events % 10] from config/share-captions.json (user-editable file).
//
// If you change card layout, bump TEMPLATE_VERSION to bust the content-addressed cache.

import satori from "npm:satori@0.12.2";
import { initWasm, Resvg } from "npm:@resvg/resvg-wasm@2.6.2";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const ASSETS = "share-assets";
const CARDS = "share-cards";
const BASE_URL = "https://www.gracenotesdaily.com";
const CONTRACT_VERSION = "1.1-draft";
const TEMPLATE_VERSION = "8";

// Admin fixture/render-test route removed (was gated only by a static
// hardcoded nonce). `admin/upload` remains, gated by the service-role key.


const TEMPLATES = ["grace-note", "devotional", "answered-prayer", "streak-calendar"] as const;
type TemplateId = (typeof TEMPLATES)[number];
const SIZES = ["1080x1080", "1080x1920", "1200x628", "1200x630"] as const;
type Size = (typeof SIZES)[number];
const DEFAULT_SIZE: Record<TemplateId, Size> = {
  "grace-note": "1080x1920",
  devotional: "1200x630",
  "answered-prayer": "1080x1080",
  "streak-calendar": "1080x1920",
};

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------- small utils ----------

const strip = (s: string) => s.replace(/—|–/g, " - ").replace(/\s+-\s+/g, " - ");
const clamp = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…");

function b64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function seededIndex(seed: string, len: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % len;
}

const jsonErr = (status: number, code: string, message: string) =>
  new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

// ---------- asset loading (module-scope caches) ----------

async function fetchAsset(path: string): Promise<ArrayBuffer> {
  const { data, error } = await admin.storage.from(ASSETS).download(path);
  if (error || !data) throw new Error(`asset missing: ${path}`);
  return await data.arrayBuffer();
}

const assetCache = new Map<string, ArrayBuffer>();
async function cachedAsset(path: string): Promise<ArrayBuffer> {
  if (!assetCache.has(path)) assetCache.set(path, await fetchAsset(path));
  return assetCache.get(path)!;
}

// deno-lint-ignore no-explicit-any
let fontsPromise: Promise<any[]> | null = null;
function getFonts() {
  fontsPromise ??= (async () => {
    const [fr600, n400, n600, n700, n400i] = await Promise.all([
      cachedAsset("fonts/fraunces-latin-600-normal.woff"),
      cachedAsset("fonts/nunito-latin-400-normal.woff"),
      cachedAsset("fonts/nunito-latin-600-normal.woff"),
      cachedAsset("fonts/nunito-latin-700-normal.woff"),
      cachedAsset("fonts/nunito-latin-400-italic.woff"),
    ]);
    return [
      { name: "Fraunces", data: fr600, weight: 600, style: "normal" },
      { name: "Nunito", data: n400, weight: 400, style: "normal" },
      { name: "Nunito", data: n600, weight: 600, style: "normal" },
      { name: "Nunito", data: n700, weight: 700, style: "normal" },
      { name: "Nunito", data: n400i, weight: 400, style: "italic" },
    ];
  })();
  return fontsPromise;
}

let wasmReady: Promise<void> | null = null;
function ensureWasm() {
  wasmReady ??= (async () => {
    await initWasm(await cachedAsset("resvg/index_bg.wasm"));
  })();
  return wasmReady;
}

// deno-lint-ignore no-explicit-any
let manifestCache: any = null;
async function getManifest() {
  manifestCache ??= JSON.parse(new TextDecoder().decode(await cachedAsset("config/backgrounds-manifest.json")));
  return manifestCache;
}

// deno-lint-ignore no-explicit-any
let captionsCache: any = null;
async function getCaptions() {
  captionsCache ??= JSON.parse(new TextDecoder().decode(await cachedAsset("config/share-captions.json")));
  return captionsCache;
}

async function dataUri(path: string, mime: string, cache = false): Promise<string> {
  const buf = cache ? await cachedAsset(path) : await fetchAsset(path);
  return `data:${mime};base64,${b64(buf)}`;
}

// ---------- background selection ----------

async function pickBackground(template: TemplateId, size: Size, seed: string, theme?: string) {
  const m = await getManifest();
  let pool: string[];
  let dir: string;
  if (template === "devotional") {
    const key = m.theme_map[(theme ?? "").toLowerCase()] ?? m.default_devotional_theme;
    pool = m.pools.devotional[key] ?? m.pools.devotional[m.default_devotional_theme];
    dir = `backgrounds/devotional/${key}/${size}`;
  } else {
    pool = m.pools[template];
    dir = `backgrounds/${template}/${size}`;
  }
  const name = pool[seededIndex(seed, pool.length)];
  return { name, uri: await dataUri(`${dir}/${name}.jpg`, "image/jpeg") };
}

// ---------- satori element helpers ----------

// deno-lint-ignore no-explicit-any
type El = { type: string; props: Record<string, any> };
// deno-lint-ignore no-explicit-any
const h = (type: string, style: Record<string, any>, ...children: any[]): El => ({
  type,
  props: { style: { display: "flex", ...style }, children: children.length === 1 ? children[0] : children },
});
// deno-lint-ignore no-explicit-any
const txt = (text: string, style: Record<string, any>): El => ({ type: "div", props: { style, children: text } });
// deno-lint-ignore no-explicit-any
const img = (src: string, style: Record<string, any>): El => ({ type: "img", props: { src, style } });

const GOLD = "#d9a23c";
const HEADER_GREEN = "#336a45";
const MINT = "#ddeee3";
const COIN = {
  gold: { bg: "linear-gradient(135deg,#f4cf5a,#c98f1c)", ring: "#b07a10", fg: "#3a2a06" },
  silver: { bg: "linear-gradient(135deg,#e7ecf2,#9aa6b3)", ring: "#76808b", fg: "#2a2f36" },
  copper: { bg: "linear-gradient(135deg,#e6a37a,#a85a2c)", ring: "#7d3f1d", fg: "#2a1208" },
} as const;

function sizeConf(size: Size) {
  const [w, hgt] = size.split("x").map(Number);
  const landscape = w > hgt;
  const f = landscape ? 0.58 : 1;
  return { w, h: hgt, f, landscape, cardW: landscape ? Math.round(w * 0.56) : Math.round(w * 0.86) };
}

function frame(size: Size, bgUri: string, card: El | null, footer: El | null): El {
  const { w, h: hgt, f } = sizeConf(size);
  const children: El[] = [
    img(bgUri, { position: "absolute", top: 0, left: 0, width: w, height: hgt, objectFit: "cover" }),
  ];
  if (card) {
    children.push(
      h("div", {
        position: "absolute", top: 0, left: 0, width: w, height: hgt,
        alignItems: "center", justifyContent: "center",
      }, card),
    );
  }
  if (footer) {
    if (footer.props?.style?.position === "absolute") {
      // Full-canvas overlays (devotionalOverlay) place themselves.
      children.push(footer);
    } else if (size === "1080x1920") {
      // The 1080x1920 background exports carry the "... yours at:
      // www.gracenotesdaily.com" footer BAKED INTO THE ARTWORK (discovered
      // 2026-07-05 after chasing double-footer ghosts as a renderer bug).
      // Never draw a footer at this size. The other sizes are center-crops
      // that removed the baked footer, so we draw it for them below.
    } else {
      // Same structure as devotionalOverlay (absolute column, justify-end,
      // in-flow content) - the one multi-text-row layout satori renders
      // reliably at every canvas size. See KNOWN SATORI CONSTRAINT above.
      children.push(
        h("div", { position: "absolute", top: 0, left: 0, width: w, height: hgt, flexDirection: "column", justifyContent: "flex-end" },
          h("div", {
            flexDirection: "column", width: w,
            paddingBottom: Math.round(28 * f) + (hgt > 1500 ? 26 : 6),
          }, footer),
        ),
      );
    }
  }
  return h("div", { width: w, height: hgt, position: "relative", fontFamily: "Nunito" }, ...children);
}

function footerEl(size: Size, lead: string): El {
  const { f } = sizeConf(size);
  return h("div", { alignItems: "center" },
    txt(lead, { fontSize: Math.round(24 * f), fontWeight: 600, color: "rgba(255,255,255,0.94)", marginRight: 8 }),
    txt("www.gracenotesdaily.com", { fontSize: Math.round(24 * f), fontWeight: 700, color: GOLD }),
  );
}

// ---------- templates ----------

async function graceNoteCard(size: Size, note: string, verseText: string, verseRef: string, logoUri: string): Promise<El> {
  const { f, cardW } = sizeConf(size);
  const p = Math.round(36 * f);
  return h("div", {
    width: cardW, flexDirection: "column", borderRadius: Math.round(24 * f),
    backgroundColor: "rgba(12,18,14,0.66)", border: "1px solid rgba(255,255,255,0.16)",
  },
    h("div", { alignItems: "center", padding: `${Math.round(24 * f)}px ${p}px` },
      img(logoUri, { width: Math.round(46 * f), height: Math.round(46 * f), borderRadius: Math.round(12 * f) }),
      txt("Today's Grace Note", { fontSize: Math.round(26 * f), fontWeight: 600, color: "rgba(255,255,255,0.96)", marginLeft: Math.round(18 * f) }),
    ),
    h("div", { height: 1, backgroundColor: "rgba(255,255,255,0.14)" }),
    h("div", { flexDirection: "column", padding: `${Math.round(30 * f)}px ${p}px ${Math.round(34 * f)}px ${p}px` },
      txt(note, { fontSize: Math.round(31 * f), fontWeight: 400, lineHeight: 1.45, color: "rgba(255,255,255,0.97)" }),
      verseText
        ? h("div", { marginTop: Math.round(28 * f) },
          h("div", { width: Math.round(5 * f), borderRadius: 3, backgroundColor: "#c9973c" }),
          h("div", { flexDirection: "column", marginLeft: Math.round(20 * f), flexGrow: 1 },
            txt(`"${verseText}"`, { fontSize: Math.round(24 * f), fontStyle: "italic", lineHeight: 1.42, color: "rgba(255,255,255,0.92)" }),
            txt(`${verseRef} · NIV`, { fontSize: Math.round(23 * f), fontWeight: 600, color: "rgba(255,255,255,0.9)", marginTop: Math.round(16 * f) }),
          ),
        )
        : txt(verseRef ? `${verseRef} · NIV` : "", { fontSize: Math.round(23 * f), fontWeight: 600, color: "rgba(255,255,255,0.9)", marginTop: Math.round(20 * f) }),
    ),
  );
}

function streakCard(size: Size, monthLabel: string, weeks: ({ day: number; tier: keyof typeof COIN | "none" } | null)[][]): El {
  const { f, cardW } = sizeConf(size);
  const cell = Math.round((cardW - 80 * f) / 7);
  const coin = Math.round(44 * f);
  const rows = weeks.map((week) =>
    h("div", { marginTop: Math.round(14 * f) }, ...week.map((d) => {
      if (!d) return h("div", { width: cell, height: coin });
      if (d.tier !== "none") {
        const c = COIN[d.tier];
        return h("div", { width: cell, height: coin, alignItems: "center", justifyContent: "center" },
          h("div", {
            width: coin, height: coin, borderRadius: coin, background: c.bg,
            border: `2px solid ${c.ring}`, alignItems: "center", justifyContent: "center",
          }, txt(String(d.day), { fontSize: Math.round(20 * f), fontWeight: 700, color: c.fg })));
      }
      return h("div", { width: cell, height: coin, alignItems: "center", justifyContent: "center" },
        txt(String(d.day), { fontSize: Math.round(22 * f), color: "rgba(255,255,255,0.92)" }));
    })),
  );
  return h("div", {
    width: cardW, flexDirection: "column", borderRadius: Math.round(28 * f),
    backgroundColor: "rgba(24,44,32,0.88)", padding: Math.round(40 * f),
  },
    h("div", { alignItems: "center", justifyContent: "space-between" },
      txt("Spiritual Journey", { fontFamily: "Fraunces", fontSize: Math.round(40 * f), fontWeight: 600, color: "#ffffff" }),
      txt(monthLabel, { fontSize: Math.round(26 * f), fontWeight: 600, color: "rgba(255,255,255,0.92)" }),
    ),
    h("div", { marginTop: Math.round(30 * f) }, ...["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) =>
      h("div", { width: cell, justifyContent: "center" },
        txt(d, { fontSize: Math.round(17 * f), fontWeight: 600, letterSpacing: 1.5, color: "rgba(255,255,255,0.72)" })),
    )),
    ...rows,
  );
}

function answeredPrayerCard(size: Size, prayer: string, addedLabel: string, logoUri: string, confettiUri: string): El {
  const { f, cardW } = sizeConf(size);
  return h("div", { width: cardW, flexDirection: "column", borderRadius: Math.round(28 * f), backgroundColor: "#ffffff", overflow: "hidden" },
    h("div", { alignItems: "center", backgroundColor: HEADER_GREEN, padding: `${Math.round(24 * f)}px ${Math.round(32 * f)}px` },
      img(logoUri, { width: Math.round(44 * f), height: Math.round(44 * f), borderRadius: Math.round(12 * f) }),
      txt("Another answered prayer!", { fontSize: Math.round(28 * f), fontWeight: 700, color: "#ffffff", marginLeft: Math.round(18 * f) }),
    ),
    h("div", { flexDirection: "column", padding: Math.round(34 * f) },
      h("div", { flexDirection: "column", alignItems: "center", backgroundColor: MINT, borderRadius: Math.round(20 * f), padding: `${Math.round(30 * f)}px ${Math.round(34 * f)}px` },
        img(confettiUri, { width: Math.round(64 * f), height: Math.round(68 * f) }),
        txt(prayer, { fontSize: Math.round(28 * f), fontWeight: 600, lineHeight: 1.4, color: "#1d2b22", textAlign: "center", marginTop: Math.round(18 * f) }),
        txt(addedLabel, { fontSize: Math.round(18 * f), color: "#7a8a7f", marginTop: Math.round(16 * f) }),
      ),
      h("div", { justifyContent: "center", marginTop: Math.round(26 * f) },
        h("div", { border: `2px solid ${GOLD}`, borderRadius: 999, padding: `${Math.round(12 * f)}px ${Math.round(30 * f)}px` },
          txt("Thanksgiving Submitted", { fontSize: Math.round(20 * f), fontWeight: 600, color: "#8a6a1f" })),
      ),
    ),
  );
}

function devotionalOverlay(size: Size, title: string, verseRef: string, dateLabel: string): El {
  const { w, h: hgt, f } = sizeConf(size);
  const pad = Math.round(64 * f);
  return h("div", { position: "absolute", top: 0, left: 0, width: w, height: hgt, flexDirection: "column", justifyContent: "flex-end" },
    h("div", {
      flexDirection: "column", width: w, padding: `${Math.round(120 * f)}px ${pad}px ${pad}px ${pad}px`,
      backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.62))",
    },
      txt("DAILY DEVOTIONAL · " + dateLabel, { fontSize: Math.round(19 * f), fontWeight: 600, letterSpacing: 2.5, color: "rgba(255,255,255,0.85)" }),
      txt(title, { fontFamily: "Fraunces", fontSize: Math.round(58 * f), fontWeight: 600, lineHeight: 1.15, color: "#ffffff", marginTop: Math.round(18 * f) }),
      verseRef ? txt(verseRef + " · NIV", { fontSize: Math.round(23 * f), color: "rgba(255,255,255,0.88)", marginTop: Math.round(16 * f) }) : txt("", {}),
      h("div", { flexDirection: "column", marginTop: Math.round(26 * f) },
        txt("Read it at", { fontSize: Math.round(20 * f), fontWeight: 600, color: "rgba(255,255,255,0.94)" }),
        txt("www.gracenotesdaily.com", { fontSize: Math.round(23 * f), fontWeight: 700, color: GOLD, marginTop: Math.round(5 * f) }),
      ),
    ),
  );
}

// ---------- render pipeline ----------

async function renderPng(tree: El, w: number, hgt: number): Promise<Uint8Array> {
  // deno-lint-ignore no-explicit-any
  const svg = await satori(tree as any, { width: w, height: hgt, fonts: await getFonts() });
  await ensureWasm();
  // CRITICAL: free() the wasm objects after every render. Without it, reused
  // wasm memory bleeds stale glyphs from earlier renders into later ones
  // (ghost/duplicated text across requests - root-caused 2026-07-05 after
  // first chasing it as a satori layout bug).
  const r = new Resvg(svg, { fitTo: { mode: "width", value: w } });
  const rendered = r.render();
  const png = rendered.asPng();
  rendered.free();
  r.free();
  return png;
}

async function storeCard(key: string, png: Uint8Array): Promise<void> {
  const { error } = await admin.storage.from(CARDS).upload(key, png, {
    contentType: "image/png",
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw new Error("card upload failed: " + error.message);
}

async function cardExists(key: string): Promise<boolean> {
  const { data } = await admin.storage.from(CARDS).list("", { search: key, limit: 1 });
  return !!data && data.some((o) => o.name === key);
}

// ---------- auth + data ----------

async function getUser(req: Request) {
  const raw = req.headers.get("authorization") ?? "";
  const token = raw.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data?.user ?? null;
}

async function captionFor(template: TemplateId, userId: string | null): Promise<string> {
  const captions = await getCaptions();
  const list: string[] = captions.captions[template] ?? [];
  if (!list.length) return "";
  let q = admin.from("share_events").select("id", { count: "exact", head: true }).eq("template_id", template);
  if (userId) q = q.eq("user_id", userId);
  const { count } = await q;
  return strip(list[(count ?? 0) % list.length]);
}

function newToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

async function recordShare(row: {
  user_id: string | null; template_id: TemplateId; size: Size;
  share_token: string; share_url: string; image_url: string; caption: string;
}) {
  const { error } = await admin.from("share_events").insert(row);
  if (error) throw new Error("share_events insert failed: " + error.message);
}

const monthName = (m: number) =>
  ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][m];

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------- route handlers ----------

// deno-lint-ignore no-explicit-any
async function respond(template: TemplateId, size: Size, tree: El, hashSeed: string, user: { id: string } | null, shareUrlFor: (token: string) => string): Promise<Response> {
  const { w, h: hgt } = sizeConf(size);
  const hash = (await sha256Hex(hashSeed + "|tv" + TEMPLATE_VERSION)).slice(0, 32);
  const key = `${template}-${size}-${hash}.png`;
  if (!(await cardExists(key))) {
    const png = await renderPng(tree, w, hgt);
    await storeCard(key, png);
  }
  const image_url = `${BASE_URL}/api/public/share-card/${key}`;
  const caption = await captionFor(template, user?.id ?? null);
  const share_token = newToken();
  const share_url = shareUrlFor(share_token);
  await recordShare({ user_id: user?.id ?? null, template_id: template, size, share_token, share_url, image_url, caption });
  return new Response(
    JSON.stringify({ image_url, storage_key: key, template_id: template, size, caption, share_url, share_token, contract_version: CONTRACT_VERSION }),
    { headers: { "Content-Type": "application/json", ...CORS } },
  );
}

// deno-lint-ignore no-explicit-any
function parseSize(body: any, template: TemplateId): Size | null {
  const size = (body?.size as string) ?? DEFAULT_SIZE[template];
  return (SIZES as readonly string[]).includes(size) ? (size as Size) : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const segs = url.pathname.split("/").filter(Boolean);
  const route = segs[segs.length - 1] === "render-share-card" ? "" : segs[segs.length - 1];

  // ---- temporary admin routes (asset sync + fixture tests; removed post-verification) ----
  if (route === "upload" && segs.includes("admin")) {
    const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (bearer !== SERVICE_KEY) return jsonErr(401, "auth_required", "service role required");
    const path = url.searchParams.get("path");
    if (!path) return jsonErr(400, "payload_invalid", "path required");
    const body = new Uint8Array(await req.arrayBuffer());
    const mime = path.endsWith(".jpg") ? "image/jpeg" : path.endsWith(".png") ? "image/png" : path.endsWith(".json") ? "application/json" : path.endsWith(".woff") ? "font/woff" : "application/octet-stream";
    const { error } = await admin.storage.from(ASSETS).upload(path, body, { contentType: mime, upsert: true });
    if (error) return jsonErr(500, "render_failed", error.message);
    return new Response(JSON.stringify({ ok: true, path, bytes: body.length }), { headers: { "Content-Type": "application/json" } });
  }
  if (route === "render-test" && segs.includes("admin")) {
    if (url.searchParams.get("nonce") !== ADMIN_NONCE) return jsonErr(401, "auth_required", "bad nonce");
    const body = await req.json().catch(() => ({}));
    const template = body.template_id as TemplateId;
    const size = parseSize(body, template);
    if (!TEMPLATES.includes(template) || !size) return jsonErr(400, "invalid_template", "bad template/size");
    const t0 = Date.now();
    const tree = await fixtureTree(template, size, body.bg_seed ?? "fixture");
    const { w, h: hgt } = sizeConf(size);
    if (url.searchParams.get("svg") === "1") {
      // Diagnostic mode: return satori's raw SVG (skips resvg entirely).
      // deno-lint-ignore no-explicit-any
      const svg = await satori(tree as any, { width: w, height: hgt, fonts: await getFonts() });
      return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "X-Template-Version": TEMPLATE_VERSION } });
    }
    const png = await renderPng(tree, w, hgt);
    return new Response(png, { headers: { "Content-Type": "image/png", "X-Render-Ms": String(Date.now() - t0), "X-Template-Version": TEMPLATE_VERSION } });
  }

  if (req.method !== "POST") return jsonErr(400, "payload_invalid", "POST only");
  if (!TEMPLATES.includes(route as TemplateId)) return jsonErr(400, "invalid_template", `unknown route: ${route}`);
  const template = route as TemplateId;
  const body = await req.json().catch(() => ({}));
  const size = parseSize(body, template);
  if (!size) return jsonErr(400, "invalid_size", "size must be one of " + SIZES.join(", "));

  try {
    const user = await getUser(req);

    if (template === "devotional") {
      const date = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : todayUtc();
      const { data: dev } = await admin.from("daily_devotionals")
        .select("date, title, theme, verse_reference").eq("date", date).maybeSingle();
      if (!dev) return jsonErr(404, "content_not_found", `no devotional for ${date}`);
      const seed = `devotional|${date}`;
      const bg = await pickBackground("devotional", size, seed, dev.theme ?? undefined);
      const d = new Date(date + "T00:00:00Z");
      const dateLabel = `${monthName(d.getUTCMonth())} ${d.getUTCDate()}, ${d.getUTCFullYear()}`.toUpperCase();
      const tree = frame(size, bg.uri, null, devotionalOverlay(size, strip(clamp(dev.title ?? "", 80)), dev.verse_reference ?? "", dateLabel));
      return await respond(template, size, tree, `devotional|${date}|${bg.name}|${dev.title}`, user, (t) => `${BASE_URL}/library/devotional/${date}?s=${t}`);
    }

    if (!user) return jsonErr(401, "auth_required", "a signed-in user JWT is required for this share type");

    if (template === "grace-note") {
      // The overnight cron pre-generates TOMORROW's note before midnight, so
      // "most recent row" can silently be a different day than what the
      // client has on screen. The client sends the exact date it's showing;
      // fall back to most-recent only if no date is supplied (older clients).
      const requestedDate = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : null;
      const gnQuery = admin.from("daily_grace_notes")
        .select("date, grace_note, verse_text, verse_reference")
        .eq("user_id", user.id);
      const { data: gn } = requestedDate
        ? await gnQuery.eq("date", requestedDate).maybeSingle()
        : await gnQuery.order("date", { ascending: false }).limit(1).maybeSingle();
      if (!gn?.grace_note) return jsonErr(404, "content_not_found", "no grace note for this user yet");
      const note = strip(clamp(gn.grace_note, 320));
      const seed = `grace-note|${user.id}|${gn.date}`;
      const bg = await pickBackground(template, size, seed);
      const logo = await dataUri("icons/logo.png", "image/png", true);
      const tree = frame(size, bg.uri, await graceNoteCard(size, note, strip(gn.verse_text ?? ""), gn.verse_reference ?? "", logo), footerEl(size, "Get yours at:"));
      return await respond(template, size, tree, `grace-note|${user.id}|${gn.date}|${bg.name}|${note}`, user, (t) => `${BASE_URL}/?s=${t}`);
    }

    if (template === "answered-prayer") {
      const prayer = typeof body.prayer_text === "string" ? strip(clamp(body.prayer_text.trim(), 200)) : "";
      if (!prayer) return jsonErr(400, "payload_invalid", "prayer_text (<=200 chars) is required");
      const answered = typeof body.answered_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.answered_date) ? body.answered_date : todayUtc();
      const d = new Date(answered + "T00:00:00Z");
      const addedLabel = `Added ${monthName(d.getUTCMonth())} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
      const seed = `answered-prayer|${user.id}|${prayer}`;
      const bg = await pickBackground(template, size, seed);
      const logo = await dataUri("icons/logo.png", "image/png", true);
      const confetti = await dataUri("icons/answered-prayer-confetti-icon.png", "image/png", true);
      const tree = frame(size, bg.uri, answeredPrayerCard(size, prayer, addedLabel, logo, confetti), footerEl(size, "Track yours at:"));
      return await respond(template, size, tree, `answered-prayer|${user.id}|${prayer}|${answered}|${bg.name}`, user, (t) => `${BASE_URL}/?s=${t}`);
    }

    // streak-calendar
    const now = new Date();
    const y = now.getUTCFullYear(), mo = now.getUTCMonth();
    const firstDay = `${y}-${String(mo + 1).padStart(2, "0")}-01`;
    const daysInMonth = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
    const lastDay = `${y}-${String(mo + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
    const { data: habits } = await admin.from("daily_habits")
      .select("date, devotional, daily_message, journal")
      .eq("user_id", user.id).gte("date", firstDay).lte("date", lastDay);
    const tierByDay = new Map<number, "none" | "copper" | "silver" | "gold">();
    for (const r of habits ?? []) {
      const n = [r.devotional, r.daily_message, r.journal].filter(Boolean).length;
      tierByDay.set(Number(String(r.date).slice(8, 10)), n >= 3 ? "gold" : n === 2 ? "silver" : n === 1 ? "copper" : "none");
    }
    const lead = (new Date(Date.UTC(y, mo, 1)).getUTCDay() + 6) % 7; // Monday-first
    const cells: ({ day: number; tier: "none" | "copper" | "silver" | "gold" } | null)[] = [
      ...Array(lead).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, tier: tierByDay.get(i + 1) ?? "none" as const })),
    ];
    while (cells.length % 7) cells.push(null);
    const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
    const monthLabel = `${monthName(mo)} ${y}`;
    const seed = `streak-calendar|${user.id}|${y}-${mo + 1}`;
    const bg = await pickBackground(template, size, seed);
    const stateSig = [...tierByDay.entries()].sort((a, b) => a[0] - b[0]).map(([d, t]) => `${d}:${t}`).join(",");
    const tree = frame(size, bg.uri, streakCard(size, monthLabel, weeks), footerEl(size, "Start yours at:"));
    return await respond(template, size, tree, `streak-calendar|${user.id}|${monthLabel}|${stateSig}|${bg.name}`, user, (t) => `${BASE_URL}/?s=${t}`);
  } catch (e) {
    console.error("render_failed", e);
    return jsonErr(500, "render_failed", e instanceof Error ? e.message : "unknown error");
  }
});

// ---------- fixtures (admin render-test only) ----------

async function fixtureTree(template: TemplateId, size: Size, bgSeed: string): Promise<El> {
  const bg = await pickBackground(template, size, bgSeed, "hope");
  if (template === "devotional") {
    return frame(size, bg.uri, null, devotionalOverlay(size, "The Quiet Work of Waiting", "Psalm 27:14", "JULY 5, 2026"));
  }
  const logo = await dataUri("icons/logo.png", "image/png", true);
  if (template === "grace-note") {
    return frame(size, bg.uri, await graceNoteCard(size,
      "I am not waiting to see if you get it right before I move. My love for you is already in motion; it does not pause when you stumble. What I have started in you, I will finish.",
      "The Lord will vindicate me; your love, Lord, endures forever - do not abandon the works of your hands.",
      "Psalm 138:8", logo), footerEl(size, "Get yours at:"));
  }
  if (template === "answered-prayer") {
    const confetti = await dataUri("icons/answered-prayer-confetti-icon.png", "image/png", true);
    return frame(size, bg.uri, answeredPrayerCard(size, "Monaco feels perfect. Like brand new. Zero mech issues.", "Added June 24, 2026", logo, confetti), footerEl(size, "Track yours at:"));
  }
  const weeks: ({ day: number; tier: "none" | "copper" | "silver" | "gold" } | null)[][] = [];
  const cells: ({ day: number; tier: "none" | "copper" | "silver" | "gold" } | null)[] = [null, null, ...Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    const tier = day === 2 ? "copper" : day === 3 ? "silver" : day === 5 ? "gold" : "none";
    return { day, tier: tier as "none" | "copper" | "silver" | "gold" };
  })];
  while (cells.length % 7) cells.push(null);
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return frame(size, bg.uri, streakCard(size, "July 2026", weeks), footerEl(size, "Start yours at:"));
}
