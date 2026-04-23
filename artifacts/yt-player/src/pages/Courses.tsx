import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import Header from "../components/Header";

interface Chapter { id: string; name: string; order: number }
interface Subject {
  id: string; name: string; course: string; color?: string;
  chapters: Chapter[]; createdAt: string;
}
interface Video {
  id: string; videoId: string; title: string;
  subjectId: string; chapterId?: string;
  desc: string; date: string; course: string; online: boolean;
}

const FALLBACK_COLORS = ["#7c3aed","#2563eb","#db2777","#059669","#d97706","#dc2626","#0891b2","#7c2d12"];

export default function Courses() {
  const [, navigate] = useLocation();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [videos, setVideos]     = useState<Video[]>([]);
  const [loading, setLoading]   = useState(true);
  const [denied, setDenied]     = useState(false);
  const [openSubject, setOpenSubject] = useState<string | null>(null);
  const [search, setSearch]     = useState("");
  const [requestModal, setRequestModal] = useState<Subject | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("rr_user_token");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    Promise.all([
      fetch("/api/subjects", { headers }).then(r => {
        if (r.status === 403) { setDenied(true); return []; }
        return r.ok ? r.json() : [];
      }).catch(() => []),
      fetch("/api/videos", { headers }).then(r => {
        if (r.status === 403) { setDenied(true); return []; }
        return r.ok ? r.json() : [];
      }).catch(() => []),
    ]).then(([s, v]) => {
      if (Array.isArray(s)) setSubjects(s);
      if (Array.isArray(v)) setVideos(v);
    }).finally(() => setLoading(false));
  }, []);

  // If denied, send back to root (IpGate will show)
  useEffect(() => {
    if (denied) navigate("/");
  }, [denied]);

  const bySubject = useMemo(() => {
    const map = new Map<string, Video[]>();
    for (const v of videos) {
      if (!v.subjectId) continue;
      if (!map.has(v.subjectId)) map.set(v.subjectId, []);
      map.get(v.subjectId)!.push(v);
    }
    return map;
  }, [videos]);

  const subjectsWithVideos = useMemo(() => {
    const filtered = subjects.filter(s => (bySubject.get(s.id)?.length || 0) > 0);
    if (!search.trim()) return filtered;
    const q = search.toLowerCase();
    return filtered.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.course || "").toLowerCase().includes(q)
    );
  }, [subjects, bySubject, search]);

  const totalVideos = videos.filter(v => v.subjectId).length;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100svh" }}>
      <div className="page">
        <Header showBack backTo="/" />

        <div className="cc-hero">
          <div className="cc-hero-inner">
            <div className="cc-hero-emoji">📚</div>
            <div style={{ flex: 1 }}>
              <div className="cc-hero-title">Course &amp; Content</div>
              <div className="cc-hero-sub">
                {subjectsWithVideos.length} subject{subjectsWithVideos.length === 1 ? "" : "s"} ·{" "}
                {totalVideos} video{totalVideos === 1 ? "" : "s"}
              </div>
            </div>
          </div>
          <input
            className="cc-search"
            placeholder="🔍 Search subjects or courses…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 38 }}>🥀</div>
            <p style={{ color: "var(--sub)", marginTop: 10 }}>Loading content…</p>
          </div>
        )}

        {!loading && subjectsWithVideos.length === 0 && (
          <div className="cc-empty">
            <div style={{ fontSize: 44 }}>📭</div>
            <h3>No content yet</h3>
            <p>When the admin imports a YouTube playlist and assigns it to a subject &amp; chapter, the videos will appear here.</p>
          </div>
        )}

        <div className="cc-grid">
          {subjectsWithVideos.map((s, idx) => {
            const color = s.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
            const vids = bySubject.get(s.id) || [];
            const isOpen = openSubject === s.id;
            const chaptersWithCounts = s.chapters
              .slice()
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map(c => ({ ...c, count: vids.filter(v => v.chapterId === c.id).length }));
            const unassignedCount = vids.filter(v => !v.chapterId).length;

            return (
              <div key={s.id} className="cc-subject-card" style={{ borderTopColor: color }}>
                <div
                  className="cc-subject-head"
                  role="button" tabIndex={0}
                  onClick={() => setOpenSubject(isOpen ? null : s.id)}
                  onKeyDown={e => e.key === "Enter" && setOpenSubject(isOpen ? null : s.id)}
                  style={{ background: `linear-gradient(135deg, ${color}18, transparent)`, cursor: "pointer" }}
                >
                  <div className="cc-subject-icon" style={{ background: color }}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <div className="cc-subject-name">{s.name}</div>
                    <div className="cc-subject-meta">
                      {s.course && <span>📖 {s.course}</span>}
                      <span>🎬 {vids.length} video{vids.length === 1 ? "" : "s"}</span>
                      <span>📂 {s.chapters.length} chapter{s.chapters.length === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      className="cc-request-btn"
                      style={{ borderColor: color, color }}
                      onClick={e => { e.stopPropagation(); setRequestModal(s); }}
                    >
                      Request
                    </button>
                    <div className="cc-subject-chev" style={{ color }}>{isOpen ? "▾" : "▸"}</div>
                  </div>
                </div>

                {isOpen && (
                  <div className="cc-subject-body">
                    {chaptersWithCounts.map(ch => {
                      if (ch.count === 0) return null;
                      const chVids = vids.filter(v => v.chapterId === ch.id);
                      return (
                        <ChapterBlock
                          key={ch.id} color={color}
                          title={`${ch.order ? ch.order + ". " : ""}${ch.name}`}
                          videos={chVids} subjectId={s.id} chapterId={ch.id}
                          navigate={navigate}
                        />
                      );
                    })}
                    {unassignedCount > 0 && (
                      <ChapterBlock
                        color={color} title="Unsorted videos"
                        videos={vids.filter(v => !v.chapterId)}
                        subjectId={s.id} chapterId="" navigate={navigate}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {requestModal && (
        <RequestModal subject={requestModal} onClose={() => setRequestModal(null)} />
      )}
    </div>
  );
}

function ChapterBlock({ color, title, videos, subjectId, chapterId, navigate }: {
  color: string; title: string; videos: Video[];
  subjectId: string; chapterId: string; navigate: (to: string) => void;
}) {
  return (
    <div className="cc-chapter">
      <div className="cc-chapter-title" style={{ borderLeftColor: color }}>
        <span className="cc-chapter-dot" style={{ background: color }} />
        {title}
        <span className="cc-chapter-count">{videos.length}</span>
      </div>
      <div className="cc-video-list">
        {videos.map((v, idx) => (
          <button
            key={v.id}
            className="cc-video-row"
            onClick={() => {
              const q = new URLSearchParams({
                title: v.title,
                subject: subjectId,
                ...(chapterId ? { chapter: chapterId } : {}),
                back: "/courses",
              });
              navigate(`/video/${v.videoId}?${q.toString()}`);
            }}
          >
            <div className="cc-playlist-num" style={{ color }}>{idx + 1}</div>
            <div className="cc-thumb-wrap">
              <img
                className="cc-thumb"
                src={`https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`}
                alt="" loading="lazy"
                onError={e => { (e.target as HTMLImageElement).style.visibility = "hidden"; }}
              />
              <div className="cc-thumb-play">▶</div>
              {v.online && <span className="cc-live-badge">LIVE</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
              <div className="cc-video-title">{v.title}</div>
              <div className="cc-video-sub">
                {v.course && <span>{v.course}</span>}
                {v.date && <span> · {v.date}</span>}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function RequestModal({ subject, onClose }: { subject: Subject; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [sent, setSent]       = useState(false);
  const [loading, setLoad]    = useState(false);
  const [err, setErr]         = useState("");

  async function submit() {
    setLoad(true); setErr("");
    try {
      const token = localStorage.getItem("rr_user_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const r = await fetch("/api/content-request", {
        method: "POST", headers,
        body: JSON.stringify({ subject: subject.name + (subject.course ? ` (${subject.course})` : ""), message }),
      });
      if (r.ok) { setSent(true); }
      else { const d = await r.json(); setErr(d.error || "Failed to send request"); }
    } catch { setErr("Connection error. Please try again."); }
    finally { setLoad(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: "var(--surface)", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 480, boxShadow: "0 -8px 32px rgba(0,0,0,0.15)" }}>
        {!sent ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: (subject.color || "#7c3aed") + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: subject.color || "var(--purple)" }}>
                {subject.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text)" }}>Request Course Access</div>
                <div style={{ fontSize: 13, color: "var(--sub)" }}>{subject.name} · {subject.course}</div>
              </div>
              <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--sub)" }}>×</button>
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Optional: Add a note (e.g. I am a new student from batch 2025)…"
              rows={3}
              style={{ width: "100%", padding: 12, borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 14, resize: "none", fontFamily: "Roboto,'Noto Sans Bengali',sans-serif", outline: "none", marginBottom: 14, boxSizing: "border-box" }}
            />
            {err && <p style={{ color: "var(--orange)", fontSize: 13, marginBottom: 10 }}>{err}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1.5px solid var(--border)", background: "transparent", color: "var(--sub)", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={submit} disabled={loading} style={{ flex: 2, padding: 12, borderRadius: 10, border: "none", background: subject.color || "var(--purple)", color: "#fff", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Sending…" : "Send Request 📨"}
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 800, fontSize: 17, color: "var(--text)", marginBottom: 8 }}>Request Sent!</div>
            <p style={{ fontSize: 14, color: "var(--sub)", lineHeight: 1.7 }}>The admin has been notified. You'll get access once they approve.</p>
            <button onClick={onClose} style={{ marginTop: 18, padding: "10px 28px", borderRadius: 10, border: "1.5px solid var(--purple)", background: "transparent", color: "var(--purple)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
