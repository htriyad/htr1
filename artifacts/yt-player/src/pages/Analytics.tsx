import { useEffect, useState, useMemo } from "react";
import Header from "../components/Header";
import { USER_NAME_KEY } from "../App";

export function logActivity(mins = 1) {
  const key = `rr_activity_${new Date().toISOString().slice(0,10)}`;
  const prev = Number(localStorage.getItem(key) || 0);
  localStorage.setItem(key, String(Math.max(prev, prev + mins)));
}

interface GData {
  xp:number; level:number; streak:number;
  displayName:string;
  badgeDetails:{ key:string; label:string; icon:string }[];
  examHistory:{ quizId:string; title:string; score:number; total:number; pct:number; date:string; timeSecs:number }[];
  topicScores:Record<string,{ correct:number; total:number }>;
  totalExams:number; totalCorrect:number; totalAnswers:number;
}

const HEATMAP_COLORS = ["rgba(0,0,0,0.06)","#c6e48b","#7bc96f","#239a3b","#196127"];

export default function Analytics() {
  const [data, setData] = useState<GData|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    logActivity(1);
    const username = localStorage.getItem(USER_NAME_KEY) || "";
    fetch("/api/gamification/me", { headers: username ? { "x-username": username } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); setLoading(false); });
  }, []);

  /* ── Heatmap (90 days) ──────────────────────── */
  const heatmap = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 91 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() - (90 - i));
      const key = d.toISOString().slice(0,10);
      const mins = Number(localStorage.getItem(`rr_activity_${key}`) || 0);
      return { date: key, mins, level: mins === 0 ? 0 : mins < 10 ? 1 : mins < 25 ? 2 : mins < 50 ? 3 : 4 };
    });
  }, []);

  /* ── Streak ──────────────────────────────────── */
  const streak = useMemo(() => {
    let s = 0;
    for (let i = 0; i <= 365; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0,10);
      if (Number(localStorage.getItem(`rr_activity_${k}`) || 0) > 0) s++;
      else if (i > 0) break;
    }
    return s;
  }, []);

  const totalMins = Number(localStorage.getItem("rr_timer_mins") || 0);
  const totalSessions = Number(localStorage.getItem("rr_timer_sessions") || 0);
  const flashToday = Number(localStorage.getItem("rr_fc_today") || 0);

  /* ── Radar data (subject mastery) ───────────── */
  const radarData = useMemo(() => {
    if (!data?.topicScores) return [];
    const entries = Object.entries(data.topicScores)
      .map(([s,v]) => ({ subject: s.length > 10 ? s.slice(0,10)+"…" : s, pct: v.total > 0 ? Math.round((v.correct/v.total)*100) : 0 }));
    return entries.slice(0, 6);
  }, [data]);

  /* ── Quiz chart (last 10 scores) ────────────── */
  const quizChart = useMemo(() => {
    if (!data?.examHistory?.length) return [];
    return data.examHistory.slice(-10).map((e,i) => ({ i, title:e.title.slice(0,14), pct:e.pct }));
  }, [data]);

  /* ── Error notebook ──────────────────────────── */
  const errorNotes = useMemo(() => {
    try { const v = localStorage.getItem("rr_error_notebook"); return v ? JSON.parse(v) : []; } catch { return []; }
  }, []);

  /* ── Radar SVG ───────────────────────────────── */
  function renderRadar() {
    if (radarData.length < 2) return null;
    const N = radarData.length; const R = 80; const cx = 110; const cy = 110;
    const pts = radarData.map((d,i) => {
      const angle = (2*Math.PI/N)*i - Math.PI/2;
      const r = (d.pct / 100) * R;
      return { x: cx + r*Math.cos(angle), y: cy + r*Math.sin(angle), lx: cx + (R+22)*Math.cos(angle), ly: cy + (R+22)*Math.sin(angle), label: d.subject, pct: d.pct };
    });
    const bg = radarData.map((_,i) => {
      const angle = (2*Math.PI/N)*i - Math.PI/2;
      return `${cx + R*Math.cos(angle)},${cy + R*Math.sin(angle)}`;
    }).join(" ");
    const poly = pts.map(p => `${p.x},${p.y}`).join(" ");
    return (
      <svg viewBox="0 0 220 220" style={{ width:"100%", maxWidth:220, display:"block" }}>
        <polygon points={bg} fill="rgba(124,58,237,0.06)" stroke="rgba(124,58,237,0.2)" strokeWidth="1" />
        {[0.25,0.5,0.75,1].map(r => (
          <polygon key={r} points={radarData.map((_,i)=>{const a=(2*Math.PI/N)*i-Math.PI/2;return `${cx+R*r*Math.cos(a)},${cy+R*r*Math.sin(a)}`;}).join(" ")}
            fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="1" />
        ))}
        {pts.map(p => <line key={p.label} x1={cx} y1={cy} x2={cx + R*Math.cos((2*Math.PI/N)*radarData.findIndex(d=>d.subject===p.label)-Math.PI/2)} y2={cy + R*Math.sin((2*Math.PI/N)*radarData.findIndex(d=>d.subject===p.label)-Math.PI/2)} stroke="rgba(0,0,0,0.1)" strokeWidth="1" />)}
        <polygon points={poly} fill="rgba(124,58,237,0.25)" stroke="#7c3aed" strokeWidth="2" />
        {pts.map(p => <circle key={p.label+"c"} cx={p.x} cy={p.y} r="4" fill="#7c3aed" />)}
        {pts.map(p => (
          <text key={p.label+"t"} x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="700" fill="var(--text)" fontFamily="Roboto,sans-serif">
            {p.label}
          </text>
        ))}
      </svg>
    );
  }

  /* ── Bar chart (quiz scores) ─────────────────── */
  function renderBars() {
    if (!quizChart.length) return <div style={{textAlign:"center",color:"var(--sub)",fontSize:13,padding:20}}>No quiz history yet</div>;
    return (
      <svg viewBox={`0 0 ${quizChart.length*36+20} 100`} style={{ width:"100%", height:100 }}>
        {quizChart.map((q, i) => {
          const h = (q.pct / 100) * 70;
          const color = q.pct >= 80 ? "#16a34a" : q.pct >= 50 ? "#d97706" : "#dc2626";
          return (
            <g key={i}>
              <rect x={i*36+10} y={80-h} width={28} height={h} rx={4} fill={color} opacity="0.85" />
              <text x={i*36+24} y={78-h} textAnchor="middle" fontSize="8" fontWeight="700" fill={color}>{q.pct}%</text>
              <text x={i*36+24} y={95} textAnchor="middle" fontSize="7.5" fill="var(--sub)" fontFamily="Roboto,sans-serif">{q.title}</text>
            </g>
          );
        })}
      </svg>
    );
  }

  const accuracy = data && data.totalAnswers > 0 ? Math.round((data.totalCorrect / data.totalAnswers)*100) : 0;
  const xpToNext = data ? (data.level * data.level) * 100 : 100;

  const TIPS = [
    { icon:"🔥", tip:"Study every day to build your streak!" },
    { icon:"🃏", tip:"Review flashcards in the morning for best retention." },
    { icon:"⏱", tip:"Use Pomodoro: 25 min focus → 5 min break." },
    { icon:"📖", tip:"Teach a concept to someone else to master it." },
    { icon:"🎯", tip:"Focus on your weakest subjects first." },
  ];

  return (
    <div className="analytics-shell">
      <Header showBack backTo="/" />
      <div className="analytics-content">
        <div className="analytics-hero">
          <h1 className="analytics-hero-title">📊 Study Analytics</h1>
          <p className="analytics-hero-sub">Your complete learning performance overview</p>
        </div>

        {/* ── Hero Stats ──────────────────────── */}
        <div className="analytics-stats-grid">
          {[
            { icon: streak >= 7 ? "🔥" : "📅", label:"Study Streak", value:`${streak}d`, color:"#dc2626" },
            { icon:"⏱", label:"Study Minutes", value:String(totalMins), color:"#7c3aed" },
            { icon:"🎯", label:"Quiz Accuracy", value:`${accuracy}%`, color:accuracy>=80?"#16a34a":accuracy>=50?"#d97706":"#dc2626" },
            { icon:"⚡", label:"Total XP", value:loading?"…":String(data?.xp??0), color:"#d97706" },
            { icon:"🃏", label:"Cards Today", value:String(flashToday), color:"#2563eb" },
            { icon:"📝", label:"Exams Taken", value:loading?"…":String(data?.totalExams??0), color:"#0891b2" },
          ].map(s => (
            <div key={s.label} className="analytics-stat" style={{ borderTop:`3px solid ${s.color}` }}>
              <div style={{fontSize:24,marginBottom:4}}>{s.icon}</div>
              <div style={{fontSize:22,fontWeight:900,color:s.color,fontFamily:"Lato,sans-serif"}}>{s.value}</div>
              <div style={{fontSize:11,color:"var(--sub)",fontWeight:600}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Activity Heatmap ─────────────────── */}
        <div className="analytics-section">
          <div className="analytics-section-header">
            <h2 className="analytics-section-title">📅 Activity Heatmap</h2>
            <span style={{fontSize:12,color:"var(--sub)"}}>Last 90 days</span>
          </div>
          <div className="heatmap-grid">
            {heatmap.map((d,i) => (
              <div key={i} className="heatmap-cell"
                style={{ background: HEATMAP_COLORS[d.level] }}
                title={`${d.date}: ${d.mins} mins`}
              />
            ))}
          </div>
          <div className="heatmap-legend">
            <span style={{fontSize:11,color:"var(--sub)"}}>Less</span>
            {HEATMAP_COLORS.map((c,i) => <div key={i} style={{width:12,height:12,borderRadius:2,background:c,border:"1px solid rgba(0,0,0,0.1)"}} />)}
            <span style={{fontSize:11,color:"var(--sub)"}}>More</span>
          </div>
        </div>

        {/* ── Two columns: Radar + Quiz bars ──── */}
        <div className="analytics-two-col">
          <div className="analytics-section" style={{flex:1}}>
            <h2 className="analytics-section-title">🎯 Subject Mastery</h2>
            {radarData.length >= 2 ? renderRadar() : (
              <div style={{textAlign:"center",color:"var(--sub)",fontSize:13,padding:20}}>
                Take quizzes to see your mastery radar
              </div>
            )}
          </div>
          <div className="analytics-section" style={{flex:1}}>
            <h2 className="analytics-section-title">📊 Quiz Scores</h2>
            {renderBars()}
          </div>
        </div>

        {/* ── Level Progress ────────────────────── */}
        {data && (
          <div className="analytics-section">
            <h2 className="analytics-section-title">🏆 Level Progress</h2>
            <div style={{display:"flex",alignItems:"center",gap:16}}>
              <div style={{
                width:64,height:64,borderRadius:"50%",
                background:"linear-gradient(135deg,#f59e0b,#dc2626)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:24,fontWeight:900,color:"#fff",fontFamily:"Lato,sans-serif",
                flexShrink:0
              }}>{data.level}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:13,fontWeight:700}}>Level {data.level} → {data.level+1}</span>
                  <span style={{fontSize:12,color:"var(--sub)"}}>{data.xp} / {xpToNext} XP</span>
                </div>
                <div style={{height:10,background:"rgba(0,0,0,0.08)",borderRadius:999,overflow:"hidden"}}>
                  <div style={{height:"100%",background:"linear-gradient(90deg,#f59e0b,#dc2626)",borderRadius:999,width:`${Math.min(100,(data.xp/xpToNext)*100)}%`,transition:"width 800ms ease"}} />
                </div>
                <div style={{fontSize:11,color:"var(--sub)",marginTop:4}}>
                  {Math.max(0,xpToNext-data.xp)} XP needed to level up
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Badges ────────────────────────────── */}
        {data && data.badgeDetails.length > 0 && (
          <div className="analytics-section">
            <h2 className="analytics-section-title">🏅 Earned Badges</h2>
            <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
              {data.badgeDetails.map(b => (
                <div key={b.key} style={{
                  display:"flex",alignItems:"center",gap:8,
                  background:"linear-gradient(135deg,rgba(124,58,237,0.08),rgba(220,38,38,0.06))",
                  border:"1px solid rgba(124,58,237,0.2)",
                  borderRadius:12,padding:"8px 14px",
                }}>
                  <span style={{fontSize:20}}>{b.icon}</span>
                  <span style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Error Notebook ───────────────────── */}
        <div className="analytics-section">
          <h2 className="analytics-section-title">📓 Error Notebook</h2>
          {errorNotes.length === 0 ? (
            <div style={{textAlign:"center",color:"var(--sub)",fontSize:13,padding:"20px 0"}}>
              <div style={{fontSize:36,marginBottom:8}}>✅</div>
              Wrong answers from quizzes will appear here for review
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {errorNotes.slice(-10).reverse().map((n: any, i: number) => (
                <div key={i} style={{background:"#fff0f0",border:"1px solid #fecaca",borderRadius:12,padding:"12px 14px"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#991b1b",marginBottom:4}}>❌ {n.question}</div>
                  <div style={{fontSize:12,color:"#666"}}>Your answer: <span style={{color:"#dc2626",fontWeight:600}}>{n.yourAnswer}</span></div>
                  <div style={{fontSize:12,color:"#666"}}>Correct: <span style={{color:"#16a34a",fontWeight:600}}>{n.correct}</span></div>
                  {n.solution && <div style={{fontSize:12,color:"#7c3aed",marginTop:4}}>💡 {n.solution}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Study Tips ───────────────────────── */}
        <div className="analytics-section">
          <h2 className="analytics-section-title">💡 Personalized Tips</h2>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {TIPS.map((t,i) => (
              <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"10px 12px",background:"var(--bg)",borderRadius:12,border:"1px solid var(--border)"}}>
                <span style={{fontSize:18,flexShrink:0}}>{t.icon}</span>
                <span style={{fontSize:13,color:"var(--text)",lineHeight:1.5}}>{t.tip}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{height:40}} />
      </div>
    </div>
  );
}
