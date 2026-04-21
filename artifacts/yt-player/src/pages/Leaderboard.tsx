import { useEffect, useState } from "react";
import Header from "../components/Header";
import { USER_NAME_KEY } from "../App";

interface Row {
  rank: number; displayName: string; xp: number; level: number;
  streak: number; badges: number; totalExams: number;
}

export default function Leaderboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const me = localStorage.getItem(USER_NAME_KEY) || "";

  useEffect(() => {
    fetch("/api/gamification/leaderboard")
      .then(r => r.json())
      .then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100svh", paddingBottom: 30 }}>
      <Header showBack backTo="/" />

      {/* Hero */}
      <div style={{ padding: "12px 14px" }}>
        <div style={{
          background: "linear-gradient(135deg,#dc2626 0%,#f59e0b 100%)",
          color: "#fff", borderRadius: 14, padding: 16,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ fontSize: 30 }}>🏆</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 18, fontFamily: "Lato,sans-serif" }}>Leaderboard</div>
            <div style={{ fontSize: 11, opacity: 0.95 }}>Top XP earners across RedRose</div>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ padding: 30, textAlign: "center", color: "var(--sub)" }}>Loading…</div>
      )}

      {/* Top 3 podium */}
      {!loading && rows.length >= 3 && (
        <div style={{ padding: "10px 14px 6px", display: "flex", alignItems: "flex-end", gap: 8, justifyContent: "center" }}>
          <Podium row={rows[1]} place={2} h={84} bg="#94a3b8"/>
          <Podium row={rows[0]} place={1} h={108} bg="#f59e0b"/>
          <Podium row={rows[2]} place={3} h={68} bg="#b45309"/>
        </div>
      )}

      {/* Rest of list */}
      <div style={{ padding: "8px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.length === 0 && !loading && (
          <div style={{ color: "var(--sub)", fontSize: 13, textAlign: "center", padding: 20 }}>
            No leaderboard data yet. Be the first to take an exam!
          </div>
        )}
        {rows.slice(rows.length >= 3 ? 3 : 0).map((r) => {
          const isMe = me && r.displayName === me;
          return (
            <div key={r.rank} style={{
              background: isMe ? "linear-gradient(135deg,#fef3c7,#fde68a)" : "var(--card)",
              border: isMe ? "2px solid #f59e0b" : "1px solid var(--border)",
              borderRadius: 12, padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{
                width: 30, textAlign: "center",
                fontWeight: 800, color: "var(--sub)", fontSize: 14,
              }}>#{r.rank}</div>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "var(--bg)", color: "var(--text)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 14, fontFamily: "Lato,sans-serif",
              }}>{r.displayName[0]?.toUpperCase() || "?"}</div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.displayName} {isMe && <span style={{ fontSize: 10, color: "#d97706" }}>(you)</span>}
                </div>
                <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 1 }}>
                  Lv {r.level} • 🔥 {r.streak} • 🏅 {r.badges}
                </div>
              </div>
              <div style={{ fontWeight: 800, color: "#7c3aed", fontFamily: "Lato,sans-serif", fontSize: 14 }}>
                {r.xp.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Podium({ row, place, h, bg }: { row: Row; place: number; h: number; bg: string }) {
  const medal = place === 1 ? "🥇" : place === 2 ? "🥈" : "🥉";
  return (
    <div style={{ flex: 1, maxWidth: 110, textAlign: "center" }}>
      <div style={{ fontSize: 26 }}>{medal}</div>
      <div style={{
        fontSize: 12, fontWeight: 700, color: "var(--text)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 4px",
      }}>{row.displayName}</div>
      <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 700, marginBottom: 4 }}>
        {row.xp.toLocaleString()} XP
      </div>
      <div style={{
        height: h, background: bg, borderRadius: "10px 10px 0 0",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: 8, color: "#fff", fontWeight: 800, fontFamily: "Lato,sans-serif", fontSize: 18,
      }}>{place}</div>
    </div>
  );
}
