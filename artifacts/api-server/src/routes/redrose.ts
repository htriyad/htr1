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
interface Message  { id: string; ip: string; message: string; timestamp: string; status: "pending"|"noted" }
interface Video    { id: string; videoId: string; title: string; subjectId: string; desc: string; date: string; course: string; online: boolean }
interface UniversalUser { id: string; username: string; password: string; note?: string; createdAt: string }
interface QuizOption   { id: string; text: string }
interface QuizQuestion { id: string; text: string; options: QuizOption[]; correct: string; solution?: string }
interface Quiz         { id: string; title: string; desc: string; timeMinutes: number; published: boolean; createdAt: string; questions: QuizQuestion[] }
interface Notification { id: string; title: string; body: string; createdAt: string }

/* ── Seed default data ──────────────────────────────────── */
if (!fs.existsSync(path.join(DATA_DIR, "ips.json")))    wr("ips.json",    {});
if (!fs.existsSync(path.join(DATA_DIR, "msgs.json")))   wr("msgs.json",   []);
if (!fs.existsSync(path.join(DATA_DIR, "users.json")))  wr("users.json",  []);
if (!fs.existsSync(path.join(DATA_DIR, "quizzes.json")))wr("quizzes.json",[]);
if (!fs.existsSync(path.join(DATA_DIR, "notifs.json"))) wr("notifs.json", []);
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
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "message required" });
  const msgs = rd<Message[]>("msgs.json", []);
  msgs.push({ id: crypto.randomUUID(), ip, message, timestamp: new Date().toISOString(), status: "pending" });
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
router.get("/notifications", userAuth, (_req, res) => {
  res.json(rd<Notification[]>("notifs.json", []));
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
router.delete("/admin/videos/:id", adminAuth, (req, res) => {
  wr("vids.json", rd<Video[]>("vids.json",[]).filter(v=>v.id!==req.params.id)); res.json({ok:true});
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
  const { title, body } = req.body;
  if (!title||!body) return res.status(400).json({error:"title and body required"});
  const notifs = rd<Notification[]>("notifs.json",[]);
  const n: Notification = { id:crypto.randomUUID(), title, body, createdAt:new Date().toISOString() };
  notifs.unshift(n); wr("notifs.json",notifs); res.json(n);
});
router.delete("/admin/notifications/:id", adminAuth, (req, res) => {
  wr("notifs.json", rd<Notification[]>("notifs.json",[]).filter(n=>n.id!==req.params.id)); res.json({ok:true});
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
