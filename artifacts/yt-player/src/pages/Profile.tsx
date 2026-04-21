import { useEffect, useState } from "react";
import Header from "../components/Header";
import { USER_NAME_KEY } from "../App";

interface Progress {
  id: string; displayName: string; xp: number; level: number; streak: number;
  badges: string[];
  badgeDetails: { key: string; label: string; icon: string }[];
  examHistory: { quizId: string; title: string; score: number; total: number; pct: number; date: string; timeSecs: number }[];
  topicScores: Record<string, { correct: number; total: number }>;
  totalExams: number; totalCorrect: number; totalAnswers: number;
}

export default function Profile() {
  const [data, setData] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const username = localStorage.getItem(USER_NAME_KEY) || "";
    fetch("/api/gamification/me", {
      headers: username ? { "x-username": username } : {},
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message || "Failed"); setLoading(false); });
  }, []);

  if (loading) return <Shell><Loading/></Shell>;
  if (error)   return <Shell><div style={{padding:20,color:"#991b1b"}}>⚠ {error}</div></Shell>;
  if (!data)   return <Shell><div style={{padding:20}}>No data.</div></Shell>;

  const accuracy = data.totalAnswers > 0 ? Math.round((data.totalCorrect / data.totalAnswers) * 100) : 0;
  const xpToNext = (data.level * data.level) * 100;
  const xpInLvl  = data.xp - ((data.level - 1) * (data.level - 1) * 100);
  const xpNeeded = xpToNext - ((data.level - 1) * (data.level - 1) * 100);
  const lvlPct   = Math.min(100, Math.round((xpInLvl / xpNeeded) * 100));

  return (
    <Shell>
      {/* Hero */}
      <div style={{ padding: "12px 14px" }}>
        <div style={{
          background: "linear-gradient(135deg,#f59e0b 0%,#dc2626 100%)",
          color: "#fff", borderRadius: 16, padding: 18,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(255,255,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 30, fontWeight: 900, fontFamily: "Lato,sans-serif",
            }}>
              {(data.displayName || "S")[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "Lato,sans-serif" }}>
                {data.displayName}
              </div>
              <div style={{ fontSize: 12, opacity: 0.95 }}>
                Level {data.level} • {data.xp.toLocaleString()} XP
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24 }}>🔥</div>
              <div style={{ fontSize: 11, fontWeight: 700 }}>{data.streak} day{data.streak !== 1 ? "s" : ""}</div>
            </div>
          </div>

          {/* XP bar */}
          <div style={{ marginTop: 14, height: 8, background: "rgba(0,0,0,0.25)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${lvlPct}%`, height: "100%", background: "#fff", transition: "width 400ms" }} />
          </div>
          <div style={{ fontSize: 10, opacity: 0.85, marginTop: 4, textAlign: "right" }}>
            {xpInLvl}/{xpNeeded} XP to Level {data.level + 1}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ padding: "0 14px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
        <Stat label="Exams" value={data.totalExams} icon="📝" color="#2563eb"/>
        <Stat label="Accuracy" value={`${accuracy}%`} icon="🎯" color="#16a34a"/>
        <Stat label="Badges" value={data.badges.length} icon="🏅" color="#d97706"/>
      </div>

      {/* Badges */}
      <Section title="🏆 Badges">
        {data.badgeDetails.length === 0 ? (
          <div style={{ color: "var(--sub)", fontSize: 13, padding: "8px 0" }}>
            No badges yet. Take your first exam to start earning!
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {data.badgeDetails.map(b => (
              <div key={b.key} style={{
                background: "var(--bg)", padding: "10px 14px",
                borderRadius: 10, display: "flex", alignItems: "center", gap: 8,
                border: "1px solid var(--border)",
              }}>
                <span style={{ fontSize: 22 }}>{b.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{b.label}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Recent exams */}
      <Section title="📊 Recent Exams">
        {data.examHistory.length === 0 ? (
          <div style={{ color: "var(--sub)", fontSize: 13 }}>No exam history yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.examHistory.slice(0, 8).map((e, i) => (
              <div key={i} style={{
                background: "var(--bg)", padding: 10, borderRadius: 10,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: e.pct >= 80 ? "#dcfce7" : e.pct >= 50 ? "#fef3c7" : "#fee2e2",
                  color: e.pct >= 80 ? "#16a34a" : e.pct >= 50 ? "#d97706" : "#dc2626",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 13, fontFamily: "Lato,sans-serif",
                }}>{e.pct}%</div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 2 }}>
                    {e.score}/{e.total} • {new Date(e.date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg)", minHeight: "100svh", paddingBottom: 24 }}>
      <Header showBack backTo="/" />
      {children}
    </div>
  );
}

function Loading() {
  return <div style={{ padding: 30, textAlign: "center", color: "var(--sub)" }}>Loading…</div>;
}

function Stat({ label, value, icon, color }: { label: string; value: any; icon: string; color: string }) {
  return (
    <div style={{
      background: "var(--card)", padding: 12, borderRadius: 12,
      textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div style={{ fontWeight: 800, fontSize: 18, color, fontFamily: "Lato,sans-serif", marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--sub)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "0 14px", marginBottom: 14 }}>
      <div style={{
        background: "var(--card)", borderRadius: 14, padding: 14,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}
