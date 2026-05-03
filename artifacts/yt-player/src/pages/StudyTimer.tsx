import { useEffect, useState, useRef, useCallback } from "react";
import Header from "../components/Header";

const MODES = [
  { id:"focus",  label:"Focus",       mins:25, color:"#7c3aed", emoji:"🎯" },
  { id:"short",  label:"Short Break", mins:5,  color:"#16a34a", emoji:"☕" },
  { id:"long",   label:"Long Break",  mins:15, color:"#2563eb", emoji:"🌿" },
];

const QUOTES = [
  { bn:"মনোযোগ দিয়ে পড়লে সব সহজ হয়", en:"Focus makes everything easier." },
  { bn:"একটু একটু করে এগিয়ে যাও", en:"Take it one step at a time." },
  { bn:"বিরতি নাও, আবার শুরু করো", en:"Rest, then rise stronger." },
  { bn:"তুমি পারবে — বিশ্বাস রাখো", en:"You can do it — believe." },
  { bn:"কঠিন পরিশ্রম কখনো বৃথা যায় না", en:"Hard work is never wasted." },
  { bn:"আজকের পরিশ্রম, কালকের সাফল্য", en:"Today's effort, tomorrow's success." },
  { bn:"প্রতিটি মিনিট মূল্যবান", en:"Every minute counts." },
];

const RADIUS = 56;
const CIRC   = 2 * Math.PI * RADIUS;

function pad(n: number) { return String(n).padStart(2,"0"); }

export default function StudyTimer() {
  const [modeIdx, setModeIdx]     = useState(0);
  const [secsLeft, setSecsLeft]   = useState(MODES[0].mins * 60);
  const [running, setRunning]     = useState(false);
  const [sessions, setSessions]   = useState(0);
  const [totalMins, setTotalMins] = useState(0);
  const [quoteIdx, setQuoteIdx]   = useState(0);
  const [completed, setCompleted] = useState(0);
  const intervalRef               = useRef<ReturnType<typeof setInterval>|null>(null);
  const audioCtxRef               = useRef<AudioContext|null>(null);

  const mode = MODES[modeIdx];
  const totalSecs = mode.mins * 60;
  const progress  = secsLeft / totalSecs;
  const dashOffset = CIRC * progress;

  // Rotate quote every 30s
  useEffect(() => {
    const t = setInterval(() => setQuoteIdx(i => (i+1) % QUOTES.length), 30_000);
    return () => clearInterval(t);
  }, []);

  // Load saved total
  useEffect(() => {
    try { setTotalMins(Number(localStorage.getItem("rr_timer_mins")||0)); } catch {}
    try { setSessions(Number(localStorage.getItem("rr_timer_sessions")||0)); } catch {}
  }, []);

  const tick = useCallback(() => {
    setSecsLeft(s => {
      if (s <= 1) {
        setRunning(false);
        setCompleted(c => c + 1);
        playDing();
        return 0;
      }
      return s - 1;
    });
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Save progress when paused/stopped if focus mode
      if (modeIdx === 0 && secsLeft < totalSecs) {
        const mins = Math.round((totalSecs - secsLeft) / 60);
        if (mins > 0) {
          try {
            const prev = Number(localStorage.getItem("rr_timer_mins")||0);
            localStorage.setItem("rr_timer_mins", String(prev + mins));
            setTotalMins(prev + mins);
            const prevS = Number(localStorage.getItem("rr_timer_sessions")||0);
            localStorage.setItem("rr_timer_sessions", String(prevS));
          } catch {}
        }
      }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, tick, modeIdx, secsLeft, totalSecs]);

  // When secsLeft hits 0
  useEffect(() => {
    if (secsLeft === 0 && !running) {
      if (modeIdx === 0) {
        // Completed a focus session
        const newS = sessions + 1;
        setSessions(newS);
        try { localStorage.setItem("rr_timer_sessions", String(newS)); } catch {}
        const mins = mode.mins;
        try {
          const prev = Number(localStorage.getItem("rr_timer_mins")||0);
          localStorage.setItem("rr_timer_mins", String(prev + mins));
          setTotalMins(prev + mins);
        } catch {}
        // After 4 sessions, suggest long break
        if (newS % 4 === 0) setModeIdx(2);
        else setModeIdx(1);
      } else {
        setModeIdx(0);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secsLeft]);

  function switchMode(i: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setModeIdx(i);
    setSecsLeft(MODES[i].mins * 60);
  }

  function toggleTimer() {
    if (secsLeft === 0) {
      setSecsLeft(mode.mins * 60);
      setRunning(true);
    } else {
      setRunning(r => !r);
    }
  }

  function reset() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setSecsLeft(mode.mins * 60);
  }

  function playDing() {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.2);
    } catch {}
  }

  const quote = QUOTES[quoteIdx];
  const mins  = Math.floor(secsLeft / 60);
  const secs  = secsLeft % 60;

  // Session dots (4 per cycle)
  const sessionDots = Array.from({length:4}, (_,i) => i < (sessions % 4));

  return (
    <div className="timer-shell">
      <Header showBack backTo="/" />
      <div className="timer-content">
        <h1 className="timer-title">⏱ Study Timer</h1>
        <p className="timer-subtitle">Pomodoro technique for deep focus</p>

        {/* Mode selector */}
        <div className="timer-modes">
          {MODES.map((m, i) => (
            <button key={m.id} className={`timer-mode-btn ${modeIdx===i?"active":""}`}
              style={modeIdx===i ? {background:m.color,color:"#fff",borderColor:m.color} : {}}
              onClick={() => switchMode(i)}>
              {m.emoji} {m.label}
            </button>
          ))}
        </div>

        {/* Ring */}
        <div className="timer-ring-wrap">
          <svg className="timer-ring-svg" viewBox="0 0 140 140">
            {/* Background ring */}
            <circle cx="70" cy="70" r={RADIUS} fill="none"
              stroke="rgba(0,0,0,0.08)" strokeWidth="10" />
            {/* Progress ring */}
            <circle cx="70" cy="70" r={RADIUS} fill="none"
              stroke={mode.color} strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 70 70)"
              style={{transition:"stroke-dashoffset 1s linear, stroke 300ms"}}
            />
          </svg>
          <div className="timer-ring-center">
            <div className="timer-display" style={{color:mode.color}}>
              {pad(mins)}:{pad(secs)}
            </div>
            <div className="timer-mode-label">{mode.label}</div>
          </div>
        </div>

        {/* Session dots */}
        <div className="timer-session-dots">
          {sessionDots.map((done, i) => (
            <div key={i} className={`timer-session-dot ${done?"done":""}`}
              style={done ? {background:mode.color} : {}} />
          ))}
        </div>
        <div className="timer-session-label">Session {(sessions % 4) + 1} of 4</div>

        {/* Controls */}
        <div className="timer-controls">
          <button className="timer-ctrl-btn timer-reset" onClick={reset} title="Reset">
            ⟳
          </button>
          <button className="timer-play-btn" onClick={toggleTimer}
            style={{background:`linear-gradient(135deg,${mode.color},${mode.color}cc)`}}>
            {running ? "⏸ Pause" : secsLeft===0 ? "▶ Start" : "▶ Resume"}
          </button>
          <button className="timer-ctrl-btn timer-skip" onClick={() => { setRunning(false); setSecsLeft(0); }} title="Skip">
            ⏭
          </button>
        </div>

        {/* Quote */}
        <div className="timer-quote">
          <div className="timer-quote-bn">{quote.bn}</div>
          <div className="timer-quote-en">{quote.en}</div>
        </div>

        {/* Stats */}
        <div className="timer-stats">
          <div className="timer-stat">
            <div className="timer-stat-val">{sessions}</div>
            <div className="timer-stat-lbl">Sessions Today</div>
          </div>
          <div className="timer-stat-divider" />
          <div className="timer-stat">
            <div className="timer-stat-val">{totalMins}</div>
            <div className="timer-stat-lbl">Total Minutes</div>
          </div>
          <div className="timer-stat-divider" />
          <div className="timer-stat">
            <div className="timer-stat-val">{completed}</div>
            <div className="timer-stat-lbl">Completed</div>
          </div>
        </div>

        {/* Tips */}
        <div className="timer-tips">
          <div className="timer-tips-title">📖 Pomodoro Technique</div>
          <div className="timer-tips-list">
            <div>🎯 Work for 25 minutes without distractions</div>
            <div>☕ Take a 5-minute break after each session</div>
            <div>🌿 Take a 15-minute break after 4 sessions</div>
            <div>📵 Keep your phone face-down during focus time</div>
          </div>
        </div>
      </div>
    </div>
  );
}
