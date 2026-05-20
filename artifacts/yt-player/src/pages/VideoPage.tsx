import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import Header from "../components/Header";
import YTPlayer from "../components/YTPlayer";

interface Video {
  id: string; videoId: string; title: string;
  subjectId: string; chapterId?: string;
  desc: string; date: string; course: string; online: boolean;
}

export default function VideoPage() {
  const params = useParams<{ videoId: string }>();
  const [location, navigate] = useLocation();

  const searchStr = location.includes("?") ? location.split("?")[1] : "";
  const searchParams = new URLSearchParams(searchStr);
  const title = searchParams.get("title") || "Video Class";
  const playlistSubject = searchParams.get("subject") || "";
  const playlistChapter = searchParams.get("chapter") || "";
  const backTo = searchParams.get("back") || "/past-classes";

  const videoId = params.videoId || "";

  const [videos, setVideos] = useState<Video[]>([]);
  const [activeSource, setActiveSource] = useState<1 | 2>(2);
  const [activeLang, setActiveLang] = useState<"bn" | "en">("bn");
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [autoNext, setAutoNext] = useState(true);

  useEffect(() => {
    if (!playlistSubject) return;
    const token = localStorage.getItem("rr_user_token");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch("/api/videos", { headers })
      .then(r => r.ok ? r.json() : [])
      .then(v => { if (Array.isArray(v)) setVideos(v); })
      .catch(() => {});
  }, [playlistSubject]);

  const playlist = useMemo(() => {
    if (!playlistSubject) return [];
    let filtered = videos.filter(v => v.subjectId === playlistSubject);
    if (playlistChapter) filtered = filtered.filter(v => v.chapterId === playlistChapter);
    return filtered;
  }, [videos, playlistSubject, playlistChapter]);

  const currentIdx = useMemo(() =>
    playlist.findIndex(v => v.videoId === videoId),
    [playlist, videoId]
  );

  const nextVideo = currentIdx >= 0 && currentIdx < playlist.length - 1
    ? playlist[currentIdx + 1] : null;
  const prevVideo = currentIdx > 0
    ? playlist[currentIdx - 1] : null;

  const currentVideoData = playlist.find(v => v.videoId === videoId);

  function goToVideo(v: Video) {
    const q = new URLSearchParams({
      title: v.title,
      ...(playlistSubject ? { subject: playlistSubject } : {}),
      ...(playlistChapter ? { chapter: playlistChapter } : {}),
      back: backTo,
    });
    navigate(`/video/${v.videoId}?${q.toString()}`);
  }

  function handleEnded() {
    if (autoNext && nextVideo) {
      setTimeout(() => goToVideo(nextVideo), 800);
    }
  }

  /* Shared playlist items — rendered in both mobile panel and desktop sidebar */
  function PlaylistItems() {
    return (
      <>
        <div className="vp-playlist-header">
          <span>Playlist · {playlist.length} videos</span>
          <label className="vp-auto-next-toggle">
            <input type="checkbox" checked={autoNext} onChange={e => setAutoNext(e.target.checked)} />
            Auto-next
          </label>
        </div>
        <div className="vp-playlist-list">
          {playlist.map((v, i) => {
            const isCurrent = v.videoId === videoId;
            return (
              <button
                key={v.id}
                className={`vp-playlist-item ${isCurrent ? "active" : ""}`}
                onClick={() => goToVideo(v)}
              >
                <div className="vp-playlist-num">{isCurrent ? "▶" : i + 1}</div>
                <img
                  className="vp-playlist-thumb"
                  src={`https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`}
                  alt=""
                  loading="lazy"
                  onError={e => { (e.target as HTMLImageElement).style.visibility = "hidden"; }}
                />
                <div className="vp-playlist-info">
                  <div className="vp-playlist-title">{v.title}</div>
                  {v.date && <div className="vp-playlist-date">{v.date}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  /* Shared info card content */
  function InfoCardContent() {
    return (
      <>
        <div className="vp-lang-row">
          <button className={`vp-lang-btn ${activeLang === "bn" ? "active" : ""}`} onClick={() => setActiveLang("bn")}>বাংলা</button>
          <button className={`vp-lang-btn ${activeLang === "en" ? "active" : ""}`} onClick={() => setActiveLang("en")}>English</button>
        </div>
        <div className="vp-card-title">{currentVideoData?.title || title}</div>
        {currentVideoData?.date && <div className="vp-card-date">{currentVideoData.date}</div>}
        {currentVideoData?.course && <div className="vp-card-subject">{currentVideoData.course}</div>}
        {currentVideoData?.desc && (
          <div className="vp-card-desc" style={{ whiteSpace: "pre-line" }}>
            {currentVideoData.desc}
          </div>
        )}
        {!currentVideoData && (
          <>
            <div className="vp-card-date">Class recording</div>
            <div className="vp-card-links">
              <button className="vp-card-link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Video
              </button>
              <button className="vp-card-link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Notes
              </button>
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <div className="vp-page">
      <div className="page vp-page-shell" style={{ padding: 0 }}>
        <Header showBack backTo={backTo} title={title} />

        <div className="vp-desktop-layout">

          {/* ── LEFT COLUMN: player + tabs ──────────────────────── */}
          <div className="vp-left-col">
            <div style={{ background: "#000", position: "relative" }}>
              <YTPlayer videoId={videoId} title={title} onEnded={handleEnded} />
            </div>

            {/* Source tabs */}
            <div className="vp-source-tabs">
              <button className={`vp-source-tab ${activeSource === 1 ? "active" : ""}`} onClick={() => setActiveSource(1)}>Source-1</button>
              <button className={`vp-source-tab ${activeSource === 2 ? "active" : ""}`} onClick={() => setActiveSource(2)}>Source-2</button>
              {playlist.length > 1 && (
                <button
                  className={`vp-source-tab vp-playlist-toggle-btn ${showPlaylist ? "active" : ""}`}
                  onClick={() => setShowPlaylist(p => !p)}
                  style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/></svg>
                  Playlist ({playlist.length})
                </button>
              )}
            </div>

            {/* Mobile-only: playlist panel (shown via toggle button) */}
            {showPlaylist && playlist.length > 0 && (
              <div className="vp-playlist-panel vp-playlist-mobile-only">
                <PlaylistItems />
              </div>
            )}

            {/* Mobile-only: prev/next nav */}
            {(prevVideo || nextVideo) && (
              <div className="vp-nav-row vp-nav-mobile-only">
                {prevVideo ? (
                  <button className="vp-nav-btn" onClick={() => goToVideo(prevVideo)}>
                    ← <span className="vp-nav-label">{prevVideo.title || "Previous"}</span>
                  </button>
                ) : <span />}
                {nextVideo && (
                  <button className="vp-nav-btn next" onClick={() => goToVideo(nextVideo)}>
                    <span className="vp-nav-label">{nextVideo.title || "Next"}</span> →
                  </button>
                )}
              </div>
            )}

            {/* Mobile-only: info card */}
            <div className="vp-info-card vp-info-mobile-only">
              <InfoCardContent />
            </div>

            <div className="vp-mobile-spacer" />
          </div>

          {/* ── RIGHT COLUMN: desktop sidebar ───────────────────── */}
          <div className="vp-right-col">

            {/* Info card */}
            <div className="vp-info-card vp-info-desktop-only">
              <InfoCardContent />
            </div>

            {/* Prev/Next nav */}
            {(prevVideo || nextVideo) && (
              <div className="vp-nav-row vp-nav-desktop-only">
                {prevVideo ? (
                  <button className="vp-nav-btn" onClick={() => goToVideo(prevVideo)}>
                    ← <span className="vp-nav-label">{prevVideo.title || "Previous"}</span>
                  </button>
                ) : <span />}
                {nextVideo && (
                  <button className="vp-nav-btn next" onClick={() => goToVideo(nextVideo)}>
                    <span className="vp-nav-label">{nextVideo.title || "Next"}</span> →
                  </button>
                )}
              </div>
            )}

            {/* Playlist sidebar (desktop: always visible) */}
            {playlist.length > 0 && (
              <div className="vp-playlist-panel vp-playlist-sidebar">
                <PlaylistItems />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
