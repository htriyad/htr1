import { useState, useEffect, useRef, useCallback } from "react";
import Header from "../components/Header";
import { logActivity } from "./Analytics";

const MODES = [
  {id:"focus",label:"Deep Focus",mins:25,color:"#7c3aed",icon:"🎯"},
  {id:"short",label:"Short Break",mins:5, color:"#16a34a",icon:"☕"},
  {id:"long", label:"Long Break", mins:15,color:"#2563eb",icon:"🌿"},
  {id:"exam", label:"Exam Prep",  mins:50,color:"#dc2626",icon:"📝"},
];
const AMBIENT = [
  {id:"none",   label:"Silent",  icon:"🔇"},
  {id:"rain",   label:"Rain",    icon:"🌧️"},
  {id:"forest", label:"Forest",  icon:"🌲"},
  {id:"cafe",   label:"Café",    icon:"☕"},
  {id:"waves",  label:"Waves",   icon:"🌊"},
  {id:"focus",  label:"Focus Hz",icon:"🧠"},
];
const QUOTES = [
  {bn:"আজকের পরিশ্রম, কালকের সাফল্য।",        en:"Today's effort, tomorrow's success."},
  {bn:"মনোযোগই শক্তির উৎস।",                    en:"Focus is the source of all power."},
  {bn:"এক মিনিট এক ঘণ্টার চেয়ে বেশি মূল্যবান হতে পারে।", en:"One focused minute beats an idle hour."},
  {bn:"তুমি পারবে — থামো না।",                   en:"You can do it — don't stop now."},
  {bn:"পরীক্ষায় সাফল্য আসে ধৈর্য ও অধ্যবসায় থেকে।", en:"Exam success comes from patience and persistence."},
];
const RADIUS = 70; const CIRC = 2*Math.PI*RADIUS;
const PAD = (n:number) => String(n).padStart(2,"0");

export default function FocusRoom() {
  const [modeIdx,  setModeIdx]  = useState(0);
  const [custom,   setCustom]   = useState(45);
  const [running,  setRunning]  = useState(false);
  const [secsLeft, setSecsLeft] = useState(MODES[0].mins*60);
  const [sessions, setSessions] = useState(0);
  const [totalFocus, setTotalFocus] = useState(() => Number(localStorage.getItem("rr_focus_mins")||0));
  const [tasks, setTasks]     = useState<{id:number;text:string;done:boolean}[]>(() => {
    try { return JSON.parse(localStorage.getItem("rr_focus_tasks")||"[]"); } catch { return []; }
  });
  const [newTask,  setNewTask]  = useState("");
  const [ambient,  setAmbient]  = useState("none");
  const [breath,   setBreath]   = useState<"inhale"|"hold"|"exhale">("inhale");
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [ring, setRing]         = useState(false);
  const timerRef  = useRef<ReturnType<typeof setInterval>|null>(null);
  const audioCtxRef = useRef<AudioContext|null>(null);
  const nodesRef  = useRef<any[]>([]);

  const mode      = MODES[modeIdx];
  const totalSecs = (mode.id==="exam"?custom:mode.mins)*60;
  const progress  = secsLeft/totalSecs;
  const dashOff   = CIRC*progress;

  /* ── Breathing guide ── */
  useEffect(() => {
    if (!running || mode.id!=="focus") return;
    let active = true;
    const cycle = async () => {
      setBreath("inhale");  await new Promise(r=>setTimeout(r,4000));
      if (!active) return;
      setBreath("hold");    await new Promise(r=>setTimeout(r,4000));
      if (!active) return;
      setBreath("exhale");  await new Promise(r=>setTimeout(r,4000));
    };
    const run = async () => { while (active) await cycle(); };
    run();
    return () => { active = false; };
  }, [running, mode.id]);

  /* ── Ambient audio ── */
  function stopAudio() {
    nodesRef.current.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch {} });
    nodesRef.current = [];
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
  }
  function startAudio(id: string) {
    stopAudio();
    if (id === "none") return;
    try {
      const ctx = new AudioContext(); audioCtxRef.current = ctx;
      const masterGain = ctx.createGain(); masterGain.gain.value = 0.07; masterGain.connect(ctx.destination);
      if (id === "focus") {
        const L = ctx.createOscillator(); const R = ctx.createOscillator();
        const gL = ctx.createGain(); const gR = ctx.createGain();
        const merger = ctx.createChannelMerger(2);
        gL.gain.value = 0.15; gR.gain.value = 0.15;
        L.frequency.value = 200; R.frequency.value = 240; // 40Hz gamma for focus
        L.connect(gL); R.connect(gR);
        gL.connect(merger,0,0); gR.connect(merger,0,1);
        merger.connect(ctx.destination);
        L.start(); R.start();
        nodesRef.current = [L, R, gL, gR, merger];
      } else {
        const sr = ctx.sampleRate; const dur = 4;
        const buf = ctx.createBuffer(1, sr*dur, sr);
        const data = buf.getChannelData(0);
        for (let i=0; i<sr*dur; i++) data[i] = (Math.random()*2-1);
        const filter = ctx.createBiquadFilter();
        filter.type = id==="rain"?"bandpass":id==="forest"?"highpass":id==="waves"?"lowpass":"allpass";
        filter.frequency.value = id==="cafe"?1200:id==="rain"?800:id==="waves"?200:600;
        filter.Q.value = 0.7;
        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
        src.connect(filter); filter.connect(masterGain);
        src.start();
        nodesRef.current = [src, filter, masterGain];
      }
    } catch {}
  }
  useEffect(() => () => stopAudio(), []);

  function pickAmbient(id: string) { setAmbient(id); if (running) startAudio(id); }

  function beep() {
    try {
      const a = new AudioContext(); const o = a.createOscillator(); const g = a.createGain();
      o.connect(g); g.connect(a.destination); o.frequency.value = 880;
      g.gain.setValueAtTime(0.3, a.currentTime);
      o.start(); o.stop(a.currentTime+0.5);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime+0.5);
    } catch {}
  }

  const finish = useCallback((minsDone: number) => {
    stopAudio();
    if (minsDone > 0) {
      setSessions(s => s+1);
      setTotalFocus(t => { const n=t+minsDone; localStorage.setItem("rr_focus_mins",String(n)); return n; });
      logActivity(minsDone);
    }
    setRunning(false); setRing(true); setTimeout(()=>setRing(false),3000);
    beep();
    setSecsLeft(totalSecs);
  }, [totalSecs]);

  const handleStop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const minsDone = Math.round((totalSecs-secsLeft)/60);
    finish(minsDone);
  }, [totalSecs, secsLeft, finish]);

  function handleStart() {
    setRunning(true); setSecsLeft(totalSecs);
    setQuoteIdx(Math.floor(Math.random()*QUOTES.length));
    startAudio(ambient);
  }

  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setSecsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          const minsDone = mode.id==="exam" ? custom : mode.mins;
          finish(minsDone);
          return totalSecs;
        }
        return s-1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running, mode, custom, totalSecs, finish]);

  useEffect(() => { localStorage.setItem("rr_focus_tasks", JSON.stringify(tasks)); }, [tasks]);

  function addTask() {
    if (!newTask.trim()) return;
    setTasks(t => [...t, {id:Date.now(),text:newTask.trim(),done:false}]);
    setNewTask("");
  }
  const doneTasks = tasks.filter(t=>t.done).length;
  const modeColor = mode.color;
  const bgGrad = running
    ? mode.id==="focus"?"linear-gradient(180deg,#0d0520 0%,#0d1a36 100%)"
      :mode.id==="short"?"linear-gradient(180deg,#051a05 0%,#0d1a10 100%)"
      :mode.id==="exam"? "linear-gradient(180deg,#200505 0%,#1a0d0d 100%)"
      :"linear-gradient(180deg,#050d1a 0%,#0d1236 100%)"
    : "var(--bg)";

  return (
    <div style={{background:bgGrad,minHeight:"100svh",transition:"background 1.2s",paddingBottom:40}}>
      {!fullscreen && <Header showBack backTo="/" />}

      <div style={{padding:"14px 14px",display:"flex",flexDirection:"column",gap:14,maxWidth:500,margin:"0 auto"}}>

        {/* Ring flash overlay */}
        {ring && (
          <div style={{position:"fixed",inset:0,background:`${modeColor}22`,zIndex:50,pointerEvents:"none",animation:"ringFlash 3s ease-out forwards"}}/>
        )}

        {/* Mode tabs */}
        {!fullscreen && (
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:2}}>
            {MODES.map((m,i) => (
              <button key={m.id} onClick={()=>{ if(!running){setModeIdx(i);setSecsLeft(m.id==="exam"?custom*60:m.mins*60);} }}
                style={{padding:"7px 14px",borderRadius:20,background:modeIdx===i?m.color:"var(--surface)",color:modeIdx===i?"#fff":"var(--sub)",border:`2px solid ${modeIdx===i?m.color:"var(--border)"}`,fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap",transition:"all 200ms"}}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>
        )}
        {!fullscreen && mode.id==="exam" && !running && (
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <label style={{fontSize:13,color:"var(--sub)",flexShrink:0}}>Duration:</label>
            <input type="number" value={custom} min={1} max={180} onChange={e=>{const v=Math.max(1,Math.min(180,Number(e.target.value)||45));setCustom(v);setSecsLeft(v*60);}}
              style={{width:70,padding:"6px 10px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text)",fontSize:13}}/>
            <span style={{fontSize:13,color:"var(--sub)"}}>minutes</span>
          </div>
        )}

        {/* Timer */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
          <div style={{position:"relative",width:190,height:190}}>
            <svg width={190} height={190} viewBox="0 0 190 190">
              <circle cx={95} cy={95} r={RADIUS} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={12}/>
              <circle cx={95} cy={95} r={RADIUS} fill="none" stroke={modeColor} strokeWidth={12}
                strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={dashOff}
                transform="rotate(-90 95 95)" style={{transition:"stroke-dashoffset 1s linear",filter:`drop-shadow(0 0 8px ${modeColor}88)`}}/>
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
              <div style={{fontSize:38,fontWeight:900,fontFamily:"monospace",color:"var(--text)",letterSpacing:2}}>
                {PAD(Math.floor(secsLeft/60))}:{PAD(secsLeft%60)}
              </div>
              <div style={{fontSize:13,color:"var(--sub)",fontWeight:600,marginTop:2}}>{mode.label}</div>
            </div>
          </div>

          {running && mode.id==="focus" && (
            <div style={{fontSize:13,fontWeight:700,color:modeColor,letterSpacing:"0.08em",textAlign:"center",padding:"6px 16px",borderRadius:20,background:`${modeColor}18`,border:`1px solid ${modeColor}44`}}>
              {breath==="inhale"?"🫁 Inhale... (4s)":breath==="hold"?"⏸ Hold... (4s)":"💨 Exhale... (4s)"}
            </div>
          )}

          <div style={{display:"flex",gap:10}}>
            {!running ? (
              <button onClick={handleStart}
                style={{padding:"13px 36px",borderRadius:14,background:modeColor,color:"#fff",border:"none",fontSize:16,fontWeight:900,cursor:"pointer",boxShadow:`0 4px 20px ${modeColor}55`,minWidth:150}}>
                ▶ Start
              </button>
            ) : (
              <button onClick={handleStop}
                style={{padding:"13px 36px",borderRadius:14,background:"rgba(220,38,38,0.15)",color:"#f87171",border:"2px solid #dc2626",fontSize:16,fontWeight:900,cursor:"pointer",minWidth:150}}>
                ⏹ Stop
              </button>
            )}
            {!running && (
              <button onClick={()=>setFullscreen(f=>!f)}
                style={{padding:"13px 16px",borderRadius:14,background:"var(--surface)",color:"var(--sub)",border:"1px solid var(--border)",fontSize:18,cursor:"pointer"}}>
                {fullscreen?"⊡":"⊞"}
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
          {[["🎯",`${sessions}`,  "Sessions"],["⏱",`${totalFocus}m`,"Total Focus"],[mode.icon,`${mode.id==="exam"?custom:mode.mins}m`,"This Mode"]].map(([icon,val,lbl])=>(
            <div key={String(lbl)} style={{background:"var(--surface)",borderRadius:10,padding:"8px 14px",textAlign:"center",border:"1px solid var(--border)",flex:1,minWidth:80}}>
              <div style={{fontSize:20}}>{icon}</div>
              <div style={{fontSize:16,fontWeight:900,color:"var(--text)",fontFamily:"Lato,sans-serif"}}>{val}</div>
              <div style={{fontSize:10,color:"var(--sub)",fontWeight:600}}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Ambient */}
        {!fullscreen && (
          <div style={{background:"var(--surface)",borderRadius:12,padding:14,border:"1px solid var(--border)"}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--sub)",marginBottom:8}}>🎵 Ambient Sound</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {AMBIENT.map(a => (
                <button key={a.id} onClick={()=>pickAmbient(a.id)}
                  style={{padding:"6px 12px",borderRadius:20,background:ambient===a.id?modeColor:"var(--bg)",color:ambient===a.id?"#fff":"var(--sub)",border:`1.5px solid ${ambient===a.id?modeColor:"var(--border)"}`,fontSize:11,fontWeight:700,cursor:"pointer",transition:"all 200ms"}}>
                  {a.icon} {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tasks */}
        {!fullscreen && (
          <div style={{background:"var(--surface)",borderRadius:12,padding:14,border:"1px solid var(--border)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{fontSize:12,fontWeight:700,color:"var(--sub)"}}>📋 Session Tasks ({doneTasks}/{tasks.length})</div>
              {doneTasks > 0 && <button onClick={()=>setTasks(t=>t.filter(x=>!x.done))} style={{fontSize:10,color:"var(--sub)",background:"none",border:"none",cursor:"pointer"}}>Clear done</button>}
            </div>
            <div style={{display:"flex",gap:6,marginBottom:8}}>
              <input value={newTask} onChange={e=>setNewTask(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&addTask()}
                placeholder="Add a task… (Enter to add)"
                style={{flex:1,padding:"7px 10px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:12}}/>
              <button onClick={addTask} style={{padding:"7px 14px",borderRadius:8,background:modeColor,color:"#fff",border:"none",fontWeight:700,fontSize:12,cursor:"pointer"}}>+</button>
            </div>
            {tasks.length > 0 && (
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {tasks.map(t => (
                  <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:8,background:"var(--bg)"}}>
                    <button onClick={()=>setTasks(ts=>ts.map(x=>x.id===t.id?{...x,done:!x.done}:x))}
                      style={{width:18,height:18,borderRadius:4,border:`2px solid ${t.done?"var(--green)":"var(--border)"}`,background:t.done?"var(--green)":"transparent",cursor:"pointer",color:"#fff",fontSize:10,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {t.done?"✓":""}
                    </button>
                    <span style={{flex:1,fontSize:12,color:"var(--text)",textDecoration:t.done?"line-through":"none",opacity:t.done?0.5:1}}>{t.text}</span>
                    <button onClick={()=>setTasks(ts=>ts.filter(x=>x.id!==t.id))} style={{color:"var(--sub)",background:"none",border:"none",cursor:"pointer",fontSize:11}}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quote */}
        {running && (
          <div style={{textAlign:"center",padding:"14px 18px",background:"rgba(255,255,255,0.04)",borderRadius:14,border:"1px solid rgba(255,255,255,0.07)"}}>
            <div style={{fontSize:15,fontWeight:600,color:"var(--text)",marginBottom:4,fontFamily:"Lato,sans-serif"}}>{QUOTES[quoteIdx].bn}</div>
            <div style={{fontSize:11,color:"var(--sub)",fontStyle:"italic"}}>{QUOTES[quoteIdx].en}</div>
          </div>
        )}
      </div>
      <style>{`@keyframes ringFlash{0%{opacity:0.6}100%{opacity:0}}`}</style>
    </div>
  );
}
