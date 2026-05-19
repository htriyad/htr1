import { useEffect, useRef, useState, useCallback } from "react";

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}
declare namespace YT {
  class Player {
    constructor(el: string | HTMLElement, opts: PlayerOptions);
    playVideo(): void;
    pauseVideo(): void;
    seekTo(seconds: number, allowSeekAhead?: boolean): void;
    getCurrentTime(): number;
    getDuration(): number;
    getPlayerState(): number;
    setVolume(vol: number): void;
    getVolume(): number;
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    setPlaybackRate(rate: number): void;
    getPlaybackRate(): number;
    getAvailablePlaybackRates(): number[];
    setPlaybackQuality(q: string): void;
    getPlaybackQuality(): string;
    getAvailableQualityLevels(): string[];
    loadModule(name: string): void;
    unloadModule(name: string): void;
    setOption(module: string, option: string, value: any): void;
    getOption(module: string, option: string): any;
    destroy(): void;
  }
  interface PlayerOptions {
    videoId: string;
    playerVars?: Record<string, string | number>;
    events?: {
      onReady?: (e: PlayerEvent) => void;
      onStateChange?: (e: OnStateChangeEvent) => void;
    };
  }
  interface PlayerEvent { target: Player }
  interface OnStateChangeEvent { data: number }
  enum PlayerState {
    UNSTARTED = -1, ENDED = 0, PLAYING = 1, PAUSED = 2, BUFFERING = 3, CUED = 5,
  }
}

interface Props { videoId: string; title?: string; onEnded?: () => void; }

const SEEK_SECS        = 10;
const HIDE_DELAY       = 3500;
const TOP_BAR_HIDE_MS  = 2000;
const FIRST_PLAY_MS    = 4000;
const TAP_GAP          = 380;

const fmt = (t: number) => {
  const s = Math.floor(t % 60);
  const m = Math.floor(t / 60) % 60;
  const h = Math.floor(t / 3600);
  const z = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${z(m)}:${z(s)}` : `${z(m)}:${z(s)}`;
};

export default function YTPlayer({ videoId, title = "", onEnded }: Props) {
  const playerRef     = useRef<YT.Player | null>(null);
  const playerDivRef  = useRef<HTMLDivElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const hideCtrlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topBarTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topBarRef     = useRef<HTMLDivElement | null>(null);
  const instantMaskTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstPlay   = useRef(true);
  const tickRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const leftTap       = useRef(0);
  const rightTap      = useRef(0);
  const centerTap     = useRef(0);

  const [ready,        setReady]        = useState(false);
  const [playing,      setPlaying]      = useState(false);
  const [showCtrl,     setShowCtrl]     = useState(true);
  const [showTop,      setShowTop]      = useState(true);
  const [progress,     setProgress]     = useState(0);
  const [duration,     setDuration]     = useState(0);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [volume,       setVolume]       = useState(100);
  const [muted,        setMuted]        = useState(false);
  const [speed,        setSpeed]        = useState(1);
  const [speedOpen,    setSpeedOpen]    = useState(false);
  const [speeds,       setSpeeds]       = useState<number[]>([0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
  const [quality,      setQuality]      = useState<string>("auto");
  const [qualities,    setQualities]    = useState<string[]>([]);
  const [qualityOpen,  setQualityOpen]  = useState(false);
  const [ccOn,         setCcOn]         = useState(false);
  const [ccTracks,     setCcTracks]     = useState<Array<{languageCode:string; languageName?:string; displayName?:string}>>([]);
  const [ccLang,       setCcLang]       = useState<string>("");
  const [ccOpen,       setCcOpen]       = useState(false);
  const [scrubT,       setScrubT]       = useState<number | null>(null);
  const [scrubX,       setScrubX]       = useState(0);
  const dragging                        = useRef(false);
  const progRowRef                      = useRef<HTMLDivElement | null>(null);
  const [buffering,    setBuffering]    = useState(false);
  const [started,      setStarted]      = useState(false);
  const [leftFlash,    setLeftFlash]    = useState(false);
  const [rightFlash,   setRightFlash]   = useState(false);
  const [isFS,         setIsFS]         = useState(false);

  /* ── FULLSCREEN GUARD (Udvash technique) ───────────────────────────────
     Listen on BOTH document AND the container so bubbling is caught.
     If the YouTube <iframe> itself goes fullscreen, immediately cancel it.
     Also remove allowfullscreen + add playsinline directly on the iframe
     element in onReady to prevent mobile auto-fullscreen at browser level.
  ─────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function guard(e: Event) {
      e.preventDefault?.();
      const fsEl = (document.fullscreenElement
        || (document as any).webkitFullscreenElement) as HTMLElement | null;

      if (fsEl) {
        // If what went fullscreen is an iframe (YouTube native) — kill it
        if (fsEl.tagName?.toLowerCase() === "iframe") {
          ((document as any).exitFullscreen
           || (document as any).webkitExitFullscreen
           || (document as any).mozCancelFullScreen
          )?.call(document).catch?.(() => {});
          return;
        }
        // Our container went fullscreen — that's fine
        setIsFS(true);
      } else {
        setIsFS(false);
      }
    }

    document.addEventListener("fullscreenchange", guard);
    document.addEventListener("webkitfullscreenchange", guard);
    container.addEventListener("fullscreenchange", guard);
    container.addEventListener("webkitfullscreenchange", guard);
    return () => {
      document.removeEventListener("fullscreenchange", guard);
      document.removeEventListener("webkitfullscreenchange", guard);
      container.removeEventListener("fullscreenchange", guard);
      container.removeEventListener("webkitfullscreenchange", guard);
    };
  }, []);

  /* ── LOAD YOUTUBE API ─────────────────────────────────────────────────── */
  useEffect(() => {
    isFirstPlay.current = true;
    if (window.YT?.Player) { initPlayer(); return; }
    window.onYouTubeIframeAPIReady = initPlayer;
    if (!document.getElementById("yt-api-script")) {
      const t = document.createElement("script");
      t.id = "yt-api-script";
      t.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(t);
    }
    return () => {
      window.onYouTubeIframeAPIReady = () => {};
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
      stopTick();
    };
  }, [videoId]);

  function initPlayer() {
    if (!playerDivRef.current) return;
    try { playerRef.current?.destroy(); } catch {}

    playerRef.current = new window.YT.Player(playerDivRef.current, {
      videoId,
      host: "https://www.youtube-nocookie.com",
      playerVars: {
        playsinline: 1,
        autoplay:    0,
        controls:    0,
        modestbranding: 1,
        rel:         0,
        showinfo:    0,
        fs:          0,
        iv_load_policy: 3,
        disablekb:   1,
        cc_load_policy: 0,
        hl: "en",
        widget_referrer: window.location.origin,
        origin: window.location.origin,
      } as any,
      events: {
        onReady: (e) => {
          /* ── CRITICAL: patch the iframe element directly ──
             Sets playsinline + webkit-playsinline attributes directly on
             the <iframe> element so the browser respects inline playback.
             Removes allowfullscreen to block browser-level fullscreen.
          ─────────────────────────────────────────────────── */
          const iframe = playerDivRef.current?.querySelector("iframe");
          if (iframe) {
            iframe.id = "yt-player-iframe";
            iframe.setAttribute("playsinline", "1");
            iframe.setAttribute("webkit-playsinline", "1");
            iframe.removeAttribute("allowfullscreen");
            const allow = iframe.getAttribute("allow") || "";
            iframe.setAttribute(
              "allow",
              allow.replace(/;?\s*fullscreen[^;]*/gi, "").replace(/^;\s*/, "")
            );
          }
          const p = e.target;
          setDuration(p.getDuration());
          setVolume(p.getVolume());
          setMuted(p.isMuted());
          setSpeeds(p.getAvailablePlaybackRates());
          try {
            const qs = p.getAvailableQualityLevels?.() || [];
            if (qs.length) setQualities(["auto", ...qs.filter(q => q !== "auto")]);
          } catch {}
          setReady(true);
        },
        onStateChange: (e) => { onState(e.data); refreshTracksAndQualities(); },
      },
    });
  }

  /* ── STATE MACHINE (mirrors Udvash onPlayerStateChange) ──────────────── */
  function onState(state: number) {
    if (state === 1) {
      setPlaying(true); setBuffering(false); setStarted(true); startTick();
      if (isFirstPlay.current) {
        showTopNow(); setShowCtrl(true); clearAllTimers();
        topBarTimer.current = setTimeout(() => {
          hideTopNow(); setShowCtrl(false); isFirstPlay.current = false;
        }, FIRST_PLAY_MS);
      } else {
        hideTopDelayed(); scheduleHide();
      }
    } else if (state === 2) {
      setPlaying(false); stopTick();
      showTopNow(); setShowCtrl(true); clearAllTimers();
    } else if (state === 3) {
      setBuffering(true); setPlaying(false); stopTick();
      showTopNow(); setShowCtrl(true);
    } else if (state === 0) {
      setPlaying(false); setProgress(0); setCurrentTime(0); stopTick();
      showTopNow(); setShowCtrl(true); clearAllTimers();
      onEnded?.();
    }
  }

  function showTopNow()  { if (topBarTimer.current) clearTimeout(topBarTimer.current); setShowTop(true); }
  function hideTopNow()  { setShowTop(false); }
  function hideTopDelayed() {
    if (topBarTimer.current) clearTimeout(topBarTimer.current);
    topBarTimer.current = setTimeout(() => setShowTop(false), TOP_BAR_HIDE_MS);
  }
  function clearAllTimers() {
    if (hideCtrlTimer.current) clearTimeout(hideCtrlTimer.current);
    if (topBarTimer.current)   clearTimeout(topBarTimer.current);
  }
  function scheduleHide() {
    if (hideCtrlTimer.current) clearTimeout(hideCtrlTimer.current);
    hideCtrlTimer.current = setTimeout(() => setShowCtrl(false), HIDE_DELAY);
  }

  function startTick() {
    stopTick();
    tickRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      const cur = p.getCurrentTime();
      const dur = p.getDuration() || 1;
      setCurrentTime(cur); setDuration(dur); setProgress(cur / dur);
    }, 500);
  }
  function stopTick() { if (tickRef.current) clearInterval(tickRef.current); }

  /* ── Refresh CC tracklist + quality list (only populated after playback starts) ── */
  function refreshTracksAndQualities() {
    const p = playerRef.current; if (!p) return;
    try {
      const qs = p.getAvailableQualityLevels?.() || [];
      if (qs.length) setQualities(["auto", ...qs.filter(q => q !== "auto")]);
    } catch {}
    try {
      // Force-load the captions module so tracklist is available
      try { p.loadModule("captions"); } catch {}
      try { p.loadModule("cc"); } catch {}
      const tracks: any[] =
        p.getOption("captions", "tracklist") ||
        p.getOption("cc", "tracklist") || [];
      if (Array.isArray(tracks) && tracks.length) {
        setCcTracks(
          tracks.map((t) => ({
            languageCode: t.languageCode || t.lang || "en",
            languageName: t.languageName || t.name || t.displayName,
            displayName:  t.displayName  || t.languageName || t.name || t.languageCode,
          }))
        );
      }
      // Disable captions by default unless user enabled them
      if (!ccOn) {
        try { p.unloadModule("captions"); } catch {}
        try { p.unloadModule("cc"); } catch {}
      }
    } catch {}
  }

  const handleInteraction = useCallback(() => {
    showTopNow(); setShowCtrl(true);
    if (playerRef.current?.getPlayerState?.() === 1) {
      hideTopDelayed(); scheduleHide();
    }
  }, []);

  /* ── CONTROLS ─────────────────────────────────────────────────────────── */
  function togglePlay() {
    const p = playerRef.current; if (!p) return;
    p.getPlayerState() === 1 ? p.pauseVideo() : p.playVideo();
  }
  /* Synchronously paint the top mask black RIGHT NOW (no React render,
     no CSS fade) so YouTube's title flash during a fast double-tap seek
     never has a frame to leak through. Then arm a timer to release it. */
  function armMaskInstant(holdMs = 600) {
    const el = topBarRef.current;
    if (el) el.classList.add("instant-show"); // synchronous, zero-frame paint
    if (instantMaskTimer.current) clearTimeout(instantMaskTimer.current);
    instantMaskTimer.current = setTimeout(() => {
      if (topBarRef.current) {
        topBarRef.current.classList.remove("instant-show");
        topBarRef.current.style.opacity = "";
      }
    }, holdMs);
  }

  function seek(d: number) {
    const p = playerRef.current; if (!p) return;
    armMaskInstant();
    p.seekTo(Math.max(0, p.getCurrentTime() + d), true);
    p.playVideo();
    handleInteraction();
  }
  function seekTo(ratio: number) {
    const p = playerRef.current; if (!p) return;
    armMaskInstant();
    p.seekTo(ratio * p.getDuration(), true); handleInteraction();
  }
  function changeVolume(v: number) {
    const p = playerRef.current; if (!p) return;
    setVolume(v); p.setVolume(v);
    if (v === 0) { p.mute(); setMuted(true); }
    else { p.unMute(); setMuted(false); }
  }
  function toggleMute() {
    const p = playerRef.current; if (!p) return;
    if (p.isMuted()) { p.unMute(); setMuted(false); }
    else { p.mute(); setMuted(true); }
  }
  function setRate(r: number) {
    playerRef.current?.setPlaybackRate(r); setSpeed(r); setSpeedOpen(false);
  }
  function setQ(q: string) {
    try { playerRef.current?.setPlaybackQuality(q); } catch {}
    setQuality(q); setQualityOpen(false);
  }
  function pickCc(languageCode: string | "") {
    const p = playerRef.current; if (!p) return;
    if (!languageCode) {
      setCcOn(false); setCcLang("");
      try { p.setOption("captions", "track", {}); } catch {}
      try { p.setOption("cc", "track", {}); } catch {}
      try { p.unloadModule("captions"); } catch {}
      try { p.unloadModule("cc"); } catch {}
    } else {
      try { p.loadModule("captions"); } catch {}
      try { p.loadModule("cc"); } catch {}
      const t = ccTracks.find(x => x.languageCode === languageCode) || { languageCode };
      try { p.setOption("captions", "track", t); } catch {}
      try { p.setOption("cc",       "track", t); } catch {}
      try { p.setOption("captions", "fontSize", 1); } catch {}
      setCcOn(true); setCcLang(languageCode);
    }
    setCcOpen(false);
    handleInteraction();
  }
  function toggleFS() {
    const el = containerRef.current; if (!el) return;
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      (el.requestFullscreen?.() || (el as any).webkitRequestFullscreen?.())
        ?.catch?.(() => {});
    } else {
      ((document as any).exitFullscreen?.()
       || (document as any).webkitExitFullscreen?.())
        ?.catch?.(() => {});
    }
    handleInteraction();
  }

  /* ── TOUCH / TAP handlers ─────────────────────────────────────────────── */
  function handleLeftTouchEnd(e: React.TouchEvent) {
    const now = Date.now();
    if (now - leftTap.current < TAP_GAP) {
      e.preventDefault();
      seek(-SEEK_SECS); setLeftFlash(true); setTimeout(() => setLeftFlash(false), 700);
    } else { handleInteraction(); }
    leftTap.current = now;
  }
  function handleRightTouchEnd(e: React.TouchEvent) {
    const now = Date.now();
    if (now - rightTap.current < TAP_GAP) {
      e.preventDefault();
      seek(SEEK_SECS); setRightFlash(true); setTimeout(() => setRightFlash(false), 700);
    } else { handleInteraction(); }
    rightTap.current = now;
  }
  function handleCenterTouchEnd(e: React.TouchEvent) {
    const now = Date.now();
    if (now - centerTap.current < TAP_GAP) {
      e.preventDefault(); toggleFS();
    } else { togglePlay(); handleInteraction(); }
    centerTap.current = now;
  }

  /* ── VOLUME ICON ─────────────────────────────────────────────────────── */
  const volPath = muted || volume === 0
    ? "M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z"
    : volume < 50
    ? "M5,9V15H9L14,20V4L9,9M18.5,12C18.5,10.23 17.5,8.71 16,7.97V16C17.5,15.29 18.5,13.76 18.5,12Z"
    : "M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z";

  return (
    <div
      ref={containerRef}
      className="ytp-aspect-wrap"
      onClick={speedOpen || qualityOpen || ccOpen ? () => { setSpeedOpen(false); setQualityOpen(false); setCcOpen(false); } : undefined}
    >
      {/* YouTube iframe target — wrapped in zoom layer so YouTube's inline
          styles on the iframe don't fight our transform. The wrapper scales
          to 20% visually, shrinking YT branding to ~11px while the video
          still fills the container perfectly. */}
      <div className="ytp-zoom-layer">
        <div ref={playerDivRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      </div>

      {/* TOP BAR — covers YouTube branding at top.
          Visible whenever YT might show its own overlay: not started, paused, buffering,
          or whenever our own controls are visible. */}
      <div
        ref={topBarRef}
        className="ytp-top-bar"
        style={{ opacity: (showTop || showCtrl || buffering || !started || !playing) ? 1 : 0 }}
      >
        <span className="ytp-video-title">{title}</span>
      </div>

      {/* BOTTOM COVER — covers YouTube logo + share button. Same visibility rule. */}
      <div
        className="ytp-bottom-cover"
        style={{ opacity: (showCtrl || buffering || !started || !playing) ? 1 : 0 }}
      />

      {/* MAIN OVERLAY — z-index 999, intercepts ALL clicks (Udvash technique) */}
      <div className="ytp-overlay">
        {/* Thumbnail — hidden after first play */}
        {!started && (
          <img
            className="ytp-thumb"
            src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }}
            alt=""
          />
        )}

        {/* Left zone — double-tap = rewind 10s */}
        <div
          className="ytp-tap-left"
          onDoubleClick={() => { seek(-SEEK_SECS); setLeftFlash(true); setTimeout(() => setLeftFlash(false), 700); }}
          onTouchEnd={handleLeftTouchEnd}
          onClick={handleInteraction}
        >
          <div className={`ytp-tap-icon${leftFlash ? " flash" : ""}`}>
            <svg width="32" height="32" viewBox="0 0 55 55" stroke="#4FA621" strokeWidth="3" fill="none">
              <path strokeLinecap="round" d="M9.57 15.41l2.6 8.64 8.64-2.61M26.93 41.41V23a.09.09 0 00-.16-.07s-2.58 3.69-4.17 4.78" />
              <rect x="32.19" y="22.52" width="11.41" height="18.89" rx="5.7" />
              <path d="M12.14 23.94a21.91 21.91 0 11-.91 13.25" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Center zone — single tap = play/pause, double-tap = fullscreen */}
        <div
          className="ytp-tap-center"
          onClick={handleCenterClick}
          onTouchEnd={handleCenterTouchEnd}
        />

        {/* Right zone — double-tap = forward 10s */}
        <div
          className="ytp-tap-right"
          onDoubleClick={() => { seek(SEEK_SECS); setRightFlash(true); setTimeout(() => setRightFlash(false), 700); }}
          onTouchEnd={handleRightTouchEnd}
          onClick={handleInteraction}
        >
          <div className={`ytp-tap-icon${rightFlash ? " flash" : ""}`}>
            <svg width="32" height="32" viewBox="0 0 55 55" stroke="#4FA621" strokeWidth="3" fill="none">
              <path d="M23.93 41.41V23a.09.09 0 00-.16-.07s-2.58 3.69-4.17 4.78" strokeLinecap="round" />
              <rect x="29.19" y="22.52" width="11.41" height="18.89" rx="5.7" />
              <path strokeLinecap="round" d="M54.43 15.41l-2.6 8.64-8.64-2.61M51.86 23.94a21.91 21.91 0 10.91 13.25" />
            </svg>
          </div>
        </div>
      </div>

      {/* BIG PLAY BUTTON — pre-first-play only */}
      {!started && (
        <button
          className={`ytp-big-play${ready ? "" : " hidden"}`}
          onClick={() => { togglePlay(); handleInteraction(); }}
          aria-label="Play"
        >
          <svg width="36" height="36" viewBox="0 0 24 24">
            <path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" />
          </svg>
        </button>
      )}

      {/* BUFFERING SPINNER */}
      <div className={`ytp-spinner${buffering ? " visible" : ""}`}>
        <svg width="56" height="56" viewBox="0 0 100 100">
          <path d="M18 50A32 32 0 0 0 82 50A32 35.5 0 0 1 18 50" fill="#4fa621">
            <animateTransform attributeName="transform" type="rotate" dur="0.9s" repeatCount="indefinite" values="0 50 51.75;360 50 51.75" />
          </path>
        </svg>
      </div>

      {/* CONTROLS BAR */}
      <div className={`ytp-controls${showCtrl ? "" : " hidden"}`}>

        {/* PROGRESS ROW — big touch target, draggable thumb, time tooltip while scrubbing */}
        <div
          ref={progRowRef}
          className="ytp-prog-row"
          onPointerDown={(e) => {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            dragging.current = true;
            const r = progRowRef.current!.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
            const dur = playerRef.current?.getDuration() || duration || 0;
            setScrubT(ratio * dur); setScrubX(e.clientX - r.left);
            setProgress(ratio);
            handleInteraction();
          }}
          onPointerMove={(e) => {
            const r = progRowRef.current!.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
            const dur = playerRef.current?.getDuration() || duration || 0;
            if (dragging.current) {
              setProgress(ratio);
              setScrubT(ratio * dur); setScrubX(e.clientX - r.left);
            } else {
              // hover preview
              setScrubT(ratio * dur); setScrubX(e.clientX - r.left);
            }
          }}
          onPointerUp={(e) => {
            if (dragging.current) {
              const r = progRowRef.current!.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
              seekTo(ratio);
              dragging.current = false;
            }
            setScrubT(null);
          }}
          onPointerLeave={() => { if (!dragging.current) setScrubT(null); }}
          onPointerCancel={() => { dragging.current = false; setScrubT(null); }}
        >
          <div className="ytp-prog-track">
            <div className="ytp-prog-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="ytp-prog-thumb" style={{ left: `${progress * 100}%` }} />
          {scrubT !== null && (
            <div className="ytp-prog-tooltip" style={{ left: scrubX }}>
              {fmt(scrubT)}
            </div>
          )}
        </div>

        {/* BUTTON ROW */}
        <div className="ytp-btn-row">

          {/* Play / Pause */}
          <button className="ytp-btn" onClick={() => { togglePlay(); handleInteraction(); }}>
            {playing
              ? <svg width="22" height="22" viewBox="0 0 24 24"><path fill="currentColor" d="M14,19H18V5H14M6,19H10V5H6V19Z" /></svg>
              : <svg width="22" height="22" viewBox="0 0 24 24"><path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" /></svg>
            }
          </button>

          {/* Skip backward — hidden portrait, shown landscape/fullscreen via CSS */}
          <button className="ytp-btn ytp-skip-btn" onClick={() => { seek(-SEEK_SECS); setLeftFlash(true); setTimeout(() => setLeftFlash(false), 700); }}>
            <svg width="22" height="22" viewBox="0 0 55 55" stroke="#cacbd2" strokeWidth="3" fill="none">
              <path strokeLinecap="round" d="M9.57 15.41l2.6 8.64 8.64-2.61M26.93 41.41V23a.09.09 0 00-.16-.07s-2.58 3.69-4.17 4.78" />
              <rect x="32.19" y="22.52" width="11.41" height="18.89" rx="5.7" />
              <path d="M12.14 23.94a21.91 21.91 0 11-.91 13.25" strokeLinecap="round" />
            </svg>
          </button>

          {/* Skip forward — hidden portrait, shown landscape/fullscreen via CSS */}
          <button className="ytp-btn ytp-skip-btn" onClick={() => { seek(SEEK_SECS); setRightFlash(true); setTimeout(() => setRightFlash(false), 700); }}>
            <svg width="22" height="22" viewBox="0 0 55 55" stroke="#cacbd2" strokeWidth="3" fill="none">
              <path d="M23.93 41.41V23a.09.09 0 00-.16-.07s-2.58 3.69-4.17 4.78" strokeLinecap="round" />
              <rect x="29.19" y="22.52" width="11.41" height="18.89" rx="5.7" />
              <path strokeLinecap="round" d="M54.43 15.41l-2.6 8.64-8.64-2.61M51.86 23.94a21.91 21.91 0 10.91 13.25" />
            </svg>
          </button>

          {/* Volume */}
          <div className="ytp-vol-wrap">
            <button className="ytp-btn" onClick={() => { toggleMute(); handleInteraction(); }}>
              <svg width="22" height="22" viewBox="0 0 24 24">
                <path fill="currentColor" d={volPath} />
              </svg>
            </button>
            <input
              className="ytp-vol-slider"
              type="range" min={0} max={100}
              value={muted ? 0 : volume}
              onChange={(e) => { changeVolume(Number(e.target.value)); handleInteraction(); }}
            />
          </div>

          {/* Time */}
          <span className="ytp-time">{fmt(currentTime)} / {fmt(duration)}</span>

          {/* CC / Subtitles — language menu */}
          <div className="ytp-speed-wrap">
            <div className={`ytp-speed-popup${ccOpen ? " open" : ""}`} style={{minWidth: 130}}>
              <button className={`ytp-speed-item${!ccOn ? " active" : ""}`} onClick={() => pickCc("")}>Off</button>
              {ccTracks.length === 0 && (
                <div style={{padding: "7px 14px", color: "#9aa", fontSize: 11, textAlign: "center"}}>
                  No captions
                </div>
              )}
              {ccTracks.map((t) => (
                <button key={t.languageCode}
                        className={`ytp-speed-item${ccOn && ccLang === t.languageCode ? " active" : ""}`}
                        onClick={() => pickCc(t.languageCode)}>
                  {t.displayName || t.languageName || t.languageCode}
                </button>
              ))}
            </div>
            <button className="ytp-btn ytp-cc-btn"
                    onClick={(e) => { e.stopPropagation(); setCcOpen(o => !o); setSpeedOpen(false); setQualityOpen(false); refreshTracksAndQualities(); handleInteraction(); }}
                    aria-label="Captions" style={{position:"relative"}}>
              <svg width="22" height="22" viewBox="0 0 24 24">
                <path fill="currentColor" d="M19,4H5A2,2 0 0,0 3,6V18A2,2 0 0,0 5,20H19A2,2 0 0,0 21,18V6A2,2 0 0,0 19,4M11,11H9.5V10.5H7.5V13.5H9.5V13H11V14A1,1 0 0,1 10,15H7A1,1 0 0,1 6,14V10A1,1 0 0,1 7,9H10A1,1 0 0,1 11,10M18,11H16.5V10.5H14.5V13.5H16.5V13H18V14A1,1 0 0,1 17,15H14A1,1 0 0,1 13,14V10A1,1 0 0,1 14,9H17A1,1 0 0,1 18,10V11Z"/>
              </svg>
              {ccOn && <span style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",width:18,height:2,background:"#4FA621",borderRadius:1}}/>}
            </button>
          </div>

          {/* Quality / Resolution */}
          {qualities.length > 0 && (
            <div className="ytp-speed-wrap">
              <div className={`ytp-speed-popup${qualityOpen ? " open" : ""}`}>
                {qualities.map((q) => (
                  <button key={q} className={`ytp-speed-item${q === quality ? " active" : ""}`}
                    onClick={() => { setQ(q); handleInteraction(); }}>
                    {q === "auto" ? "Auto" : q.replace(/^hd|^medium$|^small$|^tiny$|^large$/i, (m) => ({hd:"",medium:"360p",small:"240p",tiny:"144p",large:"480p"} as any)[m.toLowerCase()] || m)}
                  </button>
                ))}
              </div>
              <button className="ytp-btn ytp-speed-btn"
                onClick={(e) => { e.stopPropagation(); setQualityOpen((o) => !o); setSpeedOpen(false); handleInteraction(); }}
                aria-label="Quality">
                <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/></svg>
              </button>
            </div>
          )}

          {/* Speed */}
          <div className="ytp-speed-wrap">
            <div className={`ytp-speed-popup${speedOpen ? " open" : ""}`}>
              {speeds.map((s) => (
                <button key={s} className={`ytp-speed-item${s === speed ? " active" : ""}`}
                  onClick={() => { setRate(s); handleInteraction(); }}>
                  {s}x
                </button>
              ))}
            </div>
            <button className="ytp-btn ytp-speed-btn"
              onClick={(e) => { e.stopPropagation(); setSpeedOpen((o) => !o); setQualityOpen(false); handleInteraction(); }}>
              {speed}x
            </button>
          </div>

          {/* Fullscreen */}
          <button className="ytp-btn" onClick={toggleFS}>
            {isFS
              ? <svg width="22" height="22" viewBox="0 0 24 24"><path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
              : <svg width="22" height="22" viewBox="0 0 24 24"><path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
            }
          </button>

        </div>
      </div>
    </div>
  );

  function handleCenterClick() { togglePlay(); handleInteraction(); }
}
