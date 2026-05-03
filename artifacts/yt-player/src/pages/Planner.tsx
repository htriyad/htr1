import { useEffect, useState, useCallback } from "react";
import Header from "../components/Header";

const TOKEN = () => localStorage.getItem("rr_user_token") || "";

interface ExamDate { id:string; title:string; exam:string; date:string; color:string; }

/* ── Circular progress ring ─────────────────────────────── */
function Ring({ pct, color, size=100 }: { pct:number; color:string; size?:number }) {
  const r = (size/2) - 8; const circ = 2*Math.PI*r;
  const offset = circ * (1 - Math.min(1, pct/100));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="8" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${size/2} ${size/2})`} style={{transition:"stroke-dashoffset 600ms ease"}} />
    </svg>
  );
}

const SUBJECTS = ["Physics","Chemistry","Biology","Mathematics","English","Bangla","ICT","Geography","History","Economy","Other"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const today = () => new Date().toDateString();

function loadPlan() {
  try { return JSON.parse(localStorage.getItem(`rr_plan_${today()}`)||"[]"); } catch { return []; }
}
function savePlan(plan: any[]) { localStorage.setItem(`rr_plan_${today()}`, JSON.stringify(plan)); }
function loadGoal() { return Number(localStorage.getItem("rr_daily_goal") || 120); }

export default function Planner() {
  const [goal, setGoal]               = useState(loadGoal);
  const [editGoal, setEditGoal]       = useState(false);
  const [goalInput, setGoalInput]     = useState(String(loadGoal()));
  const [plan, setPlan]               = useState<{subj:string;mins:number;done:boolean}[]>(loadPlan);
  const [addSubj, setAddSubj]         = useState(SUBJECTS[0]);
  const [addMins, setAddMins]         = useState(30);
  const [examDates, setExamDates]     = useState<ExamDate[]>([]);
  const [notifEnabled, setNotifEnabled] = useState(localStorage.getItem("rr_notif")==="1");
  const [noteText, setNoteText]       = useState(localStorage.getItem("rr_quick_note")||"");

  // Load exam dates
  const loadExams = useCallback(() => {
    fetch("/api/exam-dates", { headers: { Authorization: `Bearer ${TOKEN()}` } })
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setExamDates(d); })
      .catch(() => {});
  }, []);

  useEffect(() => { loadExams(); }, [loadExams]);

  // Save plan on change
  useEffect(() => { savePlan(plan); }, [plan]);

  const doneMins = plan.filter(p=>p.done).reduce((a,p)=>a+p.mins,0);
  const totalPlanMins = plan.reduce((a,p)=>a+p.mins,0);
  const goalPct = Math.round((doneMins/goal)*100);

  function addToday() {
    if (!addSubj || addMins <= 0) return;
    const np = [...plan, { subj: addSubj, mins: addMins, done: false }];
    setPlan(np);
  }
  function toggleDone(i: number) {
    const np = [...plan]; np[i] = { ...np[i], done: !np[i].done };
    setPlan(np);
  }
  function removePlan(i: number) {
    setPlan(p => p.filter((_,j)=>j!==i));
  }

  function saveGoal() {
    const g = Number(goalInput);
    if (g > 0) { setGoal(g); localStorage.setItem("rr_daily_goal", String(g)); }
    setEditGoal(false);
  }

  async function requestNotif() {
    if (!("Notification" in window)) return alert("Notifications not supported");
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setNotifEnabled(true);
      localStorage.setItem("rr_notif","1");
      new Notification("RedRose Study Reminder", { body:"Time to study! Your daily goal awaits. 📚", icon:"/favicon.ico" });
    }
  }

  // Exam countdowns
  const now = Date.now();
  const upcomingExams = examDates
    .map(e => ({ ...e, ms: new Date(e.date).getTime() - now }))
    .filter(e => e.ms > 0)
    .sort((a,b) => a.ms - b.ms);

  function fmtCountdown(ms: number) {
    const days = Math.floor(ms / 86400000);
    if (days > 0) return `${days}d ${Math.floor((ms%86400000)/3600000)}h`;
    const h = Math.floor(ms/3600000); const m = Math.floor((ms%3600000)/60000);
    return `${h}h ${m}m`;
  }

  // Weekly overview (dummy from localStorage)
  const weekData = DAYS.map((_,i) => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + i);
    const k = `rr_activity_${d.toISOString().slice(0,10)}`;
    return { day: DAYS[i], mins: Number(localStorage.getItem(k)||0) };
  });
  const maxWeek = Math.max(...weekData.map(w=>w.mins), 1);

  return (
    <div className="planner-shell">
      <Header showBack backTo="/" />
      <div className="planner-content">

        <h1 className="planner-title">📅 Study Planner</h1>

        {/* ── Exam Countdowns ──────────────────── */}
        {upcomingExams.length > 0 && (
          <div style={{padding:"0 14px",marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:800,color:"var(--text)",marginBottom:8}}>⏰ Upcoming Exams</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {upcomingExams.slice(0,5).map(e => {
                const days = Math.floor(e.ms/86400000);
                const urgency = days < 7 ? "#dc2626" : days < 30 ? "#d97706" : "#16a34a";
                return (
                  <div key={e.id} style={{background:urgency+"15",border:`1.5px solid ${urgency}30`,borderLeft:`4px solid ${urgency}`,borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:800,color:"var(--text)"}}>{e.title}</div>
                      <div style={{fontSize:12,color:urgency,fontWeight:700}}>{e.exam}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:22,fontWeight:900,color:urgency,fontFamily:"monospace",lineHeight:1}}>{days}d</div>
                      <div style={{fontSize:10,color:"var(--sub)"}}>{fmtCountdown(e.ms)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Daily Goal Ring ──────────────────── */}
        <div className="planner-goal-card">
          <div style={{position:"relative",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
            <Ring pct={goalPct} color={goalPct>=100?"#16a34a":goalPct>=50?"#d97706":"#7c3aed"} size={120} />
            <div style={{position:"absolute",textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:900,color:"var(--text)",fontFamily:"Lato,sans-serif"}}>{goalPct}%</div>
              <div style={{fontSize:10,color:"var(--sub)"}}>of goal</div>
            </div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:800,color:"var(--text)"}}>Today's Goal</div>
            {!editGoal ? (
              <>
                <div style={{fontSize:24,fontWeight:900,color:"var(--purple)",fontFamily:"Lato,sans-serif"}}>{doneMins}<span style={{fontSize:14,color:"var(--sub)"}}> / {goal} min</span></div>
                <button onClick={()=>setEditGoal(true)} style={{background:"none",border:"none",color:"var(--purple)",fontSize:12,fontWeight:700,cursor:"pointer",padding:0,marginTop:4}}>Change goal →</button>
              </>
            ) : (
              <div style={{display:"flex",gap:8,alignItems:"center",marginTop:6}}>
                <input type="number" value={goalInput} onChange={e=>setGoalInput(e.target.value)}
                  style={{width:70,padding:"4px 8px",borderRadius:8,border:"1.5px solid var(--border)",fontSize:14,background:"var(--bg)",color:"var(--text)"}} />
                <span style={{fontSize:12,color:"var(--sub)"}}>min</span>
                <button onClick={saveGoal} style={{padding:"4px 12px",borderRadius:8,background:"var(--purple)",border:"none",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Save</button>
              </div>
            )}
          </div>
        </div>

        {/* ── Today's Plan ────────────────────── */}
        <div className="planner-section">
          <div style={{fontSize:16,fontWeight:800,color:"var(--text)",marginBottom:12}}>📝 Today's Schedule</div>
          {plan.length === 0 && (
            <div style={{textAlign:"center",padding:"20px 0",color:"var(--sub)",fontSize:13}}>No subjects planned yet. Add one below!</div>
          )}
          {plan.map((item, i) => (
            <div key={i} className={`planner-task ${item.done?"planner-task-done":""}`}>
              <button onClick={()=>toggleDone(i)} className={`planner-check ${item.done?"checked":""}`}>
                {item.done?"✓":""}
              </button>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700,color:item.done?"var(--sub)":"var(--text)",textDecoration:item.done?"line-through":"none"}}>{item.subj}</div>
                <div style={{fontSize:12,color:"var(--sub)"}}>{item.mins} minutes</div>
              </div>
              <button onClick={()=>removePlan(i)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--sub)",fontSize:16,padding:4}}>✕</button>
            </div>
          ))}

          {/* Add task */}
          <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
            <select value={addSubj} onChange={e=>setAddSubj(e.target.value)} style={{flex:1,minWidth:120,padding:"8px 10px",borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13}}>
              {SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              {[15,30,45,60,90].map(m=>(
                <button key={m} onClick={()=>setAddMins(m)} style={{padding:"6px 10px",borderRadius:8,border:"1.5px solid",borderColor:addMins===m?"var(--purple)":"var(--border)",background:addMins===m?"var(--purple)":"transparent",color:addMins===m?"#fff":"var(--text)",fontSize:12,fontWeight:700,cursor:"pointer"}}>{m}m</button>
              ))}
            </div>
            <button onClick={addToday} style={{padding:"8px 18px",borderRadius:10,background:"var(--purple)",border:"none",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer"}}>+ Add</button>
          </div>
        </div>

        {/* ── Weekly View ──────────────────────── */}
        <div className="planner-section">
          <div style={{fontSize:16,fontWeight:800,color:"var(--text)",marginBottom:12}}>📊 This Week's Activity</div>
          <div style={{display:"flex",gap:6,alignItems:"flex-end",height:80}}>
            {weekData.map((w, i) => {
              const isToday = i === new Date().getDay();
              const h = Math.round((w.mins/maxWeek)*68) || 4;
              return (
                <div key={w.day} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <div style={{width:"100%",height:h,borderRadius:"6px 6px 2px 2px",background:isToday?"var(--purple)":w.mins>0?"#a78bfa":"rgba(0,0,0,0.08)",transition:"height 400ms ease"}} title={`${w.mins} min`} />
                  <span style={{fontSize:10,fontWeight:isToday?800:600,color:isToday?"var(--purple)":"var(--sub)"}}>{w.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Quick Notes ──────────────────────── */}
        <div className="planner-section">
          <div style={{fontSize:16,fontWeight:800,color:"var(--text)",marginBottom:8}}>📌 Quick Note</div>
          <textarea
            value={noteText}
            onChange={e=>{ setNoteText(e.target.value); localStorage.setItem("rr_quick_note",e.target.value); }}
            placeholder="Jot down something to remember..."
            style={{width:"100%",minHeight:80,padding:"12px",borderRadius:12,border:"1.5px solid var(--border)",background:"#fffbeb",color:"#92400e",fontSize:13,resize:"vertical",fontFamily:"Roboto,'Noto Sans Bengali',sans-serif",outline:"none",lineHeight:1.6,boxSizing:"border-box"}}
          />
        </div>

        {/* ── Notifications ────────────────────── */}
        <div className="planner-section">
          <div style={{fontSize:16,fontWeight:800,color:"var(--text)",marginBottom:8}}>🔔 Study Reminders</div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:"var(--sub)",lineHeight:1.5}}>
                {notifEnabled ? "✅ Notifications enabled — you'll get study reminders" : "Get notified when it's time to study"}
              </div>
            </div>
            {!notifEnabled && (
              <button onClick={requestNotif} style={{padding:"8px 16px",borderRadius:10,background:"var(--purple)",border:"none",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",flexShrink:0}}>
                Enable
              </button>
            )}
          </div>
        </div>

        <div style={{height:40}} />
      </div>
    </div>
  );
}
