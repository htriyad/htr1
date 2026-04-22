import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import Header from "../components/Header";

interface Chapter { id: string; name: string; order: number }
interface Subject {
  id: string;
  name: string;
  course: string;
  color?: string;
  chapters: Chapter[];
  createdAt: string;
}
interface Video {
  id: string; videoId: string; title: string;
  subjectId: string; chapterId?: string;
  desc: string; date: string; course: string; online: boolean;
}

const FALLBACK_COLORS = ["#7c3aed", "#2563eb", "#db2777", "#059669", "#d97706", "#dc2626", "#0891b2", "#7c2d12"];

export default function Courses() {
  const [, navigate] = useLocation();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [videos,   setVideos]   = useState<Video[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [openSubject, setOpenSubject] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/subjects").then(r => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/videos").then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([s, v]) => {
      if (Array.isArray(s)) setSubjects(s);
      if (Array.isArray(v)) setVideos(v);
    }).finally(() => setLoading(false));
  }, []);

  // Index videos by subject (and chapter)
  const bySubject = useMemo(() => {
    const map = new Map<string, Video[]>();
    for (const v of videos) {
      if (!v.subjectId) continue;
      if (!map.has(v.subjectId)) map.set(v.subjectId, []);
      map.get(v.subjectId)!.push(v);
    }
    return map;
  }, [videos]);

  // Subjects that have at least one imported video
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

        {/* Hero */}
        <div className="cc-hero">
          <div className="cc-hero-inner">
            <div className="cc-hero-emoji">📚</div>
            <div style={{ flex: 1 }}>
              <div className="cc-hero-title">Course &amp; Content</div>
              <div className="cc-hero-sub">
                {subjectsWithVideos.length} subject{subjectsWithVideos.length === 1 ? "" : "s"} ·
                {" "}{totalVideos} video{totalVideos === 1 ? "" : "s"}
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
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 36 }}>🥀</div>
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

        {/* Subject grid */}
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
                <button
                  className="cc-subject-head"
                  onClick={() => setOpenSubject(isOpen ? null : s.id)}
                  style={{ background: `linear-gradient(135deg, ${color}18, transparent)` }}
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
                  <div className="cc-subject-chev" style={{ color }}>{isOpen ? "▾" : "▸"}</div>
                </button>

                {isOpen && (
                  <div className="cc-subject-body">
                    {chaptersWithCounts.map(ch => {
                      if (ch.count === 0) return null;
                      const chVids = vids.filter(v => v.chapterId === ch.id);
                      return (
                        <ChapterBlock
                          key={ch.id}
                          color={color}
                          title={`${ch.order ? ch.order + ". " : ""}${ch.name}`}
                          videos={chVids}
                          navigate={navigate}
                        />
                      );
                    })}
                    {unassignedCount > 0 && (
                      <ChapterBlock
                        color={color}
                        title="Unsorted videos"
                        videos={vids.filter(v => !v.chapterId)}
                        navigate={navigate}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ChapterBlock({ color, title, videos, navigate }: {
  color: string;
  title: string;
  videos: Video[];
  navigate: (to: string) => void;
}) {
  return (
    <div className="cc-chapter">
      <div className="cc-chapter-title" style={{ borderLeftColor: color }}>
        <span className="cc-chapter-dot" style={{ background: color }} />
        {title}
        <span className="cc-chapter-count">{videos.length}</span>
      </div>
      <div className="cc-video-list">
        {videos.map(v => (
          <button
            key={v.id}
            className="cc-video-row"
            onClick={() => navigate(`/video/${v.videoId}?title=${encodeURIComponent(v.title)}`)}
          >
            <div className="cc-thumb-wrap">
              <img
                className="cc-thumb"
                src={`https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`}
                alt=""
                loading="lazy"
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
