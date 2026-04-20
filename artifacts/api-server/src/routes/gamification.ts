import { Router } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const router = Router();
const DATA_DIR = path.resolve(process.cwd(), "data");

function rd<T>(f: string, d: T): T {
  const p = path.join(DATA_DIR, f);
  if (!fs.existsSync(p)) return d;
  try { return JSON.parse(fs.readFileSync(p,"utf-8")); } catch { return d; }
}
function wr(f: string, d: unknown) {
  fs.writeFileSync(path.join(DATA_DIR, f), JSON.stringify(d, null, 2));
}

interface Progress {
  id: string; displayName: string; xp: number; level: number; streak: number;
  lastActive: string; badges: string[];
  examHistory: { quizId: string; title: string; score: number; total: number; pct: number; date: string; timeSecs: number }[];
  topicScores: Record<string, { correct: number; total: number }>;
  totalExams: number; totalCorrect: number; totalAnswers: number;
}

const BADGES: Record<string, { label: string; icon: string; cond: (p: Progress) => boolean }> = {
  first_exam:    { label:"First Exam",        icon:"🎯", cond: p => p.totalExams >= 1 },
  streak_3:      { label:"3-Day Streak",       icon:"🔥", cond: p => p.streak >= 3 },
  streak_7:      { label:"Week Warrior",       icon:"⚡", cond: p => p.streak >= 7 },
  streak_30:     { label:"Monthly Master",     icon:"🏆", cond: p => p.streak >= 30 },
  exams_10:      { label:"Exam Machine",       icon:"💪", cond: p => p.totalExams >= 10 },
  perfect_score: { label:"Perfect Score",      icon:"⭐", cond: p => p.examHistory.some(e => e.pct === 100) },
  xp_1000:       { label:"Rising Star",        icon:"🌟", cond: p => p.xp >= 1000 },
  xp_5000:       { label:"Scholar",            icon:"🎓", cond: p => p.xp >= 5000 },
  accuracy_90:   { label:"Sharp Shooter",      icon:"🎯", cond: p => p.totalAnswers >= 20 && (p.totalCorrect/p.totalAnswers) >= 0.9 },
};

function level(xp: number): number { return Math.floor(1 + Math.sqrt(xp / 100)); }

function getUid(req: any): string {
  const auth  = req.headers["authorization"]?.replace("Bearer ","");
  const uname = req.headers["x-username"];
  if (uname) return `user:${uname}`;
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "unknown";
  return `ip:${ip}`;
}

function getOrCreate(id: string, displayName?: string): Progress {
  const all = rd<Record<string,Progress>>("progress.json", {});
  if (!all[id]) {
    all[id] = { id, displayName: displayName||id.split(":")[1]||id, xp:0, level:1, streak:0, lastActive:"", badges:[], examHistory:[], topicScores:{}, totalExams:0, totalCorrect:0, totalAnswers:0 };
    wr("progress.json", all);
  }
  return all[id];
}

function save(p: Progress) {
  const all = rd<Record<string,Progress>>("progress.json", {});
  // Update streak
  const today = new Date().toDateString();
  const last  = p.lastActive ? new Date(p.lastActive).toDateString() : "";
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (last === today) { /* same day, no change */ }
  else if (last === yesterday) { p.streak++; }
  else if (last !== today) { p.streak = 1; }
  p.lastActive = new Date().toISOString();
  p.level = level(p.xp);
  // Award badges
  for (const [key, b] of Object.entries(BADGES)) {
    if (!p.badges.includes(key) && b.cond(p)) p.badges.push(key);
  }
  all[p.id] = p;
  wr("progress.json", all);
}

/* GET /api/gamification/me */
router.get("/me", (req, res) => {
  const id = getUid(req);
  const p  = getOrCreate(id);
  res.json({ ...p, level: level(p.xp), badgeDetails: p.badges.map(k => BADGES[k] ? {key:k,...BADGES[k]} : null).filter(Boolean) });
});

/* POST /api/gamification/exam-complete */
router.post("/exam-complete", (req, res) => {
  const { quizId, quizTitle, score, total, timeSecs, topicScores } = req.body;
  const id = getUid(req);
  const p  = getOrCreate(id);
  const pct = total > 0 ? Math.round((score/total)*100) : 0;
  const xpGained = Math.round(10 + (pct/100)*50 + (score*2));
  p.xp += xpGained;
  p.totalExams++;
  p.totalCorrect  += score;
  p.totalAnswers  += total;
  p.examHistory.unshift({ quizId, title: quizTitle||"Quiz", score, total, pct, date: new Date().toISOString(), timeSecs: timeSecs||0 });
  if (p.examHistory.length > 50) p.examHistory = p.examHistory.slice(0, 50);
  // merge topic scores
  if (topicScores) {
    for (const [t, v] of Object.entries(topicScores as Record<string,{c:number;t:number}>)) {
      if (!p.topicScores[t]) p.topicScores[t] = {correct:0,total:0};
      p.topicScores[t].correct += v.c;
      p.topicScores[t].total   += v.t;
    }
  }
  save(p);
  const newBadges = p.badges.filter(k => !getOrCreate(id).badges.includes(k));
  res.json({ xpGained, totalXP: p.xp, level: p.level, streak: p.streak, badges: p.badges, newBadges });
});

/* GET /api/gamification/leaderboard */
router.get("/leaderboard", (req, res) => {
  const all = rd<Record<string,Progress>>("progress.json", {});
  const board = Object.values(all)
    .sort((a,b) => b.xp - a.xp)
    .slice(0, 50)
    .map((p, i) => ({ rank:i+1, displayName:p.displayName, xp:p.xp, level:level(p.xp), streak:p.streak, badges:p.badges.length, totalExams:p.totalExams }));
  res.json(board);
});

export default router;
