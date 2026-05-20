import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import type { IncomingMessage, ServerResponse } from "http";

/* ══════════════════════════════════════════════════════════════
   DATA LAYER — JSON files in ./data/
══════════════════════════════════════════════════════════════ */
const DATA_DIR = path.resolve("data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

type IpMap  = Record<string, { approvedAt: string; note?: string }>;
type Msg    = { id: string; ip: string; message: string; timestamp: string; status: "pending"|"noted" };
type Video  = { id: string; videoId: string; title: string; subjectId: string; desc: string; date: string; course: string; online: boolean };

function rd<T>(file: string, def: T): T {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return def;
  try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return def; }
}
function wr(file: string, data: unknown) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

// Init default data
if (!fs.existsSync(path.join(DATA_DIR, "ips.json")))  wr("ips.json", {});
if (!fs.existsSync(path.join(DATA_DIR, "msgs.json"))) wr("msgs.json", []);
if (!fs.existsSync(path.join(DATA_DIR, "vids.json"))) {
  wr("vids.json", [
    { id: randomUUID(), videoId:"O6HL1Q3MCrM", title:"SSC Final Revision Class Bangla-10", subjectId:"Ba-10", desc:"১ম পত্র- উপন্যাস: ১৯৭১\n২য় পত্র- পরিচ্ছেদ: ৪৫, ৪৬, ৪৮, ৪৯", date:"19 Nov, 2025 08:00 PM to 09:45 PM", course:"SSC/Dakhil 2026 A to Z Final Revision Course for Science", online:true },
    { id: randomUUID(), videoId:"O6HL1Q3MCrM", title:"SSC Final Revision Class ICT-05", subjectId:"ICT-05", desc:"অধ্যায়-০৬ প্রোগ্রামিংয়ের মাধ্যমে সমস্যার সমাধান", date:"18 Nov, 2025 05:00 PM to 06:45 PM", course:"SSC/Dakhil 2026 A to Z Final Revision Course for Science", online:true },
    { id: randomUUID(), videoId:"O6HL1Q3MCrM", title:"SSC Final Revision Class Bangla-09", subjectId:"Ba-09", desc:"১ম পত্র- কবিতা: আমার পরিচয়\n২য় পত্র- পরিচ্ছেদ: ৪০-৪৪", date:"17 Nov, 2025 08:00 PM to 09:45 PM", course:"SSC/Dakhil 2026 A to Z Final Revision Course for Science", online:true },
  ]);
}

/* ══════════════════════════════════════════════════════════════
   ADMIN SESSIONS (in-memory, reset on server restart)
══════════════════════════════════════════════════════════════ */
const ADMIN_USER = "htr";
const ADMIN_PASS = "htr0";
const sessions   = new Set<string>();

/* ══════════════════════════════════════════════════════════════
   MIDDLEWARE HELPERS
══════════════════════════════════════════════════════════════ */
function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((res) => {
    let s = "";
    req.on("data", (c) => (s += c));
    req.on("end", () => { try { res(JSON.parse(s)); } catch { res({}); } });
    req.on("error", () => res({}));
  });
}
function json(res: ServerResponse, data: unknown, code = 200) {
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}
function clientIp(req: IncomingMessage) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return (Array.isArray(fwd) ? fwd[0] : fwd).split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}
function auth(req: IncomingMessage) {
  const t = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  return sessions.has(t);
}

/* ══════════════════════════════════════════════════════════════
   API PLUGIN
══════════════════════════════════════════════════════════════ */
function apiPlugin() {
  return {
    name: "redrose-api",
    configureServer(server: { middlewares: { use: (fn: (req: IncomingMessage, res: ServerResponse, next: ()=>void)=>void)=>void } }) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        const p = new URL(req.url, "http://x").pathname;
        const m = req.method?.toUpperCase() || "GET";

        // ── Pass-through to API server proxy for modern routes ─────────
        const PROXIED = ["/api/admin","/api/ai","/api/validate-token","/api/security","/api/user","/api/subjects","/api/doubts","/api/notifications","/api/gamification","/api/solve-sheets","/api/live-classes","/api/announcements","/api/discussions","/api/dashboard-menu","/api/flashcard-decks","/api/daily-challenge","/api/search","/api/exam-dates","/api/past-papers","/api/formulas","/api/vocabulary","/api/study-log","/api/topic-votes","/api/platform-settings","/api/smart-quiz","/api/fractal"];
        if (PROXIED.some(prefix => p === prefix || p.startsWith(prefix+"/")||p.startsWith(prefix+"?"))) return next();

        // ── GET /api/check-ip ──────────────────────────────────────────
        if (m==="GET" && p==="/api/check-ip") {
          const ip = clientIp(req);
          const ips = rd<IpMap>("ips.json", {});
          return json(res, { allowed: ip in ips, ip });
        }

        // ── POST /api/message ──────────────────────────────────────────
        if (m==="POST" && p==="/api/message") {
          const b = await body(req);
          const ip = clientIp(req);
          const msgs = rd<Msg[]>("msgs.json", []);
          msgs.unshift({ id: randomUUID(), ip, message: String(b.message||"").slice(0,800), timestamp: new Date().toISOString(), status:"pending" });
          wr("msgs.json", msgs.slice(0,500));
          return json(res, { ok: true });
        }

        // ── GET /api/videos (public, but IP-gated) ─────────────────────
        if (m==="GET" && p==="/api/videos") {
          const ip = clientIp(req);
          const ips = rd<IpMap>("ips.json", {});
          if (!(ip in ips) && !auth(req)) return json(res, {error:"Forbidden"}, 403);
          return json(res, rd<Video[]>("vids.json", []));
        }

        // ── POST /api/admin/login ──────────────────────────────────────
        if (m==="POST" && p==="/api/admin/login") {
          const b = await body(req);
          if (b.username===ADMIN_USER && b.password===ADMIN_PASS) {
            const token = randomUUID();
            sessions.add(token);
            return json(res, { token });
          }
          return json(res, {error:"Invalid credentials"}, 401);
        }

        // ── All below require admin auth ───────────────────────────────
        if (!auth(req)) return json(res, {error:"Unauthorized"}, 401);

        // Messages
        if (m==="GET"   && p==="/api/admin/msgs")      return json(res, rd<Msg[]>("msgs.json",[]));
        if (m==="PATCH" && p.startsWith("/api/admin/msgs/")) {
          const id = p.split("/").pop();
          const msgs = rd<Msg[]>("msgs.json",[]);
          const i = msgs.findIndex(x=>x.id===id);
          if (i>=0) { msgs[i].status="noted"; wr("msgs.json", msgs); }
          return json(res, {ok:true});
        }
        if (m==="DELETE" && p.startsWith("/api/admin/msgs/")) {
          const id = p.split("/").pop();
          wr("msgs.json", rd<Msg[]>("msgs.json",[]).filter(x=>x.id!==id));
          return json(res, {ok:true});
        }

        // IPs
        if (m==="GET" && p==="/api/admin/ips") {
          const ips = rd<IpMap>("ips.json",{});
          return json(res, Object.entries(ips).map(([ip,v])=>({ip,...v})));
        }
        if (m==="POST" && p==="/api/admin/ips") {
          const b = await body(req);
          const ip = String(b.ip||"").trim();
          if (!ip) return json(res,{error:"IP required"},400);
          const ips = rd<IpMap>("ips.json",{});
          ips[ip] = { approvedAt: new Date().toISOString(), note: String(b.note||"") };
          wr("ips.json", ips);
          const msgs = rd<Msg[]>("msgs.json",[]);
          msgs.forEach(x=>{ if(x.ip===ip) x.status="noted"; });
          wr("msgs.json", msgs);
          return json(res, {ok:true});
        }
        if (m==="DELETE" && p.startsWith("/api/admin/ips/")) {
          const ip = decodeURIComponent(p.replace("/api/admin/ips/",""));
          const ips = rd<IpMap>("ips.json",{});
          delete ips[ip];
          wr("ips.json", ips);
          return json(res, {ok:true});
        }

        // Videos
        if (m==="GET"    && p==="/api/admin/videos") return json(res, rd<Video[]>("vids.json",[]));
        if (m==="POST"   && p==="/api/admin/videos") {
          const b = await body(req) as Partial<Video>;
          const vids = rd<Video[]>("vids.json",[]);
          const entry: Video = { id:randomUUID(), videoId:String(b.videoId||"").trim(), title:String(b.title||"").trim(), subjectId:String(b.subjectId||"").trim(), desc:String(b.desc||"").trim(), date:String(b.date||"").trim(), course:String(b.course||"").trim(), online:Boolean(b.online??true) };
          vids.unshift(entry);
          wr("vids.json", vids);
          return json(res, entry);
        }
        if (m==="DELETE" && p.startsWith("/api/admin/videos/")) {
          const id = p.replace("/api/admin/videos/","");
          wr("vids.json", rd<Video[]>("vids.json",[]).filter(x=>x.id!==id));
          return json(res, {ok:true});
        }

        return next();
      });
    },
  };
}

/* ══════════════════════════════════════════════════════════════
   VITE CONFIG
══════════════════════════════════════════════════════════════ */
const rawPort = process.env.PORT;
if (!rawPort) throw new Error("PORT environment variable is required.");
const port = Number(rawPort);
if (Number.isNaN(port)||port<=0) throw new Error(`Invalid PORT: "${rawPort}"`);
const basePath = process.env.BASE_PATH;
if (!basePath) throw new Error("BASE_PATH environment variable is required.");

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    apiPlugin(),
    ...(process.env.NODE_ENV!=="production" && process.env.REPL_ID!==undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m)=>m.cartographer({ root: path.resolve(import.meta.dirname, "..") })),
          await import("@replit/vite-plugin-dev-banner").then((m)=>m.devBanner()),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: { outDir: path.resolve(import.meta.dirname, "dist/public"), emptyOutDir: true },
  server: {
    port, host:"0.0.0.0", allowedHosts:true,
    proxy: {
      '/api/admin':          { target: 'http://localhost:8080', changeOrigin: true },
      '/api/ai':             { target: 'http://localhost:8080', changeOrigin: true },
      '/api/validate-token': { target: 'http://localhost:8080', changeOrigin: true },
      '/api/security':       { target: 'http://localhost:8080', changeOrigin: true },
      '/api/user':           { target: 'http://localhost:8080', changeOrigin: true },
      '/api/subjects':       { target: 'http://localhost:8080', changeOrigin: true },
      '/api/doubts':         { target: 'http://localhost:8080', changeOrigin: true },
      '/api/solve-sheets':  { target: 'http://localhost:8080', changeOrigin: true },
      '/api/live-classes':  { target: 'http://localhost:8080', changeOrigin: true },
      '/api/announcements': { target: 'http://localhost:8080', changeOrigin: true },
      '/api/discussions':   { target: 'http://localhost:8080', changeOrigin: true },
      '/api/dashboard-menu':    { target: 'http://localhost:8080', changeOrigin: true },
      '/api/flashcard-decks':   { target: 'http://localhost:8080', changeOrigin: true },
      '/api/daily-challenge':   { target: 'http://localhost:8080', changeOrigin: true },
      '/api/search':            { target: 'http://localhost:8080', changeOrigin: true },
      '/api/exam-dates':        { target: 'http://localhost:8080', changeOrigin: true },
      '/api/past-papers':       { target: 'http://localhost:8080', changeOrigin: true },
      '/api/formulas':          { target: 'http://localhost:8080', changeOrigin: true },
      '/api/vocabulary':        { target: 'http://localhost:8080', changeOrigin: true },
      '/api/study-log':         { target: 'http://localhost:8080', changeOrigin: true },
      '/api/topic-votes':       { target: 'http://localhost:8080', changeOrigin: true },
      '/api/platform-settings': { target: 'http://localhost:8080', changeOrigin: true },
      '/api/notifications':     { target: 'http://localhost:8080', changeOrigin: true },
    },
    fs:{ strict:true, deny:["**/.*"] },
  },
  preview: { port, host:"0.0.0.0", allowedHosts:true },
});
