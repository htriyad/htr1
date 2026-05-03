import { Router } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const router = Router();

/* ══════════════════════════════════════════════════════════
   DATA LAYER
══════════════════════════════════════════════════════════ */
const DATA_DIR = path.resolve(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function rd<T>(file: string, def: T): T {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return def;
  try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return def; }
}
function wr(file: string, data: unknown) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

/* ── Gemini AI helper ───────────────────────────────────── */
const GEMINI_KEY   = process.env.GOOGLE_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL   || "gemini-2.5-flash";
const GEMINI_BASE  = "https://generativelanguage.googleapis.com/v1beta";
async function gemini(prompt: string, system: string, maxTokens = 600): Promise<string> {
  if (!GEMINI_KEY) throw new Error("GOOGLE_API_KEY not set");
  const models = [GEMINI_MODEL, "gemini-2.5-flash-lite", "gemini-2.0-flash-lite", "gemini-2.0-flash"];
  for (const m of models) {
    try {
      const r = await fetch(`${GEMINI_BASE}/models/${m}:generateContent?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens }
        })
      });
      if (r.ok) {
        const d: any = await r.json();
        return d?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
      }
      if (r.status !== 429 && r.status !== 503) break;
    } catch {}
  }
  throw new Error("AI unavailable");
}

/* ── Types ─────────────────────────────────────────────── */
interface IpEntry   { approvedAt: string; note?: string; name?: string; banned?: boolean }
interface IpMap     { [ip: string]: IpEntry }
interface DeviceInfo {
  os?: string;
  browser?: string;
  deviceType?: string;
  connectionType?: string;
  isMobileData?: boolean;
  userAgent?: string;
}
interface Message {
  id: string;
  ip: string;
  fullName?: string;
  message: string;
  timestamp: string;
  status: "pending" | "noted";
  deviceInfo?: DeviceInfo;
  type?: "access-request" | "content-request" | "security-alert";
  subject?: string;
  alertType?: string;
}
interface Video    { id: string; videoId: string; title: string; subjectId: string; chapterId?: string; desc: string; date: string; course: string; online: boolean }
interface Chapter  { id: string; name: string; order?: number }
interface Subject  { id: string; name: string; course: string; color?: string; chapters: Chapter[]; createdAt: string }
interface UniversalUser {
  id: string;
  username: string;
  password: string;
  note?: string;
  createdAt: string;
  banned?: boolean;
  universalAccess?: boolean;
  firstLoginDevice?: string;
  firstLoginAt?: string;
}
interface QuizOption   { id: string; text: string }
interface QuizQuestion { id: string; text: string; options: QuizOption[]; correct: string; solution?: string }
interface Quiz         { id: string; title: string; desc: string; timeMinutes: number; published: boolean; createdAt: string; questions: QuizQuestion[] }
interface Notification {
  id: string; title: string; body: string; createdAt: string;
  recipients?: string[];
  readBy?: string[];
}
interface DashMenuItem {
  id: string; label: string; icon: string; bg: string; chevron: string;
  path: string; order: number; enabled: boolean;
}

/* ── Seed default data ──────────────────────────────────── */
if (!fs.existsSync(path.join(DATA_DIR, "ips.json")))      wr("ips.json",      {});
if (!fs.existsSync(path.join(DATA_DIR, "msgs.json")))     wr("msgs.json",     []);
if (!fs.existsSync(path.join(DATA_DIR, "users.json")))    wr("users.json",    []);
if (!fs.existsSync(path.join(DATA_DIR, "settings.json"))) wr("settings.json", { universalSite: false, universalFree: false });
if (!fs.existsSync(path.join(DATA_DIR, "quizzes.json")))wr("quizzes.json",[]);
if (!fs.existsSync(path.join(DATA_DIR, "notifs.json"))) wr("notifs.json", []);
if (!fs.existsSync(path.join(DATA_DIR, "dashmenu.json"))) wr("dashmenu.json", [
  { id:"m1", label:"AI Tutor",         icon:"🤖", bg:"#ede9fe", chevron:"#7c3aed", path:"/ai-tutor",      order:1,  enabled:true },
  { id:"m2", label:"Past Classes",     icon:"🎬", bg:"#fff3e0", chevron:"#e65100", path:"/past-classes",  order:2,  enabled:true },
  { id:"m3", label:"Live Exam",        icon:"📝", bg:"#e3f2fd", chevron:"#2e7d32", path:"/exams",         order:3,  enabled:true },
  { id:"m4", label:"Practice Exam",    icon:"💻", bg:"#fff3e0", chevron:"#2e7d32", path:"/exams",         order:4,  enabled:true },
  { id:"m5", label:"My Progress",      icon:"🏆", bg:"#fef3c7", chevron:"#d97706", path:"/profile",       order:5,  enabled:true },
  { id:"m6", label:"Leaderboard",      icon:"🥇", bg:"#fee2e2", chevron:"#dc2626", path:"/leaderboard",   order:6,  enabled:true },
  { id:"m7", label:"Live Class",       icon:"👨‍🏫", bg:"#e8f5e9", chevron:"#e53935", path:"/",             order:7,  enabled:true },
  { id:"m8", label:"Solve Sheet",      icon:"📋", bg:"#f3e5f5", chevron:"#7b2fa5", path:"/",             order:8,  enabled:true },
  { id:"m9", label:"Q&A Service",      icon:"💬", bg:"#e0f7fa", chevron:"#2e7d32", path:"/ask",         order:9,  enabled:true },
  { id:"m10",label:"Course & Content", icon:"📚", bg:"#fce4ec", chevron:"#e65100", path:"/",             order:10, enabled:true },
  { id:"m11",label:"Discussion Group", icon:"👥", bg:"#e8f5e9", chevron:"#2e7d32", path:"/",             order:11, enabled:true },
]);
if (!fs.existsSync(path.join(DATA_DIR, "subjects.json")))
  wr("subjects.json", [
    { id:"sub-physics", name:"Physics",     course:"HSC Science", color:"#7c3aed", chapters:[{id:"ch-p1",name:"Mechanics",order:1},{id:"ch-p2",name:"Thermodynamics",order:2}], createdAt:new Date().toISOString() },
    { id:"sub-math",    name:"Mathematics", course:"HSC Math",    color:"#2563eb", chapters:[{id:"ch-m1",name:"Algebra",order:1},{id:"ch-m2",name:"Calculus",order:2}], createdAt:new Date().toISOString() },
  ]);
if (!fs.existsSync(path.join(DATA_DIR, "vids.json")))
  wr("vids.json", [
    { id:"1", videoId:"O6HL1Q3MCrM", title:"Chapter 1: Introduction to Physics", subjectId:"Ba-10", desc:"Newton's Laws of Motion\nKinematics\nForce & Acceleration", date:"19 Nov, 2025 08:00 PM", course:"HSC Science", online:true },
    { id:"2", videoId:"dQw4w9WgXcQ", title:"Chapter 2: Thermodynamics",           subjectId:"Ba-11", desc:"Heat & Temperature\nIdeal Gas Law\nEntropy Basics",            date:"22 Nov, 2025 09:00 AM", course:"HSC Science", online:true },
    { id:"3", videoId:"L_jWHffIx5E", title:"Math – Algebra & Calculus",           subjectId:"Ga-05", desc:"Integration & Differentiation\nLimits\nSeries & Sequences",  date:"25 Nov, 2025 07:00 PM", course:"HSC Math",    online:false },
  ]);

/* ══════════════════════════════════════════════════════════
   IN-MEMORY SECURITY STORES
══════════════════════════════════════════════════════════ */
const ADMIN_SESSIONS = new Set<string>();
const ADMIN_USER = "htr";
const ADMIN_PASS = "htr0";

// universal user token → username
const USER_SESSIONS = new Map<string, string>();

// Bot/flood protection: ip → list of request timestamps (last 60s)
const RATE_WINDOW: Map<string, number[]> = new Map();
// Auto-blocked IPs (bot activity)
const BOT_BLOCKED: Set<string> = new Set();

// VPN detection cache: ip → { isVpn, checkedAt }
const VPN_CACHE: Map<string, { isVpn: boolean; checkedAt: number }> = new Map();

/* ══════════════════════════════════════════════════════════
   SECURITY HELPERS
══════════════════════════════════════════════════════════ */
function clientIp(req: any): string {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return (Array.isArray(fwd) ? fwd[0] : fwd.split(",")[0]).trim();
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function isLocalhost(ip: string): boolean {
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

/** Track request rate per IP; returns true if this IP should be auto-blocked */
function trackRate(ip: string): boolean {
  if (isLocalhost(ip)) return false;
  if (BOT_BLOCKED.has(ip)) return true;
  const now = Date.now();
  const times = RATE_WINDOW.get(ip) || [];
  const recent = times.filter(t => now - t < 60_000);
  recent.push(now);
  RATE_WINDOW.set(ip, recent);
  if (recent.length > 60) {
    BOT_BLOCKED.add(ip);
    // Log as security alert
    const msgs = rd<Message[]>("msgs.json", []);
    msgs.push({
      id: crypto.randomUUID(), ip,
      message: `🤖 Auto-blocked: ${recent.length} requests in 60 seconds (bot/flood detected)`,
      timestamp: new Date().toISOString(),
      status: "pending", type: "security-alert", alertType: "bot-flood",
    });
    wr("msgs.json", msgs);
    return true;
  }
  return false;
}

async function checkVpn(ip: string): Promise<boolean> {
  if (isLocalhost(ip)) return false;
  const cached = VPN_CACHE.get(ip);
  if (cached && Date.now() - cached.checkedAt < 24 * 60 * 60 * 1000) return cached.isVpn;
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(`http://ip-api.com/json/${ip}?fields=proxy,hosting`, { signal: ctrl.signal });
    clearTimeout(timeout);
    if (!r.ok) { VPN_CACHE.set(ip, { isVpn: false, checkedAt: Date.now() }); return false; }
    const d: any = await r.json();
    const isVpn = d.proxy === true || d.hosting === true;
    VPN_CACHE.set(ip, { isVpn, checkedAt: Date.now() });
    return isVpn;
  } catch {
    VPN_CACHE.set(ip, { isVpn: false, checkedAt: Date.now() });
    return false;
  }
}

function getUserToken(req: any): string | null {
  const auth = req.headers["authorization"] || req.headers["x-user-token"];
  if (!auth) return null;
  return auth.replace("Bearer ", "").trim() || null;
}

function getLoggedInUser(req: any): UniversalUser | null {
  const token = getUserToken(req);
  if (!token || !USER_SESSIONS.has(token)) return null;
  const username = USER_SESSIONS.get(token)!;
  const users = rd<UniversalUser[]>("users.json", []);
  return users.find(u => u.username === username) || null;
}

/** Returns true if request is allowed (approved IP or valid non-banned user token) */
function isAllowed(req: any): boolean {
  const ip = clientIp(req);
  // Check if IP is banned
  const ips = rd<IpMap>("ips.json", {});
  if (ips[ip]?.banned) return false;
  // Check user token
  const token = getUserToken(req);
  if (token && USER_SESSIONS.has(token)) {
    const user = getLoggedInUser(req);
    if (user?.banned) return false;
    return true;
  }
  // Check IP approval
  if (ip in ips) return true;
  if (isLocalhost(ip)) return true;
  return false;
}

function adminAuth(req: any, res: any, next: any) {
  const token = req.headers["authorization"]?.replace("Bearer ", "") || req.headers["x-admin-token"];
  if (!token || !ADMIN_SESSIONS.has(token)) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function userAuth(req: any, res: any, next: any) {
  if (!isAllowed(req)) return res.status(403).json({ error: "Access denied" });
  next();
}

/* Bot-protection middleware — applied to public endpoints */
function botGuard(req: any, res: any, next: any) {
  const ip = clientIp(req);
  if (trackRate(ip)) return res.status(429).json({ error: "Too many requests. Your IP has been auto-blocked." });
  next();
}

/* ══════════════════════════════════════════════════════════
   PUBLIC — IP / ACCESS CHECK
══════════════════════════════════════════════════════════ */
router.get("/check-ip", async (req, res) => {
  const ip      = clientIp(req);
  const token   = getUserToken(req);
  const ips     = rd<IpMap>("ips.json", {});
  const settings = rd<any>("settings.json", { universalSite: false, universalFree: false });

  // Universal Site mode — everyone gets in
  if (settings.universalSite) {
    return res.json({ allowed: true, ip, universalSite: true });
  }

  // Check if IP is bot-blocked
  if (BOT_BLOCKED.has(ip) && !isLocalhost(ip)) {
    return res.json({ allowed: false, ip, blocked: true, reason: "bot" });
  }

  // Check if IP is banned
  if (ips[ip]?.banned) {
    return res.json({ allowed: false, ip, banned: true });
  }

  // Check user token
  const isUser = !!(token && USER_SESSIONS.has(token));
  if (isUser) {
    const user = getLoggedInUser(req);
    if (user?.banned) return res.json({ allowed: false, ip, banned: true, userBanned: true });
    return res.json({
      allowed: true, ip, universalUser: true,
      username: user?.username || null,
      universalAccess: user?.universalAccess || false,
      name: user?.note || null,
    });
  }

  const ipOk = ip in ips || isLocalhost(ip);
  if (!ipOk) {
    // VPN check for blocked users
    let vpn = false;
    try { vpn = await checkVpn(ip); } catch {}
    return res.json({ allowed: false, ip, vpnDetected: vpn });
  }

  // IP-approved — VPN check
  let vpn = false;
  try { vpn = await checkVpn(ip); } catch {}
  if (vpn) return res.json({ allowed: false, ip, vpnDetected: true });

  res.json({
    allowed: true, ip,
    universalUser: false,
    username: null,
    name: ips[ip]?.name || null,
  });
});

/* POST /api/message — blocked visitor sends an access request */
router.post("/message", botGuard, (req, res) => {
  const ip = clientIp(req);

  // Check if IP is banned
  const ips = rd<IpMap>("ips.json", {});
  if (ips[ip]?.banned) return res.status(403).json({ error: "Your access has been permanently blocked." });

  const { fullName, message, deviceInfo } = req.body;
  if (!fullName || !fullName.trim()) return res.status(400).json({ error: "Full name is required" });

  // Rate limit: max 2 requests per IP in 7 days
  const msgs = rd<Message[]>("msgs.json", []);
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentFromIp = msgs.filter(m =>
    m.ip === ip &&
    m.type === "access-request" &&
    new Date(m.timestamp).getTime() > oneWeekAgo
  );
  if (recentFromIp.length >= 2) {
    return res.status(429).json({ error: "You have already sent 2 requests this week. Please wait for admin response or try again next week." });
  }

  const bodyText = message?.trim()
    ? message.trim()
    : "";

  msgs.push({
    id: crypto.randomUUID(),
    ip,
    fullName: fullName.trim(),
    message: bodyText,
    timestamp: new Date().toISOString(),
    status: "pending",
    type: "access-request",
    deviceInfo: deviceInfo || undefined,
  });
  wr("msgs.json", msgs);
  res.json({ ok: true });
});

/* POST /api/content-request — logged-in student requests course access */
router.post("/content-request", userAuth, (req, res) => {
  const ip = clientIp(req);
  const token = getUserToken(req);
  const username = token ? USER_SESSIONS.get(token) : null;
  const { subject, message, deviceInfo } = req.body;
  if (!subject) return res.status(400).json({ error: "subject required" });

  // Rate limit: max 2 content requests per IP/user per 7 days
  const msgs = rd<Message[]>("msgs.json", []);
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentRequests = msgs.filter(m =>
    (m.ip === ip || (username && m.message.includes(`@${username}`))) &&
    m.type === "content-request" &&
    new Date(m.timestamp).getTime() > oneWeekAgo
  );
  if (recentRequests.length >= 2) {
    return res.status(429).json({ error: "You have already sent 2 content requests this week." });
  }

  const body = `📚 Course Access Request\nSubject: ${subject}\n${username ? `Student: @${username}\n` : ""}${message ? `Message: ${message}` : ""}`;
  msgs.push({
    id: crypto.randomUUID(),
    ip,
    message: body,
    timestamp: new Date().toISOString(),
    status: "pending",
    type: "content-request",
    subject,
    deviceInfo: deviceInfo || undefined,
  });
  wr("msgs.json", msgs);
  res.json({ ok: true });
});

/* POST /api/security/alert — client reports security event (DevTools open, etc.) */
router.post("/security/alert", (req, res) => {
  const ip = clientIp(req);
  const { alertType, details, username } = req.body || {};
  const msgs = rd<Message[]>("msgs.json", []);
  const label = alertType === "devtools" ? "🛠️ DevTools Opened"
              : alertType === "extension" ? "🧩 Browser Extension"
              : alertType === "view-source" ? "📄 View Source Attempt"
              : "🚨 Security Alert";
  msgs.push({
    id: crypto.randomUUID(),
    ip,
    message: `${label}\n${username ? `User: @${username}\n` : ""}${details ? `Details: ${JSON.stringify(details)}` : ""}`,
    timestamp: new Date().toISOString(),
    status: "pending",
    type: "security-alert",
    alertType,
  });
  wr("msgs.json", msgs);
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════
   UNIVERSAL USER AUTH
══════════════════════════════════════════════════════════ */

/* POST /api/user/login */
router.post("/user/login", botGuard, (req, res) => {
  const { username, password, deviceFingerprint } = req.body;
  if (!username || !password) return res.status(400).json({ error: "username and password required" });

  const users = rd<UniversalUser[]>("users.json", []);
  const user  = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid username or password" });

  // Check if banned
  if (user.banned) {
    return res.status(403).json({ error: "Your account has been permanently banned. Contact admin." });
  }

  // One-device restriction
  if (deviceFingerprint) {
    if (!user.firstLoginDevice) {
      // First time login — save device fingerprint
      const i = users.findIndex(u => u.id === user.id);
      users[i].firstLoginDevice = deviceFingerprint;
      users[i].firstLoginAt = new Date().toISOString();
      wr("users.json", users);
    } else if (user.firstLoginDevice !== deviceFingerprint) {
      // Different device — reject
      return res.status(403).json({
        error: "This account is already bound to another device. Each account can only be used on one device. Contact admin to reset your device.",
        deviceLocked: true,
      });
    }
  }

  const token = crypto.randomUUID();
  USER_SESSIONS.set(token, user.username);
  res.json({
    token,
    username: user.username,
    universalAccess: user.universalAccess || false,
  });
});

/* GET /api/validate-token */
router.get("/validate-token", (req, res) => {
  const token = getUserToken(req);
  if (!token || !USER_SESSIONS.has(token)) return res.json({ valid: false });
  const username = USER_SESSIONS.get(token)!;
  const users = rd<UniversalUser[]>("users.json", []);
  const user = users.find(u => u.username === username);
  if (user?.banned) {
    USER_SESSIONS.delete(token);
    return res.json({ valid: false, banned: true });
  }
  res.json({
    valid: true,
    username,
    universalAccess: user?.universalAccess || false,
  });
});

/* POST /api/user/logout */
router.post("/user/logout", (req, res) => {
  const token = getUserToken(req);
  if (token) USER_SESSIONS.delete(token);
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════
   STUDENT — VIDEOS
══════════════════════════════════════════════════════════ */
router.get("/videos", (req, res) => {
  const settings = rd<any>("settings.json", { universalSite: false, universalFree: false });
  if (!settings.universalFree && !settings.universalSite && !isAllowed(req)) {
    return res.status(403).json({ error: "Access denied" });
  }
  res.json(rd<Video[]>("vids.json", []));
});

/* ══════════════════════════════════════════════════════════
   STUDENT — NOTIFICATIONS
══════════════════════════════════════════════════════════ */
router.get("/notifications", userAuth, (req, res) => {
  const token = getUserToken(req);
  const username = token ? USER_SESSIONS.get(token) || null : null;
  const all = rd<Notification[]>("notifs.json", []);
  const visible = all.filter(n => {
    const r = n.recipients;
    if (!r || r.length === 0) return true;
    return username ? r.includes(username) : false;
  });
  const decorated = visible.map(n => ({
    ...n,
    read: username ? !!(n.readBy?.includes(username)) : false,
  }));
  res.json(decorated);
});

router.post("/notifications/:id/read", userAuth, (req, res) => {
  const token = getUserToken(req);
  const username = token ? USER_SESSIONS.get(token) : null;
  if (!username) return res.json({ ok: true });
  const all = rd<Notification[]>("notifs.json", []);
  const n = all.find(x => x.id === req.params.id);
  if (!n) return res.status(404).json({ error: "Not found" });
  n.readBy = n.readBy || [];
  if (!n.readBy.includes(username)) n.readBy.push(username);
  wr("notifs.json", all);
  res.json({ ok: true });
});

router.post("/notifications/read-all", userAuth, (req, res) => {
  const token = getUserToken(req);
  const username = token ? USER_SESSIONS.get(token) : null;
  if (!username) return res.json({ ok: true });
  const all = rd<Notification[]>("notifs.json", []);
  for (const n of all) {
    const r = n.recipients;
    const visible = !r || r.length === 0 || r.includes(username);
    if (!visible) continue;
    n.readBy = n.readBy || [];
    if (!n.readBy.includes(username)) n.readBy.push(username);
  }
  wr("notifs.json", all);
  res.json({ ok: true });
});

/* ── Dashboard menu ── */
router.get("/dashboard-menu", userAuth, (_req, res) => {
  const items = rd<DashMenuItem[]>("dashmenu.json", []);
  res.json(items.filter(i => i.enabled).sort((a, b) => a.order - b.order));
});

/* Public subject list */
router.get("/subjects", (req, res) => {
  const settings = rd<any>("settings.json", { universalSite: false, universalFree: false });
  if (!settings.universalFree && !settings.universalSite && !isAllowed(req)) {
    return res.status(403).json({ error: "Access denied" });
  }
  res.json(rd<Subject[]>("subjects.json", []));
});

/* ══════════════════════════════════════════════════════════
   STUDENT — QUIZZES
══════════════════════════════════════════════════════════ */
router.get("/quizzes", userAuth, (_req, res) => {
  const all = rd<Quiz[]>("quizzes.json", []);
  const safe = all
    .filter(q => q.published)
    .map(q => ({
      id: q.id, title: q.title, desc: q.desc,
      timeMinutes: q.timeMinutes, createdAt: q.createdAt,
      questionCount: q.questions.length,
    }));
  res.json(safe);
});

router.get("/quizzes/:id", userAuth, (req, res) => {
  const all  = rd<Quiz[]>("quizzes.json", []);
  const quiz = all.find(q => q.id === req.params.id && q.published);
  if (!quiz) return res.status(404).json({ error: "Not found" });
  const safeQ = quiz.questions.map(q => ({ id: q.id, text: q.text, options: q.options }));
  res.json({ id: quiz.id, title: quiz.title, desc: quiz.desc, timeMinutes: quiz.timeMinutes, questions: safeQ });
});

router.post("/quiz-submit", userAuth, (req, res) => {
  const { quizId, answers } = req.body as { quizId: string; answers: Record<string, string> };
  const all  = rd<Quiz[]>("quizzes.json", []);
  const quiz = all.find(q => q.id === quizId);
  if (!quiz) return res.status(404).json({ error: "Quiz not found" });
  let correct = 0;
  const results = quiz.questions.map(q => {
    const chosen  = answers[q.id] || null;
    const isRight = chosen === q.correct;
    if (isRight) correct++;
    return { id: q.id, text: q.text, options: q.options, chosen, correct: q.correct, isRight, solution: q.solution };
  });
  res.json({ score: correct, total: quiz.questions.length, results });
});

/* ══════════════════════════════════════════════════════════
   ADMIN AUTH
══════════════════════════════════════════════════════════ */
router.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = crypto.randomUUID();
    ADMIN_SESSIONS.add(token);
    return res.json({ token });
  }
  res.status(401).json({ error: "Invalid credentials" });
});

/* ══════════════════════════════════════════════════════════
   ADMIN — GLOBAL SETTINGS
══════════════════════════════════════════════════════════ */
router.get("/admin/settings", adminAuth, (_req, res) => {
  res.json(rd<any>("settings.json", { universalSite: false, universalFree: false }));
});
router.patch("/admin/settings", adminAuth, (req, res) => {
  const current = rd<any>("settings.json", { universalSite: false, universalFree: false });
  const { universalSite, universalFree } = req.body || {};
  if (typeof universalSite === "boolean") current.universalSite = universalSite;
  if (typeof universalFree  === "boolean") current.universalFree  = universalFree;
  wr("settings.json", current);
  res.json(current);
});

/* ══════════════════════════════════════════════════════════
   ADMIN — MESSAGES / INBOX
══════════════════════════════════════════════════════════ */
router.get("/admin/msgs",          adminAuth, (_r, res) => res.json(rd<Message[]>("msgs.json",[])));
router.patch("/admin/msgs/:id",    adminAuth, (req, res) => {
  const msgs = rd<Message[]>("msgs.json",[]);
  const i = msgs.findIndex(m=>m.id===req.params.id);
  if (i===-1) return res.status(404).json({error:"Not found"});
  msgs[i].status="noted"; wr("msgs.json",msgs); res.json({ok:true});
});
router.delete("/admin/msgs/:id",   adminAuth, (req, res) => {
  wr("msgs.json", rd<Message[]>("msgs.json",[]).filter(m=>m.id!==req.params.id)); res.json({ok:true});
});

/* POST /admin/msgs/:id/quick-user — Create account from inbox message & auto-mark noted */
router.post("/admin/msgs/:id/quick-user", adminAuth, (req, res) => {
  const { username, password, note } = req.body;
  if (!username || !password) return res.status(400).json({ error: "username and password required" });
  const users = rd<UniversalUser[]>("users.json", []);
  if (users.find(u => u.username === username)) return res.status(400).json({ error: "Username already exists" });
  const user: UniversalUser = {
    id: crypto.randomUUID(), username: username.trim(), password,
    note: note || "", createdAt: new Date().toISOString(),
  };
  users.push(user);
  wr("users.json", users);
  // Also sync name to IP from the message
  const msgs = rd<Message[]>("msgs.json", []);
  const i = msgs.findIndex(m => m.id === req.params.id);
  if (i !== -1) {
    msgs[i].status = "noted";
    wr("msgs.json", msgs);
  }
  res.json({ id: user.id, username: user.username, createdAt: user.createdAt });
});

/* ══════════════════════════════════════════════════════════
   ADMIN — IPs
══════════════════════════════════════════════════════════ */
router.get("/admin/ips",           adminAuth, (_r, res) => {
  const ips = rd<IpMap>("ips.json",{});
  res.json(Object.entries(ips).map(([ip,v])=>({ip,...v})));
});
router.post("/admin/ips",          adminAuth, (req, res) => {
  const { ip, name } = req.body;
  if (!ip) return res.status(400).json({error:"ip required"});
  const ips = rd<IpMap>("ips.json",{});
  ips[ip.trim()] = { approvedAt: new Date().toISOString(), name: name || undefined };
  wr("ips.json",ips); res.json({ok:true});
});
router.patch("/admin/ips/:ip/ban", adminAuth, (req, res) => {
  const ipKey = decodeURIComponent(req.params.ip);
  const ips = rd<IpMap>("ips.json", {});
  if (!ips[ipKey]) ips[ipKey] = { approvedAt: new Date().toISOString() };
  ips[ipKey].banned = !ips[ipKey].banned;
  wr("ips.json", ips);
  res.json({ ok: true, banned: ips[ipKey].banned });
});
router.delete("/admin/ips/:ip",    adminAuth, (req, res) => {
  const ips = rd<IpMap>("ips.json",{});
  delete ips[decodeURIComponent(req.params.ip)];
  wr("ips.json",ips); res.json({ok:true});
});

/* Approve IP from a specific inbox message (also syncs the name) */
router.post("/admin/msgs/:id/approve-ip", adminAuth, (req, res) => {
  const msgs = rd<Message[]>("msgs.json", []);
  const msg = msgs.find(m => m.id === req.params.id);
  if (!msg) return res.status(404).json({ error: "Message not found" });
  const ips = rd<IpMap>("ips.json", {});
  ips[msg.ip] = {
    approvedAt: new Date().toISOString(),
    name: msg.fullName || undefined,
  };
  wr("ips.json", ips);
  // Mark message as noted
  const i = msgs.findIndex(m => m.id === req.params.id);
  if (i !== -1) { msgs[i].status = "noted"; wr("msgs.json", msgs); }
  res.json({ ok: true, ip: msg.ip, name: msg.fullName });
});

/* ══════════════════════════════════════════════════════════
   ADMIN — UNIVERSAL USERS
══════════════════════════════════════════════════════════ */
router.get("/admin/users",         adminAuth, (_r, res) => {
  const users = rd<UniversalUser[]>("users.json",[]);
  res.json(users.map(u=>({
    id: u.id, username: u.username, note: u.note, createdAt: u.createdAt,
    banned: u.banned || false,
    universalAccess: u.universalAccess || false,
    firstLoginDevice: u.firstLoginDevice ? "set" : null,
    firstLoginAt: u.firstLoginAt || null,
  })));
});
router.post("/admin/users",        adminAuth, (req, res) => {
  const { username, password, note, universalAccess } = req.body;
  if (!username || !password) return res.status(400).json({error:"username and password required"});
  const users = rd<UniversalUser[]>("users.json",[]);
  if (users.find(u=>u.username===username)) return res.status(400).json({error:"Username already exists"});
  const user: UniversalUser = {
    id: crypto.randomUUID(), username: username.trim(), password,
    note: note||"", createdAt: new Date().toISOString(),
    universalAccess: !!universalAccess,
  };
  users.push(user);
  wr("users.json",users);
  res.json({id:user.id, username:user.username, createdAt:user.createdAt});
});
router.delete("/admin/users/:id",  adminAuth, (req, res) => {
  const users = rd<UniversalUser[]>("users.json",[]);
  const target = users.find(u=>u.id===req.params.id);
  if (target) {
    for (const [tok, uname] of USER_SESSIONS.entries()) {
      if (uname===target.username) USER_SESSIONS.delete(tok);
    }
  }
  wr("users.json", users.filter(u=>u.id!==req.params.id));
  res.json({ok:true});
});
router.patch("/admin/users/:id/password", adminAuth, (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({error:"password required"});
  const users = rd<UniversalUser[]>("users.json",[]);
  const i = users.findIndex(u=>u.id===req.params.id);
  if (i===-1) return res.status(404).json({error:"Not found"});
  users[i].password = password;
  wr("users.json",users); res.json({ok:true});
});
/* PATCH /admin/users/:id/ban — toggle ban */
router.patch("/admin/users/:id/ban", adminAuth, (req, res) => {
  const users = rd<UniversalUser[]>("users.json",[]);
  const i = users.findIndex(u=>u.id===req.params.id);
  if (i===-1) return res.status(404).json({error:"Not found"});
  users[i].banned = !users[i].banned;
  // Revoke all sessions if banning
  if (users[i].banned) {
    for (const [tok, uname] of USER_SESSIONS.entries()) {
      if (uname===users[i].username) USER_SESSIONS.delete(tok);
    }
  }
  wr("users.json",users); res.json({ok:true, banned:users[i].banned});
});
/* PATCH /admin/users/:id/universal-access — toggle universal access */
router.patch("/admin/users/:id/universal-access", adminAuth, (req, res) => {
  const users = rd<UniversalUser[]>("users.json",[]);
  const i = users.findIndex(u=>u.id===req.params.id);
  if (i===-1) return res.status(404).json({error:"Not found"});
  users[i].universalAccess = !users[i].universalAccess;
  wr("users.json",users); res.json({ok:true, universalAccess:users[i].universalAccess});
});
/* PATCH /admin/users/:id/reset-device — admin resets device lock so student can log in from a new device */
router.patch("/admin/users/:id/reset-device", adminAuth, (req, res) => {
  const users = rd<UniversalUser[]>("users.json",[]);
  const i = users.findIndex(u=>u.id===req.params.id);
  if (i===-1) return res.status(404).json({error:"Not found"});
  delete users[i].firstLoginDevice;
  delete users[i].firstLoginAt;
  wr("users.json",users); res.json({ok:true});
});
/* PATCH /admin/ips/unblock-bot — admin manually unblocks a bot-blocked IP */
router.delete("/admin/security/bot-block/:ip", adminAuth, (req, res) => {
  BOT_BLOCKED.delete(decodeURIComponent(req.params.ip));
  res.json({ ok: true });
});
/* GET /admin/security/bot-blocked — list bot-blocked IPs */
router.get("/admin/security/bot-blocked", adminAuth, (_req, res) => {
  res.json(Array.from(BOT_BLOCKED));
});

/* ══════════════════════════════════════════════════════════
   ADMIN — VIDEOS
══════════════════════════════════════════════════════════ */
router.get("/admin/videos",        adminAuth, (_r, res) => res.json(rd<Video[]>("vids.json",[])));
router.post("/admin/videos",       adminAuth, (req, res) => {
  const { videoId, title, subjectId, desc, date, course, online } = req.body;
  if (!videoId||!title) return res.status(400).json({error:"videoId and title required"});
  const vids = rd<Video[]>("vids.json",[]);
  const vid: Video = { id:crypto.randomUUID(), videoId, title, subjectId:subjectId||"", desc:desc||"", date:date||"", course:course||"", online:!!online };
  vids.unshift(vid); wr("vids.json",vids); res.json(vid);
});
router.put("/admin/videos/:id", adminAuth, (req, res) => {
  const vids = rd<Video[]>("vids.json",[]);
  const i = vids.findIndex(v=>v.id===req.params.id);
  if (i===-1) return res.status(404).json({error:"Not found"});
  vids[i] = { ...vids[i], ...req.body, id: vids[i].id };
  wr("vids.json", vids); res.json(vids[i]);
});
router.delete("/admin/videos/:id", adminAuth, (req, res) => {
  wr("vids.json", rd<Video[]>("vids.json",[]).filter(v=>v.id!==req.params.id)); res.json({ok:true});
});

/* Bulk transfer videos to a different subject */
router.post("/admin/videos/transfer", adminAuth, (req, res) => {
  const { videoIds, targetSubjectId, targetChapterId } = req.body as { videoIds: string[]; targetSubjectId: string; targetChapterId?: string };
  if (!Array.isArray(videoIds) || !targetSubjectId) return res.status(400).json({ error: "videoIds[] and targetSubjectId required" });
  const subjects = rd<Subject[]>("subjects.json", []);
  const subj = subjects.find(s => s.id === targetSubjectId);
  if (!subj) return res.status(404).json({ error: "Target subject not found" });
  if (targetChapterId && !subj.chapters.find(c => c.id === targetChapterId)) return res.status(400).json({ error: "Target chapter not in target subject" });
  const vids = rd<Video[]>("vids.json", []);
  const ids = new Set(videoIds);
  let moved = 0;
  for (const v of vids) {
    if (ids.has(v.id)) { v.subjectId = targetSubjectId; v.chapterId = targetChapterId || undefined; moved++; }
  }
  wr("vids.json", vids);
  res.json({ ok: true, moved });
});

/* ── ADMIN — SUBJECTS & CHAPTERS ── */
router.get("/admin/subjects", adminAuth, (_r, res) => res.json(rd<Subject[]>("subjects.json", [])));
router.post("/admin/subjects", adminAuth, (req, res) => {
  const { name, course, color } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });
  const subjects = rd<Subject[]>("subjects.json", []);
  const subj: Subject = { id:"sub-"+crypto.randomUUID().slice(0,8), name:String(name).trim(), course:String(course||"").trim(), color:color||"#7c3aed", chapters:[], createdAt:new Date().toISOString() };
  subjects.push(subj); wr("subjects.json", subjects); res.json(subj);
});
router.put("/admin/subjects/:id", adminAuth, (req, res) => {
  const subjects = rd<Subject[]>("subjects.json", []);
  const i = subjects.findIndex(s=>s.id===req.params.id);
  if (i===-1) return res.status(404).json({error:"Not found"});
  const b = req.body||{};
  subjects[i]={...subjects[i],...(b.name!==undefined?{name:String(b.name).trim()}:{}),...(b.course!==undefined?{course:String(b.course).trim()}:{}),...(b.color!==undefined?{color:String(b.color)}:{})};
  wr("subjects.json",subjects); res.json(subjects[i]);
});
router.delete("/admin/subjects/:id", adminAuth, (req, res) => {
  const subjects=rd<Subject[]>("subjects.json",[]);
  const next=subjects.filter(s=>s.id!==req.params.id);
  if(next.length===subjects.length) return res.status(404).json({error:"Not found"});
  wr("subjects.json",next);
  const vids=rd<Video[]>("vids.json",[]);
  let changed=false;
  for(const v of vids) if(v.subjectId===req.params.id){v.subjectId="";v.chapterId=undefined;changed=true;}
  if(changed) wr("vids.json",vids);
  res.json({ok:true});
});
router.post("/admin/subjects/:id/chapters", adminAuth, (req, res) => {
  const {name}=req.body||{};
  if(!name) return res.status(400).json({error:"name required"});
  const subjects=rd<Subject[]>("subjects.json",[]);
  const subj=subjects.find(s=>s.id===req.params.id);
  if(!subj) return res.status(404).json({error:"Subject not found"});
  const ch:Chapter={id:"ch-"+crypto.randomUUID().slice(0,8),name:String(name).trim(),order:subj.chapters.length+1};
  subj.chapters.push(ch); wr("subjects.json",subjects); res.json(ch);
});
router.put("/admin/subjects/:sid/chapters/:cid", adminAuth, (req, res) => {
  const subjects=rd<Subject[]>("subjects.json",[]);
  const subj=subjects.find(s=>s.id===req.params.sid);
  if(!subj) return res.status(404).json({error:"Subject not found"});
  const ch=subj.chapters.find(c=>c.id===req.params.cid);
  if(!ch) return res.status(404).json({error:"Chapter not found"});
  if(req.body?.name!==undefined) ch.name=String(req.body.name).trim();
  if(typeof req.body?.order==="number") ch.order=req.body.order;
  wr("subjects.json",subjects); res.json(ch);
});
router.delete("/admin/subjects/:sid/chapters/:cid", adminAuth, (req, res) => {
  const subjects=rd<Subject[]>("subjects.json",[]);
  const subj=subjects.find(s=>s.id===req.params.sid);
  if(!subj) return res.status(404).json({error:"Subject not found"});
  subj.chapters=subj.chapters.filter(c=>c.id!==req.params.cid);
  wr("subjects.json",subjects);
  const vids=rd<Video[]>("vids.json",[]);
  let changed=false;
  for(const v of vids) if(v.chapterId===req.params.cid){v.chapterId=undefined;changed=true;}
  if(changed) wr("vids.json",vids);
  res.json({ok:true});
});

/* ── YOUTUBE PLAYLIST IMPORT ── */
function extractPlaylistId(input: string): string | null {
  const s = (input||"").trim();
  if (!s) return null;
  try { const u=new URL(s); const list=u.searchParams.get("list"); if(list) return list; } catch {}
  if (/^[A-Za-z0-9_-]{10,}$/.test(s) && !s.includes("/")) return s;
  const m = s.match(/[?&]list=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

const YT_BROWSE_URL = "https://www.youtube.com/youtubei/v1/browse?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const YT_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  "X-YouTube-Client-Name": "1",
  "X-YouTube-Client-Version": "2.20240101.00.00",
};

async function fetchYtPlaylistPage(playlistId: string, continuation?: string): Promise<any> {
  const body: any = { context: { client: { clientName:"WEB", clientVersion:"2.20240101.00.00", hl:"en", gl:"US" } } };
  if (continuation) body.continuation = continuation; else body.browseId = `VL${playlistId}`;
  const r = await fetch(YT_BROWSE_URL, { method:"POST", headers:YT_HEADERS, body:JSON.stringify(body) });
  if (!r.ok) throw new Error(`YouTube responded ${r.status}`);
  return r.json();
}

function ytExtractVideos(data: any): Array<{ videoId:string; title:string; thumbnail:string; duration:string }> {
  const out: Array<{ videoId:string; title:string; thumbnail:string; duration:string }> = [];
  const visit = (n: any) => {
    if (!n||typeof n!=="object") return;
    if (Array.isArray(n)) { n.forEach(visit); return; }
    const r = n.playlistVideoRenderer;
    if (r) {
      const vid=r.videoId; const title=r.title?.runs?.[0]?.text||r.title?.simpleText||"";
      const thumb=r.thumbnail?.thumbnails?.slice(-1)?.[0]?.url||(vid?`https://i.ytimg.com/vi/${vid}/mqdefault.jpg`:"");
      const duration=r.lengthText?.simpleText||r.lengthText?.runs?.[0]?.text||"";
      if (vid&&title&&title!=="[Private video]"&&title!=="[Deleted video]") out.push({videoId:vid,title,thumbnail:thumb,duration});
    }
    for (const v of Object.values(n)) visit(v);
  };
  visit(data); return out;
}

function ytExtractContinuation(data: any): string | null {
  const visit = (n: any): string | null => {
    if (!n||typeof n!=="object") return null;
    if (Array.isArray(n)) { for(const x of n){const t=visit(x);if(t)return t;} return null; }
    if (n.continuationCommand?.token) return n.continuationCommand.token;
    if (n.continuationItemRenderer) { const t=visit(n.continuationItemRenderer); if(t) return t; }
    for(const v of Object.values(n)){const t=visit(v);if(t)return t;}
    return null;
  };
  return visit(data);
}

function ytExtractPlaylistTitle(data: any): string {
  return data?.header?.playlistHeaderRenderer?.title?.simpleText||data?.header?.playlistHeaderRenderer?.title?.runs?.[0]?.text||data?.metadata?.playlistMetadataRenderer?.title||"YouTube Playlist";
}

/** STEP 1 — Fetch playlist videos */
router.post("/admin/playlist/fetch", adminAuth, async (req, res) => {
  const { playlist } = req.body||{};
  const pid = extractPlaylistId(playlist);
  if (!pid) return res.status(400).json({ error: "Couldn't find a YouTube playlist ID in that URL." });
  try {
    const all: Array<{videoId:string;title:string;thumbnail:string;duration:string}> = [];
    let continuation: string|null = null;
    let title = "YouTube Playlist";
    for (let page=0;page<12;page++) {
      const data: any = await fetchYtPlaylistPage(pid, continuation||undefined);
      if (page===0) title = ytExtractPlaylistTitle(data);
      all.push(...ytExtractVideos(data));
      continuation = ytExtractContinuation(data);
      if (!continuation) break;
    }
    if (all.length===0) return res.status(404).json({ error: "Playlist is empty, private, or not accessible." });
    const existing = new Set(rd<Video[]>("vids.json",[]).map(v=>v.videoId));
    res.json({ title, playlistId:pid, total:all.length, videos:all.map(v=>({...v,exists:existing.has(v.videoId)})) });
  } catch(err:any) { res.status(500).json({ error: err?.message||"Failed to fetch playlist" }); }
});

/** STEP 2 — Bulk import (auto-saves to DB immediately) */
router.post("/admin/videos/bulk", adminAuth, (req, res) => {
  const { videos, subjectId, chapterId, course, online } = req.body||{};
  if (!Array.isArray(videos)||videos.length===0) return res.status(400).json({error:"videos[] is required"});
  const list = rd<Video[]>("vids.json",[]);
  const existing = new Set(list.map(v=>v.videoId));
  let added=0;
  const created: Video[]=[];
  for (const it of videos) {
    const vid=String(it?.videoId||"").trim(); const title=String(it?.title||"").trim();
    if (!vid||!title) continue;
    if (existing.has(vid)) continue;
    const v: Video = { id:crypto.randomUUID(), videoId:vid, title, subjectId:subjectId||"", chapterId:chapterId||undefined, desc:String(it?.desc||it?.duration||"").slice(0,800), date:new Date().toLocaleString(), course:course||"", online:!!online };
    created.push(v); existing.add(vid); added++;
  }
  // Prepend in original playlist order so sequential playback works
  const updatedList = [...created, ...list];
  wr("vids.json", updatedList);
  res.json({ ok:true, total:videos.length, added, skipped:videos.length-added, created });
});

/** FETCH + AUTO-IMPORT in one step */
router.post("/admin/playlist/fetch-import", adminAuth, async (req, res) => {
  const { playlist, subjectId, chapterId, course, online } = req.body||{};
  const pid = extractPlaylistId(playlist);
  if (!pid) return res.status(400).json({ error: "Couldn't find a YouTube playlist ID." });
  try {
    const all: Array<{videoId:string;title:string;thumbnail:string;duration:string}> = [];
    let continuation: string|null = null;
    for (let page=0;page<12;page++) {
      const data: any = await fetchYtPlaylistPage(pid, continuation||undefined);
      all.push(...ytExtractVideos(data));
      continuation = ytExtractContinuation(data);
      if (!continuation) break;
    }
    if (all.length===0) return res.status(404).json({ error: "Playlist is empty or not accessible." });
    const list = rd<Video[]>("vids.json",[]);
    const existing = new Set(list.map(v=>v.videoId));
    const created: Video[] = [];
    for (const it of all) {
      if (!it.videoId||existing.has(it.videoId)) continue;
      created.push({ id:crypto.randomUUID(), videoId:it.videoId, title:it.title, subjectId:subjectId||"", chapterId:chapterId||undefined, desc:it.duration||"", date:new Date().toLocaleString(), course:course||"", online:!!online });
      existing.add(it.videoId);
    }
    wr("vids.json", [...created, ...list]);
    res.json({ ok:true, total:all.length, added:created.length, skipped:all.length-created.length });
  } catch(err:any) { res.status(500).json({ error:err?.message||"Import failed" }); }
});

/* ══════════════════════════════════════════════════════════
   ADMIN — QUIZZES
══════════════════════════════════════════════════════════ */
router.get("/admin/quizzes",           adminAuth, (_r, res) => res.json(rd<Quiz[]>("quizzes.json",[])));
router.post("/admin/quizzes",          adminAuth, (req, res) => {
  const {title,desc,timeMinutes,questions}=req.body;
  if(!title) return res.status(400).json({error:"title required"});
  const quizzes=rd<Quiz[]>("quizzes.json",[]);
  const quiz: Quiz={id:crypto.randomUUID(),title,desc:desc||"",timeMinutes:timeMinutes||30,published:false,createdAt:new Date().toISOString(),questions:questions||[]};
  quizzes.unshift(quiz); wr("quizzes.json",quizzes); res.json(quiz);
});
router.put("/admin/quizzes/:id",       adminAuth, (req, res) => {
  const quizzes=rd<Quiz[]>("quizzes.json",[]);
  const i=quizzes.findIndex(q=>q.id===req.params.id);
  if(i===-1) return res.status(404).json({error:"Not found"});
  quizzes[i]={...quizzes[i],...req.body,id:quizzes[i].id};
  wr("quizzes.json",quizzes); res.json(quizzes[i]);
});
router.patch("/admin/quizzes/:id/publish", adminAuth, (req, res) => {
  const quizzes=rd<Quiz[]>("quizzes.json",[]);
  const i=quizzes.findIndex(q=>q.id===req.params.id);
  if(i===-1) return res.status(404).json({error:"Not found"});
  quizzes[i].published=!quizzes[i].published;
  wr("quizzes.json",quizzes); res.json({published:quizzes[i].published});
});
router.delete("/admin/quizzes/:id",    adminAuth, (req, res) => {
  wr("quizzes.json",rd<Quiz[]>("quizzes.json",[]).filter(q=>q.id!==req.params.id)); res.json({ok:true});
});

/* ══════════════════════════════════════════════════════════
   ADMIN — NOTIFICATIONS
══════════════════════════════════════════════════════════ */
router.get("/admin/notifications",     adminAuth, (_r, res) => res.json(rd<Notification[]>("notifs.json",[])));
router.post("/admin/notifications",    adminAuth, (req, res) => {
  const {title,body,recipients}=req.body;
  if(!title||!body) return res.status(400).json({error:"title and body required"});
  let recList: string[]=[];
  if (Array.isArray(recipients)) {
    const users=rd<UniversalUser[]>("users.json",[]);
    const valid=new Set(users.map(u=>u.username));
    recList=recipients.filter(r=>typeof r==="string"&&valid.has(r));
  }
  const notifs=rd<Notification[]>("notifs.json",[]);
  const n: Notification={id:crypto.randomUUID(),title,body,createdAt:new Date().toISOString(),recipients:recList,readBy:[]};
  notifs.unshift(n); wr("notifs.json",notifs); res.json(n);
});
router.delete("/admin/notifications/:id", adminAuth, (req, res) => {
  wr("notifs.json",rd<Notification[]>("notifs.json",[]).filter(n=>n.id!==req.params.id)); res.json({ok:true});
});

/* ── Dashboard menu CRUD ── */
router.get("/admin/dashboard-menu", adminAuth, (_r, res) => res.json(rd<DashMenuItem[]>("dashmenu.json",[]).sort((a,b)=>a.order-b.order)));
router.post("/admin/dashboard-menu", adminAuth, (req, res) => {
  const {label,icon,bg,chevron,path:navPath,order,enabled}=req.body||{};
  if(!label||!icon) return res.status(400).json({error:"label and icon required"});
  const items=rd<DashMenuItem[]>("dashmenu.json",[]);
  const item: DashMenuItem={id:crypto.randomUUID(),label:String(label).trim(),icon:String(icon).trim(),bg:bg||"#f3f4f6",chevron:chevron||"#666",path:navPath||"/",order:typeof order==="number"?order:(items.length+1),enabled:enabled!==false};
  items.push(item); wr("dashmenu.json",items); res.json(item);
});
router.put("/admin/dashboard-menu/:id", adminAuth, (req, res) => {
  const items=rd<DashMenuItem[]>("dashmenu.json",[]);
  const i=items.findIndex(x=>x.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Not found"});
  const b=req.body||{};
  items[i]={...items[i],...(b.label!==undefined?{label:String(b.label).trim()}:{}),...(b.icon!==undefined?{icon:String(b.icon).trim()}:{}),...(b.bg!==undefined?{bg:String(b.bg)}:{}),...(b.chevron!==undefined?{chevron:String(b.chevron)}:{}),...(b.path!==undefined?{path:String(b.path)}:{}),...(typeof b.order==="number"?{order:b.order}:{}),...(typeof b.enabled==="boolean"?{enabled:b.enabled}:{})};
  wr("dashmenu.json",items); res.json(items[i]);
});
router.delete("/admin/dashboard-menu/:id", adminAuth, (req, res) => {
  wr("dashmenu.json",rd<DashMenuItem[]>("dashmenu.json",[]).filter(x=>x.id!==req.params.id)); res.json({ok:true});
});
router.post("/admin/dashboard-menu/reorder", adminAuth, (req, res) => {
  const {ids}=req.body as {ids:string[]};
  if(!Array.isArray(ids)) return res.status(400).json({error:"ids array required"});
  const items=rd<DashMenuItem[]>("dashmenu.json",[]);
  ids.forEach((id,idx)=>{const it=items.find(x=>x.id===id);if(it) it.order=idx+1;});
  wr("dashmenu.json",items); res.json({ok:true});
});

/* ══════════════════════════════════════════════════════════
   DOUBTS / Q&A
══════════════════════════════════════════════════════════ */
interface DoubtReply {
  text?: string;
  audioData?: string;
  imageData?: string;
  pdfData?: string; pdfName?: string;
  links?: string[];
  repliedAt: string;
}
interface DoubtQuestion {
  id: string; ip: string; username?: string; fullName?: string;
  question: string; audioData?: string; imageData?: string;
  pdfData?: string; pdfName?: string;
  links?: string[];
  timestamp: string; status: "open" | "answered";
  subject?: string;
  reply?: DoubtReply;
}
if (!fs.existsSync(path.join(DATA_DIR, "doubts.json"))) wr("doubts.json", []);

router.post("/doubts", userAuth, (req, res) => {
  const ip = clientIp(req);
  const { question, audioData, imageData, fullName, pdfData, pdfName, links, subject } = req.body || {};
  if (!question?.trim() && !audioData) return res.status(400).json({ error: "question or audio required" });
  const username = getLoggedInUser(req)?.username;
  const doubts = rd<DoubtQuestion[]>("doubts.json", []);
  const item: DoubtQuestion = {
    id: crypto.randomUUID(), ip, username,
    fullName: String(fullName || username || "Student").slice(0, 100),
    question: String(question || "").slice(0, 3000),
    audioData: audioData ? String(audioData).slice(0, 8_000_000) : undefined,
    imageData: imageData ? String(imageData).slice(0, 8_000_000) : undefined,
    pdfData:   pdfData   ? String(pdfData).slice(0, 10_000_000) : undefined,
    pdfName:   pdfName   ? String(pdfName).slice(0, 200) : undefined,
    links:     Array.isArray(links) ? (links as string[]).slice(0, 10).map(l => String(l).slice(0, 500)) : undefined,
    subject:   subject   ? String(subject).slice(0, 80) : undefined,
    timestamp: new Date().toISOString(), status: "open",
  };
  doubts.unshift(item);
  wr("doubts.json", doubts.slice(0, 500));
  /* notify admins of new question */
  const notifs0 = rd<Notification[]>("notifs.json", []);
  notifs0.unshift({ id: crypto.randomUUID(), title: "❓ New Student Question", body: `${item.fullName} asked: ${(item.question || "Voice question").slice(0, 90)}`, createdAt: new Date().toISOString(), recipients: ["htr"], readBy: [] });
  wr("notifs.json", notifs0.slice(0, 300));
  res.json({ ok: true, id: item.id });
});

router.get("/doubts/my", userAuth, (req, res) => {
  const username = getLoggedInUser(req)?.username;
  const ip = clientIp(req);
  const doubts = rd<DoubtQuestion[]>("doubts.json", []);
  res.json(doubts.filter(d => d.username === username || d.ip === ip));
});

router.get("/doubts", adminAuth, (_req, res) => {
  res.json(rd<DoubtQuestion[]>("doubts.json", []));
});

router.patch("/doubts/:id/reply", adminAuth, (req, res) => {
  const { text, audioData, imageData, pdfData, pdfName, links } = req.body || {};
  const doubts = rd<DoubtQuestion[]>("doubts.json", []);
  const i = doubts.findIndex(d => d.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: "Not found" });
  doubts[i].reply = {
    text:      text      ? String(text).slice(0, 5000) : undefined,
    audioData: audioData ? String(audioData).slice(0, 8_000_000) : undefined,
    imageData: imageData ? String(imageData).slice(0, 8_000_000) : undefined,
    pdfData:   pdfData   ? String(pdfData).slice(0, 10_000_000) : undefined,
    pdfName:   pdfName   ? String(pdfName).slice(0, 200) : undefined,
    links:     Array.isArray(links) ? (links as string[]).slice(0, 10).map(l => String(l).slice(0, 500)) : undefined,
    repliedAt: new Date().toISOString(),
  };
  doubts[i].status = "answered";
  wr("doubts.json", doubts);
  /* notify the student that their question was answered */
  const studentUser = doubts[i].username;
  if (studentUser) {
    const notifs1 = rd<Notification[]>("notifs.json", []);
    const preview = text ? String(text).slice(0, 90) : "Check the Q&A page for your answer.";
    notifs1.unshift({ id: crypto.randomUUID(), title: "👨‍🏫 Teacher answered your question!", body: preview, createdAt: new Date().toISOString(), recipients: [studentUser], readBy: [] });
    wr("notifs.json", notifs1.slice(0, 300));
  }
  res.json({ ok: true });
});

router.patch("/doubts/:id/reopen", adminAuth, (req, res) => {
  const doubts = rd<DoubtQuestion[]>("doubts.json", []);
  const i = doubts.findIndex(d => d.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: "Not found" });
  doubts[i].status = "open";
  doubts[i].reply = undefined;
  wr("doubts.json", doubts);
  res.json({ ok: true });
});

router.delete("/doubts/:id", adminAuth, (req, res) => {
  wr("doubts.json", rd<DoubtQuestion[]>("doubts.json", []).filter(d => d.id !== req.params.id));
  res.json({ ok: true });
});

/* AI-generated answer for a doubt — admin side */
router.post("/doubts/:id/ai-answer", adminAuth, async (req: any, res) => {
  const doubts = rd<DoubtQuestion[]>("doubts.json", []);
  const d = doubts.find(x => x.id === req.params.id);
  if (!d) return res.status(404).json({ error: "Not found" });
  try {
    const answer = await gemini(
      d.question || "A student asked a voice question about an academic topic.",
      "You are a helpful Bangladeshi academic teacher for SSC/HSC/BCS/Admission students. Answer the student's question clearly and accurately. Write in clear English with Bangla terms where helpful. Give a direct answer with key points. Keep it under 200 words.",
      500
    );
    res.json({ answer });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

/* AI instant answer — student side (no admin required) */
router.post("/doubts/ai-instant", userAuth, async (req: any, res) => {
  const { question } = req.body || {};
  if (!question?.trim()) return res.status(400).json({ error: "question required" });
  try {
    const answer = await gemini(
      String(question).slice(0, 2000),
      "You are a brilliant, friendly Bangladeshi academic tutor for SSC/HSC/BCS/Admission students. Answer the question directly, clearly and helpfully. Include key facts, formulas, or explanations as needed. Write in clear English; use Bangla terms where natural. Be concise but complete — max 200 words.",
      500
    );
    res.json({ answer });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

/* ══════════════════════════════════════════════════════════
   FLASHCARD DECKS + CARDS
══════════════════════════════════════════════════════════ */
interface FlashCard { id:string; deckId:string; front:string; back:string; hint?:string; order:number; }
interface FlashDeck { id:string; name:string; subject:string; description:string; createdAt:string; }
if (!fs.existsSync(path.join(DATA_DIR,"flashdecks.json")))  wr("flashdecks.json",[]);
if (!fs.existsSync(path.join(DATA_DIR,"flashcards.json")))  wr("flashcards.json",[]);

function deckWithCount(deck: FlashDeck, cards: FlashCard[]) {
  return { ...deck, cardCount: cards.filter(c=>c.deckId===deck.id).length };
}

router.get("/flashcard-decks", userAuth, (_req,res) => {
  const decks = rd<FlashDeck[]>("flashdecks.json",[]);
  const cards = rd<FlashCard[]>("flashcards.json",[]);
  res.json(decks.map(d=>deckWithCount(d,cards)));
});
router.get("/flashcard-decks/:id/cards", userAuth, (req,res) => {
  const cards = rd<FlashCard[]>("flashcards.json",[]).filter(c=>c.deckId===req.params.id);
  res.json(cards.sort((a,b)=>a.order-b.order));
});
router.get("/admin/flashcard-decks", adminAuth, (_req,res) => {
  const decks = rd<FlashDeck[]>("flashdecks.json",[]);
  const cards = rd<FlashCard[]>("flashcards.json",[]);
  res.json(decks.map(d=>deckWithCount(d,cards)));
});
router.post("/admin/flashcard-decks", adminAuth, (req,res) => {
  const {name,subject,description}=req.body||{};
  if(!name) return res.status(400).json({error:"name required"});
  const decks=rd<FlashDeck[]>("flashdecks.json",[]);
  const deck:FlashDeck={id:crypto.randomUUID(),name:String(name).trim(),subject:String(subject||"").trim(),description:String(description||"").trim(),createdAt:new Date().toISOString()};
  decks.push(deck); wr("flashdecks.json",decks); res.json(deckWithCount(deck,rd<FlashCard[]>("flashcards.json",[])));
});
router.put("/admin/flashcard-decks/:id", adminAuth, (req,res) => {
  const decks=rd<FlashDeck[]>("flashdecks.json",[]); const i=decks.findIndex(d=>d.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Not found"});
  decks[i]={...decks[i],...req.body,id:decks[i].id}; wr("flashdecks.json",decks);
  res.json(deckWithCount(decks[i],rd<FlashCard[]>("flashcards.json",[])));
});
router.delete("/admin/flashcard-decks/:id", adminAuth, (req,res) => {
  wr("flashdecks.json",rd<FlashDeck[]>("flashdecks.json",[]).filter(d=>d.id!==req.params.id));
  wr("flashcards.json",rd<FlashCard[]>("flashcards.json",[]).filter(c=>c.deckId!==req.params.id));
  res.json({ok:true});
});
router.get("/admin/flashcard-decks/:id/cards", adminAuth, (req,res) => {
  res.json(rd<FlashCard[]>("flashcards.json",[]).filter(c=>c.deckId===req.params.id).sort((a,b)=>a.order-b.order));
});
router.post("/admin/flashcard-decks/:id/cards", adminAuth, (req,res) => {
  const {front,back,hint}=req.body||{};
  if(!front||!back) return res.status(400).json({error:"front and back required"});
  const cards=rd<FlashCard[]>("flashcards.json",[]);
  const deckCards=cards.filter(c=>c.deckId===req.params.id);
  const card:FlashCard={id:crypto.randomUUID(),deckId:req.params.id,front:String(front).trim(),back:String(back).trim(),hint:hint||undefined,order:deckCards.length};
  cards.push(card); wr("flashcards.json",cards); res.json(card);
});
router.put("/admin/flashcard-decks/:deckId/cards/:cardId", adminAuth, (req,res) => {
  const cards=rd<FlashCard[]>("flashcards.json",[]); const i=cards.findIndex(c=>c.id===req.params.cardId);
  if(i<0) return res.status(404).json({error:"Not found"});
  cards[i]={...cards[i],...req.body,id:cards[i].id,deckId:cards[i].deckId}; wr("flashcards.json",cards); res.json(cards[i]);
});
router.delete("/admin/flashcard-decks/:deckId/cards/:cardId", adminAuth, (req,res) => {
  wr("flashcards.json",rd<FlashCard[]>("flashcards.json",[]).filter(c=>c.id!==req.params.cardId)); res.json({ok:true});
});

/* ══════════════════════════════════════════════════════════
   DAILY CHALLENGE — one quiz question per day
══════════════════════════════════════════════════════════ */
router.get("/daily-challenge", userAuth, (_req,res) => {
  const quizzes = rd<Quiz[]>("quizzes.json",[]);
  const allQ: (QuizQuestion & {quizTitle:string})[] = [];
  quizzes.filter(q=>q.published).forEach(q=>q.questions.forEach(qq=>allQ.push({...qq,quizTitle:q.title})));
  if (!allQ.length) return res.json(null);
  const today = new Date().toISOString().slice(0,10).replace(/-/g,"");
  const seed  = parseInt(today) % allQ.length;
  res.json(allQ[seed]);
});

/* ══════════════════════════════════════════════════════════
   SEARCH — fulltext across videos, solve sheets, discussions
══════════════════════════════════════════════════════════ */
router.get("/search", userAuth, (req,res) => {
  const q = String(req.query.q||"").toLowerCase().trim();
  if (!q || q.length < 2) return res.json({ videos:[], sheets:[], discussions:[] });
  const videos   = rd<Video[]>("vids.json",[]).filter(v=>v.title.toLowerCase().includes(q)||v.desc.toLowerCase().includes(q)).slice(0,6);
  const sheets   = rd<SolveSheet[]>("solve-sheets.json",[]).filter(s=>s.title.toLowerCase().includes(q)||s.subject.toLowerCase().includes(q)).slice(0,6);
  const discAll  = rd<DiscussionPost[]>("discussions.json",[]);
  const discussions = discAll.filter(d=>d.title.toLowerCase().includes(q)||d.body.toLowerCase().includes(q)).slice(0,6);
  res.json({ videos, sheets, discussions });
});

/* ══════════════════════════════════════════════════════════
   SOLVE SHEETS
══════════════════════════════════════════════════════════ */
interface SolveSheet {
  id: string; title: string; subject: string;
  exam: string; year: string;
  imageUrls: string[]; pdfUrl?: string;
  createdAt: string;
}
if (!fs.existsSync(path.join(DATA_DIR,"solve-sheets.json"))) wr("solve-sheets.json",[]);
router.get("/solve-sheets", userAuth, (_req,res) => res.json(rd<SolveSheet[]>("solve-sheets.json",[])));
router.get("/admin/solve-sheets", adminAuth, (_req,res) => res.json(rd<SolveSheet[]>("solve-sheets.json",[])));
router.post("/admin/solve-sheets", adminAuth, (req,res) => {
  const {title,subject,exam,year,imageUrls,pdfUrl}=req.body||{};
  if(!title||!subject) return res.status(400).json({error:"title and subject required"});
  const sheets=rd<SolveSheet[]>("solve-sheets.json",[]);
  const item:SolveSheet={id:crypto.randomUUID(),title:String(title).trim(),subject:String(subject).trim(),exam:String(exam||"").trim(),year:String(year||"").trim(),imageUrls:Array.isArray(imageUrls)?imageUrls.filter(Boolean):[],pdfUrl:pdfUrl||undefined,createdAt:new Date().toISOString()};
  sheets.unshift(item); wr("solve-sheets.json",sheets); res.json(item);
});
router.put("/admin/solve-sheets/:id", adminAuth, (req,res) => {
  const sheets=rd<SolveSheet[]>("solve-sheets.json",[]); const i=sheets.findIndex(s=>s.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Not found"});
  const b=req.body||{}; sheets[i]={...sheets[i],...(b.title?{title:String(b.title).trim()}:{}),...(b.subject?{subject:String(b.subject).trim()}:{}),...(b.exam!==undefined?{exam:String(b.exam).trim()}:{}),...(b.year!==undefined?{year:String(b.year).trim()}:{}),...(Array.isArray(b.imageUrls)?{imageUrls:b.imageUrls.filter(Boolean)}:{}),...(b.pdfUrl!==undefined?{pdfUrl:b.pdfUrl||undefined}:{})};
  wr("solve-sheets.json",sheets); res.json(sheets[i]);
});
router.delete("/admin/solve-sheets/:id", adminAuth, (req,res) => {
  wr("solve-sheets.json",rd<SolveSheet[]>("solve-sheets.json",[]).filter(s=>s.id!==req.params.id)); res.json({ok:true});
});

/* ══════════════════════════════════════════════════════════
   LIVE CLASSES
══════════════════════════════════════════════════════════ */
interface LiveClass {
  id: string; title: string; subject: string; teacherName: string;
  youtubeId: string; scheduledAt: string; durationMinutes: number;
  description?: string; createdAt: string;
}
if (!fs.existsSync(path.join(DATA_DIR,"live-classes.json"))) wr("live-classes.json",[]);
router.get("/live-classes", userAuth, (_req,res) => res.json(rd<LiveClass[]>("live-classes.json",[])));
router.get("/admin/live-classes", adminAuth, (_req,res) => res.json(rd<LiveClass[]>("live-classes.json",[])));
router.post("/admin/live-classes", adminAuth, (req,res) => {
  const {title,subject,teacherName,youtubeId,scheduledAt,durationMinutes,description}=req.body||{};
  if(!title||!youtubeId||!scheduledAt) return res.status(400).json({error:"title, youtubeId, scheduledAt required"});
  const classes=rd<LiveClass[]>("live-classes.json",[]);
  const item:LiveClass={id:crypto.randomUUID(),title:String(title).trim(),subject:String(subject||"General").trim(),teacherName:String(teacherName||"").trim(),youtubeId:String(youtubeId).trim(),scheduledAt:String(scheduledAt),durationMinutes:Number(durationMinutes)||60,description:description||undefined,createdAt:new Date().toISOString()};
  classes.push(item); classes.sort((a,b)=>new Date(a.scheduledAt).getTime()-new Date(b.scheduledAt).getTime()); wr("live-classes.json",classes); res.json(item);
});
router.put("/admin/live-classes/:id", adminAuth, (req,res) => {
  const classes=rd<LiveClass[]>("live-classes.json",[]); const i=classes.findIndex(c=>c.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Not found"});
  const b=req.body||{}; classes[i]={...classes[i],...b}; wr("live-classes.json",classes); res.json(classes[i]);
});
router.delete("/admin/live-classes/:id", adminAuth, (req,res) => {
  wr("live-classes.json",rd<LiveClass[]>("live-classes.json",[]).filter(c=>c.id!==req.params.id)); res.json({ok:true});
});

/* ══════════════════════════════════════════════════════════
   ANNOUNCEMENTS
══════════════════════════════════════════════════════════ */
interface Announcement {
  id: string; title: string; body: string;
  type: "info"|"warning"|"success"|"urgent";
  pinned: boolean; createdAt: string; expiresAt?: string;
}
if (!fs.existsSync(path.join(DATA_DIR,"announcements.json"))) wr("announcements.json",[]);
router.get("/announcements", userAuth, (_req,res) => {
  const now=new Date().toISOString();
  res.json(rd<Announcement[]>("announcements.json",[]).filter(a=>!a.expiresAt||a.expiresAt>now));
});
router.get("/admin/announcements", adminAuth, (_req,res) => res.json(rd<Announcement[]>("announcements.json",[])));
router.post("/admin/announcements", adminAuth, (req,res) => {
  const {title,body,type,pinned,expiresAt}=req.body||{};
  if(!title||!body) return res.status(400).json({error:"title and body required"});
  const items=rd<Announcement[]>("announcements.json",[]);
  const item:Announcement={id:crypto.randomUUID(),title:String(title).trim(),body:String(body).trim(),type:(type||"info") as Announcement["type"],pinned:Boolean(pinned),createdAt:new Date().toISOString(),expiresAt:expiresAt||undefined};
  items.unshift(item); wr("announcements.json",items); res.json(item);
});
router.put("/admin/announcements/:id", adminAuth, (req,res) => {
  const items=rd<Announcement[]>("announcements.json",[]); const i=items.findIndex(a=>a.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Not found"});
  items[i]={...items[i],...req.body}; wr("announcements.json",items); res.json(items[i]);
});
router.delete("/admin/announcements/:id", adminAuth, (req,res) => {
  wr("announcements.json",rd<Announcement[]>("announcements.json",[]).filter(a=>a.id!==req.params.id)); res.json({ok:true});
});

/* ══════════════════════════════════════════════════════════
   DISCUSSION BOARD
══════════════════════════════════════════════════════════ */
interface DiscussionReply { id:string; body:string; author:string; ip:string; createdAt:string; isTeacher?:boolean; }
interface DiscussionPost  { id:string; subject:string; title:string; body:string; author:string; ip:string; createdAt:string; pinned?:boolean; replies:DiscussionReply[]; upvotes:string[]; }
if (!fs.existsSync(path.join(DATA_DIR,"discussions.json"))) wr("discussions.json",[]);
router.get("/discussions", userAuth, (_req,res) => res.json(rd<DiscussionPost[]>("discussions.json",[])));
router.post("/discussions", userAuth, (req,res) => {
  const {subject,title,body}=req.body||{}; if(!title||!body) return res.status(400).json({error:"title and body required"});
  const user=getLoggedInUser(req); const ip=clientIp(req);
  const posts=rd<DiscussionPost[]>("discussions.json",[]);
  const post:DiscussionPost={id:crypto.randomUUID(),subject:String(subject||"General").trim(),title:String(title).slice(0,200),body:String(body).slice(0,3000),author:user?.username||"Anonymous",ip,createdAt:new Date().toISOString(),replies:[],upvotes:[]};
  posts.unshift(post); wr("discussions.json",posts.slice(0,500)); res.json(post);
});
router.post("/discussions/:id/reply", userAuth, (req,res) => {
  const {body}=req.body||{}; if(!body) return res.status(400).json({error:"body required"});
  const posts=rd<DiscussionPost[]>("discussions.json",[]); const i=posts.findIndex(p=>p.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Not found"});
  const user=getLoggedInUser(req); const ip=clientIp(req);
  const reply:DiscussionReply={id:crypto.randomUUID(),body:String(body).slice(0,2000),author:user?.username||"Anonymous",ip,createdAt:new Date().toISOString()};
  posts[i].replies.push(reply); wr("discussions.json",posts); res.json(reply);
});
router.patch("/discussions/:id/upvote", userAuth, (req,res) => {
  const posts=rd<DiscussionPost[]>("discussions.json",[]); const i=posts.findIndex(p=>p.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Not found"});
  const ip=clientIp(req);
  if(posts[i].upvotes.includes(ip)) posts[i].upvotes=posts[i].upvotes.filter(x=>x!==ip);
  else posts[i].upvotes.push(ip);
  wr("discussions.json",posts); res.json({upvotes:posts[i].upvotes.length});
});
router.patch("/admin/discussions/:id/pin", adminAuth, (req,res) => {
  const posts=rd<DiscussionPost[]>("discussions.json",[]); const i=posts.findIndex(p=>p.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Not found"});
  posts[i].pinned=!posts[i].pinned; wr("discussions.json",posts); res.json({ok:true});
});
router.delete("/admin/discussions/:id", adminAuth, (req,res) => {
  wr("discussions.json",rd<DiscussionPost[]>("discussions.json",[]).filter(p=>p.id!==req.params.id)); res.json({ok:true});
});
router.get("/admin/discussions", adminAuth, (_req,res) => res.json(rd<DiscussionPost[]>("discussions.json",[])));
router.post("/admin/discussions/:id/reply", adminAuth, (req,res) => {
  const {body}=req.body||{}; if(!body) return res.status(400).json({error:"body required"});
  const posts=rd<DiscussionPost[]>("discussions.json",[]); const i=posts.findIndex(p=>p.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Not found"});
  const reply:DiscussionReply={id:crypto.randomUUID(),body:String(body).slice(0,2000),author:"Teacher",ip:"admin",createdAt:new Date().toISOString(),isTeacher:true};
  posts[i].replies.push(reply); wr("discussions.json",posts); res.json(reply);
});

/* ══════════════════════════════════════════════════════════
   ADMIN — MANUAL DATABASE EDITOR
══════════════════════════════════════════════════════════ */
function safeName(name: string): string|null {
  if (!/^[a-zA-Z0-9_\-]+\.json$/.test(name)) return null;
  return name;
}
router.get("/admin/db/files", adminAuth, (_r, res) => {
  try {
    const files=fs.readdirSync(DATA_DIR).filter(f=>f.endsWith(".json")).map(f=>{const p=path.join(DATA_DIR,f);const st=fs.statSync(p);return{name:f,size:st.size,mtime:st.mtime.toISOString()};}).sort((a,b)=>a.name.localeCompare(b.name));
    res.json(files);
  } catch(err:any){res.status(500).json({error:err.message});}
});
router.get("/admin/db/file/:name", adminAuth, (req, res) => {
  const name=safeName(req.params.name);
  if(!name) return res.status(400).json({error:"Invalid filename"});
  const p=path.join(DATA_DIR,name);
  if(!fs.existsSync(p)) return res.status(404).json({error:"File not found"});
  try{const raw=fs.readFileSync(p,"utf-8");res.type("application/json").send(raw);}
  catch(err:any){res.status(500).json({error:err.message});}
});
router.put("/admin/db/file/:name", adminAuth, (req, res) => {
  const name=safeName(req.params.name);
  if(!name) return res.status(400).json({error:"Invalid filename"});
  const {content}=req.body as{content:string};
  if(typeof content!=="string") return res.status(400).json({error:"content (string) required"});
  let parsed: any;
  try{parsed=JSON.parse(content);}catch(e:any){return res.status(422).json({error:"Invalid JSON: "+e.message});}
  try{
    const p=path.join(DATA_DIR,name);
    if(fs.existsSync(p)){const bakDir=path.join(DATA_DIR,".backups");if(!fs.existsSync(bakDir))fs.mkdirSync(bakDir,{recursive:true});const stamp=new Date().toISOString().replace(/[:.]/g,"-");fs.copyFileSync(p,path.join(bakDir,`${name}.${stamp}.bak`));}
    fs.writeFileSync(p,JSON.stringify(parsed,null,2));
    res.json({ok:true,bytes:fs.statSync(p).size});
  }catch(err:any){res.status(500).json({error:err.message});}
});
router.post("/admin/db/file/:name", adminAuth, (req, res) => {
  const name=safeName(req.params.name);
  if(!name) return res.status(400).json({error:"Invalid filename"});
  const p=path.join(DATA_DIR,name);
  if(fs.existsSync(p)) return res.status(409).json({error:"File already exists"});
  try{const init=req.body?.content??"[]";JSON.parse(init);fs.writeFileSync(p,init);res.json({ok:true});}
  catch(err:any){res.status(422).json({error:"Invalid JSON: "+err.message});}
});
router.delete("/admin/db/file/:name", adminAuth, (req, res) => {
  const name=safeName(req.params.name);
  if(!name) return res.status(400).json({error:"Invalid filename"});
  const p=path.join(DATA_DIR,name);
  if(!fs.existsSync(p)) return res.status(404).json({error:"Not found"});
  try{const bakDir=path.join(DATA_DIR,".backups");if(!fs.existsSync(bakDir))fs.mkdirSync(bakDir,{recursive:true});const stamp=new Date().toISOString().replace(/[:.]/g,"-");fs.renameSync(p,path.join(bakDir,`${name}.${stamp}.deleted`));res.json({ok:true});}
  catch(err:any){res.status(500).json({error:err.message});}
});

/* ══════════════════════════════════════════════════════════
   EXAM DATES
══════════════════════════════════════════════════════════ */
router.get("/exam-dates", (_req, res) => {
  res.json(rd<any[]>("exam-dates.json",[]));
});
router.post("/admin/exam-dates", adminAuth, (req, res) => {
  const b = req.body as any;
  const list = rd<any[]>("exam-dates.json",[]);
  const entry = { id:uid(), title:String(b.title||"").trim(), exam:String(b.exam||"").trim(), date:String(b.date||"").trim(), color:String(b.color||"#dc2626").trim(), createdAt:new Date().toISOString() };
  list.push(entry);
  wr("exam-dates.json", list);
  res.json(entry);
});
router.delete("/admin/exam-dates/:id", adminAuth, (req, res) => {
  const list = rd<any[]>("exam-dates.json",[]);
  wr("exam-dates.json", list.filter(x=>x.id!==req.params.id));
  res.json({ok:true});
});

/* ══════════════════════════════════════════════════════════
   PAST PAPERS
══════════════════════════════════════════════════════════ */
router.get("/past-papers", (_req, res) => {
  res.json(rd<any[]>("past-papers.json",[]));
});
router.post("/admin/past-papers", adminAuth, (req, res) => {
  const b = req.body as any;
  const list = rd<any[]>("past-papers.json",[]);
  const entry = { id:uid(), title:String(b.title||"").trim(), exam:String(b.exam||"").trim(), subject:String(b.subject||"").trim(), year:String(b.year||"").trim(), imageUrls:Array.isArray(b.imageUrls)?b.imageUrls:[], pdfUrl:String(b.pdfUrl||"").trim()||undefined, createdAt:new Date().toISOString() };
  list.unshift(entry);
  wr("past-papers.json", list);
  res.json(entry);
});
router.delete("/admin/past-papers/:id", adminAuth, (req, res) => {
  const list = rd<any[]>("past-papers.json",[]);
  wr("past-papers.json", list.filter(x=>x.id!==req.params.id));
  res.json({ok:true});
});

/* ══════════════════════════════════════════════════════════
   FORMULA LIBRARY
══════════════════════════════════════════════════════════ */
router.get("/formulas", (_req, res) => {
  res.json(rd<any[]>("formulas.json",[]));
});
router.post("/admin/formulas", adminAuth, (req, res) => {
  const b = req.body as any;
  const list = rd<any[]>("formulas.json",[]);
  const entry = { id:uid(), subject:String(b.subject||"").trim(), category:String(b.category||"General").trim(), title:String(b.title||"").trim(), latex:String(b.latex||"").trim(), description:String(b.description||"").trim()||undefined, createdAt:new Date().toISOString() };
  list.push(entry);
  wr("formulas.json", list);
  res.json(entry);
});
router.put("/admin/formulas/:id", adminAuth, (req, res) => {
  const b = req.body as any;
  const list = rd<any[]>("formulas.json",[]);
  const i = list.findIndex(x=>x.id===req.params.id);
  if (i<0) return res.status(404).json({error:"Not found"});
  list[i] = { ...list[i], subject:String(b.subject||list[i].subject), category:String(b.category||list[i].category), title:String(b.title||list[i].title), latex:String(b.latex||list[i].latex), description:String(b.description||""), updatedAt:new Date().toISOString() };
  wr("formulas.json", list);
  res.json(list[i]);
});
router.delete("/admin/formulas/:id", adminAuth, (req, res) => {
  const list = rd<any[]>("formulas.json",[]);
  wr("formulas.json", list.filter(x=>x.id!==req.params.id));
  res.json({ok:true});
});

/* ══════════════════════════════════════════════════════════
   VOCABULARY BUILDER
══════════════════════════════════════════════════════════ */
router.get("/vocabulary", (_req, res) => {
  res.json(rd<any[]>("vocabulary.json",[]));
});
router.post("/admin/vocabulary", adminAuth, (req, res) => {
  const b = req.body as any;
  const list = rd<any[]>("vocabulary.json",[]);
  const entry = { id:uid(), word:String(b.word||"").trim(), meaning:String(b.meaning||"").trim(), bangla:String(b.bangla||"").trim(), example:String(b.example||"").trim(), subject:String(b.subject||"General").trim(), difficulty:String(b.difficulty||"medium"), createdAt:new Date().toISOString() };
  list.push(entry);
  wr("vocabulary.json", list);
  res.json(entry);
});
router.delete("/admin/vocabulary/:id", adminAuth, (req, res) => {
  wr("vocabulary.json", rd<any[]>("vocabulary.json",[]).filter(x=>x.id!==req.params.id));
  res.json({ok:true});
});

/* ══════════════════════════════════════════════════════════
   STUDY LOGS  (server-side analytics)
══════════════════════════════════════════════════════════ */
router.post("/study-log", userAuth, (req: any, res) => {
  const b = req.body as any;
  const username = req.username as string;
  const today = new Date().toISOString().slice(0,10);
  const logs = rd<any[]>("study-logs.json",[]);
  logs.push({ username, date:today, mins:Number(b.mins||0), type:String(b.type||"general"), ts:new Date().toISOString() });
  wr("study-logs.json", logs.slice(-10000));
  res.json({ok:true});
});
router.get("/admin/study-logs", adminAuth, (req, res) => {
  const logs = rd<any[]>("study-logs.json",[]);
  const { username, date } = req.query as any;
  let filtered = logs;
  if (username) filtered = filtered.filter(l=>l.username===username);
  if (date) filtered = filtered.filter(l=>l.date===date);
  res.json(filtered.slice(-500));
});

/* ══════════════════════════════════════════════════════════
   TOPIC VOTE / REQUEST
══════════════════════════════════════════════════════════ */
router.get("/topic-votes", userAuth, (req, res) => {
  res.json(rd<any[]>("topic-votes.json",[]));
});
router.post("/topic-votes", userAuth, (req: any, res) => {
  const b = req.body as any;
  const username = req.username as string;
  const list = rd<any[]>("topic-votes.json",[]);
  const topic = String(b.topic||"").trim().slice(0,200);
  if (!topic) return res.status(400).json({error:"Topic required"});
  const existing = list.find(x=>x.topic.toLowerCase()===topic.toLowerCase());
  if (existing) {
    if (!existing.voters.includes(username)) { existing.votes++; existing.voters.push(username); }
  } else {
    list.unshift({ id:uid(), topic, votes:1, voters:[username], createdAt:new Date().toISOString() });
  }
  wr("topic-votes.json", list);
  res.json({ok:true});
});

/* ══════════════════════════════════════════════════════════
   PLATFORM SETTINGS (site-wide config)
══════════════════════════════════════════════════════════ */
router.get("/platform-settings", (_req, res) => {
  res.json(rd<any>("platform-settings.json",{ siteName:"RedRose Online Care", tagline:"SSC · HSC · Admission · BCS", primaryColor:"#dc2626", enableLeaderboard:true, enableDiscussions:true, maintenanceMode:false }));
});
router.put("/admin/platform-settings", adminAuth, (req, res) => {
  const existing = rd<any>("platform-settings.json",{});
  const updated = { ...existing, ...req.body as any, updatedAt:new Date().toISOString() };
  wr("platform-settings.json", updated);
  res.json(updated);
});

/* ══════════════════════════════════════════════════════════
   SMART QUIZ — adaptive question pool
══════════════════════════════════════════════════════════ */
router.get("/smart-quiz/pool", (req, res) => {
  try {
    const quizzes = rd<any[]>("quizzes.json", []);
    const pool: any[] = [];
    let globalIdx = 0;
    quizzes.filter(q => q.published !== false).forEach((quiz: any) => {
      const questions: any[] = quiz.questions || [];
      questions.forEach((q: any, i: number) => {
        // Assign simulated difficulty: 1=easy, 2=medium, 3=hard based on position
        const diff = i < Math.floor(questions.length * 0.35) ? 1
          : i < Math.floor(questions.length * 0.70) ? 2 : 3;
        pool.push({
          id: q.id || `${quiz.id}-${i}`,
          text: q.text,
          options: q.options || [],
          correct: q.correct,
          solution: q.solution || "",
          quizTitle: quiz.title,
          subject: quiz.subject || quiz.title,
          difficulty: diff,
        });
        globalIdx++;
      });
    });
    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    res.json(pool);
  } catch (e) {
    res.json([]);
  }
});

/* ══════════════════════════════════════════════════════════
   GAMIFICATION
══════════════════════════════════════════════════════════ */
interface GameProfile {
  username:string; displayName:string; xp:number; level:number; streak:number;
  lastStudyDate:string; badges:string[];
  badgeDetails:{key:string;label:string;icon:string}[];
  examHistory:{quizId:string;title:string;score:number;total:number;pct:number;date:string;timeSecs:number}[];
  topicScores:Record<string,{correct:number;total:number}>;
  totalExams:number; totalCorrect:number; totalAnswers:number;
}
function computeLevel(xp:number):number { let l=1; while(l*l*100<=xp)l++; return Math.max(1,l-1); }
const ALL_BADGES=[
  {key:"first_quiz",  label:"First Step",    icon:"🎓", check:(p:GameProfile)=>p.totalExams>=1},
  {key:"quiz_5",      label:"Quiz Veteran",  icon:"🏅", check:(p:GameProfile)=>p.totalExams>=5},
  {key:"quiz_10",     label:"Quiz Master",   icon:"🏆", check:(p:GameProfile)=>p.totalExams>=10},
  {key:"quiz_25",     label:"Champion",      icon:"🥇", check:(p:GameProfile)=>p.totalExams>=25},
  {key:"perfect",     label:"Perfect Score", icon:"💯", check:(p:GameProfile)=>p.examHistory.some(e=>e.pct===100)},
  {key:"streak_3",    label:"3-Day Streak",  icon:"🔥", check:(p:GameProfile)=>p.streak>=3},
  {key:"streak_7",    label:"Week Warrior",  icon:"⚡", check:(p:GameProfile)=>p.streak>=7},
  {key:"streak_30",   label:"Monthly Star",  icon:"🌟", check:(p:GameProfile)=>p.streak>=30},
  {key:"xp_500",      label:"Rising Star",   icon:"⭐", check:(p:GameProfile)=>p.xp>=500},
  {key:"xp_2000",     label:"Scholar",       icon:"📚", check:(p:GameProfile)=>p.xp>=2000},
  {key:"accuracy_80", label:"Sharpshooter",  icon:"🎯", check:(p:GameProfile)=>p.totalAnswers>=20&&p.totalCorrect/p.totalAnswers>=0.8},
  {key:"accuracy_90", label:"Precision Pro", icon:"💎", check:(p:GameProfile)=>p.totalAnswers>=30&&p.totalCorrect/p.totalAnswers>=0.9},
];
function getProfile(username:string):GameProfile {
  return rd<GameProfile>(`game_${username}.json`,{username,displayName:username,xp:0,level:1,streak:0,lastStudyDate:"",badges:[],badgeDetails:[],examHistory:[],topicScores:{},totalExams:0,totalCorrect:0,totalAnswers:0});
}
function saveProfile(p:GameProfile){
  p.level=computeLevel(p.xp);
  const earned=ALL_BADGES.filter(b=>b.check(p));
  p.badges=earned.map(b=>b.key); p.badgeDetails=earned.map(b=>({key:b.key,label:b.label,icon:b.icon}));
  wr(`game_${p.username}.json`,p);
}
router.get("/gamification/me",(req:any,res)=>{
  const username=(req.headers["x-username"] as string)||"";
  if(!username) return res.json({xp:0,level:1,streak:0,displayName:"Guest",badges:[],badgeDetails:[],examHistory:[],topicScores:{},totalExams:0,totalCorrect:0,totalAnswers:0});
  const p=getProfile(username); saveProfile(p); res.json(p);
});
router.post("/gamification/exam-complete",(req:any,res)=>{
  const username=(req.headers["x-username"] as string)||(req.username as string)||"";
  if(!username) return res.json({ok:true,xpEarned:0});
  const {quizId,quizTitle,score,total,timeSecs}=req.body as any;
  const p=getProfile(username);
  const pct=total>0?Math.round((score/total)*100):0;
  p.examHistory.unshift({quizId:String(quizId||""),title:String(quizTitle||"Quiz").slice(0,60),score:Number(score||0),total:Number(total||0),pct,date:new Date().toISOString().slice(0,10),timeSecs:Number(timeSecs||0)});
  p.examHistory=p.examHistory.slice(0,100);
  const xpEarned=50+Math.round(pct*0.5)+(timeSecs>0&&timeSecs<60*Number(total||10)?10:0);
  p.xp+=xpEarned; p.totalExams++; p.totalCorrect+=Number(score||0); p.totalAnswers+=Number(total||0);
  const today=new Date().toISOString().slice(0,10);
  const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
  if(p.lastStudyDate===yesterday) p.streak++; else if(p.lastStudyDate!==today) p.streak=1;
  p.lastStudyDate=today;
  saveProfile(p); res.json({ok:true,xpEarned,newXp:p.xp,level:p.level,streak:p.streak,badgeDetails:p.badgeDetails});
});
router.get("/gamification/leaderboard",(_req,res)=>{
  const users=rd<any[]>("users.json",[]);
  const rows=users.map(u=>{const p=getProfile(u.username);return{username:u.username,displayName:p.displayName||u.username,xp:p.xp,level:p.level,streak:p.streak,badges:p.badges.length,totalExams:p.totalExams};}).sort((a,b)=>b.xp-a.xp).slice(0,50).map((r,i)=>({...r,rank:i+1}));
  res.json(rows);
});
router.patch("/gamification/display-name",(req:any,res)=>{
  const username=(req.headers["x-username"] as string)||"";
  if(!username) return res.status(400).json({error:"No username"});
  const {displayName}=req.body as any;
  if(!displayName?.trim()) return res.status(400).json({error:"Display name required"});
  const p=getProfile(username); p.displayName=String(displayName).trim().slice(0,40);
  saveProfile(p); res.json({ok:true});
});

/* ══════════════════════════════════════════════════════════
   STUDY GOALS
══════════════════════════════════════════════════════════ */
router.get("/study-goals/today",userAuth,(req:any,res)=>{
  const username=req.username as string;
  const goals=rd<any[]>("study-goals.json",[]);
  const today=new Date().toISOString().slice(0,10);
  const goal=goals.find(g=>g.username===username&&g.date===today)||{dailyQuestions:20,answered:0,date:today};
  res.json(goal);
});
router.post("/study-goals/today",userAuth,(req:any,res)=>{
  const username=req.username as string;
  const {dailyQuestions,answered}=req.body as any;
  const goals=rd<any[]>("study-goals.json",[]);
  const today=new Date().toISOString().slice(0,10);
  const i=goals.findIndex(g=>g.username===username&&g.date===today);
  const entry={username,date:today,dailyQuestions:Number(dailyQuestions)||20,answered:Number(answered)||0};
  if(i>=0) goals[i]={...goals[i],...entry}; else goals.push(entry);
  wr("study-goals.json",goals.slice(-20000)); res.json(entry);
});

/* ══════════════════════════════════════════════════════════
   MOTIVATIONAL QUOTES
══════════════════════════════════════════════════════════ */
const DEFAULT_QUOTES=[
  {id:"dq1",text:"সফলতার চাবিকাঠি হলো অধ্যবসায়।",author:"Anonymous",lang:"bn"},
  {id:"dq2",text:"Success is the sum of small efforts, repeated day in and day out.",author:"Robert Collier",lang:"en"},
  {id:"dq3",text:"শিক্ষাই জাতির মেরুদণ্ড।",author:"Bengali Proverb",lang:"bn"},
  {id:"dq4",text:"The secret of getting ahead is getting started.",author:"Mark Twain",lang:"en"},
  {id:"dq5",text:"কঠিন পরিশ্রমের কোনো বিকল্প নেই।",author:"Thomas Edison",lang:"bn"},
  {id:"dq6",text:"Education is the most powerful weapon you can use to change the world.",author:"Nelson Mandela",lang:"en"},
  {id:"dq7",text:"প্রতিটি মিনিট মূল্যবান — আজকের পরিশ্রম, কালকের সাফল্য।",author:"Red Rose 🥀",lang:"bn"},
  {id:"dq8",text:"Believe you can and you're halfway there.",author:"Theodore Roosevelt",lang:"en"},
  {id:"dq9",text:"পরীক্ষায় ভালো করতে চাইলে প্রতিদিন পড়তে হবে।",author:"Red Rose 🥀",lang:"bn"},
  {id:"dq10",text:"Don't watch the clock; do what it does. Keep going.",author:"Sam Levenson",lang:"en"},
];
router.get("/motivational-quote",(_req,res)=>{
  const quotes=rd<any[]>("quotes.json",DEFAULT_QUOTES);
  if(!quotes.length) return res.json(DEFAULT_QUOTES[0]);
  const idx=Math.floor(Date.now()/(1000*60*60*4))%quotes.length;
  res.json(quotes[idx]);
});
router.get("/admin/quotes",adminAuth,(_req,res)=>res.json(rd<any[]>("quotes.json",DEFAULT_QUOTES)));
router.post("/admin/quotes",adminAuth,(req,res)=>{
  const {text,author,lang}=req.body as any;
  if(!text?.trim()) return res.status(400).json({error:"Text required"});
  const quotes=rd<any[]>("quotes.json",DEFAULT_QUOTES);
  const entry={id:uid(),text:String(text).trim(),author:String(author||"Red Rose 🥀").trim(),lang:String(lang||"en"),createdAt:new Date().toISOString()};
  quotes.push(entry); wr("quotes.json",quotes); res.json(entry);
});
router.delete("/admin/quotes/:id",adminAuth,(req,res)=>{
  wr("quotes.json",rd<any[]>("quotes.json",DEFAULT_QUOTES).filter(q=>q.id!==req.params.id)); res.json({ok:true});
});

/* ══════════════════════════════════════════════════════════
   GROUP STUDY ROOMS
══════════════════════════════════════════════════════════ */
interface StudyRoom { id:string; name:string; subject:string; host:string; members:string[]; maxMembers:number; isPrivate:boolean; pin:string|null; timerState:{running:boolean;endAt:number|null;mode:string;duration:number}; createdAt:string; lastActivity:string; }
interface RoomMsg   { id:string; roomId:string; username:string; text:string; type:"chat"|"system"; ts:string; }

function getRooms(): StudyRoom[]  { return rd<StudyRoom[]>("study-rooms.json",[]); }
function saveRooms(r:StudyRoom[]) { wr("study-rooms.json",r); }
function getMsgs(roomId:string):RoomMsg[]  { return rd<RoomMsg[]>(`room-${roomId}-chat.json`,[]); }
function saveMsgs(roomId:string,msgs:RoomMsg[]) { wr(`room-${roomId}-chat.json`,msgs.slice(-200)); }

// Prune stale rooms (no activity > 2h and empty)
function pruneRooms(rooms:StudyRoom[]):StudyRoom[] {
  const cutoff=Date.now()-2*60*60*1000;
  return rooms.filter(r=>r.members.length>0||new Date(r.lastActivity).getTime()>cutoff);
}

router.get("/study-rooms",(_req,res)=>{
  const rooms=pruneRooms(getRooms());
  saveRooms(rooms);
  res.json(rooms.filter(r=>!r.isPrivate).map(r=>({...r,pin:undefined})));
});

router.post("/study-rooms",(req:any,res)=>{
  const username=(req.headers["x-username"] as string)||"guest";
  const {name,subject,maxMembers,isPrivate,pin}=req.body as any;
  if(!name?.trim()) return res.status(400).json({error:"Room name required"});
  const room:StudyRoom={
    id:uid(), name:String(name).trim().slice(0,50), subject:String(subject||"General").trim().slice(0,30),
    host:username, members:[username], maxMembers:Math.min(20,Math.max(2,Number(maxMembers)||8)),
    isPrivate:!!isPrivate, pin:isPrivate&&pin?String(pin).slice(0,8):null,
    timerState:{running:false,endAt:null,mode:"focus",duration:25},
    createdAt:new Date().toISOString(), lastActivity:new Date().toISOString()
  };
  const rooms=pruneRooms(getRooms());
  rooms.push(room);
  saveRooms(rooms);
  saveMsgs(room.id,[{id:uid(),roomId:room.id,username:"system",text:`${username} created the room. Welcome! 🎓`,type:"system",ts:new Date().toISOString()}]);
  res.json(room);
});

router.get("/study-rooms/:id",(req:any,res)=>{
  const rooms=getRooms();
  const room=rooms.find(r=>r.id===req.params.id) as any;
  if(!room) return res.status(404).json({error:"Room not found"});
  // compute who is online (heartbeat within 20s)
  const onlineAt=room.onlineAt||{};
  const now=Date.now();
  const onlineMembers=Object.entries(onlineAt).filter(([,t])=>now-(t as number)<20000).map(([u])=>u);
  const {pin:_,...safe}=room;
  res.json({...safe,onlineMembers});
});

router.post("/study-rooms/:id/join",(req:any,res)=>{
  const username=(req.headers["x-username"] as string)||"guest";
  const {pin}=req.body as any;
  const rooms=getRooms();
  const i=rooms.findIndex(r=>r.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Room not found"});
  const room=rooms[i];
  if(room.isPrivate&&room.pin&&room.pin!==String(pin||"")) return res.status(403).json({error:"Wrong PIN"});
  if(room.members.length>=room.maxMembers&&!room.members.includes(username)) return res.status(400).json({error:"Room is full"});
  if(!room.members.includes(username)){
    room.members.push(username);
    saveMsgs(room.id,[...getMsgs(room.id),{id:uid(),roomId:room.id,username:"system",text:`${username} joined the room 👋`,type:"system",ts:new Date().toISOString()}]);
  }
  room.lastActivity=new Date().toISOString();
  rooms[i]=room; saveRooms(rooms);
  res.json(room);
});

router.post("/study-rooms/:id/leave",(req:any,res)=>{
  const username=(req.headers["x-username"] as string)||"guest";
  const rooms=getRooms();
  const i=rooms.findIndex(r=>r.id===req.params.id);
  if(i<0) return res.json({ok:true});
  const room=rooms[i];
  room.members=room.members.filter(m=>m!==username);
  saveMsgs(room.id,[...getMsgs(room.id),{id:uid(),roomId:room.id,username:"system",text:`${username} left the room`,type:"system",ts:new Date().toISOString()}]);
  if(room.members.length===0) rooms.splice(i,1);
  else { if(room.host===username&&room.members.length>0) room.host=room.members[0]; rooms[i]=room; }
  saveRooms(rooms); res.json({ok:true});
});

router.get("/study-rooms/:id/messages",(req:any,res)=>{
  const since=String(req.query.since||"");
  const msgs=getMsgs(req.params.id);
  const filtered=since?msgs.filter(m=>m.ts>since):msgs.slice(-60);
  res.json(filtered);
});

router.post("/study-rooms/:id/messages",(req:any,res)=>{
  const username=(req.headers["x-username"] as string)||"guest";
  const {text}=req.body as any;
  if(!text?.trim()) return res.status(400).json({error:"Empty message"});
  const rooms=getRooms();
  const room=rooms.find(r=>r.id===req.params.id);
  if(!room) return res.status(404).json({error:"Room not found"});
  const msg:RoomMsg={id:uid(),roomId:req.params.id,username,text:String(text).trim().slice(0,300),type:"chat",ts:new Date().toISOString()};
  const msgs=getMsgs(req.params.id);
  msgs.push(msg);
  saveMsgs(req.params.id,msgs);
  const i=rooms.findIndex(r=>r.id===req.params.id);
  if(i>=0){rooms[i].lastActivity=new Date().toISOString();saveRooms(rooms);}
  res.json(msg);
});

router.post("/study-rooms/:id/heartbeat",(req:any,res)=>{
  const username=(req.headers["x-username"] as string)||"guest";
  const rooms=getRooms();
  const i=rooms.findIndex(r=>r.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Room not found"});
  const room=rooms[i] as any;
  if(!room.onlineAt) room.onlineAt={};
  room.onlineAt[username]=Date.now();
  // auto-add member if they're sending heartbeat and not in room
  if(!room.members.includes(username)&&room.members.length<room.maxMembers){
    room.members.push(username);
  }
  room.lastActivity=new Date().toISOString();
  rooms[i]=room; saveRooms(rooms);
  res.json({ok:true});
});

router.put("/study-rooms/:id/timer",(req:any,res)=>{
  const username=(req.headers["x-username"] as string)||"guest";
  const {running,mode,duration}=req.body as any;
  const rooms=getRooms();
  const i=rooms.findIndex(r=>r.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Room not found"});
  const room=rooms[i];
  if(room.host!==username) return res.status(403).json({error:"Only host can control timer"});
  room.timerState={
    running:!!running,
    endAt:running?Date.now()+Number(duration||25)*60*1000:null,
    mode:String(mode||"focus"),
    duration:Number(duration||25)
  };
  room.lastActivity=new Date().toISOString();
  rooms[i]=room; saveRooms(rooms);
  const action=running?"started":"stopped";
  saveMsgs(room.id,[...getMsgs(room.id),{id:uid(),roomId:room.id,username:"system",text:`${username} ${action} the ${mode||"focus"} timer ⏱`,type:"system",ts:new Date().toISOString()}]);
  res.json(room.timerState);
});

/* ══════════════════════════════════════════════════════════
   MOD / COMMUNITY ROLES SYSTEM
══════════════════════════════════════════════════════════ */
const MOD_SESSIONS = new Map<string,string>(); // token → username

interface ModUser { id:string; username:string; password:string; role:string; createdAt:string; }

function getMods():ModUser[]{return rd<ModUser[]>("mods.json",[]);}
function saveMods(m:ModUser[]){wr("mods.json",m);}
function getRoles():Record<string,string>{return rd<Record<string,string>>("community-roles.json",{"htr":"owner"});}
function saveRoles(r:Record<string,string>){wr("community-roles.json",r);}
function getPins():string[]{return rd<string[]>("community-pins.json",[]);}
function savePins(p:string[]){wr("community-pins.json",p);}
function getAnnounces():string[]{return rd<string[]>("community-announces.json",[]);}
function saveAnnounces(a:string[]){wr("community-announces.json",a);}
function getReports():any[]{return rd<any[]>("community-reports.json",[]);}
function saveReports(r:any[]){wr("community-reports.json",r);}

function modAuth(req:any,res:any,next:any){
  const token=req.headers["x-mod-token"] as string;
  if(!token||!MOD_SESSIONS.has(token)) return res.status(401).json({error:"Mod auth required"});
  (req as any).modUsername=MOD_SESSIONS.get(token);
  next();
}
function modOrAdminAuth(req:any,res:any,next:any){
  const modToken=req.headers["x-mod-token"] as string;
  const adminToken=req.headers["authorization"]?.replace("Bearer ","") || req.headers["x-admin-token"];
  if(modToken&&MOD_SESSIONS.has(modToken)){(req as any).modUsername=MOD_SESSIONS.get(modToken);return next();}
  if(adminToken&&ADMIN_SESSIONS.has(adminToken)){(req as any).modUsername="htr";return next();}
  res.status(401).json({error:"Mod or admin auth required"});
}

router.post("/mod/login",(req:any,res)=>{
  const{username,password}=req.body||{};
  // Allow admin to log in as mod too
  if(username===ADMIN_USER&&password===ADMIN_PASS){
    const tok=crypto.randomUUID();MOD_SESSIONS.set(tok,username);return res.json({token:tok,role:"admin",username});
  }
  const mods=getMods();
  const mod=mods.find(m=>m.username===username&&m.password===password);
  if(!mod) return res.status(401).json({error:"Invalid credentials"});
  const tok=crypto.randomUUID();
  MOD_SESSIONS.set(tok,username);
  res.json({token:tok,role:mod.role,username});
});

router.post("/mod/logout",modAuth,(req:any,res)=>{
  const tok=req.headers["x-mod-token"] as string;
  MOD_SESSIONS.delete(tok); res.json({ok:true});
});

router.get("/community/roles",(_req,res)=>{
  res.json(getRoles());
});

router.post("/community/roles/assign",modOrAdminAuth,(req:any,res)=>{
  const{username,role}=req.body||{};
  if(!username) return res.status(400).json({error:"username required"});
  const validRoles=["owner","admin","moderator","teacher","scholar","champion","elite","contributor","verified","active","veteran","newcomer",""];
  if(!validRoles.includes(role||"")) return res.status(400).json({error:"Invalid role"});
  // Only admin can assign admin/owner roles
  if((role==="owner"||role==="admin")&&req.modUsername!=="htr") return res.status(403).json({error:"Only owner can assign this role"});
  const roles=getRoles();
  if(!role||role==="") delete roles[username];
  else roles[username]=role;
  saveRoles(roles); res.json(roles);
});

router.post("/community/posts/:id/pin",modOrAdminAuth,(req:any,res)=>{
  const pins=getPins();
  const i=pins.indexOf(req.params.id);
  if(i>=0) pins.splice(i,1);
  else pins.unshift(req.params.id);
  savePins(pins); res.json({pinned:i<0,pins});
});

router.post("/community/posts/:id/announce",modOrAdminAuth,(req:any,res)=>{
  const arr=getAnnounces();
  const i=arr.indexOf(req.params.id);
  if(i>=0) arr.splice(i,1);
  else arr.unshift(req.params.id);
  saveAnnounces(arr); res.json({announced:i<0});
});

router.post("/community/posts/:id/report",userAuth,(req:any,res)=>{
  const u=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const{reason}=req.body||{};
  const reports=getReports();
  reports.unshift({id:crypto.randomUUID(),postId:req.params.id,reporter:u,reason:String(reason||"No reason"),createdAt:new Date().toISOString(),resolved:false});
  saveReports(reports.slice(0,500)); res.json({ok:true});
});

router.get("/mod/reports",modOrAdminAuth,(_req,res)=>res.json(getReports()));
router.patch("/mod/reports/:id/resolve",modOrAdminAuth,(req:any,res)=>{
  const reports=getReports();
  const i=reports.findIndex((r:any)=>r.id===req.params.id);
  if(i>=0){reports[i].resolved=true;saveReports(reports);}
  res.json({ok:true});
});

router.get("/community/pins",(_req,res)=>res.json({pins:getPins(),announces:getAnnounces()}));

router.get("/mod/users",modOrAdminAuth,(_req,res)=>{
  const users=rd<any[]>("users.json",[]);
  const roles=getRoles();
  const warns=rd<Record<string,number>>("community-warns.json",{});
  const bans=rd<string[]>("community-bans.json",[]);
  res.json(users.map((u:any)=>({username:u.username||u.name,role:roles[u.username||u.name]||"",warned:(warns[u.username||u.name]||0)>0,banned:bans.includes(u.username||u.name)})));
});

router.post("/mod/users/:username/warn",modOrAdminAuth,(req:any,res)=>{
  const warns=rd<Record<string,number>>("community-warns.json",{});
  warns[req.params.username]=(warns[req.params.username]||0)+1;
  wr("community-warns.json",warns);
  // Send notification
  const notifs=rd<Notification[]>("notifs.json",[]);
  notifs.unshift({id:crypto.randomUUID(),title:"⚠️ Community Warning",body:`You have received a community warning from a moderator. Repeated violations may result in a ban.`,createdAt:new Date().toISOString(),recipients:[req.params.username],readBy:[]});
  wr("notifs.json",notifs.slice(0,300));
  res.json({ok:true,warns:warns[req.params.username]});
});

router.post("/mod/users/:username/ban",modOrAdminAuth,(req:any,res)=>{
  const bans=rd<string[]>("community-bans.json",[]);
  if(!bans.includes(req.params.username)) bans.push(req.params.username);
  wr("community-bans.json",bans);
  const notifs=rd<Notification[]>("notifs.json",[]);
  notifs.unshift({id:crypto.randomUUID(),title:"🚫 Community Ban",body:`You have been banned from the Red Rose 🥀 Community by a moderator.`,createdAt:new Date().toISOString(),recipients:[req.params.username],readBy:[]});
  wr("notifs.json",notifs.slice(0,300));
  res.json({ok:true});
});

router.post("/mod/users/:username/unban",modOrAdminAuth,(req:any,res)=>{
  const bans=rd<string[]>("community-bans.json",[]);
  const i=bans.indexOf(req.params.username);
  if(i>=0) bans.splice(i,1);
  wr("community-bans.json",bans);
  res.json({ok:true});
});

router.post("/mod/announce",modOrAdminAuth,(req:any,res)=>{
  const{text}=req.body||{};
  if(!text?.trim()) return res.status(400).json({error:"text required"});
  const u=req.modUsername||"moderator";
  const post:any={id:crypto.randomUUID(),author:u,text:String(text).slice(0,2000),subject:"Announcement",
    createdAt:new Date().toISOString(),reactions:{},comments:[],pinned:true,announced:true};
  const posts=getPosts();posts.unshift(post);savePosts(posts.slice(0,1000));
  const announces=getAnnounces();announces.unshift(post.id);saveAnnounces(announces);
  const pins=getPins();pins.unshift(post.id);savePins(pins);
  // Broadcast notification
  const notifs=rd<Notification[]>("notifs.json",[]);
  notifs.unshift({id:crypto.randomUUID(),title:"📢 Community Announcement",body:String(text).slice(0,120),createdAt:new Date().toISOString(),readBy:[]});
  wr("notifs.json",notifs.slice(0,300));
  res.json(post);
});

// Mod management (admin only)
router.get("/admin/mods",adminAuth,(_req,res)=>res.json(getMods()));
router.post("/admin/mods",adminAuth,(req:any,res)=>{
  const{username,password,role}=req.body||{};
  if(!username||!password) return res.status(400).json({error:"username and password required"});
  const mods=getMods();
  if(mods.find(m=>m.username===username)) return res.status(409).json({error:"Username already exists"});
  const mod:ModUser={id:crypto.randomUUID(),username:String(username).trim(),password:String(password),role:role||"moderator",createdAt:new Date().toISOString()};
  mods.push(mod);saveMods(mods);
  // Auto-assign role in community
  const roles=getRoles();roles[mod.username]=mod.role;saveRoles(roles);
  res.json(mod);
});
router.delete("/admin/mods/:id",adminAuth,(req:any,res)=>{
  const mods=getMods();
  const i=mods.findIndex(m=>m.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Not found"});
  const{username,role}=mods[i];mods.splice(i,1);saveMods(mods);
  // Remove role if it was mod role
  const roles=getRoles();if(roles[username]===role){delete roles[username];saveRoles(roles);}
  res.json({ok:true});
});
router.patch("/admin/mods/:id",adminAuth,(req:any,res)=>{
  const mods=getMods();
  const i=mods.findIndex(m=>m.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Not found"});
  const{password,role}=req.body||{};
  if(password) mods[i].password=String(password);
  if(role) {mods[i].role=String(role); const roles=getRoles();roles[mods[i].username]=String(role);saveRoles(roles);}
  saveMods(mods); res.json(mods[i]);
});

/* ══════════════════════════════════════════════════════════
   COMMUNITY — POSTS, REACTIONS, COMMENTS, STORIES
══════════════════════════════════════════════════════════ */
interface CPost {
  id:string; author:string; text:string;
  imageData?:string; videoUrl?:string; subject?:string;
  createdAt:string;
  reactions:Record<string,string[]>;
  comments:{id:string;author:string;text:string;createdAt:string;reactions:Record<string,string[]>}[];
}
interface CStory {
  id:string; author:string; text?:string; imageData?:string;
  bgColor:string; createdAt:string; expiresAt:string; views:string[];
}

const STORY_COLORS=["linear-gradient(135deg,#7c3aed,#a855f7)","linear-gradient(135deg,#0ea5e9,#38bdf8)","linear-gradient(135deg,#f59e0b,#fbbf24)","linear-gradient(135deg,#ef4444,#f97316)","linear-gradient(135deg,#10b981,#34d399)","linear-gradient(135deg,#6366f1,#818cf8)","linear-gradient(135deg,#ec4899,#f43f5e)"];

function getPosts():CPost[]{return rd<CPost[]>("community-posts.json",[]);}
function savePosts(p:CPost[]){wr("community-posts.json",p);}
function getStories():CStory[]{
  const all=rd<CStory[]>("community-stories.json",[]);
  return all.filter(s=>new Date(s.expiresAt)>new Date());
}
function saveStories(s:CStory[]){wr("community-stories.json",s);}

router.get("/community/feed",(req:any,res)=>{
  const page=Number((req.query as any).page)||0;
  const all=getPosts();
  res.json(all.slice(page*20,(page+1)*20));
});

router.post("/community/posts",userAuth,(req:any,res)=>{
  const u=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const{text,imageData,videoUrl,subject}=req.body||{};
  if(!text?.trim()&&!imageData&&!videoUrl) return res.status(400).json({error:"Content required"});
  const post:CPost={
    id:crypto.randomUUID(),author:u,
    text:String(text||"").slice(0,2000),
    imageData:imageData?String(imageData).slice(0,8_000_000):undefined,
    videoUrl:videoUrl?String(videoUrl).slice(0,500):undefined,
    subject:subject?String(subject).slice(0,60):undefined,
    createdAt:new Date().toISOString(),
    reactions:{},comments:[]
  };
  const posts=getPosts();
  posts.unshift(post);
  savePosts(posts.slice(0,1000));
  res.json(post);
});

router.post("/community/posts/:id/react",userAuth,(req:any,res)=>{
  const u=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const{emoji}=req.body||{};
  if(!emoji) return res.status(400).json({error:"emoji required"});
  const posts=getPosts();
  const i=posts.findIndex(p=>p.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Not found"});
  const p=posts[i];
  if(!p.reactions[emoji]) p.reactions[emoji]=[];
  const idx=p.reactions[emoji].indexOf(u);
  if(idx>=0) p.reactions[emoji].splice(idx,1);
  else{
    // remove user from any other emoji first
    Object.keys(p.reactions).forEach(e=>{const j=p.reactions[e].indexOf(u);if(j>=0)p.reactions[e].splice(j,1);});
    p.reactions[emoji].push(u);
  }
  posts[i]=p; savePosts(posts);
  res.json(p.reactions);
});

router.post("/community/posts/:id/comments",userAuth,(req:any,res)=>{
  const u=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const{text}=req.body||{};
  if(!text?.trim()) return res.status(400).json({error:"text required"});
  const posts=getPosts();
  const i=posts.findIndex(p=>p.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Not found"});
  const comment={id:crypto.randomUUID(),author:u,text:String(text).slice(0,1000),createdAt:new Date().toISOString(),reactions:{}};
  posts[i].comments.push(comment);
  savePosts(posts);
  res.json(comment);
});

router.delete("/community/posts/:id",userAuth,(req:any,res)=>{
  const u=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const posts=getPosts();
  const i=posts.findIndex(p=>p.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Not found"});
  if(posts[i].author!==u&&u!=="htr") return res.status(403).json({error:"Forbidden"});
  posts.splice(i,1); savePosts(posts);
  res.json({ok:true});
});

router.get("/community/stories",userAuth,(req:any,res)=>res.json(getStories()));

router.post("/community/stories",userAuth,(req:any,res)=>{
  const u=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const{text,imageData,bgColor}=req.body||{};
  if(!text?.trim()&&!imageData) return res.status(400).json({error:"text or image required"});
  const now=new Date();
  const story:CStory={
    id:crypto.randomUUID(),author:u,
    text:text?String(text).slice(0,200):undefined,
    imageData:imageData?String(imageData).slice(0,8_000_000):undefined,
    bgColor:STORY_COLORS[Math.floor(Math.random()*STORY_COLORS.length)],
    ...(bgColor?{bgColor:String(bgColor)}:{}),
    createdAt:now.toISOString(),
    expiresAt:new Date(now.getTime()+24*60*60*1000).toISOString(),
    views:[]
  };
  const stories=getStories();
  stories.unshift(story);
  saveStories(stories);
  res.json(story);
});

router.post("/community/stories/:id/view",userAuth,(req:any,res)=>{
  const u=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const stories=getStories();
  const i=stories.findIndex(s=>s.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Not found"});
  if(!stories[i].views.includes(u)) stories[i].views.push(u);
  saveStories(stories); res.json({ok:true});
});

/* ══════════════════════════════════════════════════════════
   DIRECT MESSAGES
══════════════════════════════════════════════════════════ */
interface DMThread{id:string;participants:string[];lastMsg?:string;lastAt?:string;updatedAt:string;}
interface DMMessage{id:string;threadId:string;author:string;text?:string;audioData?:string;imageData?:string;ts:string;}

function getThreads():DMThread[]{return rd<DMThread[]>("dm-threads.json",[]);}
function saveThreads(t:DMThread[]){wr("dm-threads.json",t);}
function getDMMessages(threadId:string):DMMessage[]{return rd<DMMessage[]>(`dm-${threadId}.json`,[]);}
function saveDMMessages(threadId:string,msgs:DMMessage[]){wr(`dm-${threadId}.json`,msgs.slice(-500));}

router.get("/dm/threads",userAuth,(req:any,res)=>{
  const u=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  res.json(getThreads().filter(t=>t.participants.includes(u)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));
});

router.post("/dm/threads",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const{other}=req.body||{};
  if(!other||other===me) return res.status(400).json({error:"other username required"});
  const threads=getThreads();
  let thread=threads.find(t=>t.participants.length===2&&t.participants.includes(me)&&t.participants.includes(String(other)));
  if(!thread){
    thread={id:crypto.randomUUID(),participants:[me,String(other)],updatedAt:new Date().toISOString()};
    threads.push(thread); saveThreads(threads);
  }
  res.json(thread);
});

router.get("/dm/threads/:id/messages",userAuth,(req:any,res)=>{
  const u=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const threads=getThreads();
  const t=threads.find(x=>x.id===req.params.id);
  if(!t||!t.participants.includes(u)) return res.status(403).json({error:"Forbidden"});
  const since=(req.query as any).since;
  const msgs=getDMMessages(req.params.id);
  res.json(since?msgs.filter(m=>m.ts>since):msgs);
});

router.post("/dm/threads/:id/messages",userAuth,(req:any,res)=>{
  const u=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const threads=getThreads();
  const ti=threads.findIndex(x=>x.id===req.params.id);
  if(ti<0||!threads[ti].participants.includes(u)) return res.status(403).json({error:"Forbidden"});
  const{text,audioData,imageData}=req.body||{};
  if(!text?.trim()&&!audioData&&!imageData) return res.status(400).json({error:"content required"});
  const msg:DMMessage={id:crypto.randomUUID(),threadId:req.params.id,author:u,
    text:text?String(text).slice(0,2000):undefined,
    audioData:audioData?String(audioData).slice(0,8_000_000):undefined,
    imageData:imageData?String(imageData).slice(0,8_000_000):undefined,
    ts:new Date().toISOString()};
  const msgs=getDMMessages(req.params.id);
  msgs.push(msg);
  saveDMMessages(req.params.id,msgs);
  threads[ti].lastMsg=text?String(text).slice(0,80):(audioData?"🎤 Voice message":"📷 Photo");
  threads[ti].lastAt=msg.ts;
  threads[ti].updatedAt=msg.ts;
  saveThreads(threads);
  // notify recipient
  const other=threads[ti].participants.find(p=>p!==u);
  if(other){
    const notifs=rd<Notification[]>("notifs.json",[]);
    notifs.unshift({id:crypto.randomUUID(),title:`💬 ${u} sent you a message`,body:threads[ti].lastMsg||"",createdAt:msg.ts,recipients:[other],readBy:[]});
    wr("notifs.json",notifs.slice(0,300));
  }
  res.json(msg);
});

router.get("/dm/users",userAuth,(req:any,res)=>{
  // return list of known usernames (for starting new DM)
  const users=rd<any[]>("users.json",[]);
  res.json(users.map(u=>({username:u.username||u.name,ip:undefined})));
});

/* ══════════════════════════════════════════════════════════
   WEBRTC SIGNALING — 1:1 CALLS
══════════════════════════════════════════════════════════ */
interface CallSignal{
  id:string; caller:string; callee:string;
  type:"audio"|"video";
  offer?:any; answer?:any;
  callerCandidates:any[]; calleeCandidates:any[];
  status:"pending"|"ringing"|"active"|"ended"|"rejected";
  createdAt:string;
}
function getCalls():CallSignal[]{
  const calls=rd<CallSignal[]>("calls.json",[]);
  const cutoff=Date.now()-120_000; // 2 min expiry
  return calls.filter(c=>new Date(c.createdAt).getTime()>cutoff&&c.status!=="ended");
}
function saveCalls(c:CallSignal[]){wr("calls.json",c);}

router.post("/calls",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const{callee,type,offer}=req.body||{};
  if(!callee||!offer) return res.status(400).json({error:"callee and offer required"});
  // end any existing active call for this caller
  const calls=getCalls().filter(c=>!(c.caller===me&&c.status!=="ended"));
  const call:CallSignal={id:crypto.randomUUID(),caller:me,callee:String(callee),type:type==="audio"?"audio":"video",
    offer,answer:undefined,callerCandidates:[],calleeCandidates:[],status:"ringing",createdAt:new Date().toISOString()};
  calls.push(call); saveCalls(calls);
  res.json({id:call.id});
});

router.get("/calls/incoming",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const call=getCalls().find(c=>c.callee===me&&c.status==="ringing");
  res.json(call||null);
});

router.get("/calls/:id",userAuth,(req:any,res)=>{
  const call=getCalls().find(c=>c.id===req.params.id);
  res.json(call||null);
});

router.patch("/calls/:id/answer",userAuth,(req:any,res)=>{
  const calls=getCalls();
  const i=calls.findIndex(c=>c.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Not found"});
  calls[i].answer=req.body.answer;
  calls[i].status="active";
  saveCalls(calls); res.json({ok:true});
});

router.patch("/calls/:id/reject",userAuth,(req:any,res)=>{
  const calls=getCalls();
  const i=calls.findIndex(c=>c.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Not found"});
  calls[i].status="rejected"; saveCalls(calls); res.json({ok:true});
});

router.post("/calls/:id/candidate",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const calls=getCalls();
  const i=calls.findIndex(c=>c.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Not found"});
  const{candidate}=req.body||{};
  if(calls[i].caller===me) calls[i].callerCandidates.push(candidate);
  else calls[i].calleeCandidates.push(candidate);
  saveCalls(calls); res.json({ok:true});
});

router.delete("/calls/:id",userAuth,(req:any,res)=>{
  const calls=getCalls();
  const i=calls.findIndex(c=>c.id===req.params.id);
  if(i>=0){calls[i].status="ended"; saveCalls(calls);}
  res.json({ok:true});
});

/* ══════════════════════════════════════════════════════════
   ONLINE STATUS & TYPING INDICATORS
══════════════════════════════════════════════════════════ */
router.post("/online",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const online=rd<Record<string,number>>("online.json",{});
  online[me]=Date.now(); wr("online.json",online);
  res.json({ok:true});
});
router.get("/online",(_req,res)=>{
  const online=rd<Record<string,number>>("online.json",{});
  const now=Date.now(); const result:Record<string,number>={};
  for(const[u,ts] of Object.entries(online)){if(now-ts<120000)result[u]=ts;}
  res.json(result);
});
router.post("/dm/typing",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const{context}=req.body||{};
  if(!context)return res.status(400).json({error:"context required"});
  const typing=rd<Record<string,Record<string,number>>>("typing.json",{});
  if(!typing[context])typing[context]={};
  typing[context][me]=Date.now(); wr("typing.json",typing);
  res.json({ok:true});
});
router.delete("/dm/typing",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const{context}=req.body||{};
  if(!context)return res.status(400).json({error:"context required"});
  const typing=rd<Record<string,Record<string,number>>>("typing.json",{});
  if(typing[context])delete typing[context][me];
  wr("typing.json",typing); res.json({ok:true});
});
router.get("/dm/typing/:context",(_req:any,res)=>{
  const typing=rd<Record<string,Record<string,number>>>("typing.json",{});
  const ctx=typing[_req.params.context]||{};
  const now=Date.now();
  const active=Object.entries(ctx).filter(([,ts])=>now-(ts as number)<4000).map(([u])=>u);
  res.json(active);
});

/* ══════════════════════════════════════════════════════════
   ENHANCED DM (reactions, delete, read receipts, polls)
══════════════════════════════════════════════════════════ */
router.post("/dm/threads/:id/messages/:msgId/react",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const{emoji}=req.body||{};
  const t=getThreads().find(x=>x.id===req.params.id);
  if(!t||!t.participants.includes(me))return res.status(403).json({error:"Forbidden"});
  const msgs=getDMMessages(req.params.id) as any[];
  const i=msgs.findIndex(m=>m.id===req.params.msgId);
  if(i<0)return res.status(404).json({error:"Not found"});
  if(!msgs[i].reactions)msgs[i].reactions={};
  if(!msgs[i].reactions[emoji])msgs[i].reactions[emoji]=[];
  const idx=msgs[i].reactions[emoji].indexOf(me);
  if(idx>=0)msgs[i].reactions[emoji].splice(idx,1);
  else msgs[i].reactions[emoji].push(me);
  saveDMMessages(req.params.id,msgs); res.json(msgs[i].reactions);
});
router.delete("/dm/threads/:id/messages/:msgId",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const{forAll}=req.body||{};
  const t=getThreads().find(x=>x.id===req.params.id);
  if(!t||!t.participants.includes(me))return res.status(403).json({error:"Forbidden"});
  const msgs=getDMMessages(req.params.id) as any[];
  const i=msgs.findIndex(m=>m.id===req.params.msgId);
  if(i<0)return res.status(404).json({error:"Not found"});
  if(forAll&&msgs[i].author===me){msgs[i].text="🚫 This message was deleted";delete msgs[i].imageData;delete msgs[i].audioData;delete msgs[i].fileData;msgs[i].deleted=true;}
  else{if(!msgs[i].deletedFor)msgs[i].deletedFor=[];msgs[i].deletedFor.push(me);}
  saveDMMessages(req.params.id,msgs); res.json({ok:true});
});
router.post("/dm/threads/:id/read",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const t=getThreads().find(x=>x.id===req.params.id);
  if(!t||!t.participants.includes(me))return res.status(403).json({error:"Forbidden"});
  const msgs=getDMMessages(req.params.id) as any[];
  msgs.forEach(m=>{if(!m.readBy)m.readBy=[];if(!m.readBy.includes(me))m.readBy.push(me);});
  saveDMMessages(req.params.id,msgs); res.json({ok:true});
});
router.post("/dm/threads/:id/messages/:msgId/vote",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const{optionIndex}=req.body||{};
  const msgs=getDMMessages(req.params.id) as any[];
  const i=msgs.findIndex(m=>m.id===req.params.msgId);
  if(i<0||!msgs[i].poll)return res.status(404).json({error:"Not found"});
  const poll=msgs[i].poll;
  if(!poll.allowMultiple)poll.options.forEach((o:any)=>{o.votes=(o.votes||[]).filter((v:string)=>v!==me);});
  const opt=poll.options[optionIndex];
  if(!opt)return res.status(400).json({error:"Invalid option"});
  if(!opt.votes)opt.votes=[];
  const vi=opt.votes.indexOf(me);
  if(vi>=0)opt.votes.splice(vi,1);else opt.votes.push(me);
  msgs[i].poll=poll; saveDMMessages(req.params.id,msgs); res.json(poll);
});
router.patch("/dm/threads/:id/pinned",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const threads=getThreads();
  const i=threads.findIndex(x=>x.id===req.params.id);
  if(i<0||!threads[i].participants.includes(me))return res.status(403).json({error:"Forbidden"});
  (threads[i] as any).pinned=!(threads[i] as any).pinned;
  saveThreads(threads); res.json({pinned:(threads[i] as any).pinned});
});

/* ══════════════════════════════════════════════════════════
   GROUP CHATS
══════════════════════════════════════════════════════════ */
function getGroups():any[]{return rd<any[]>("dm-groups.json",[]);}
function saveGroups(g:any[]){wr("dm-groups.json",g);}
function getGroupMsgs(gid:string):any[]{return rd<any[]>(`dm-group-${gid}.json`,[]);}
function saveGroupMsgs(gid:string,msgs:any[]){wr(`dm-group-${gid}.json`,msgs.slice(-1000));}

router.get("/groups",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  res.json(getGroups().filter(g=>g.members.includes(me)).sort((a:any,b:any)=>(b.lastAt||b.createdAt).localeCompare(a.lastAt||a.createdAt)));
});
router.post("/groups",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const{name,members,description}=req.body||{};
  if(!name?.trim())return res.status(400).json({error:"name required"});
  const allMembers=Array.from(new Set([me,...(members||[])]));
  const group={id:crypto.randomUUID(),name:String(name).trim(),description:String(description||""),
    members:allMembers,admins:[me],createdBy:me,createdAt:new Date().toISOString(),
    lastMsg:null,lastAt:null,imageData:null,pinned:false};
  const groups=getGroups();groups.push(group);saveGroups(groups);
  const msgs=getGroupMsgs(group.id);
  msgs.push({id:crypto.randomUUID(),groupId:group.id,author:"system",text:`${me} created the group "${name}"`,type:"system",ts:new Date().toISOString(),reactions:{},readBy:[],deletedFor:[]});
  saveGroupMsgs(group.id,msgs);
  res.json(group);
});
router.get("/groups/:id",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const group=getGroups().find(g=>g.id===req.params.id);
  if(!group)return res.status(404).json({error:"Not found"});
  if(!group.members.includes(me))return res.status(403).json({error:"Not a member"});
  res.json(group);
});
router.patch("/groups/:id",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const groups=getGroups();
  const i=groups.findIndex(g=>g.id===req.params.id);
  if(i<0)return res.status(404).json({error:"Not found"});
  if(!groups[i].admins.includes(me))return res.status(403).json({error:"Not admin"});
  const{name,description,imageData}=req.body||{};
  if(name)groups[i].name=String(name).trim();
  if(description!==undefined)groups[i].description=String(description);
  if(imageData!==undefined)groups[i].imageData=imageData;
  saveGroups(groups); res.json(groups[i]);
});
router.post("/groups/:id/members",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const groups=getGroups();
  const i=groups.findIndex(g=>g.id===req.params.id);
  if(i<0)return res.status(404).json({error:"Not found"});
  if(!groups[i].admins.includes(me))return res.status(403).json({error:"Not admin"});
  const{username}=req.body||{};
  if(!username||groups[i].members.includes(username))return res.json(groups[i]);
  groups[i].members.push(username); saveGroups(groups);
  const msgs=getGroupMsgs(req.params.id);
  msgs.push({id:crypto.randomUUID(),groupId:req.params.id,author:"system",text:`${me} added ${username}`,type:"system",ts:new Date().toISOString(),reactions:{},readBy:[],deletedFor:[]});
  saveGroupMsgs(req.params.id,msgs); res.json(groups[i]);
});
router.delete("/groups/:id/members/:username",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const groups=getGroups();
  const i=groups.findIndex(g=>g.id===req.params.id);
  if(i<0)return res.status(404).json({error:"Not found"});
  if(!groups[i].admins.includes(me)&&me!==req.params.username)return res.status(403).json({error:"Forbidden"});
  groups[i].members=groups[i].members.filter((m:string)=>m!==req.params.username);
  groups[i].admins=groups[i].admins.filter((m:string)=>m!==req.params.username);
  saveGroups(groups); res.json({ok:true});
});
router.get("/groups/:id/messages",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const group=getGroups().find(g=>g.id===req.params.id);
  if(!group||!group.members.includes(me))return res.status(403).json({error:"Not a member"});
  const since=(req.query as any).since;
  let msgs=getGroupMsgs(req.params.id);
  if(since)msgs=msgs.filter(m=>m.ts>since);
  res.json(msgs.slice(-200));
});
router.post("/groups/:id/messages",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const groups=getGroups();
  const gi=groups.findIndex(g=>g.id===req.params.id);
  if(gi<0)return res.status(404).json({error:"Not found"});
  if(!groups[gi].members.includes(me))return res.status(403).json({error:"Not a member"});
  const{text,audioData,imageData,fileData,fileName,replyTo,forwardedFrom,poll,sticker}=req.body||{};
  const msg={id:crypto.randomUUID(),groupId:req.params.id,author:me,
    text:text?String(text).slice(0,5000):undefined,
    audioData:audioData?String(audioData).slice(0,8_000_000):undefined,
    imageData:imageData?String(imageData).slice(0,8_000_000):undefined,
    fileData:fileData?String(fileData).slice(0,20_000_000):undefined,
    fileName:fileName?String(fileName).slice(0,200):undefined,
    replyTo,forwardedFrom,poll:poll||undefined,sticker:sticker||undefined,
    reactions:{},deletedFor:[],readBy:[me],ts:new Date().toISOString()};
  const msgs=getGroupMsgs(req.params.id);msgs.push(msg);
  saveGroupMsgs(req.params.id,msgs);
  groups[gi].lastMsg=sticker||text||fileName||"📎";groups[gi].lastAt=msg.ts;
  saveGroups(groups); res.json(msg);
});
router.post("/groups/:id/messages/:msgId/react",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const{emoji}=req.body||{};
  const msgs=getGroupMsgs(req.params.id);
  const i=msgs.findIndex(m=>m.id===req.params.msgId);
  if(i<0)return res.status(404).json({error:"Not found"});
  if(!msgs[i].reactions)msgs[i].reactions={};
  if(!msgs[i].reactions[emoji])msgs[i].reactions[emoji]=[];
  const idx=msgs[i].reactions[emoji].indexOf(me);
  if(idx>=0)msgs[i].reactions[emoji].splice(idx,1);else msgs[i].reactions[emoji].push(me);
  saveGroupMsgs(req.params.id,msgs); res.json(msgs[i].reactions);
});
router.post("/groups/:id/read",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const msgs=getGroupMsgs(req.params.id);
  msgs.forEach(m=>{if(!m.readBy)m.readBy=[];if(!m.readBy.includes(me))m.readBy.push(me);});
  saveGroupMsgs(req.params.id,msgs); res.json({ok:true});
});
router.delete("/groups/:id/messages/:msgId",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const{forAll}=req.body||{};
  const msgs=getGroupMsgs(req.params.id);
  const i=msgs.findIndex(m=>m.id===req.params.msgId);
  if(i<0)return res.status(404).json({error:"Not found"});
  if(forAll&&msgs[i].author===me){msgs[i].text="🚫 This message was deleted";delete msgs[i].imageData;delete msgs[i].audioData;delete msgs[i].fileData;msgs[i].deleted=true;}
  else{if(!msgs[i].deletedFor)msgs[i].deletedFor=[];msgs[i].deletedFor.push(me);}
  saveGroupMsgs(req.params.id,msgs); res.json({ok:true});
});
router.patch("/groups/:id/messages/:msgId/pin",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const group=getGroups().find(g=>g.id===req.params.id);
  if(!group||!group.admins.includes(me))return res.status(403).json({error:"Not admin"});
  const msgs=getGroupMsgs(req.params.id);
  const i=msgs.findIndex(m=>m.id===req.params.msgId);
  if(i<0)return res.status(404).json({error:"Not found"});
  msgs[i].pinned=!msgs[i].pinned;saveGroupMsgs(req.params.id,msgs);
  res.json({ok:true,pinned:msgs[i].pinned});
});
router.post("/groups/:id/messages/:msgId/vote",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const{optionIndex}=req.body||{};
  const msgs=getGroupMsgs(req.params.id);
  const i=msgs.findIndex(m=>m.id===req.params.msgId);
  if(i<0||!msgs[i].poll)return res.status(404).json({error:"Not found"});
  const poll=msgs[i].poll;
  if(!poll.allowMultiple)poll.options.forEach((o:any)=>{o.votes=(o.votes||[]).filter((v:string)=>v!==me);});
  const opt=poll.options[optionIndex];
  if(!opt)return res.status(400).json({error:"Invalid option"});
  if(!opt.votes)opt.votes=[];
  const vi=opt.votes.indexOf(me);
  if(vi>=0)opt.votes.splice(vi,1);else opt.votes.push(me);
  msgs[i].poll=poll;saveGroupMsgs(req.params.id,msgs); res.json(poll);
});

/* ══════════════════════════════════════════════════════════
   CHANNELS (Telegram-style broadcast)
══════════════════════════════════════════════════════════ */
function getChannels():any[]{return rd<any[]>("channels.json",[]);}
function saveChannels(c:any[]){wr("channels.json",c);}
function getChannelPosts(cid:string):any[]{return rd<any[]>(`channel-${cid}.json`,[]);}
function saveChannelPosts(cid:string,posts:any[]){wr(`channel-${cid}.json`,posts.slice(-500));}

router.get("/channels",(_req,res)=>{
  res.json(getChannels().sort((a:any,b:any)=>(b.createdAt||"").localeCompare(a.createdAt||"")));
});
router.post("/channels",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const{name,description,category}=req.body||{};
  if(!name?.trim())return res.status(400).json({error:"name required"});
  const ch={id:crypto.randomUUID(),name:String(name).trim(),description:String(description||""),
    category:String(category||"General"),owner:me,admins:[me],subscribers:[me],
    createdAt:new Date().toISOString(),postCount:0,imageData:null};
  const channels=getChannels();channels.push(ch);saveChannels(channels);
  res.json(ch);
});
router.get("/channels/:id",(_req,res)=>{
  const ch=getChannels().find(c=>c.id===_req.params.id);
  if(!ch)return res.status(404).json({error:"Not found"});
  res.json({...ch,posts:getChannelPosts(_req.params.id).slice(-50)});
});
router.patch("/channels/:id",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const channels=getChannels();
  const i=channels.findIndex(c=>c.id===req.params.id);
  if(i<0)return res.status(404).json({error:"Not found"});
  if(!channels[i].admins.includes(me))return res.status(403).json({error:"Not admin"});
  const{name,description,imageData}=req.body||{};
  if(name)channels[i].name=String(name).trim();
  if(description!==undefined)channels[i].description=String(description);
  if(imageData!==undefined)channels[i].imageData=imageData;
  saveChannels(channels); res.json(channels[i]);
});
router.post("/channels/:id/subscribe",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const channels=getChannels();
  const i=channels.findIndex(c=>c.id===req.params.id);
  if(i<0)return res.status(404).json({error:"Not found"});
  const idx=channels[i].subscribers.indexOf(me);
  if(idx>=0)channels[i].subscribers.splice(idx,1);else channels[i].subscribers.push(me);
  saveChannels(channels);
  res.json({subscribed:channels[i].subscribers.includes(me),count:channels[i].subscribers.length});
});
router.get("/channels/:id/posts",(_req,res)=>{
  const since=(_req.query as any).since;
  let posts=getChannelPosts(_req.params.id);
  if(since)posts=posts.filter(p=>p.ts>since);
  res.json(posts.slice(-100));
});
router.post("/channels/:id/posts",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const channels=getChannels();
  const i=channels.findIndex(c=>c.id===req.params.id);
  if(i<0)return res.status(404).json({error:"Not found"});
  if(!channels[i].admins.includes(me))return res.status(403).json({error:"Not admin"});
  const{text,imageData,fileData,fileName,poll}=req.body||{};
  if(!text?.trim()&&!imageData&&!fileData)return res.status(400).json({error:"Content required"});
  const post={id:crypto.randomUUID(),channelId:req.params.id,author:me,
    text:text?String(text).slice(0,5000):undefined,
    imageData:imageData?String(imageData).slice(0,8_000_000):undefined,
    fileData:fileData?String(fileData).slice(0,20_000_000):undefined,
    fileName:fileName?String(fileName).slice(0,200):undefined,
    poll:poll||undefined,reactions:{},views:[me],ts:new Date().toISOString()};
  const posts=getChannelPosts(req.params.id);posts.unshift(post);
  saveChannelPosts(req.params.id,posts);
  channels[i].postCount=(channels[i].postCount||0)+1;saveChannels(channels);
  res.json(post);
});
router.post("/channels/:id/posts/:postId/react",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const{emoji}=req.body||{};
  const posts=getChannelPosts(req.params.id);
  const i=posts.findIndex(p=>p.id===req.params.postId);
  if(i<0)return res.status(404).json({error:"Not found"});
  if(!posts[i].reactions)posts[i].reactions={};
  if(!posts[i].reactions[emoji])posts[i].reactions[emoji]=[];
  const idx=posts[i].reactions[emoji].indexOf(me);
  if(idx>=0)posts[i].reactions[emoji].splice(idx,1);else posts[i].reactions[emoji].push(me);
  if(!posts[i].views.includes(me))posts[i].views.push(me);
  saveChannelPosts(req.params.id,posts); res.json(posts[i].reactions);
});

/* ══════════════════════════════════════════════════════════
   SOCIAL PROFILES & FOLLOW SYSTEM
══════════════════════════════════════════════════════════ */
function getSocialProfiles():any[]{return rd<any[]>("social-profiles.json",[]);}
function getFollows():any[]{return rd<any[]>("social-follows.json",[]);}
function saveFollows(f:any[]){wr("social-follows.json",f);}

router.get("/social/profile/:username",(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const profiles=getSocialProfiles();
  const profile=profiles.find(p=>p.username===req.params.username)||{username:req.params.username,createdAt:new Date().toISOString()};
  const follows=getFollows();
  const followers=follows.filter((f:any)=>f.following===req.params.username).length;
  const following=follows.filter((f:any)=>f.follower===req.params.username).length;
  const isFollowing=follows.some((f:any)=>f.follower===me&&f.following===req.params.username);
  const posts=getPosts().filter(p=>p.author===req.params.username).slice(0,20);
  res.json({...profile,followers,following,isFollowing,posts});
});
router.patch("/social/profile",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const profiles=getSocialProfiles();
  const i=profiles.findIndex(p=>p.username===me);
  const existing=i>=0?profiles[i]:{username:me,createdAt:new Date().toISOString()};
  const{bio,profilePhoto,coverPhoto,links,isPrivate,website,location}=req.body||{};
  if(bio!==undefined)existing.bio=String(bio).slice(0,500);
  if(profilePhoto!==undefined)existing.profilePhoto=profilePhoto;
  if(coverPhoto!==undefined)existing.coverPhoto=coverPhoto;
  if(links!==undefined)existing.links=Array.isArray(links)?links.slice(0,5):[];
  if(isPrivate!==undefined)existing.isPrivate=Boolean(isPrivate);
  if(website!==undefined)existing.website=String(website).slice(0,200);
  if(location!==undefined)existing.location=String(location).slice(0,100);
  if(i>=0)profiles[i]=existing;else profiles.push(existing);
  wr("social-profiles.json",profiles); res.json(existing);
});
router.post("/social/follow/:username",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const target=req.params.username;
  if(me===target)return res.status(400).json({error:"Cannot follow yourself"});
  const follows=getFollows();
  const existing=follows.findIndex((f:any)=>f.follower===me&&f.following===target);
  if(existing>=0){follows.splice(existing,1);saveFollows(follows);return res.json({following:false});}
  follows.push({follower:me,following:target,createdAt:new Date().toISOString()});
  saveFollows(follows);
  const notifs=rd<Notification[]>("notifs.json",[]);
  notifs.unshift({id:crypto.randomUUID(),title:`👤 ${me} started following you`,body:"",createdAt:new Date().toISOString(),recipients:[target],readBy:[]});
  wr("notifs.json",notifs.slice(0,300));
  res.json({following:true});
});
router.get("/social/followers/:username",(_req,res)=>{
  const follows=getFollows();
  res.json(follows.filter((f:any)=>f.following===_req.params.username).map((f:any)=>f.follower));
});
router.get("/social/following/:username",(_req,res)=>{
  const follows=getFollows();
  res.json(follows.filter((f:any)=>f.follower===_req.params.username).map((f:any)=>f.following));
});
router.get("/social/suggested",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const follows=getFollows();
  const myFollowing=follows.filter((f:any)=>f.follower===me).map((f:any)=>f.following);
  const users=rd<any[]>("users.json",[]);
  const suggested=users.filter(u=>(u.username||u.name)!==me&&!myFollowing.includes(u.username||u.name))
    .slice(0,12).map(u=>({username:u.username||u.name}));
  res.json(suggested);
});

/* ══════════════════════════════════════════════════════════
   COMMUNITY ENHANCEMENTS (polls, bookmarks, hashtags)
══════════════════════════════════════════════════════════ */
router.post("/community/posts/:id/vote",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const{optionIndex}=req.body||{};
  const posts=getPosts() as any[];
  const i=posts.findIndex(p=>p.id===req.params.id);
  if(i<0||!posts[i].poll)return res.status(404).json({error:"Not found"});
  const poll=posts[i].poll;
  if(poll.closed)return res.status(400).json({error:"Poll closed"});
  if(!poll.allowMultiple)poll.options.forEach((o:any)=>{o.votes=(o.votes||[]).filter((v:string)=>v!==me);});
  const opt=poll.options[optionIndex];
  if(!opt)return res.status(400).json({error:"Invalid option"});
  if(!opt.votes)opt.votes=[];
  const vi=opt.votes.indexOf(me);
  if(vi>=0)opt.votes.splice(vi,1);else opt.votes.push(me);
  posts[i].poll=poll;savePosts(posts);
  res.json({...posts[i],poll});
});
router.get("/bookmarks",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const bookmarks=rd<Record<string,string[]>>("bookmarks.json",{});
  const myBookmarks=bookmarks[me]||[];
  const posts=getPosts();
  res.json(posts.filter(p=>myBookmarks.includes(p.id)));
});
router.post("/community/posts/:id/bookmark",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const bookmarks=rd<Record<string,string[]>>("bookmarks.json",{});
  if(!bookmarks[me])bookmarks[me]=[];
  const idx=bookmarks[me].indexOf(req.params.id);
  if(idx>=0)bookmarks[me].splice(idx,1);else bookmarks[me].push(req.params.id);
  wr("bookmarks.json",bookmarks);
  res.json({bookmarked:bookmarks[me].includes(req.params.id)});
});

/* Update post creation to support polls, quote posts, audience */
router.post("/community/posts/enhanced",userAuth,(req:any,res)=>{
  const u=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const{text,imageData,videoUrl,subject,poll,quotePost,audience,type}=req.body||{};
  if(!text?.trim()&&!imageData&&!videoUrl&&!poll&&!quotePost)return res.status(400).json({error:"Content required"});
  const post:any={
    id:crypto.randomUUID(),author:u,
    text:String(text||"").slice(0,2000),
    imageData:imageData?String(imageData).slice(0,8_000_000):undefined,
    videoUrl:videoUrl?String(videoUrl).slice(0,500):undefined,
    subject:subject?String(subject).slice(0,60):undefined,
    poll:poll||undefined,quotePost:quotePost||undefined,
    audience:audience||"public",type:type||"text",
    createdAt:new Date().toISOString(),reactions:{},comments:[]
  };
  const posts=getPosts() as any[];posts.unshift(post);savePosts(posts.slice(0,1000));
  res.json(post);
});

/* ══════════════════════════════════════════════════════════
   EXPLORE / DISCOVERY
══════════════════════════════════════════════════════════ */
router.get("/explore/trending",(_req,res)=>{
  const posts=getPosts() as any[];
  const tagCounts:Record<string,number>={};
  posts.forEach(p=>{
    const tags=(p.text||"").match(/#[\w\u0980-\u09FF]+/g)||[];
    tags.forEach((t:string)=>{tagCounts[t]=(tagCounts[t]||0)+1;});
  });
  const trending=Object.entries(tagCounts).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([tag,count])=>({tag,count}));
  const popular=posts.slice(0,20).map(p=>({id:p.id,author:p.author,text:(p.text||"").slice(0,100),reactions:Object.values(p.reactions||{}).reduce((s:number,a:any)=>s+a.length,0)}))
    .sort((a:any,b:any)=>b.reactions-a.reactions).slice(0,10);
  res.json({trending,popular});
});
router.get("/explore/search",(req:any,res)=>{
  const q=String((req.query as any).q||"").toLowerCase().trim();
  if(!q)return res.json({posts:[],users:[],channels:[],groups:[]});
  const posts=(getPosts() as any[]).filter(p=>(p.text||"").toLowerCase().includes(q)||(p.author||"").toLowerCase().includes(q)).slice(0,20);
  const users=rd<any[]>("users.json",[]).filter(u=>(u.username||u.name||"").toLowerCase().includes(q)).slice(0,10).map(u=>({username:u.username||u.name}));
  const channels=getChannels().filter(c=>c.name.toLowerCase().includes(q)||c.description?.toLowerCase().includes(q)).slice(0,10);
  const groups=getGroups().filter(g=>g.name.toLowerCase().includes(g.description?.toLowerCase().includes(q))).slice(0,10);
  res.json({posts,users,channels,groups});
});

/* ══════════════════════════════════════════════════════════
   STORY ENHANCEMENTS
══════════════════════════════════════════════════════════ */
router.post("/community/stories/:id/react",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const{emoji}=req.body||{};
  const stories=rd<any[]>("community-stories.json",[]);
  const i=stories.findIndex(s=>s.id===req.params.id);
  if(i<0)return res.status(404).json({error:"Not found"});
  if(!stories[i].reactions)stories[i].reactions={};
  if(!stories[i].reactions[emoji])stories[i].reactions[emoji]=[];
  const idx=stories[i].reactions[emoji].indexOf(me);
  if(idx>=0)stories[i].reactions[emoji].splice(idx,1);else stories[i].reactions[emoji].push(me);
  wr("community-stories.json",stories); res.json(stories[i].reactions);
});
router.post("/community/stories/:id/reply",userAuth,(req:any,res)=>{
  const me=getLoggedInUser(req)?.username||(req.headers["x-username"] as string)||"guest";
  const{text}=req.body||{};
  if(!text?.trim())return res.status(400).json({error:"text required"});
  const stories=rd<any[]>("community-stories.json",[]);
  const i=stories.findIndex(s=>s.id===req.params.id);
  if(i<0)return res.status(404).json({error:"Not found"});
  if(!stories[i].replies)stories[i].replies=[];
  const reply={id:crypto.randomUUID(),author:me,text:String(text).slice(0,500),ts:new Date().toISOString()};
  stories[i].replies.push(reply);
  wr("community-stories.json",stories);
  // Notify story author
  const notifs=rd<Notification[]>("notifs.json",[]);
  notifs.unshift({id:crypto.randomUUID(),title:`💬 ${me} replied to your story`,body:String(text).slice(0,80),createdAt:new Date().toISOString(),recipients:[stories[i].author],readBy:[]});
  wr("notifs.json",notifs.slice(0,300));
  res.json(reply);
});

/* ══════════════════════════════════════════════════════════
   AI FEATURES (smart reply, translation)
══════════════════════════════════════════════════════════ */
router.post("/ai/smart-reply",userAuth,(req:any,res)=>{
  const{text,context}=req.body||{};
  if(!text)return res.status(400).json({error:"text required"});
  const t=String(text).toLowerCase();
  let replies:string[]=[];
  if(t.includes("?"))replies=["আমি জানি না","এটা জানার চেষ্টা করছি","একটু পরে জানাবো","ধন্যবাদ প্রশ্নের জন্য"];
  else if(t.includes("ধন্যবাদ")||t.includes("thanks"))replies=["স্বাগতম!","কোনো ব্যাপার না 😊","আমার সাহায্য করতে পেরে ভালো লাগলো","যেকোনো সময় বলুন"];
  else if(t.includes("কেমন")||t.includes("how are"))replies=["ভালো আছি, তুমি?","আলহামদুলিল্লাহ 😊","ভালো! পড়াশোনা কেমন?","ঠিক আছি, ধন্যবাদ"];
  else if(t.includes("পড়")||t.includes("study")||t.includes("exam"))replies=["শুভকামনা! 📚","কঠোর পরিশ্রম করো 💪","বিশ্বাস রাখো নিজের উপর ⭐","তুমি পারবে! 🔥"];
  else replies=["👍","ঠিক বলেছো!","হ্যাঁ","বুঝলাম","ধন্যবাদ!","😊"];
  const extra=context==="education"?["খুব ভালো প্রশ্ন!","এটা আমিও জানতে চাই","শেয়ার করার জন্য ধন্যবাদ"]:[];
  res.json([...replies,...extra].slice(0,6));
});
router.post("/ai/translate",async(req:any,res)=>{
  const{text,from,to}=req.body||{};
  if(!text)return res.status(400).json({error:"text required"});
  // Simple word-based translation for common educational terms
  const bnToEn:Record<string,string>={
    "পদার্থবিজ্ঞান":"Physics","রসায়ন":"Chemistry","জীববিজ্ঞান":"Biology",
    "গণিত":"Mathematics","ইংরেজি":"English","বাংলা":"Bangla",
    "পরীক্ষা":"Exam","প্রশ্ন":"Question","উত্তর":"Answer",
    "অধ্যায়":"Chapter","বই":"Book","শিক্ষক":"Teacher","ছাত্র":"Student",
  };
  const enToBn:Record<string,string>=Object.fromEntries(Object.entries(bnToEn).map(([k,v])=>[v.toLowerCase(),k]));
  const dict=from==="bn"?bnToEn:enToBn;
  let translated=String(text);
  Object.entries(dict).forEach(([word,tr])=>{translated=translated.replace(new RegExp(word,"gi"),tr);});
  res.json({original:text,translated,from:from||"auto",to:to||"en"});
});

/* ══════════════════════════════════════════════════════════
   ADMIN — MODERATION (Reports + Strikes)
══════════════════════════════════════════════════════════ */
router.get("/admin/moderation/reports", adminAuth, (_req, res) => {
  res.json(rd<any[]>("mod-reports.json", []));
});

router.post("/admin/moderation/reports/:id/action", adminAuth, (req: any, res) => {
  const { action } = req.body || {};
  if (!action) return res.status(400).json({ error: "action required" });
  const reports = rd<any[]>("mod-reports.json", []);
  const i = reports.findIndex((r: any) => r.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: "Not found" });
  const report = reports[i];
  reports[i].status = action;
  reports[i].resolvedAt = new Date().toISOString();
  wr("mod-reports.json", reports);
  // Log action
  appendLog("admin", `Moderation action '${action}' on report ${req.params.id} (target: ${report.targetUser || "unknown"})`, req);
  // Side effects
  if (action === "ban" && report.targetUser) {
    const users = rd<any[]>("users.json", []);
    const ui = users.findIndex((u: any) => u.username === report.targetUser);
    if (ui >= 0) { users[ui].banned = true; wr("users.json", users); }
  }
  res.json({ ok: true, action });
});

// Users can submit reports (from community/messages)
router.post("/report", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "guest";
  const { type, targetId, targetUser, contentPreview, reason } = req.body || {};
  if (!type || !targetId) return res.status(400).json({ error: "type and targetId required" });
  const reports = rd<any[]>("mod-reports.json", []);
  const newReport = { id: crypto.randomUUID(), type, targetId, targetUser, contentPreview, reason, reporter: me, status: "pending", ts: new Date().toISOString() };
  reports.unshift(newReport);
  wr("mod-reports.json", reports.slice(0, 500));
  res.json(newReport);
});

router.get("/admin/moderation/strikes", adminAuth, (_req, res) => {
  res.json(rd<any[]>("mod-strikes.json", []));
});

router.post("/admin/moderation/strikes", adminAuth, (req: any, res) => {
  const { username, reason } = req.body || {};
  if (!username || !reason) return res.status(400).json({ error: "username and reason required" });
  const strikes = rd<any[]>("mod-strikes.json", []);
  const newStrike = { id: crypto.randomUUID(), username, reason, ts: new Date().toISOString() };
  strikes.push(newStrike);
  wr("mod-strikes.json", strikes);
  appendLog("admin", `Strike issued to ${username}: ${reason}`, req);
  // Auto-ban at 3 strikes
  const userStrikes = strikes.filter((s: any) => s.username === username);
  if (userStrikes.length >= 3) {
    const users = rd<any[]>("users.json", []);
    const ui = users.findIndex((u: any) => u.username === username);
    if (ui >= 0 && !users[ui].banned) {
      users[ui].banned = true; wr("users.json", users);
      appendLog("admin", `Auto-banned ${username} after 3 strikes`, req);
    }
  }
  res.json(newStrike);
});

router.delete("/admin/moderation/strikes/:id", adminAuth, (req: any, res) => {
  const strikes = rd<any[]>("mod-strikes.json", []);
  wr("mod-strikes.json", strikes.filter((s: any) => s.id !== req.params.id));
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════
   ADMIN — SOCIAL CONTROL (Groups + Channels)
══════════════════════════════════════════════════════════ */
router.get("/admin/social/groups", adminAuth, (_req, res) => {
  res.json(rd<any[]>("dm-groups.json", []));
});

router.patch("/admin/social/groups/:id/freeze", adminAuth, (req: any, res) => {
  const { frozen } = req.body || {};
  const groups = rd<any[]>("dm-groups.json", []);
  const i = groups.findIndex((g: any) => g.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: "Not found" });
  groups[i].frozen = frozen;
  wr("dm-groups.json", groups);
  appendLog("admin", `Group '${groups[i].name}' ${frozen ? "frozen" : "unfrozen"}`, req);
  res.json(groups[i]);
});

router.delete("/admin/social/groups/:id", adminAuth, (req: any, res) => {
  const groups = rd<any[]>("dm-groups.json", []);
  const g = groups.find((x: any) => x.id === req.params.id);
  wr("dm-groups.json", groups.filter((x: any) => x.id !== req.params.id));
  if (g) appendLog("admin", `Deleted group '${g.name}'`, req);
  // Delete group messages
  const msgFile = `dm-group-${req.params.id}.json`;
  try { const p = require("path").join(DATA_DIR, msgFile); if (require("fs").existsSync(p)) require("fs").unlinkSync(p); } catch {}
  res.json({ ok: true });
});

router.get("/admin/social/channels", adminAuth, (_req, res) => {
  res.json(rd<any[]>("channels.json", []));
});

router.delete("/admin/social/channels/:id", adminAuth, (req: any, res) => {
  const channels = rd<any[]>("channels.json", []);
  const c = channels.find((x: any) => x.id === req.params.id);
  wr("channels.json", channels.filter((x: any) => x.id !== req.params.id));
  if (c) appendLog("admin", `Deleted channel '${c.name}'`, req);
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════
   ADMIN — ANALYTICS
══════════════════════════════════════════════════════════ */
router.get("/admin/analytics/stats", adminAuth, (_req, res) => {
  const users = rd<any[]>("users.json", []);
  const posts = rd<any[]>("community-posts.json", []);
  const videos = rd<any[]>("videos.json", []);
  const quizzes = rd<any[]>("quizzes.json", []);
  const groups = rd<any[]>("dm-groups.json", []);
  const channels = rd<any[]>("channels.json", []);
  // Count total messages across all DM threads
  let totalMessages = 0;
  try {
    const files = require("fs").readdirSync(DATA_DIR) as string[];
    files.filter((f: string) => f.startsWith("dm-") && f.endsWith(".json") && !f.startsWith("dm-group")).forEach((f: string) => {
      const msgs = rd<any[]>(f, []);
      totalMessages += msgs.length;
    });
  } catch {}
  // Subject breakdown
  const subjectMap: Record<string, number> = {};
  (videos as any[]).forEach((v: any) => {
    const s = v.subjectId || "Other";
    subjectMap[s] = (subjectMap[s] || 0) + 1;
  });
  const subjectBreakdown = Object.entries(subjectMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  // Course breakdown
  const courseMap: Record<string, number> = {};
  (videos as any[]).forEach((v: any) => {
    const c = v.course || "Other";
    courseMap[c] = (courseMap[c] || 0) + 1;
  });
  const courseBreakdown = Object.entries(courseMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  // Quiz stats
  const publishedQuizzes = (quizzes as any[]).filter((q: any) => q.published).length;
  const totalQuestions = (quizzes as any[]).reduce((s: number, q: any) => s + (q.questions?.length || 0), 0);
  const avgQuestionsPerQuiz = quizzes.length > 0 ? Math.round(totalQuestions / quizzes.length) : 0;
  // Top students
  const leaderboard = rd<any[]>("leaderboard.json", []);
  const topStudents = leaderboard.slice(0, 5);
  res.json({
    totalUsers: users.length,
    totalPosts: posts.length,
    totalMessages,
    activeGroups: groups.length,
    totalChannels: channels.length,
    totalVideos: videos.length,
    totalQuizzes: quizzes.length,
    communityPosts: posts.length,
    publishedQuizzes,
    totalQuestions,
    avgQuestionsPerQuiz,
    subjectBreakdown,
    courseBreakdown,
    topStudents,
  });
});

/* ══════════════════════════════════════════════════════════
   ADMIN — SECURITY
══════════════════════════════════════════════════════════ */
// Login logs are appended by the login route — we read them here
router.get("/admin/security/logs", adminAuth, (_req, res) => {
  res.json(rd<any[]>("security-logs.json", []).slice(0, 200));
});

router.get("/admin/security/suspicious", adminAuth, (_req, res) => {
  res.json(rd<any[]>("suspicious-users.json", []));
});

router.get("/admin/security/sessions", adminAuth, (_req, res) => {
  // Build session list from users with recent login activity
  const users = rd<any[]>("users.json", []);
  const secLogs = rd<any[]>("security-logs.json", []);
  const sessionMap: Record<string, any> = {};
  secLogs.filter((l: any) => l.success).forEach((l: any) => {
    if (!sessionMap[l.username] || new Date(l.ts) > new Date(sessionMap[l.username].lastSeen)) {
      sessionMap[l.username] = { username: l.username, ip: l.ip, lastSeen: l.ts, device: l.device };
    }
  });
  res.json(Object.values(sessionMap).sort((a: any, b: any) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()).slice(0, 50));
});

router.delete("/admin/security/sessions/:username/logout", adminAuth, (req: any, res) => {
  // Force logout by invalidating the user's token in a blocklist
  const blocklist = rd<string[]>("token-blocklist.json", []);
  blocklist.push(`force_logout:${req.params.username}:${Date.now()}`);
  wr("token-blocklist.json", blocklist.slice(-500));
  appendLog("admin", `Force-logged-out user ${req.params.username}`, req);
  res.json({ ok: true });
});

// Hook: append security log on every user login (called from existing login route helper)
function appendSecurityLog(username: string, ip: string, success: boolean, device?: string) {
  const logs = rd<any[]>("security-logs.json", []);
  logs.unshift({ username, ip, success, device, ts: new Date().toISOString() });
  wr("security-logs.json", logs.slice(0, 1000));
  // Flag suspicious: >10 failed attempts
  if (!success) {
    const recent = logs.filter((l: any) => l.username === username && !l.success && Date.now() - new Date(l.ts).getTime() < 3_600_000);
    if (recent.length >= 10) {
      const sus = rd<any[]>("suspicious-users.json", []);
      if (!sus.find((s: any) => s.username === username)) {
        sus.unshift({ username, reason: `${recent.length} failed login attempts in 1 hour`, riskLevel: "high", ts: new Date().toISOString() });
        wr("suspicious-users.json", sus.slice(0, 200));
      }
    }
  }
}

/* ══════════════════════════════════════════════════════════
   ADMIN — AI AUTO-MOD RULES
══════════════════════════════════════════════════════════ */
router.get("/admin/aimod/rules", adminAuth, (_req, res) => {
  res.json(rd<any[]>("aimod-rules.json", []));
});

router.post("/admin/aimod/rules", adminAuth, (req: any, res) => {
  const { trigger, condition, action, threshold } = req.body || {};
  if (!trigger || !condition) return res.status(400).json({ error: "trigger and condition required" });
  const rules = rd<any[]>("aimod-rules.json", []);
  const rule = { id: crypto.randomUUID(), trigger, condition, action: action || "warn", threshold: threshold || 5, createdAt: new Date().toISOString(), active: true };
  rules.push(rule);
  wr("aimod-rules.json", rules);
  appendLog("admin", `AI mod rule added: ${trigger} → ${action}`, req);
  res.json(rule);
});

router.delete("/admin/aimod/rules/:id", adminAuth, (req: any, res) => {
  const rules = rd<any[]>("aimod-rules.json", []);
  wr("aimod-rules.json", rules.filter((r: any) => r.id !== req.params.id));
  res.json({ ok: true });
});

router.post("/admin/aimod/scan", adminAuth, (_req, res) => {
  const users = rd<any[]>("users.json", []);
  const posts = rd<any[]>("community-posts.json", []);
  const flagged: any[] = [];
  // Check rapid posting
  const now = Date.now();
  users.forEach((u: any) => {
    const recentPosts = posts.filter((p: any) => p.author === u.username && now - new Date(p.createdAt || p.ts || 0).getTime() < 3_600_000);
    if (recentPosts.length > 20) {
      flagged.push({ username: u.username, reason: `${recentPosts.length} posts in last hour`, risk: "high" });
    }
  });
  // Check spam links in posts
  posts.forEach((p: any) => {
    const linkCount = (p.text || "").match(/https?:\/\//gi)?.length || 0;
    if (linkCount >= 5) {
      const already = flagged.find(f => f.username === p.author);
      if (!already) flagged.push({ username: p.author, reason: `${linkCount} links in a single post`, risk: "medium" });
    }
  });
  res.json({ suspicious: flagged.length, warned: 0, clean: users.length - flagged.length, flagged: flagged.slice(0, 20) });
});

/* ══════════════════════════════════════════════════════════
   ADMIN — ACTIVITY LOGS
══════════════════════════════════════════════════════════ */
function appendLog(type: string, action: string, req?: any, details?: any) {
  const logs = rd<any[]>("activity-logs.json", []);
  logs.unshift({ id: crypto.randomUUID(), type, actor: req?.adminUser || "system", action, details, ts: new Date().toISOString() });
  wr("activity-logs.json", logs.slice(0, 2000));
}

router.get("/admin/logs", adminAuth, (_req, res) => {
  res.json(rd<any[]>("activity-logs.json", []));
});

router.delete("/admin/logs", adminAuth, (req: any, res) => {
  wr("activity-logs.json", []);
  appendLog("admin", "Activity logs cleared", req);
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════
   ADMIN — ROLES & PERMISSIONS
══════════════════════════════════════════════════════════ */
router.get("/admin/roles", adminAuth, (_req, res) => {
  res.json(rd<any[]>("admin-roles.json", []));
});

router.post("/admin/roles", adminAuth, (req: any, res) => {
  const { name, description, permissions } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: "name required" });
  const roles = rd<any[]>("admin-roles.json", []);
  if (roles.find((r: any) => r.name.toLowerCase() === name.toLowerCase())) return res.status(409).json({ error: "Role name already exists" });
  const role = { id: crypto.randomUUID(), name, description: description || "", permissions: permissions || {}, createdAt: new Date().toISOString() };
  roles.push(role);
  wr("admin-roles.json", roles);
  appendLog("admin", `Created admin role: ${name}`, req);
  res.json(role);
});

router.put("/admin/roles/:id", adminAuth, (req: any, res) => {
  const roles = rd<any[]>("admin-roles.json", []);
  const i = roles.findIndex((r: any) => r.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: "Not found" });
  roles[i] = { ...roles[i], ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
  wr("admin-roles.json", roles);
  appendLog("admin", `Updated admin role: ${roles[i].name}`, req);
  res.json(roles[i]);
});

router.delete("/admin/roles/:id", adminAuth, (req: any, res) => {
  const roles = rd<any[]>("admin-roles.json", []);
  const role = roles.find((r: any) => r.id === req.params.id);
  wr("admin-roles.json", roles.filter((r: any) => r.id !== req.params.id));
  if (role) appendLog("admin", `Deleted admin role: ${role.name}`, req);
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════
   ENHANCED USER LOGIN — append security log
══════════════════════════════════════════════════════════ */
router.post("/user/login-log", (req: any, res) => {
  const { username, success, device } = req.body || {};
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (username) appendSecurityLog(username, ip, !!success, device);
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════
   USER SETTINGS  (privacy, account, appearance)
══════════════════════════════════════════════════════════ */
router.get("/user/settings", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "guest";
  const all = rd<Record<string, any>>("user-settings.json", {});
  res.json(all[me] || {});
});

router.patch("/user/settings", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "guest";
  const all = rd<Record<string, any>>("user-settings.json", {});
  all[me] = { ...(all[me] || {}), ...req.body, username: me, updatedAt: new Date().toISOString() };
  wr("user-settings.json", all);
  // If birthday changed, update social profile too
  if (req.body.birthday) {
    const profiles = rd<any[]>("social-profiles.json", []);
    const idx = profiles.findIndex((p: any) => p.username === me);
    if (idx >= 0) { profiles[idx].birthday = req.body.birthday; wr("social-profiles.json", profiles); }
    else { profiles.push({ username: me, birthday: req.body.birthday }); wr("social-profiles.json", profiles); }
  }
  res.json({ ok: true });
});

router.post("/user/change-password", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const { current, newPassword } = req.body || {};
  if (!me || !current || !newPassword) return res.status(400).json({ error: "All fields required" });
  if (newPassword.length < 6) return res.status(400).json({ error: "Password too short (min 6)" });
  const users = rd<any[]>("users.json", []);
  const ui = users.findIndex((u: any) => u.username === me);
  if (ui < 0) return res.status(404).json({ error: "User not found" });
  if (users[ui].password !== current) return res.status(401).json({ error: "Current password incorrect" });
  users[ui].password = newPassword;
  users[ui].passwordChangedAt = new Date().toISOString();
  wr("users.json", users);
  appendSecurityLog(me, (req.headers["x-forwarded-for"] as string)?.split(",")[0] || "unknown", true, "password-change");
  res.json({ ok: true });
});

router.get("/user/export-data", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  if (!me) return res.status(401).json({ error: "Not logged in" });
  const posts = rd<any[]>("community-posts.json", []).filter((p: any) => p.author === me);
  const profile = rd<any[]>("social-profiles.json", []).find((p: any) => p.username === me) || {};
  const settings = (rd<Record<string, any>>("user-settings.json", {}))[me] || {};
  const follows = rd<any[]>("social-follows.json", []).filter((f: any) => f.follower === me || f.following === me);
  const threads = rd<any[]>("dm-threads.json", []).filter((t: any) => t.participants.includes(me));
  res.json({ username: me, exportedAt: new Date().toISOString(), profile, settings, posts, follows, threads });
});

/* ══════════════════════════════════════════════════════════
   NOTIFICATIONS  (user-specific, full CRUD)
══════════════════════════════════════════════════════════ */
function pushNotif(toUser: string, type: string, fromUser: string, body: string, extra?: any) {
  const all = rd<any[]>("notifs.json", []);
  all.unshift({ id: crypto.randomUUID(), toUser, type, fromUser, body, ts: new Date().toISOString(), read: false, ...(extra || {}) });
  wr("notifs.json", all.slice(0, 2000));
}

router.get("/notifications/mine", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const all = rd<any[]>("notifs.json", []);
  const mine = all.filter((n: any) => n.toUser === me || (!n.toUser && (!n.recipients?.length || n.recipients.includes(me))));
  res.json(mine.slice(0, 100).map((n: any) => ({
    ...n,
    read: n.read || n.readBy?.includes(me) || false,
    ts: n.ts || n.createdAt || new Date().toISOString(),
    body: n.body || n.text || n.title || "",
  })));
});

router.patch("/notifications/:id/read", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const all = rd<any[]>("notifs.json", []);
  const i = all.findIndex((n: any) => n.id === req.params.id);
  if (i >= 0) {
    all[i].read = true;
    all[i].readBy = all[i].readBy || [];
    if (!all[i].readBy.includes(me)) all[i].readBy.push(me);
    wr("notifs.json", all);
  }
  res.json({ ok: true });
});

router.patch("/notifications/read-all", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const all = rd<any[]>("notifs.json", []);
  all.forEach((n: any) => {
    if (n.toUser === me || !n.toUser) {
      n.read = true;
      n.readBy = n.readBy || [];
      if (!n.readBy.includes(me)) n.readBy.push(me);
    }
  });
  wr("notifs.json", all);
  res.json({ ok: true });
});

router.delete("/notifications/:id", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const all = rd<any[]>("notifs.json", []);
  wr("notifs.json", all.filter((n: any) => !(n.id === req.params.id && (n.toUser === me || !n.toUser))));
  res.json({ ok: true });
});

router.delete("/notifications/clear", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const all = rd<any[]>("notifs.json", []);
  wr("notifs.json", all.filter((n: any) => n.toUser !== me));
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════
   STORIES  (extended: mine, archive, highlights, poll, delete)
══════════════════════════════════════════════════════════ */
router.get("/community/stories/mine", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  res.json(getStories().filter((s: any) => s.author === me));
});

router.get("/community/stories/archive", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const all = rd<any[]>("stories-archive.json", []);
  const myStories = getStories().filter((s: any) => s.author === me);
  // merge archive + current expired
  const now = Date.now();
  const expired = myStories.filter((s: any) => new Date(s.expiresAt || s.createdAt).getTime() + 86400000 < now);
  const combined = [...all.filter((s: any) => s.author === me), ...expired];
  const seen = new Set<string>();
  res.json(combined.filter((s: any) => { if (seen.has(s.id)) return false; seen.add(s.id); return true; }).slice(0, 50));
});

// Patch story creation to support full sticker/text/cover upload
router.post("/community/stories/enhanced", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "guest";
  const { text, bgColor, image, textColor, fontSize, sticker } = req.body || {};
  if (!text?.trim() && !image) return res.status(400).json({ error: "text or image required" });
  const now = new Date();
  const story: any = {
    id: crypto.randomUUID(), author: me,
    text: text ? String(text).slice(0, 300) : undefined,
    bgColor: bgColor || "#1e1b4b",
    image: image ? String(image).slice(0, 8_000_000) : undefined,
    textColor: textColor || "#ffffff",
    fontSize: fontSize || 24,
    sticker: sticker || null,
    ts: now.toISOString(),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 86400000).toISOString(),
    viewers: [],
    views: [],
    reactions: {},
    replies: [],
  };
  const stories = getStories();
  stories.unshift(story);
  saveStories(stories);
  // Archive a copy
  const archive = rd<any[]>("stories-archive.json", []);
  archive.unshift(story);
  wr("stories-archive.json", archive.slice(0, 500));
  res.json(story);
});

// Override existing story POST to also support new fields
router.patch("/community/stories/:id", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const stories = getStories();
  const i = stories.findIndex((s: any) => s.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: "Not found" });
  if (stories[i].author !== me) return res.status(403).json({ error: "Not yours" });
  stories[i] = { ...stories[i], ...req.body, id: req.params.id, author: me };
  saveStories(stories);
  res.json(stories[i]);
});

router.delete("/community/stories/:id", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const stories = getStories();
  const s = stories.find((x: any) => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: "Not found" });
  if (s.author !== me) return res.status(403).json({ error: "Not yours" });
  saveStories(stories.filter((x: any) => x.id !== req.params.id));
  res.json({ ok: true });
});

router.post("/community/stories/:id/poll-vote", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const { option } = req.body || {};
  if (!option) return res.status(400).json({ error: "option required" });
  const stories = getStories();
  const i = stories.findIndex((s: any) => s.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: "Not found" });
  const s = stories[i];
  if (!s.sticker || s.sticker.type !== "poll") return res.status(400).json({ error: "Not a poll" });
  s.sticker.votesA = s.sticker.votesA || 0;
  s.sticker.votesB = s.sticker.votesB || 0;
  s.sticker.voters = s.sticker.voters || {};
  // Toggle vote
  const prev = s.sticker.voters[me];
  if (prev === option) { delete s.sticker.voters[me]; s.sticker[`votes${option}`]--; }
  else {
    if (prev) s.sticker[`votes${prev}`]--;
    s.sticker.voters[me] = option;
    s.sticker[`votes${option}`]++;
  }
  saveStories(stories);
  res.json({ votesA: s.sticker.votesA, votesB: s.sticker.votesB });
});

// Story highlights
router.get("/community/story-highlights", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const all = rd<any[]>("story-highlights.json", []);
  res.json(all.filter((h: any) => h.owner === me));
});

router.post("/community/story-highlights", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const { name, icon } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: "name required" });
  const all = rd<any[]>("story-highlights.json", []);
  const hl = { id: crypto.randomUUID(), owner: me, name, icon: icon || "⭐", stories: [], createdAt: new Date().toISOString() };
  all.push(hl);
  wr("story-highlights.json", all);
  res.json(hl);
});

router.delete("/community/story-highlights/:id", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const all = rd<any[]>("story-highlights.json", []);
  wr("story-highlights.json", all.filter((h: any) => !(h.id === req.params.id && h.owner === me)));
  res.json({ ok: true });
});

// (story view tracking is already handled by existing route above — patch it via middleware)

/* ══════════════════════════════════════════════════════════
   EVENTS  (create/list/RSVP/comments/delete)
══════════════════════════════════════════════════════════ */
router.get("/events", (req: any, res) => {
  res.json(rd<any[]>("events.json", []));
});

router.post("/events", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "guest";
  const { title, description, date, endDate, location, isOnline, coverUrl, category } = req.body || {};
  if (!title?.trim() || !date) return res.status(400).json({ error: "title and date required" });
  const events = rd<any[]>("events.json", []);
  const event = { id: crypto.randomUUID(), title, description: description || "", date, endDate: endDate || "", location: location || "", isOnline: !!isOnline, coverUrl: coverUrl || "", category: category || "Education", creator: me, rsvps: [], comments: [], createdAt: new Date().toISOString() };
  events.unshift(event);
  wr("events.json", events.slice(0, 500));
  res.json(event);
});

router.get("/events/:id", (req: any, res) => {
  const events = rd<any[]>("events.json", []);
  const e = events.find((x: any) => x.id === req.params.id);
  if (!e) return res.status(404).json({ error: "Not found" });
  res.json(e);
});

router.post("/events/:id/rsvp", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "guest";
  const { status } = req.body || {};
  if (!["going","interested","not_going"].includes(status)) return res.status(400).json({ error: "invalid status" });
  const events = rd<any[]>("events.json", []);
  const i = events.findIndex((e: any) => e.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: "Not found" });
  events[i].rsvps = events[i].rsvps || [];
  const ri = events[i].rsvps.findIndex((r: any) => r.username === me);
  if (ri >= 0) events[i].rsvps[ri].status = status;
  else events[i].rsvps.push({ username: me, status, ts: new Date().toISOString() });
  wr("events.json", events);
  // Push notification to event creator
  if (events[i].creator !== me) {
    pushNotif(events[i].creator, "event", me, `@${me} responded "${status}" to your event "${events[i].title}"`);
  }
  res.json({ ok: true, status });
});

router.post("/events/:id/comments", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "guest";
  const { text } = req.body || {};
  if (!text?.trim()) return res.status(400).json({ error: "text required" });
  const events = rd<any[]>("events.json", []);
  const i = events.findIndex((e: any) => e.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: "Not found" });
  const comment = { id: crypto.randomUUID(), author: me, text, ts: new Date().toISOString() };
  events[i].comments = events[i].comments || [];
  events[i].comments.push(comment);
  wr("events.json", events);
  res.json(comment);
});

router.delete("/events/:id", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const events = rd<any[]>("events.json", []);
  const e = events.find((x: any) => x.id === req.params.id);
  if (!e) return res.status(404).json({ error: "Not found" });
  if (e.creator !== me) return res.status(403).json({ error: "Not yours" });
  wr("events.json", events.filter((x: any) => x.id !== req.params.id));
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════
   SOCIAL PROFILE  (visitors, birthdays, block/unblock)
══════════════════════════════════════════════════════════ */
router.post("/social/visit/:username", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const target = req.params.username;
  if (!me || me === target) return res.json({ ok: true });
  const visits = rd<Record<string, string[]>>("profile-visitors.json", {});
  visits[target] = visits[target] || [];
  visits[target] = visits[target].filter((v: string) => v !== me);
  visits[target].unshift(me);
  visits[target] = visits[target].slice(0, 50);
  wr("profile-visitors.json", visits);
  res.json({ ok: true });
});

router.get("/social/visitors", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const visits = rd<Record<string, string[]>>("profile-visitors.json", {});
  res.json(visits[me] || []);
});

router.get("/social/birthdays", userAuth, (_req, res) => {
  const profiles = rd<any[]>("social-profiles.json", []);
  const today = new Date();
  const upcoming = profiles
    .filter((p: any) => p.birthday)
    .map((p: any) => {
      const [, month, day] = p.birthday.split("-").map(Number);
      const thisYear = new Date(today.getFullYear(), month - 1, day);
      if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1);
      return { ...p, daysUntil: Math.ceil((thisYear.getTime() - today.getTime()) / 86400000) };
    })
    .sort((a: any, b: any) => a.daysUntil - b.daysUntil)
    .slice(0, 20);
  res.json(upcoming);
});

router.post("/social/block/:username", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const target = req.params.username;
  if (!me || me === target) return res.status(400).json({ error: "invalid" });
  const blocks = rd<Record<string, string[]>>("social-blocks.json", {});
  blocks[me] = blocks[me] || [];
  if (blocks[me].includes(target)) {
    blocks[me] = blocks[me].filter((u: string) => u !== target);
    wr("social-blocks.json", blocks);
    return res.json({ blocked: false });
  }
  blocks[me].push(target);
  wr("social-blocks.json", blocks);
  // Also remove follows in both directions
  const follows = rd<any[]>("social-follows.json", []);
  const filtered = follows.filter((f: any) => !((f.follower === me && f.following === target) || (f.follower === target && f.following === me)));
  wr("social-follows.json", filtered);
  res.json({ blocked: true });
});

router.get("/social/blocked", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const blocks = rd<Record<string, string[]>>("social-blocks.json", {});
  res.json((blocks[me] || []).map((u: string) => ({ username: u })));
});

// Patch /social/profile/:username to include block/visitor info
router.get("/social/profile-full/:username", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const target = req.params.username;
  const profiles = rd<any[]>("social-profiles.json", []);
  const profile = profiles.find((p: any) => p.username === target) || { username: target };
  const follows = rd<any[]>("social-follows.json", []);
  const blocks = rd<Record<string, string[]>>("social-blocks.json", {});
  const friends = rd<Record<string, string[]>>("social-friends.json", {});
  profile.followers = follows.filter((f: any) => f.following === target).length;
  profile.following = follows.filter((f: any) => f.follower === target).length;
  profile.isFollowing = follows.some((f: any) => f.follower === me && f.following === target);
  profile.isBlocked = (blocks[me] || []).includes(target);
  profile.isFriend = (friends[me] || []).includes(target);
  res.json(profile);
});

/* ══════════════════════════════════════════════════════════
   FRIENDS SYSTEM  (requests, accept, decline, remove, close)
══════════════════════════════════════════════════════════ */
function getFriends(): Record<string, string[]> { return rd<Record<string, string[]>>("social-friends.json", {}); }
function saveFriends(f: Record<string, string[]>) { wr("social-friends.json", f); }
function getRequests(): any[] { return rd<any[]>("friend-requests.json", []); }
function saveRequests(r: any[]) { wr("friend-requests.json", r); }

router.get("/social/friends/list", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const friends = getFriends();
  const myFriends = friends[me] || [];
  const profiles = rd<any[]>("social-profiles.json", []);
  const result = myFriends.map((u: string) => {
    const p = profiles.find((x: any) => x.username === u) || {};
    return { username: u, displayName: p.displayName || u, avatar: p.avatar || "" };
  });
  res.json(result);
});

router.get("/social/friends/requests", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const reqs = getRequests().filter((r: any) => r.to === me && r.status === "pending");
  const profiles = rd<any[]>("social-profiles.json", []);
  res.json(reqs.map((r: any) => {
    const p = profiles.find((x: any) => x.username === r.from) || {};
    return { username: r.from, displayName: p.displayName || r.from, avatar: p.avatar || "", requestId: r.id, ts: r.ts };
  }));
});

router.get("/social/friends/sent", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const reqs = getRequests().filter((r: any) => r.from === me && r.status === "pending");
  res.json(reqs.map((r: any) => ({ username: r.to, requestId: r.id, ts: r.ts })));
});

router.get("/social/friends/suggestions", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const friends = getFriends();
  const myFriends = new Set(friends[me] || []);
  const follows = rd<any[]>("social-follows.json", []);
  const myFollowing = new Set(follows.filter((f: any) => f.follower === me).map((f: any) => f.following));
  const blocks = rd<Record<string, string[]>>("social-blocks.json", {});
  const blocked = new Set(blocks[me] || []);
  const users = rd<any[]>("users.json", []);
  // Suggest: followers-of-followers + top users not yet friends
  const suggestions: Record<string, number> = {};
  myFollowing.forEach((u: string) => {
    (friends[u] || []).forEach((v: string) => {
      if (v !== me && !myFriends.has(v) && !blocked.has(v) && !myFollowing.has(v)) {
        suggestions[v] = (suggestions[v] || 0) + 1;
      }
    });
  });
  const profiles = rd<any[]>("social-profiles.json", []);
  const result = Object.entries(suggestions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([u, mutuals]) => {
      const p = profiles.find((x: any) => x.username === u) || {};
      return { username: u, displayName: p.displayName || u, avatar: p.avatar || "", mutualFriends: mutuals };
    });
  // If not enough, fill with random users
  if (result.length < 10) {
    users.filter((u: any) => u.username !== me && !myFriends.has(u.username) && !blocked.has(u.username) && !result.find(r => r.username === u.username)).slice(0, 10 - result.length).forEach((u: any) => {
      const p = profiles.find((x: any) => x.username === u.username) || {};
      result.push({ username: u.username, displayName: p.displayName || u.username, avatar: p.avatar || "", mutualFriends: 0 });
    });
  }
  res.json(result);
});

router.post("/social/friends/request/:username", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const to = req.params.username;
  if (!me || me === to) return res.status(400).json({ error: "invalid" });
  const reqs = getRequests();
  if (reqs.find((r: any) => r.from === me && r.to === to && r.status === "pending")) return res.json({ ok: true, alreadySent: true });
  reqs.push({ id: crypto.randomUUID(), from: me, to, status: "pending", ts: new Date().toISOString() });
  saveRequests(reqs);
  pushNotif(to, "friend_req", me, `@${me} sent you a friend request`);
  res.json({ ok: true });
});

router.post("/social/friends/accept/:username", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const from = req.params.username;
  const reqs = getRequests();
  const ri = reqs.findIndex((r: any) => r.from === from && r.to === me && r.status === "pending");
  if (ri < 0) return res.status(404).json({ error: "Request not found" });
  reqs[ri].status = "accepted";
  reqs[ri].acceptedAt = new Date().toISOString();
  saveRequests(reqs);
  // Add to friends both ways
  const friends = getFriends();
  friends[me] = friends[me] || [];
  friends[from] = friends[from] || [];
  if (!friends[me].includes(from)) friends[me].push(from);
  if (!friends[from].includes(me)) friends[from].push(me);
  saveFriends(friends);
  // Also auto-follow each other
  const follows = rd<any[]>("social-follows.json", []);
  if (!follows.find((f: any) => f.follower === me && f.following === from)) follows.push({ follower: me, following: from, createdAt: new Date().toISOString() });
  if (!follows.find((f: any) => f.follower === from && f.following === me)) follows.push({ follower: from, following: me, createdAt: new Date().toISOString() });
  wr("social-follows.json", follows);
  pushNotif(from, "follow", me, `@${me} accepted your friend request! You are now friends.`);
  res.json({ ok: true });
});

router.post("/social/friends/decline/:username", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const from = req.params.username;
  const reqs = getRequests();
  const ri = reqs.findIndex((r: any) => r.from === from && r.to === me && r.status === "pending");
  if (ri >= 0) { reqs[ri].status = "declined"; saveRequests(reqs); }
  res.json({ ok: true });
});

router.post("/social/friends/cancel/:username", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const to = req.params.username;
  const reqs = getRequests();
  wr("friend-requests.json", reqs.filter((r: any) => !(r.from === me && r.to === to && r.status === "pending")));
  res.json({ ok: true });
});

router.post("/social/friends/remove/:username", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const target = req.params.username;
  const friends = getFriends();
  friends[me] = (friends[me] || []).filter((u: string) => u !== target);
  friends[target] = (friends[target] || []).filter((u: string) => u !== me);
  saveFriends(friends);
  res.json({ ok: true });
});

// Close friends
router.get("/social/close-friends", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const cf = rd<Record<string, string[]>>("close-friends.json", {});
  res.json(cf[me] || []);
});

router.post("/social/close-friends/:username", userAuth, (req: any, res) => {
  const me = getLoggedInUser(req)?.username || (req.headers["x-username"] as string) || "";
  const target = req.params.username;
  const cf = rd<Record<string, string[]>>("close-friends.json", {});
  cf[me] = cf[me] || [];
  if (cf[me].includes(target)) {
    cf[me] = cf[me].filter((u: string) => u !== target);
    wr("close-friends.json", cf);
    return res.json({ added: false });
  }
  cf[me].push(target);
  wr("close-friends.json", cf);
  res.json({ added: true });
});

/* ══════════════════════════════════════════════════════════
   COMMUNITY POSTS  (filter by author)
══════════════════════════════════════════════════════════ */
router.get("/community/posts", (req: any, res) => {
  const { author, limit = "30", page = "1" } = req.query || {};
  let posts = rd<any[]>("community-posts.json", []);
  if (author) posts = posts.filter((p: any) => p.author === author);
  const lim = Math.min(parseInt(limit as string) || 30, 100);
  const pg = Math.max(parseInt(page as string) || 1, 1);
  res.json(posts.slice((pg - 1) * lim, pg * lim));
});

/* ══════════════════════════════════════════════════════════
   EXPLORE / SEARCH  (users + posts + channels + groups)
══════════════════════════════════════════════════════════ */
router.get("/explore/search", (req: any, res) => {
  const q = ((req.query.q as string) || "").trim().toLowerCase();
  if (!q) return res.json({ users: [], posts: [], channels: [], groups: [] });
  const users = rd<any[]>("users.json", []).filter((u: any) => u.username?.toLowerCase().includes(q) || u.displayName?.toLowerCase().includes(q)).slice(0, 15).map((u: any) => {
    const profiles = rd<any[]>("social-profiles.json", []);
    const p = profiles.find((x: any) => x.username === u.username) || {};
    return { username: u.username, displayName: p.displayName || u.username, avatar: p.avatar || "", bio: p.bio || "" };
  });
  const posts = rd<any[]>("community-posts.json", []).filter((p: any) => p.text?.toLowerCase().includes(q) || p.author?.toLowerCase().includes(q)).slice(0, 10);
  const channels = rd<any[]>("channels.json", []).filter((c: any) => c.name?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)).slice(0, 10);
  const groups = rd<any[]>("dm-groups.json", []).filter((g: any) => g.name?.toLowerCase().includes(q)).slice(0, 10);
  res.json({ users, posts, channels, groups });
});

export default router;


