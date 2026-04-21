import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import Header from "../components/Header";

/* ── Skill tree (always-free content) ───────────────────────────────────── */
type Topic = { id: string; name: string; needs?: string[] };
type Subject = { id: string; name: string; emoji: string; color: string; topics: Topic[] };

const TREE: Subject[] = [
  {
    id: "phy", name: "Physics", emoji: "⚛️", color: "#7c3aed",
    topics: [
      { id: "phy-vec",   name: "Vectors" },
      { id: "phy-kin",   name: "Kinematics",         needs: ["phy-vec"] },
      { id: "phy-laws",  name: "Newton's Laws",      needs: ["phy-kin"] },
      { id: "phy-work",  name: "Work, Energy, Power",needs: ["phy-laws"] },
      { id: "phy-rot",   name: "Rotation",           needs: ["phy-work"] },
      { id: "phy-grav",  name: "Gravitation",        needs: ["phy-laws"] },
      { id: "phy-osc",   name: "Oscillations",       needs: ["phy-work"] },
      { id: "phy-wave",  name: "Waves & Sound",      needs: ["phy-osc"] },
      { id: "phy-em",    name: "Electromagnetism",   needs: ["phy-wave"] },
      { id: "phy-mod",   name: "Modern Physics",     needs: ["phy-em"] },
    ],
  },
  {
    id: "chem", name: "Chemistry", emoji: "🧪", color: "#16a34a",
    topics: [
      { id: "chem-atom", name: "Atomic Structure" },
      { id: "chem-bond", name: "Chemical Bonding",   needs: ["chem-atom"] },
      { id: "chem-stoi", name: "Stoichiometry",      needs: ["chem-atom"] },
      { id: "chem-ther", name: "Thermochemistry",    needs: ["chem-stoi"] },
      { id: "chem-eq",   name: "Equilibrium",        needs: ["chem-ther"] },
      { id: "chem-acid", name: "Acids & Bases",      needs: ["chem-eq"] },
      { id: "chem-org",  name: "Organic Chemistry",  needs: ["chem-bond"] },
      { id: "chem-bio",  name: "Biochemistry",       needs: ["chem-org"] },
    ],
  },
  {
    id: "math", name: "Mathematics", emoji: "📐", color: "#2563eb",
    topics: [
      { id: "m-set",  name: "Sets & Functions" },
      { id: "m-alg",  name: "Algebra",          needs: ["m-set"] },
      { id: "m-trig", name: "Trigonometry",     needs: ["m-alg"] },
      { id: "m-geo",  name: "Geometry",         needs: ["m-trig"] },
      { id: "m-vec",  name: "Vectors",          needs: ["m-geo"] },
      { id: "m-cal",  name: "Calculus",         needs: ["m-alg", "m-trig"] },
      { id: "m-prob", name: "Probability",      needs: ["m-alg"] },
      { id: "m-stat", name: "Statistics",       needs: ["m-prob"] },
    ],
  },
  {
    id: "bio", name: "Biology", emoji: "🧬", color: "#db2777",
    topics: [
      { id: "bio-cell", name: "Cell Biology" },
      { id: "bio-gen",  name: "Genetics",          needs: ["bio-cell"] },
      { id: "bio-evo",  name: "Evolution",         needs: ["bio-gen"] },
      { id: "bio-eco",  name: "Ecology",           needs: ["bio-evo"] },
      { id: "bio-bot",  name: "Botany",            needs: ["bio-cell"] },
      { id: "bio-zoo",  name: "Zoology",           needs: ["bio-cell"] },
      { id: "bio-hum",  name: "Human Physiology",  needs: ["bio-zoo"] },
    ],
  },
  {
    id: "eng", name: "English", emoji: "📖", color: "#ea580c",
    topics: [
      { id: "eng-gra", name: "Grammar" },
      { id: "eng-voc", name: "Vocabulary",  needs: ["eng-gra"] },
      { id: "eng-rea", name: "Reading",     needs: ["eng-voc"] },
      { id: "eng-wri", name: "Writing",     needs: ["eng-rea"] },
      { id: "eng-spk", name: "Speaking",    needs: ["eng-wri"] },
    ],
  },
];

/* ── Local progress storage (always free, no server) ───────────────────── */
type Progress = Record<string, { score: number; attempts: number; updatedAt: number }>;
const KEY = "rr_skillmap_v1";

function loadProgress(): Progress {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") as Progress; }
  catch { return {}; }
}
function saveProgress(p: Progress) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

type Status = "locked" | "available" | "weak" | "learning" | "mastered";
const STATUS_META: Record<Status, { color: string; bg: string; label: string; icon: string }> = {
  locked:    { color: "#94a3b8", bg: "#f1f5f9", label: "Locked",    icon: "🔒" },
  available: { color: "#0284c7", bg: "#e0f2fe", label: "Available", icon: "✨" },
  weak:      { color: "#dc2626", bg: "#fee2e2", label: "Weak",      icon: "🩹" },
  learning:  { color: "#d97706", bg: "#fef3c7", label: "Learning",  icon: "📘" },
  mastered:  { color: "#16a34a", bg: "#dcfce7", label: "Mastered",  icon: "🏆" },
};

function statusOf(topic: Topic, prog: Progress): Status {
  const needs = topic.needs || [];
  const unlocked = needs.every((n) => (prog[n]?.score ?? 0) >= 50);
  if (!unlocked) return "locked";
  const s = prog[topic.id]?.score;
  if (s === undefined) return "available";
  if (s >= 85) return "mastered";
  if (s >= 50) return "learning";
  return "weak";
}

export default function SkillMap() {
  const [, navigate] = useLocation();
  const [prog, setProg]       = useState<Progress>({});
  const [active, setActive]   = useState<{ subject: Subject; topic: Topic } | null>(null);

  useEffect(() => { setProg(loadProgress()); }, []);

  function recordScore(topicId: string, score: number) {
    const next: Progress = {
      ...prog,
      [topicId]: {
        score,
        attempts: (prog[topicId]?.attempts ?? 0) + 1,
        updatedAt: Date.now(),
      },
    };
    setProg(next); saveProgress(next);
  }

  const overall = useMemo(() => {
    const all = TREE.flatMap((s) => s.topics);
    const m = all.filter((t) => (prog[t.id]?.score ?? 0) >= 85).length;
    const tot = all.length;
    return { mastered: m, total: tot, pct: Math.round((m / tot) * 100) };
  }, [prog]);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100svh", paddingBottom: 30 }}>
      <Header showBack backTo="/" />

      {/* Hero */}
      <div style={{ padding: "16px 14px 6px" }}>
        <div style={{
          background: "linear-gradient(135deg,#7c3aed 0%,#db2777 100%)",
          color: "#fff", borderRadius: 14, padding: 16,
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{ fontSize: 38, lineHeight: 1 }}>🌳</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 18, fontFamily: "Lato,sans-serif" }}>Skill Map</div>
            <div style={{ fontSize: 12, opacity: 0.95, marginTop: 2 }}>
              Unlock chapters like levels. Always free.
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "Lato,sans-serif" }}>{overall.pct}%</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>{overall.mastered}/{overall.total} mastered</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 6, padding: "10px 14px", flexWrap: "wrap" }}>
        {(Object.keys(STATUS_META) as Status[]).map((s) => (
          <span key={s} style={{
            fontSize: 11, padding: "4px 8px", borderRadius: 999,
            background: STATUS_META[s].bg, color: STATUS_META[s].color, fontWeight: 600,
          }}>
            {STATUS_META[s].icon} {STATUS_META[s].label}
          </span>
        ))}
      </div>

      {/* Subjects */}
      <div style={{ padding: "4px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
        {TREE.map((subj) => {
          const subjMastered = subj.topics.filter((t) => (prog[t.id]?.score ?? 0) >= 85).length;
          const subjPct = Math.round((subjMastered / subj.topics.length) * 100);
          return (
            <div key={subj.id} style={{
              background: "var(--card)", borderRadius: 14, padding: 14,
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: subj.color + "1a", color: subj.color,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                }}>{subj.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "var(--text)", fontSize: 15 }}>{subj.name}</div>
                  <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 2 }}>
                    {subjMastered}/{subj.topics.length} mastered • {subjPct}%
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: 6, background: "var(--bg)", borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
                <div style={{ width: `${subjPct}%`, height: "100%", background: subj.color, transition: "width 300ms" }} />
              </div>

              {/* Topic chips arranged as a tree-ish flow */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {subj.topics.map((t) => {
                  const st = statusOf(t, prog);
                  const meta = STATUS_META[st];
                  const score = prog[t.id]?.score;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActive({ subject: subj, topic: t })}
                      disabled={st === "locked"}
                      style={{
                        background: meta.bg,
                        color: meta.color,
                        border: `2px solid ${st === "weak" ? meta.color : "transparent"}`,
                        borderRadius: 10,
                        padding: "8px 12px",
                        fontSize: 12, fontWeight: 600,
                        cursor: st === "locked" ? "not-allowed" : "pointer",
                        opacity: st === "locked" ? 0.7 : 1,
                        boxShadow: st === "weak" ? `0 0 0 3px ${meta.color}33` : "none",
                        display: "flex", alignItems: "center", gap: 6,
                        transition: "transform 100ms",
                      }}
                      onMouseDown={(e) => st !== "locked" && (e.currentTarget.style.transform = "scale(0.97)")}
                      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    >
                      <span>{meta.icon}</span>
                      <span>{t.name}</span>
                      {score !== undefined && (
                        <span style={{
                          fontSize: 10, padding: "1px 6px", borderRadius: 999,
                          background: meta.color, color: "#fff",
                        }}>{score}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Topic detail modal */}
      {active && (
        <TopicModal
          subject={active.subject}
          topic={active.topic}
          status={statusOf(active.topic, prog)}
          score={prog[active.topic.id]?.score}
          onClose={() => setActive(null)}
          onLogScore={(s) => { recordScore(active.topic.id, s); setActive(null); }}
          onReset={() => {
            const next = { ...prog }; delete next[active.topic.id];
            setProg(next); saveProgress(next); setActive(null);
          }}
        />
      )}
    </div>
  );
}

function TopicModal({
  subject, topic, status, score, onClose, onLogScore, onReset,
}: {
  subject: Subject; topic: Topic; status: Status; score?: number;
  onClose: () => void; onLogScore: (s: number) => void; onReset: () => void;
}) {
  const meta = STATUS_META[status];
  const [val, setVal] = useState<number>(score ?? 75);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      zIndex: 5000,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--card)", width: "100%", maxWidth: 480,
        borderRadius: "16px 16px 0 0", padding: 20, paddingBottom: 28,
        animation: "rrSlideUp 200ms ease-out",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 24 }}>{subject.emoji}</span>
          <div style={{ fontSize: 12, color: "var(--sub)" }}>{subject.name}</div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>
          {topic.name}
        </div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: meta.bg, color: meta.color,
          padding: "4px 10px", borderRadius: 999,
          fontSize: 12, fontWeight: 700, marginBottom: 14,
        }}>
          <span>{meta.icon}</span> {meta.label}
          {score !== undefined && <span> • {score}/100</span>}
        </div>

        {status === "locked" ? (
          <div style={{
            background: "#fef3c7", color: "#92400e",
            padding: 12, borderRadius: 10, fontSize: 13,
          }}>
            🔒 Master prerequisite topics first to unlock this one.
            {topic.needs && (
              <div style={{ marginTop: 6, fontSize: 12 }}>
                Requires: {topic.needs.join(", ")}
              </div>
            )}
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: "var(--sub)", marginBottom: 10 }}>
              Log your score from your last quiz/exam on this topic. Reach 85+ to master it
              and unlock the next level.
            </div>
            <div style={{
              fontSize: 32, fontWeight: 900, color: meta.color,
              fontFamily: "Lato,sans-serif", textAlign: "center",
            }}>{val}</div>
            <input
              type="range" min={0} max={100} value={val}
              onChange={(e) => setVal(Number(e.target.value))}
              style={{ width: "100%", accentColor: subject.color, marginBottom: 14 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onClose} style={{
                flex: 1, padding: "10px 14px", borderRadius: 8,
                border: "1px solid var(--border)", background: "var(--bg)",
                color: "var(--text)", fontWeight: 600, cursor: "pointer",
              }}>Cancel</button>
              {score !== undefined && (
                <button onClick={onReset} style={{
                  padding: "10px 14px", borderRadius: 8,
                  border: "1px solid #fecaca", background: "#fef2f2",
                  color: "#dc2626", fontWeight: 600, cursor: "pointer",
                }}>Reset</button>
              )}
              <button onClick={() => onLogScore(val)} style={{
                flex: 1, padding: "10px 14px", borderRadius: 8,
                border: "none", background: subject.color,
                color: "#fff", fontWeight: 700, cursor: "pointer",
              }}>Save Score</button>
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes rrSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  );
}
