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
interface IpMap    { [ip: string]: { approvedAt: string; note?: string } }
interface DeviceInfo {
  os?: string;
  browser?: string;
  deviceType?: string;
  connectionType?: string;
  isMobileData?: boolean;
  userAgent?: string;
}
interface Message  {
  id: string;
  ip: string;
  message: string;
  timestamp: string;
  status: "pending"|"noted";
  deviceInfo?: DeviceInfo;
  type?: "access-request" | "content-request";
  subject?: string;
}
interface Video    { id: string; videoId: string; title: string; subjectId: string; chapterId?: string; desc: string; date: string; course: string; online: boolean }
interface Chapter  { id: string; name: string; order?: number }
interface Subject  { id: string; name: string; course: string; color?: string; chapters: Chapter[]; createdAt: string }
interface UniversalUser { id: string; username: string; password: string; note?: string; createdAt: string }
interface QuizOption   { id: string; text: string }
interface QuizQuestion { id: string; text: string; options: QuizOption[]; correct: string; solution?: string }
interface Quiz         { id: string; title: string; desc: string; timeMinutes: number; published: boolean; createdAt: string; questions: QuizQuestion[] }
interface Notification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  recipients?: string[];   // empty / undefined = broadcast to ALL users
  readBy?: string[];       // usernames who have read it
}
interface DashMenuItem {
  id: string;
  label: string;
  icon: string;            // emoji
  bg: string;              // background color
  chevron: string;         // chevron color
  path: string;            // navigation path (e.g. "/ai-tutor")
  order: number;
  enabled: boolean;
}

/* ── Seed default data ──────────────────────────────────── */
if (!fs.existsSync(path.join(DATA_DIR, "ips.json")))    wr("ips.json",    {});
if (!fs.existsSync(path.join(DATA_DIR, "msgs.json")))   wr("msgs.json",   []);
if (!fs.existsSync(path.join(DATA_DIR, "users.json")))  wr("users.json",  []);
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
  { id:"m9", label:"Q&A Service",      icon:"💬", bg:"#e0f7fa", chevron:"#2e7d32", path:"/",             order:9,  enabled:true },
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
   AUTH HELPERS
══════════════════════════════════════════════════════════ */
const ADMIN_SESSIONS = new Set<string>();
const ADMIN_USER = "htr";
const ADMIN_PASS = "htr0";

// universal user token → username
const USER_SESSIONS = new Map<string, string>();

function clientIp(req: any): string {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return (Array.isArray(fwd) ? fwd[0] : fwd.split(",")[0]).trim();
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function getUserToken(req: any): string | null {
  const auth = req.headers["authorization"] || req.headers["x-user-token"];
  if (!auth) return null;
  return auth.replace("Bearer ", "").trim() || null;
}

/** Returns true if request comes from an approved IP OR a valid universal-user token */
function isAllowed(req: any): boolean {
  // Check universal user token first
  const token = getUserToken(req);
  if (token && USER_SESSIONS.has(token)) return true;
  // Check IP
  const ip  = clientIp(req);
  const ips = rd<IpMap>("ips.json", {});
  if (ip in ips) return true;
  // Localhost always allowed (dev)
  if (ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1") return true;
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

/* ══════════════════════════════════════════════════════════
   PUBLIC — IP / ACCESS CHECK
══════════════════════════════════════════════════════════ */

router.get("/check-ip", (req, res) => {
  const token   = getUserToken(req);
  const isUser  = !!(token && USER_SESSIONS.has(token));
  const ip      = clientIp(req);
  const ips     = rd<IpMap>("ips.json", {});
  const ipOk    = ip in ips || ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
  res.json({ allowed: isUser || ipOk, ip, universalUser: isUser, username: isUser ? USER_SESSIONS.get(token!) : null });
});

/* POST /api/message  — blocked visitor sends a request */
router.post("/message", (req, res) => {
  const ip      = clientIp(req);
  const { message, deviceInfo } = req.body;
  if (!message) return res.status(400).json({ error: "message required" });
  const msgs = rd<Message[]>("msgs.json", []);
  msgs.push({
    id: crypto.randomUUID(),
    ip,
    message,
    timestamp: new Date().toISOString(),
    status: "pending",
    type: "access-request",
    deviceInfo: deviceInfo || undefined,
  });
  wr("msgs.json", msgs);
  res.json({ ok: true });
});

/* POST /api/content-request  — logged-in student requests course access */
router.post("/content-request", userAuth, (req, res) => {
  const ip = clientIp(req);
  const token = getUserToken(req);
  const username = token ? USER_SESSIONS.get(token) : null;
  const { subject, message, deviceInfo } = req.body;
  if (!subject) return res.status(400).json({ error: "subject required" });
  const msgs = rd<Message[]>("msgs.json", []);
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

/* ══════════════════════════════════════════════════════════
   UNIVERSAL USER AUTH
══════════════════════════════════════════════════════════ */

/* POST /api/user/login */
router.post("/user/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "username and password required" });
  const users = rd<UniversalUser[]>("users.json", []);
  const user  = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid username or password" });
  const token = crypto.randomUUID();
  USER_SESSIONS.set(token, user.username);
  res.json({ token, username: user.username });
});

/* GET /api/validate-token */
router.get("/validate-token", (req, res) => {
  const token = getUserToken(req);
  if (!token || !USER_SESSIONS.has(token)) return res.json({ valid: false });
  res.json({ valid: true, username: USER_SESSIONS.get(token) });
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
router.get("/videos", userAuth, (_req, res) => {
  res.json(rd<Video[]>("vids.json", []));
});

/* ══════════════════════════════════════════════════════════
   STUDENT — NOTIFICATIONS
══════════════════════════════════════════════════════════ */
router.get("/notifications", userAuth, (req, res) => {
  const token = getUserToken(req);
  const username = token ? USER_SESSIONS.get(token) || null : null;
  const all = rd<Notification[]>("notifs.json", []);
  // Filter: include if broadcast (no recipients), or recipients includes user.
  // IP-only visitors (no username) only see broadcasts.
  const visible = all.filter(n => {
    const r = n.recipients;
    if (!r || r.length === 0) return true;
    return username ? r.includes(username) : false;
  });
  // Decorate with `read` flag for the current user
  const decorated = visible.map(n => ({
    ...n,
    read: username ? !!(n.readBy?.includes(username)) : false,
  }));
  res.json(decorated);
});

router.post("/notifications/:id/read", userAuth, (req, res) => {
  const token = getUserToken(req);
  const username = token ? USER_SESSIONS.get(token) : null;
  if (!username) return res.json({ ok: true }); // IP-only visitors: no-op
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

/* ── Dashboard menu (public — anyone with access) ── */
router.get("/dashboard-menu", userAuth, (_req, res) => {
  const items = rd<DashMenuItem[]>("dashmenu.json", []);
  res.json(items.filter(i => i.enabled).sort((a, b) => a.order - b.order));
});

/* ══════════════════════════════════════════════════════════
   STUDENT — QUIZZES
══════════════════════════════════════════════════════════ */
router.get("/quizzes", userAuth, (_req, res) => {
  const all = rd<Quiz[]>("quizzes.json", []);
  // Return published quizzes WITHOUT exposing correct answers
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
  // Return questions WITHOUT correct answer / solution (hidden until submit)
  const safeQ = quiz.questions.map(q => ({
    id: q.id, text: q.text, options: q.options,
  }));
  res.json({ id: quiz.id, title: quiz.title, desc: quiz.desc, timeMinutes: quiz.timeMinutes, questions: safeQ });
});

/* POST /api/quiz-submit  { quizId, answers: { qId: optId } } */
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
   ADMIN — MESSAGES
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

/* ══════════════════════════════════════════════════════════
   ADMIN — IPs
══════════════════════════════════════════════════════════ */
router.get("/admin/ips",           adminAuth, (_r, res) => {
  const ips = rd<IpMap>("ips.json",{});
  res.json(Object.entries(ips).map(([ip,v])=>({ip,...v})));
});
router.post("/admin/ips",          adminAuth, (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({error:"ip required"});
  const ips = rd<IpMap>("ips.json",{});
  ips[ip.trim()] = {approvedAt: new Date().toISOString()};
  wr("ips.json",ips); res.json({ok:true});
});
router.delete("/admin/ips/:ip",    adminAuth, (req, res) => {
  const ips = rd<IpMap>("ips.json",{});
  delete ips[decodeURIComponent(req.params.ip)];
  wr("ips.json",ips); res.json({ok:true});
});

/* ══════════════════════════════════════════════════════════
   ADMIN — UNIVERSAL USERS
══════════════════════════════════════════════════════════ */
router.get("/admin/users",         adminAuth, (_r, res) => {
  const users = rd<UniversalUser[]>("users.json",[]);
  res.json(users.map(u=>({id:u.id,username:u.username,note:u.note,createdAt:u.createdAt})));
});
router.post("/admin/users",        adminAuth, (req, res) => {
  const { username, password, note } = req.body;
  if (!username || !password) return res.status(400).json({error:"username and password required"});
  const users = rd<UniversalUser[]>("users.json",[]);
  if (users.find(u=>u.username===username)) return res.status(400).json({error:"Username already exists"});
  const user: UniversalUser = { id:crypto.randomUUID(), username:username.trim(), password, note:note||"", createdAt:new Date().toISOString() };
  users.push(user);
  wr("users.json",users);
  res.json({id:user.id, username:user.username, createdAt:user.createdAt});
});
router.delete("/admin/users/:id",  adminAuth, (req, res) => {
  const users = rd<UniversalUser[]>("users.json",[]);
  // Revoke all sessions for this user
  const target = users.find(u=>u.id===req.params.id);
  if (target) {
    for (const [tok, uname] of USER_SESSIONS.entries()) {
      if (uname===target.username) USER_SESSIONS.delete(tok);
    }
  }
  wr("users.json", users.filter(u=>u.id!==req.params.id));
  res.json({ok:true});
});
/* PATCH /admin/users/:id/password */
router.patch("/admin/users/:id/password", adminAuth, (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({error:"password required"});
  const users = rd<UniversalUser[]>("users.json",[]);
  const i = users.findIndex(u=>u.id===req.params.id);
  if (i===-1) return res.status(404).json({error:"Not found"});
  users[i].password = password;
  wr("users.json",users); res.json({ok:true});
});

/* POST /admin/msgs/:id/quick-user — Create account from inbox message & auto-mark noted */
router.post("/admin/msgs/:id/quick-user", adminAuth, (req, res) => {
  const { username, password, note } = req.body;
  if (!username || !password) return res.status(400).json({ error: "username and password required" });
  const users = rd<UniversalUser[]>("users.json", []);
  if (users.find(u => u.username === username)) return res.status(400).json({ error: "Username already exists" });
  const user: UniversalUser = { id: crypto.randomUUID(), username: username.trim(), password, note: note || "", createdAt: new Date().toISOString() };
  users.push(user);
  wr("users.json", users);
  // Mark the message as noted
  const msgs = rd<Message[]>("msgs.json", []);
  const i = msgs.findIndex(m => m.id === req.params.id);
  if (i !== -1) { msgs[i].status = "noted"; wr("msgs.json", msgs); }
  res.json({ id: user.id, username: user.username, createdAt: user.createdAt });
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

/* Bulk transfer videos to a different subject (and optional chapter) */
router.post("/admin/videos/transfer", adminAuth, (req, res) => {
  const { videoIds, targetSubjectId, targetChapterId } = req.body as {
    videoIds: string[]; targetSubjectId: string; targetChapterId?: string;
  };
  if (!Array.isArray(videoIds) || !targetSubjectId) {
    return res.status(400).json({ error: "videoIds[] and targetSubjectId required" });
  }
  const subjects = rd<Subject[]>("subjects.json", []);
  const subj = subjects.find(s => s.id === targetSubjectId);
  if (!subj) return res.status(404).json({ error: "Target subject not found" });
  if (targetChapterId && !subj.chapters.find(c => c.id === targetChapterId)) {
    return res.status(400).json({ error: "Target chapter not in target subject" });
  }
  const vids = rd<Video[]>("vids.json", []);
  const ids = new Set(videoIds);
  let moved = 0;
  for (const v of vids) {
    if (ids.has(v.id)) {
      v.subjectId = targetSubjectId;
      v.chapterId = targetChapterId || undefined;
      moved++;
    }
  }
  wr("vids.json", vids);
  res.json({ ok: true, moved });
});

/* ── ADMIN — SUBJECTS & CHAPTERS ───────────────────────── */
router.get("/admin/subjects", adminAuth, (_r, res) => {
  res.json(rd<Subject[]>("subjects.json", []));
});
router.post("/admin/subjects", adminAuth, (req, res) => {
  const { name, course, color } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });
  const subjects = rd<Subject[]>("subjects.json", []);
  const subj: Subject = {
    id: "sub-" + crypto.randomUUID().slice(0, 8),
    name: String(name).trim(),
    course: String(course || "").trim(),
    color: color || "#7c3aed",
    chapters: [],
    createdAt: new Date().toISOString(),
  };
  subjects.push(subj);
  wr("subjects.json", subjects);
  res.json(subj);
});
router.put("/admin/subjects/:id", adminAuth, (req, res) => {
  const subjects = rd<Subject[]>("subjects.json", []);
  const i = subjects.findIndex(s => s.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: "Not found" });
  const b = req.body || {};
  subjects[i] = {
    ...subjects[i],
    ...(b.name !== undefined ? { name: String(b.name).trim() } : {}),
    ...(b.course !== undefined ? { course: String(b.course).trim() } : {}),
    ...(b.color !== undefined ? { color: String(b.color) } : {}),
  };
  wr("subjects.json", subjects);
  res.json(subjects[i]);
});
router.delete("/admin/subjects/:id", adminAuth, (req, res) => {
  const subjects = rd<Subject[]>("subjects.json", []);
  const next = subjects.filter(s => s.id !== req.params.id);
  if (next.length === subjects.length) return res.status(404).json({ error: "Not found" });
  wr("subjects.json", next);
  // Detach videos from this subject
  const vids = rd<Video[]>("vids.json", []);
  let changed = false;
  for (const v of vids) if (v.subjectId === req.params.id) { v.subjectId = ""; v.chapterId = undefined; changed = true; }
  if (changed) wr("vids.json", vids);
  res.json({ ok: true });
});
router.post("/admin/subjects/:id/chapters", adminAuth, (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });
  const subjects = rd<Subject[]>("subjects.json", []);
  const subj = subjects.find(s => s.id === req.params.id);
  if (!subj) return res.status(404).json({ error: "Subject not found" });
  const ch: Chapter = { id: "ch-" + crypto.randomUUID().slice(0, 8), name: String(name).trim(), order: subj.chapters.length + 1 };
  subj.chapters.push(ch);
  wr("subjects.json", subjects);
  res.json(ch);
});
router.put("/admin/subjects/:sid/chapters/:cid", adminAuth, (req, res) => {
  const subjects = rd<Subject[]>("subjects.json", []);
  const subj = subjects.find(s => s.id === req.params.sid);
  if (!subj) return res.status(404).json({ error: "Subject not found" });
  const ch = subj.chapters.find(c => c.id === req.params.cid);
  if (!ch) return res.status(404).json({ error: "Chapter not found" });
  if (req.body?.name !== undefined) ch.name = String(req.body.name).trim();
  if (typeof req.body?.order === "number") ch.order = req.body.order;
  wr("subjects.json", subjects);
  res.json(ch);
});
router.delete("/admin/subjects/:sid/chapters/:cid", adminAuth, (req, res) => {
  const subjects = rd<Subject[]>("subjects.json", []);
  const subj = subjects.find(s => s.id === req.params.sid);
  if (!subj) return res.status(404).json({ error: "Subject not found" });
  subj.chapters = subj.chapters.filter(c => c.id !== req.params.cid);
  wr("subjects.json", subjects);
  // Detach videos from this chapter
  const vids = rd<Video[]>("vids.json", []);
  let changed = false;
  for (const v of vids) if (v.chapterId === req.params.cid) { v.chapterId = undefined; changed = true; }
  if (changed) wr("vids.json", vids);
  res.json({ ok: true });
});

/* Public subject list (for student-side filters / future use) */
router.get("/subjects", userAuth, (_req, res) => {
  res.json(rd<Subject[]>("subjects.json", []));
});

/* ── ADMIN — YOUTUBE PLAYLIST IMPORT (no API key required!) ──
   Uses YouTube's internal `youtubei/v1/browse` endpoint. Works for any
   public or unlisted playlist with no Google Cloud setup, no quota, no key. */
function extractPlaylistId(input: string): string | null {
  const s = (input || "").trim();
  if (!s) return null;
  // Try URL first
  try {
    const u = new URL(s);
    const list = u.searchParams.get("list");
    if (list) return list;
  } catch { /* not a URL */ }
  // Bare ID
  if (/^[A-Za-z0-9_-]{10,}$/.test(s) && !s.includes("/")) return s;
  // Last-ditch regex
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
  const body: any = {
    context: { client: { clientName: "WEB", clientVersion: "2.20240101.00.00", hl: "en", gl: "US" } },
  };
  if (continuation) body.continuation = continuation;
  else body.browseId = `VL${playlistId}`;
  const r = await fetch(YT_BROWSE_URL, { method: "POST", headers: YT_HEADERS, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`YouTube responded ${r.status}`);
  return r.json();
}

function ytExtractVideos(data: any): Array<{ videoId: string; title: string; thumbnail: string; duration: string }> {
  const out: Array<{ videoId: string; title: string; thumbnail: string; duration: string }> = [];
  const visit = (n: any) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) { n.forEach(visit); return; }
    const r = n.playlistVideoRenderer;
    if (r) {
      const vid = r.videoId;
      const title = r.title?.runs?.[0]?.text || r.title?.simpleText || "";
      const thumb = r.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || (vid ? `https://i.ytimg.com/vi/${vid}/mqdefault.jpg` : "");
      const duration = r.lengthText?.simpleText || r.lengthText?.runs?.[0]?.text || "";
      if (vid && title && title !== "[Private video]" && title !== "[Deleted video]") {
        out.push({ videoId: vid, title, thumbnail: thumb, duration });
      }
    }
    for (const v of Object.values(n)) visit(v);
  };
  visit(data);
  return out;
}

function ytExtractContinuation(data: any): string | null {
  // Look for the "continuation" token in continuationItemRenderer
  const visit = (n: any): string | null => {
    if (!n || typeof n !== "object") return null;
    if (Array.isArray(n)) { for (const x of n) { const t = visit(x); if (t) return t; } return null; }
    if (n.continuationCommand?.token) return n.continuationCommand.token;
    if (n.continuationItemRenderer) { const t = visit(n.continuationItemRenderer); if (t) return t; }
    for (const v of Object.values(n)) { const t = visit(v); if (t) return t; }
    return null;
  };
  return visit(data);
}

function ytExtractPlaylistTitle(data: any): string {
  return (
    data?.header?.playlistHeaderRenderer?.title?.simpleText ||
    data?.header?.playlistHeaderRenderer?.title?.runs?.[0]?.text ||
    data?.metadata?.playlistMetadataRenderer?.title ||
    "YouTube Playlist"
  );
}

/** STEP 1 — Fetch a playlist's videos (no DB writes) */
router.post("/admin/playlist/fetch", adminAuth, async (req, res) => {
  const { playlist } = req.body || {};
  const pid = extractPlaylistId(playlist);
  if (!pid) return res.status(400).json({ error: "Couldn't find a YouTube playlist ID in that URL. Paste a link like https://youtube.com/playlist?list=..." });

  try {
    const all: Array<{ videoId: string; title: string; thumbnail: string; duration: string }> = [];
    let continuation: string | null = null;
    let title = "YouTube Playlist";
    for (let page = 0; page < 12; page++) { // ~100 vids per page; safety cap ~1200
      const data: any = await fetchYtPlaylistPage(pid, continuation || undefined);
      if (page === 0) title = ytExtractPlaylistTitle(data);
      all.push(...ytExtractVideos(data));
      continuation = ytExtractContinuation(data);
      if (!continuation) break;
    }
    if (all.length === 0) {
      return res.status(404).json({ error: "Playlist is empty, private, or not accessible. Make sure it's Public or Unlisted." });
    }
    // Mark which ones already exist in our library
    const existing = new Set(rd<Video[]>("vids.json", []).map(v => v.videoId));
    res.json({
      title,
      playlistId: pid,
      total: all.length,
      videos: all.map(v => ({ ...v, exists: existing.has(v.videoId) })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch playlist from YouTube" });
  }
});

/** STEP 2 — Bulk create videos (used after the user picks which ones to import) */
router.post("/admin/videos/bulk", adminAuth, (req, res) => {
  const { videos, subjectId, chapterId, course, online } = req.body || {};
  if (!Array.isArray(videos) || videos.length === 0) {
    return res.status(400).json({ error: "videos[] is required" });
  }
  const list = rd<Video[]>("vids.json", []);
  const existing = new Set(list.map(v => v.videoId));
  let added = 0;
  const created: Video[] = [];
  for (const it of videos) {
    const vid = String(it?.videoId || "").trim();
    const title = String(it?.title || "").trim();
    if (!vid || !title) continue;
    if (existing.has(vid)) continue;
    const v: Video = {
      id: crypto.randomUUID(),
      videoId: vid,
      title,
      subjectId: subjectId || "",
      chapterId: chapterId || undefined,
      desc: String(it?.desc || it?.duration || "").slice(0, 800),
      date: new Date().toLocaleString(),
      course: course || "",
      online: !!online,
    };
    created.push(v);
    existing.add(vid);
    added++;
  }
  // Prepend in original playlist order (not reversed) so sequential playback works correctly
  const updatedList = [...created, ...list];
  wr("vids.json", updatedList);
  res.json({ ok: true, total: videos.length, added, skipped: videos.length - added, created });
});

/* ══════════════════════════════════════════════════════════
   ADMIN — QUIZZES
══════════════════════════════════════════════════════════ */
router.get("/admin/quizzes",           adminAuth, (_r, res) => res.json(rd<Quiz[]>("quizzes.json",[])));
router.post("/admin/quizzes",          adminAuth, (req, res) => {
  const { title, desc, timeMinutes, questions } = req.body;
  if (!title) return res.status(400).json({error:"title required"});
  const quizzes = rd<Quiz[]>("quizzes.json",[]);
  const quiz: Quiz = {
    id: crypto.randomUUID(), title, desc:desc||"", timeMinutes:timeMinutes||30,
    published:false, createdAt:new Date().toISOString(), questions: questions||[],
  };
  quizzes.unshift(quiz); wr("quizzes.json",quizzes); res.json(quiz);
});
router.put("/admin/quizzes/:id",       adminAuth, (req, res) => {
  const quizzes = rd<Quiz[]>("quizzes.json",[]);
  const i = quizzes.findIndex(q=>q.id===req.params.id);
  if (i===-1) return res.status(404).json({error:"Not found"});
  quizzes[i] = {...quizzes[i], ...req.body, id:quizzes[i].id};
  wr("quizzes.json",quizzes); res.json(quizzes[i]);
});
router.patch("/admin/quizzes/:id/publish", adminAuth, (req, res) => {
  const quizzes = rd<Quiz[]>("quizzes.json",[]);
  const i = quizzes.findIndex(q=>q.id===req.params.id);
  if (i===-1) return res.status(404).json({error:"Not found"});
  quizzes[i].published = !quizzes[i].published;
  wr("quizzes.json",quizzes); res.json({published:quizzes[i].published});
});
router.delete("/admin/quizzes/:id",    adminAuth, (req, res) => {
  wr("quizzes.json", rd<Quiz[]>("quizzes.json",[]).filter(q=>q.id!==req.params.id)); res.json({ok:true});
});

/* ══════════════════════════════════════════════════════════
   ADMIN — NOTIFICATIONS (bulk send to all users)
══════════════════════════════════════════════════════════ */
router.get("/admin/notifications",     adminAuth, (_r, res) => res.json(rd<Notification[]>("notifs.json",[])));
router.post("/admin/notifications",    adminAuth, (req, res) => {
  const { title, body, recipients } = req.body;
  if (!title||!body) return res.status(400).json({error:"title and body required"});
  // recipients: array of usernames OR null/undefined/[] = broadcast to all
  let recList: string[] = [];
  if (Array.isArray(recipients)) {
    const users = rd<UniversalUser[]>("users.json", []);
    const valid = new Set(users.map(u => u.username));
    recList = recipients.filter(r => typeof r === "string" && valid.has(r));
  }
  const notifs = rd<Notification[]>("notifs.json",[]);
  const n: Notification = {
    id: crypto.randomUUID(),
    title, body,
    createdAt: new Date().toISOString(),
    recipients: recList,
    readBy: [],
  };
  notifs.unshift(n); wr("notifs.json",notifs); res.json(n);
});
router.delete("/admin/notifications/:id", adminAuth, (req, res) => {
  wr("notifs.json", rd<Notification[]>("notifs.json",[]).filter(n=>n.id!==req.params.id)); res.json({ok:true});
});

/* ── Admin: Dashboard menu CRUD ── */
router.get("/admin/dashboard-menu", adminAuth, (_r, res) => {
  res.json(rd<DashMenuItem[]>("dashmenu.json", []).sort((a,b)=>a.order-b.order));
});
router.post("/admin/dashboard-menu", adminAuth, (req, res) => {
  const { label, icon, bg, chevron, path: navPath, order, enabled } = req.body || {};
  if (!label || !icon) return res.status(400).json({ error: "label and icon required" });
  const items = rd<DashMenuItem[]>("dashmenu.json", []);
  const item: DashMenuItem = {
    id: crypto.randomUUID(),
    label: String(label).trim(),
    icon: String(icon).trim(),
    bg: bg || "#f3f4f6",
    chevron: chevron || "#666",
    path: navPath || "/",
    order: typeof order === "number" ? order : (items.length + 1),
    enabled: enabled !== false,
  };
  items.push(item);
  wr("dashmenu.json", items);
  res.json(item);
});
router.put("/admin/dashboard-menu/:id", adminAuth, (req, res) => {
  const items = rd<DashMenuItem[]>("dashmenu.json", []);
  const i = items.findIndex(x => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: "Not found" });
  const b = req.body || {};
  items[i] = {
    ...items[i],
    ...(b.label !== undefined ? { label: String(b.label).trim() } : {}),
    ...(b.icon !== undefined ? { icon: String(b.icon).trim() } : {}),
    ...(b.bg !== undefined ? { bg: String(b.bg) } : {}),
    ...(b.chevron !== undefined ? { chevron: String(b.chevron) } : {}),
    ...(b.path !== undefined ? { path: String(b.path) } : {}),
    ...(typeof b.order === "number" ? { order: b.order } : {}),
    ...(typeof b.enabled === "boolean" ? { enabled: b.enabled } : {}),
  };
  wr("dashmenu.json", items);
  res.json(items[i]);
});
router.delete("/admin/dashboard-menu/:id", adminAuth, (req, res) => {
  wr("dashmenu.json", rd<DashMenuItem[]>("dashmenu.json", []).filter(x => x.id !== req.params.id));
  res.json({ ok: true });
});
router.post("/admin/dashboard-menu/reorder", adminAuth, (req, res) => {
  const { ids } = req.body as { ids: string[] };
  if (!Array.isArray(ids)) return res.status(400).json({ error: "ids array required" });
  const items = rd<DashMenuItem[]>("dashmenu.json", []);
  ids.forEach((id, idx) => {
    const it = items.find(x => x.id === id);
    if (it) it.order = idx + 1;
  });
  wr("dashmenu.json", items);
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════
   ADMIN — MANUAL DATABASE EDITOR
   Allows raw read/write of any JSON file in DATA_DIR.
══════════════════════════════════════════════════════════ */
function safeName(name: string): string | null {
  if (!/^[a-zA-Z0-9_\-]+\.json$/.test(name)) return null;
  return name;
}

router.get("/admin/db/files", adminAuth, (_r, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR)
      .filter(f => f.endsWith(".json"))
      .map(f => {
        const p = path.join(DATA_DIR, f);
        const st = fs.statSync(p);
        return { name: f, size: st.size, mtime: st.mtime.toISOString() };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json(files);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/db/file/:name", adminAuth, (req, res) => {
  const name = safeName(req.params.name);
  if (!name) return res.status(400).json({ error: "Invalid filename" });
  const p = path.join(DATA_DIR, name);
  if (!fs.existsSync(p)) return res.status(404).json({ error: "File not found" });
  try {
    const raw = fs.readFileSync(p, "utf-8");
    res.type("application/json").send(raw);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/admin/db/file/:name", adminAuth, (req, res) => {
  const name = safeName(req.params.name);
  if (!name) return res.status(400).json({ error: "Invalid filename" });
  const { content } = req.body as { content: string };
  if (typeof content !== "string") return res.status(400).json({ error: "content (string) required" });
  // Validate JSON before writing
  let parsed: any;
  try { parsed = JSON.parse(content); }
  catch (e: any) { return res.status(422).json({ error: "Invalid JSON: " + e.message }); }
  // Pretty-write
  try {
    // Backup first
    const p = path.join(DATA_DIR, name);
    if (fs.existsSync(p)) {
      const bakDir = path.join(DATA_DIR, ".backups");
      if (!fs.existsSync(bakDir)) fs.mkdirSync(bakDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      fs.copyFileSync(p, path.join(bakDir, `${name}.${stamp}.bak`));
    }
    fs.writeFileSync(p, JSON.stringify(parsed, null, 2));
    res.json({ ok: true, bytes: fs.statSync(p).size });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/db/file/:name", adminAuth, (req, res) => {
  // Create new file with empty content
  const name = safeName(req.params.name);
  if (!name) return res.status(400).json({ error: "Invalid filename" });
  const p = path.join(DATA_DIR, name);
  if (fs.existsSync(p)) return res.status(409).json({ error: "File already exists" });
  try {
    const init = req.body?.content ?? "[]";
    JSON.parse(init); // validate
    fs.writeFileSync(p, init);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(422).json({ error: "Invalid JSON: " + err.message });
  }
});

router.delete("/admin/db/file/:name", adminAuth, (req, res) => {
  const name = safeName(req.params.name);
  if (!name) return res.status(400).json({ error: "Invalid filename" });
  const p = path.join(DATA_DIR, name);
  if (!fs.existsSync(p)) return res.status(404).json({ error: "Not found" });
  try {
    const bakDir = path.join(DATA_DIR, ".backups");
    if (!fs.existsSync(bakDir)) fs.mkdirSync(bakDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.renameSync(p, path.join(bakDir, `${name}.${stamp}.deleted`));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
