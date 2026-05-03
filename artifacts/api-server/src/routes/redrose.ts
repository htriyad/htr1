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
interface DoubtQuestion {
  id: string; ip: string; username?: string; fullName?: string;
  question: string; audioData?: string; imageData?: string;
  timestamp: string; status: "open" | "answered";
  reply?: { text?: string; audioData?: string; repliedAt: string };
}
if (!fs.existsSync(path.join(DATA_DIR, "doubts.json"))) wr("doubts.json", []);

router.post("/doubts", userAuth, (req, res) => {
  const ip = clientIp(req);
  const { question, audioData, imageData, fullName } = req.body || {};
  if (!question?.trim() && !audioData) return res.status(400).json({ error: "question or audio required" });
  const username = getLoggedInUser(req)?.username;
  const doubts = rd<DoubtQuestion[]>("doubts.json", []);
  const item: DoubtQuestion = {
    id: crypto.randomUUID(), ip, username,
    fullName: String(fullName || username || "Student").slice(0, 100),
    question: String(question || "").slice(0, 3000),
    audioData: audioData ? String(audioData).slice(0, 8_000_000) : undefined,
    imageData: imageData ? String(imageData).slice(0, 8_000_000) : undefined,
    timestamp: new Date().toISOString(), status: "open",
  };
  doubts.unshift(item);
  wr("doubts.json", doubts.slice(0, 500));
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
  const { text, audioData } = req.body || {};
  const doubts = rd<DoubtQuestion[]>("doubts.json", []);
  const i = doubts.findIndex(d => d.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: "Not found" });
  doubts[i].reply = {
    text: text ? String(text).slice(0, 5000) : undefined,
    audioData: audioData ? String(audioData).slice(0, 8_000_000) : undefined,
    repliedAt: new Date().toISOString(),
  };
  doubts[i].status = "answered";
  wr("doubts.json", doubts);
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

export default router;
