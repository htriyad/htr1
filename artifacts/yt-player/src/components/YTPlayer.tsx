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
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }
}

interface Props {
  videoId: string;
  title?: string;
}

const SEEK_SECS = 10;
const HIDE_DELAY = 3500;
const fmt = (t: number) => {
  const s = Math.floor(t % 60);
  const m = Math.floor(t / 60) % 60;
  const h = Math.floor(t / 3600);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

export default function YTPlayer({ videoId, title = "" }: Props) {
  const playerRef = useRef<YT.Player | null>(null);
  const playerDivRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showTopBar, setShowTopBar] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [speeds, setSpeeds] = useState<number[]>([0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
  const [buffering, setBuffering] = useState(false);
  const [started, setStarted] = useState(false);

  const [leftFlash, setLeftFlash] = useState(false);
  const [rightFlash, setRightFlash] = useState(false);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load YouTube IFrame API ────────────────────────────────────────────
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }

    window.onYouTubeIframeAPIReady = initPlayer;

    if (!document.getElementById("yt-api-script")) {
      const tag = document.createElement("script");
      tag.id = "yt-api-script";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    return () => {
      window.onYouTubeIframeAPIReady = () => {};
    };
  }, [videoId]);

  function initPlayer() {
    if (!playerDivRef.current) return;
    if (playerRef.current) { playerRef.current.destroy(); }

    playerRef.current = new window.YT.Player(playerDivRef.current, {
      videoId,
      playerVars: {
        playsinline: 1,
        autoplay: 0,
        controls: 0,
        modestbranding: 0,
        rel: 0,
        showinfo: 0,
        fs: 0,
        iv_load_policy: 3,
        disablekb: 1,
      },
      events: {
        onReady: (e) => {
          const p = e.target;
          setDuration(p.getDuration());
          setVolume(p.getVolume());
          setMuted(p.isMuted());
          setSpeeds(p.getAvailablePlaybackRates());
          setReady(true);
        },
        onStateChange: (e) => onState(e.data),
      },
    });
  }

  function onState(state: number) {
    if (state === 1) {
      setPlaying(true);
      setBuffering(false);
      setStarted(true);
      startTick();
      scheduleHide();
    } else if (state === 2) {
      setPlaying(false);
      stopTick();
      revealControls();
    } else if (state === 3) {
      setBuffering(true);
      setPlaying(false);
      stopTick();
      revealControls();
    } else if (state === 0) {
      setPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      stopTick();
      revealControls();
    }
  }

  // ── Progress tick ──────────────────────────────────────────────────────
  function startTick() {
    stopTick();
    tickRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      const cur = p.getCurrentTime();
      const dur = p.getDuration() || 1;
      setCurrentTime(cur);
      setDuration(dur);
      setProgress(cur / dur);
    }, 500);
  }
  function stopTick() {
    if (tickRef.current) clearInterval(tickRef.current);
  }

  // ── Controls visibility ────────────────────────────────────────────────
  const revealControls = useCallback(() => {
    setShowControls(true);
    setShowTopBar(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
      setShowTopBar(false);
    }, HIDE_DELAY);
  }, []);

  const handleInteraction = useCallback(() => {
    revealControls();
    if (playing) scheduleHide();
  }, [playing, revealControls, scheduleHide]);

  // ── Playback controls ──────────────────────────────────────────────────
  function togglePlay() {
    const p = playerRef.current;
    if (!p) return;
    const state = p.getPlayerState();
    if (state === 1) {
      p.pauseVideo();
    } else {
      p.playVideo();
    }
  }

  function seek(delta: number) {
    const p = playerRef.current;
    if (!p) return;
    p.seekTo(Math.max(0, p.getCurrentTime() + delta), true);
    handleInteraction();
  }

  function seekTo(ratio: number) {
    const p = playerRef.current;
    if (!p) return;
    p.seekTo(ratio * p.getDuration(), true);
  }

  function changeVolume(val: number) {
    const p = playerRef.current;
    if (!p) return;
    setVolume(val);
    p.setVolume(val);
    if (val === 0) { p.mute(); setMuted(true); }
    else { p.unMute(); setMuted(false); }
  }

  function toggleMute() {
    const p = playerRef.current;
    if (!p) return;
    if (p.isMuted()) { p.unMute(); setMuted(false); }
    else { p.mute(); setMuted(true); }
  }

  function setPlaybackSpeed(r: number) {
    const p = playerRef.current;
    if (!p) return;
    p.setPlaybackRate(r);
    setSpeed(r);
    setSpeedOpen(false);
  }

  // ── Tap zones ──────────────────────────────────────────────────────────
  function handleLeftTap() {
    seek(-SEEK_SECS);
    setLeftFlash(true);
    setTimeout(() => setLeftFlash(false), 600);
  }
  function handleRightTap() {
    seek(SEEK_SECS);
    setRightFlash(true);
    setTimeout(() => setRightFlash(false), 600);
  }
  function handleCenterTap() {
    if (!ready) return;
    togglePlay();
    handleInteraction();
  }

  // ── Volume icon ────────────────────────────────────────────────────────
  const volIcon = muted || volume === 0
    ? <path fill="currentColor" d="M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z" />
    : volume < 50
    ? <path fill="currentColor" d="M5,9V15H9L14,20V4L9,9M18.5,12C18.5,10.23 17.5,8.71 16,7.97V16C17.5,15.29 18.5,13.76 18.5,12Z" />
    : <path fill="currentColor" d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z" />;

  return (
    <div
      className="ytp-shell"
      onClick={speedOpen ? () => setSpeedOpen(false) : undefined}
    >
      {/* ── YouTube iframe ── */}
      <div
        ref={playerDivRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />

      {/* ── TOP BAR — ALWAYS BLACK to cover YT title + channel ── */}
      {/* Never removed from DOM — always solid black block */}
      <div className={`ytp-top-bar${showTopBar ? "" : " hidden"}`}>
        <span className="ytp-video-title">{title}</span>
      </div>

      {/* ── BOTTOM FULL-WIDTH COVER — always-on, covers YT logo + share btn ── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "52px",
          background: "#000",
          zIndex: 9,
          pointerEvents: "none",
        }}
      />

      {/* ── FULL TRANSPARENT OVERLAY — blocks all YT pointer events ── */}
      <div className="ytp-overlay">
        {/* Left tap zone: seek backward */}
        <div className="ytp-tap-left" onDoubleClick={handleLeftTap} onClick={handleInteraction}>
          <div className={`ytp-tap-icon${leftFlash ? " flash" : ""}`}>
            <svg width="34" height="34" viewBox="0 0 55 55" stroke="#4FA621" strokeWidth="3" fill="none">
              <path strokeLinecap="round" d="M9.57 15.41l2.6 8.64 8.64-2.61M26.93 41.41V23a.09.09 0 00-.16-.07s-2.58 3.69-4.17 4.78" />
              <rect x="32.19" y="22.52" width="11.41" height="18.89" rx="5.7" />
              <path d="M12.14 23.94a21.91 21.91 0 11-.91 13.25" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        {/* Center tap zone: play/pause */}
        <div className="ytp-tap-center" onClick={handleCenterTap} />
        {/* Right tap zone: seek forward */}
        <div className="ytp-tap-right" onDoubleClick={handleRightTap} onClick={handleInteraction}>
          <div className={`ytp-tap-icon${rightFlash ? " flash" : ""}`}>
            <svg width="34" height="34" viewBox="0 0 55 55" stroke="#4FA621" strokeWidth="3" fill="none">
              <path d="M23.93 41.41V23a.09.09 0 00-.16-.07s-2.58 3.69-4.17 4.78" strokeLinecap="round" />
              <rect x="29.19" y="22.52" width="11.41" height="18.89" rx="5.7" />
              <path strokeLinecap="round" d="M54.43 15.41l-2.6 8.64-8.64-2.61M51.86 23.94a21.91 21.91 0 10.91 13.25" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Thumbnail cover: hides ALL YouTube UI before play starts ── */}
      {/* Sits above the iframe but below the overlay. Once play begins it disappears. */}
      {!playing && (
        <img
          src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          }}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 3,
            pointerEvents: "none",
          }}
        />
      )}

      {/* ── Big play button (shown until first play) ── */}
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

      {/* ── Buffering spinner ── */}
      <div className={`ytp-spinner${buffering ? " visible" : ""}`}>
        <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 100 100">
          <path d="M18 50A32 32 0 0 0 82 50A32 35.5 0 0 1 18 50" fill="#4fa621">
            <animateTransform attributeName="transform" type="rotate" dur="0.9s" repeatCount="indefinite" values="0 50 51.75;360 50 51.75" />
          </path>
        </svg>
      </div>

      {/* ── CONTROLS BAR ── */}
      <div className={`ytp-controls${showControls ? "" : " hidden"}`}>
        {/* Seekbar */}
        <div
          className="ytp-progress-wrap"
          style={{ marginBottom: 2 }}
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            seekTo(Math.max(0, Math.min(1, ratio)));
            handleInteraction();
          }}
        >
          <div className="ytp-progress-track">
            <div className="ytp-progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <input
            className="ytp-progress-input"
            type="range"
            min={0}
            max={10000}
            value={Math.round(progress * 10000)}
            onChange={(e) => {
              seekTo(Number(e.target.value) / 10000);
              handleInteraction();
            }}
          />
        </div>

        {/* Buttons */}
        <div className="ytp-btn-row">
          {/* Play / Pause */}
          <button className="ytp-btn" onClick={() => { togglePlay(); handleInteraction(); }} aria-label={playing ? "Pause" : "Play"}>
            {playing
              ? <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M14,19H18V5H14M6,19H10V5H6V19Z" /></svg>
              : <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" /></svg>
            }
          </button>

          {/* Backward 10s */}
          <button className="ytp-btn" onClick={handleLeftTap} aria-label="Rewind 10s">
            <svg width="24" height="24" viewBox="0 0 55 55" stroke="#cacbd2" strokeWidth="3" fill="none">
              <path strokeLinecap="round" d="M9.57 15.41l2.6 8.64 8.64-2.61M26.93 41.41V23a.09.09 0 00-.16-.07s-2.58 3.69-4.17 4.78" />
              <rect x="32.19" y="22.52" width="11.41" height="18.89" rx="5.7" />
              <path d="M12.14 23.94a21.91 21.91 0 11-.91 13.25" strokeLinecap="round" />
            </svg>
          </button>

          {/* Forward 10s */}
          <button className="ytp-btn" onClick={handleRightTap} aria-label="Forward 10s">
            <svg width="24" height="24" viewBox="0 0 55 55" stroke="#cacbd2" strokeWidth="3" fill="none">
              <path d="M23.93 41.41V23a.09.09 0 00-.16-.07s-2.58 3.69-4.17 4.78" strokeLinecap="round" />
              <rect x="29.19" y="22.52" width="11.41" height="18.89" rx="5.7" />
              <path strokeLinecap="round" d="M54.43 15.41l-2.6 8.64-8.64-2.61M51.86 23.94a21.91 21.91 0 10.91 13.25" />
            </svg>
          </button>

          {/* Volume */}
          <div className="ytp-vol-wrap">
            <button className="ytp-btn" onClick={() => { toggleMute(); handleInteraction(); }} aria-label="Toggle mute">
              <svg width="22" height="22" viewBox="0 0 24 24">{volIcon}</svg>
            </button>
            <input
              className="ytp-vol-slider"
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volume}
              onChange={(e) => { changeVolume(Number(e.target.value)); handleInteraction(); }}
            />
          </div>

          {/* Time */}
          <span className="ytp-time">
            {fmt(currentTime)} / {fmt(duration)}
          </span>

          {/* Speed */}
          <div style={{ position: "relative" }}>
            <div className={`ytp-speed-popup${speedOpen ? " open" : ""}`}>
              {speeds.map((s) => (
                <button
                  key={s}
                  className={`ytp-speed-item${s === speed ? " active" : ""}`}
                  onClick={() => { setPlaybackSpeed(s); handleInteraction(); }}
                >
                  {s}x
                </button>
              ))}
            </div>
            <button
              className="ytp-btn ytp-speed"
              onClick={(e) => { e.stopPropagation(); setSpeedOpen((o) => !o); handleInteraction(); }}
              aria-label="Playback speed"
            >
              {speed}x
            </button>
          </div>

          {/* Fullscreen */}
          <button
            className="ytp-btn"
            onClick={() => {
              const el = document.querySelector(".ytp-shell") as HTMLElement;
              if (!document.fullscreenElement) {
                el?.requestFullscreen?.();
              } else {
                document.exitFullscreen?.();
              }
              handleInteraction();
            }}
            aria-label="Fullscreen"
          >
            <svg width="22" height="22" viewBox="0 0 24 24">
              <path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
