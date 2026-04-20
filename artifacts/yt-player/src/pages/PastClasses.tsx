import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Header from "../components/Header";

interface Video {
  id: string; videoId: string; title: string; subjectId: string;
  desc: string; date: string; course: string; online: boolean;
}

export default function PastClasses() {
  const [, navigate] = useLocation();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState("");
  const [subject, setSubject] = useState("");

  useEffect(() => {
    fetch("/api/videos")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setVideos(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = videos.filter(v => {
    if (subject && !v.subjectId.toLowerCase().includes(subject.toLowerCase())) return false;
    if (course && !v.course.toLowerCase().includes(course.toLowerCase())) return false;
    return true;
  });

  const subjects = [...new Set(videos.map(v => v.subjectId))];

  return (
    <div style={{ background: "var(--bg)", minHeight: "100svh" }}>
      <div className="page">
        <Header showBack backTo="/" />

        <h1 className="pc-title">PAST CLASSES</h1>

        <div className="pc-filters">
          <select className="pc-select" value={course} onChange={e => setCourse(e.target.value)}>
            <option value="">All Course</option>
            {[...new Set(videos.map(v => v.course))].map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select className="pc-select" value={subject} onChange={e => setSubject(e.target.value)}>
            <option value="">All Subject</option>
            {subjects.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="pc-select">
            <option>All Platform</option>
            <option>Online</option>
            <option>Offline</option>
          </select>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 36 }}>🥀</div>
            <p style={{ color: "var(--sub)", marginTop: 10 }}>Loading classes...</p>
          </div>
        )}

        <div className="pc-cards">
          {filtered.map(cls => (
            <div key={cls.id} className="pc-card">
              {cls.online && <span className="pc-badge">Online</span>}
              <div className="pc-card-title">{cls.title}</div>
              <div className="pc-subject-id">{cls.subjectId}</div>
              {cls.desc && (
                <div className="pc-desc" style={{ whiteSpace: "pre-line" }}>{cls.desc}</div>
              )}
              {cls.date && (
                <>
                  <div className="pc-meta-row"><strong>Date &amp; Time</strong></div>
                  <div className="pc-meta-row">{cls.date}</div>
                </>
              )}
              {cls.course && (
                <>
                  <div className="pc-meta-row" style={{ marginTop: 6 }}><strong>Course</strong></div>
                  <div className="pc-meta-row">{cls.course}</div>
                </>
              )}
              <div className="pc-actions">
                <button
                  className="pc-btn"
                  onClick={() => navigate(`/video/${cls.videoId}?title=${encodeURIComponent(cls.title)}`)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  Video
                </button>
                <button className="pc-btn" style={{ background: "#374151" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Notes
                </button>
              </div>
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--sub)" }}>
              <div style={{ fontSize: 36 }}>📭</div>
              <p style={{ marginTop: 10 }}>No classes found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
