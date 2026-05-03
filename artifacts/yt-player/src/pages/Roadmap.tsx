import { useEffect, useState, useMemo } from "react";
import Header from "../components/Header";
import { USER_NAME_KEY } from "../App";

interface GData {
  xp: number; level: number; streak: number;
  examHistory: { quizId:string; title:string; score:number; total:number; pct:number; date:string }[];
  topicScores: Record<string,{ correct:number; total:number }>;
  totalExams: number;
}
interface TopicStatus {
  subject: string; correct: number; total: number; pct: number;
  status: "weak"|"average"|"strong"; icon: string; color: string;
  bg: string; label: string;
}
interface DayPlan {
  day: string; tasks: { subject: string; type: string; mins: number; color: string }[];
}

function getBadge(pct: number) {
  if (pct < 40) return { status:"weak" as const, icon:"🔴", color:"#dc2626", bg:"#fee2e2", label:"Weak — Urgent focus" };
  if (pct < 60) return { status:"weak" as const, icon:"🟠", color:"#ea580c", bg:"#ffedd5", label:"Below Average" };
  if (pct < 75) return { status:"average" as const, icon:"🟡", color:"#d97706", bg:"#fef3c7", label:"Needs Practice" };
  if (pct < 90) return { status:"strong" as const, icon:"🟢", color:"#16a34a", bg:"#dcfce7", label:"Good — Keep it up" };
  return { status:"strong" as const, icon:"🌟", color:"#0891b2", bg:"#e0f2fe", label:"Excellent!" };
}

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const STUDY_TYPES = ["Quiz Practice","Flashcard Review","Formula Study","Past Paper","Concept Reading","Problem Solving"];

export default function Roadmap() {
  const [data, setData]   = useState<GData|null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]     = useState<"overview"|"plan"|"progress">("overview");
  const [goalExam, setGoalExam] = useState<string>(()=>localStorage.getItem("rr_goal_exam")||"SSC");
  const [goalTarget, setGoalTarget] = useState<number>(()=>Number(localStorage.getItem("rr_goal_target")||75));
  const [goalDays, setGoalDays]   = useState<number>(()=>Number(localStorage.getItem("rr_goal_days")||60));

  useEffect(() => {
    const username = localStorage.getItem(USER_NAME_KEY)||"";
    fetch("/api/gamification/me", { headers: username?{"x-username":username}:{} })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .finally(() => setLoading(false));
  }, []);

  const topics: TopicStatus[] = useMemo(() => {
    if (!data?.topicScores) return [];
    return Object.entries(data.topicScores)
      .filter(([,v]) => v.total >= 1)
      .map(([subject, v]) => {
        const pct = v.total > 0 ? Math.round((v.correct/v.total)*100) : 0;
        const badge = getBadge(pct);
        return { subject, correct:v.correct, total:v.total, pct, ...badge };
      })
      .sort((a,b) => a.pct - b.pct); // weakest first
  }, [data]);

  const weakTopics   = topics.filter(t => t.status === "weak");
  const avgTopics    = topics.filter(t => t.status === "average");
  const strongTopics = topics.filter(t => t.status === "strong");

  const weekPlan: DayPlan[] = useMemo(() => {
    const allTopics = [...(weakTopics.length?weakTopics:[{subject:"General",color:"#7c3aed"}]), ...(avgTopics.length?avgTopics:[])];
    return DAYS.map((day, i) => {
      const isWeekend = i >= 5;
      const topicA = allTopics[i % allTopics.length];
      const topicB = allTopics[(i+1) % allTopics.length];
      const tasks = isWeekend ? [
        { subject: topicA?.subject||"Mixed Review", type:"Past Paper", mins:60, color:topicA?.color||"#7c3aed" },
        { subject:"All Topics", type:"Full Revision", mins:45, color:"#0891b2" },
      ] : [
        { subject: topicA?.subject||"Study", type: weakTopics.length ? "Quiz Practice" : "Flashcard Review", mins:30, color:topicA?.color||"#dc2626" },
        { subject: topicB?.subject||"Practice", type:STUDY_TYPES[i%STUDY_TYPES.length], mins:20, color:topicB?.color||"#7c3aed" },
      ];
      return { day, tasks };
    });
  }, [weakTopics, avgTopics]);

  const readiness = useMemo(() => {
    if (!topics.length) return 0;
    const avg = topics.reduce((a,t)=>a+t.pct,0)/topics.length;
    const bonus = (data?.streak||0)*0.5;
    return Math.min(100, Math.round(avg + bonus));
  }, [topics, data]);

  function saveGoal() {
    localStorage.setItem("rr_goal_exam", goalExam);
    localStorage.setItem("rr_goal_target", String(goalTarget));
    localStorage.setItem("rr_goal_days", String(goalDays));
  }

  const EXAMS = ["SSC","HSC","Admission","BCS","JSC","IELTS"];

  return (
    <div className="roadmap-shell">
      <Header showBack backTo="/" />

      {/* Hero */}
      <div className="roadmap-hero">
        <div>
          <h1 className="roadmap-hero-title">🗺️ Study Roadmap</h1>
          <p className="roadmap-hero-sub">Your personalised learning path · AI-driven weakness detection</p>
        </div>
        {!loading && (
          <div className="roadmap-readiness">
            <div className="roadmap-readiness-ring">
              <svg viewBox="0 0 60 60" style={{width:60,height:60}}>
                <circle cx="30" cy="30" r="25" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6"/>
                <circle cx="30" cy="30" r="25" fill="none" stroke="#fff" strokeWidth="6"
                  strokeDasharray={`${(readiness/100)*157} 157`} strokeLinecap="round"
                  transform="rotate(-90 30 30)" style={{transition:"stroke-dasharray 1s ease"}}/>
              </svg>
              <div className="roadmap-readiness-pct">{readiness}%</div>
            </div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.8)",textAlign:"center",marginTop:4}}>Readiness</div>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="roadmap-tabs">
        {(["overview","plan","progress"] as const).map(t=>(
          <button key={t} className={`roadmap-tab-btn ${tab===t?"active":""}`} onClick={()=>setTab(t)}>
            {{overview:"📊 Overview",plan:"📅 7-Day Plan",progress:"🎯 Goal Tracker"}[t]}
          </button>
        ))}
      </div>

      <div className="roadmap-content">
        {loading && (
          <div style={{textAlign:"center",padding:"60px 0"}}>
            <div style={{fontSize:40,marginBottom:12}}>🗺️</div>
            <p style={{color:"var(--sub)"}}>Analysing your performance...</p>
          </div>
        )}

        {!loading && tab === "overview" && (
          <>
            {/* Quick stats */}
            <div className="roadmap-stats-row">
              {[
                { label:"Exams Taken", val:data?.totalExams||0, icon:"📝" },
                { label:"Study Streak", val:`${data?.streak||0}d`, icon:"🔥" },
                { label:"Topics Tracked", val:topics.length, icon:"📚" },
                { label:"Level", val:data?.level||1, icon:"⚡" },
              ].map(s=>(
                <div key={s.label} className="roadmap-stat">
                  <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
                  <div style={{fontSize:18,fontWeight:900,color:"var(--purple)",fontFamily:"Lato,sans-serif"}}>{s.val}</div>
                  <div style={{fontSize:10,color:"var(--sub)",fontWeight:700}}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Exam readiness meter */}
            <div className="roadmap-section">
              <h2 className="roadmap-section-title">🎯 Exam Readiness Meter</h2>
              <div className="roadmap-meter-bar">
                <div className="roadmap-meter-fill" style={{width:`${readiness}%`,background:readiness>=75?"linear-gradient(90deg,#16a34a,#0891b2)":readiness>=50?"linear-gradient(90deg,#d97706,#16a34a)":"linear-gradient(90deg,#dc2626,#d97706)"}} />
                <div className="roadmap-meter-dot" style={{left:`${readiness}%`}} />
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                <span style={{fontSize:11,color:"#dc2626",fontWeight:700}}>Not ready</span>
                <span style={{fontSize:13,fontWeight:900,color:"var(--purple)"}}>{readiness}% Ready</span>
                <span style={{fontSize:11,color:"#16a34a",fontWeight:700}}>Exam ready!</span>
              </div>
              <div style={{fontSize:12,color:"var(--sub)",marginTop:8,textAlign:"center"}}>
                {readiness<50?"Focus heavily on weak topics and take more quizzes.":readiness<75?"You're making progress! Practice weak areas daily.":readiness<90?"Almost there — keep your streak and review mistakes!":"You're exam ready! Maintain consistency."}
              </div>
            </div>

            {/* No data state */}
            {topics.length === 0 && (
              <div className="roadmap-section" style={{textAlign:"center",padding:"30px 16px"}}>
                <div style={{fontSize:48,marginBottom:12}}>🎯</div>
                <h3 style={{fontWeight:800,color:"var(--text)",marginBottom:8}}>Take some quizzes first!</h3>
                <p style={{fontSize:13,color:"var(--sub)",lineHeight:1.6}}>Your personalised roadmap will appear here after you complete a few quizzes. The system tracks your performance per topic and builds your path automatically.</p>
                <button onClick={()=>window.location.href="/smart-quiz"} style={{marginTop:16,padding:"12px 24px",borderRadius:12,background:"var(--purple)",color:"#fff",border:"none",fontWeight:700,fontSize:14,cursor:"pointer"}}>
                  🧠 Take Smart Quiz →
                </button>
              </div>
            )}

            {/* Weak areas */}
            {weakTopics.length > 0 && (
              <div className="roadmap-section">
                <h2 className="roadmap-section-title">🔴 Weak Areas — Focus Now</h2>
                <p style={{fontSize:12,color:"var(--sub)",marginBottom:12}}>These topics need urgent attention. Practice these every day.</p>
                {weakTopics.map(t=>(
                  <div key={t.subject} className="roadmap-topic-card" style={{borderLeftColor:t.color}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                      <span style={{fontSize:20}}>{t.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:800,fontSize:14,color:"var(--text)"}}>{t.subject}</div>
                        <div style={{fontSize:11,color:t.color,fontWeight:700}}>{t.label} · {t.correct}/{t.total} correct</div>
                      </div>
                      <div style={{fontSize:22,fontWeight:900,color:t.color,fontFamily:"Lato,sans-serif"}}>{t.pct}%</div>
                    </div>
                    <div style={{height:6,background:"rgba(0,0,0,0.08)",borderRadius:99}}>
                      <div style={{height:"100%",background:t.color,borderRadius:99,width:`${t.pct}%`,transition:"width 800ms"}} />
                    </div>
                    <div style={{display:"flex",gap:6,marginTop:8}}>
                      <button onClick={()=>window.location.href="/smart-quiz"} style={{fontSize:11,padding:"4px 10px",borderRadius:20,border:`1px solid ${t.color}`,background:"transparent",color:t.color,fontWeight:700,cursor:"pointer"}}>🧠 Practice Now</button>
                      <button onClick={()=>window.location.href="/flashcards"} style={{fontSize:11,padding:"4px 10px",borderRadius:20,border:"1px solid var(--border)",background:"transparent",color:"var(--sub)",cursor:"pointer"}}>🃏 Flashcards</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Average areas */}
            {avgTopics.length > 0 && (
              <div className="roadmap-section">
                <h2 className="roadmap-section-title">🟡 Needs Practice</h2>
                {avgTopics.map(t=>(
                  <div key={t.subject} className="roadmap-topic-card" style={{borderLeftColor:t.color}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                      <span style={{fontSize:18}}>{t.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:14,color:"var(--text)"}}>{t.subject}</div>
                        <div style={{fontSize:11,color:"var(--sub)"}}>{t.correct}/{t.total} correct</div>
                      </div>
                      <div style={{fontSize:20,fontWeight:900,color:t.color,fontFamily:"Lato,sans-serif"}}>{t.pct}%</div>
                    </div>
                    <div style={{height:5,background:"rgba(0,0,0,0.08)",borderRadius:99}}>
                      <div style={{height:"100%",background:t.color,borderRadius:99,width:`${t.pct}%`}} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Strong areas */}
            {strongTopics.length > 0 && (
              <div className="roadmap-section">
                <h2 className="roadmap-section-title">🟢 Strong Topics — Maintain</h2>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {strongTopics.map(t=>(
                    <div key={t.subject} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",background:t.bg,borderRadius:20,border:`1px solid ${t.color}30`}}>
                      <span>{t.icon}</span>
                      <span style={{fontSize:12,fontWeight:700,color:t.color}}>{t.subject}</span>
                      <span style={{fontSize:11,color:t.color,opacity:0.8}}>{t.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!loading && tab === "plan" && (
          <>
            <div className="roadmap-section">
              <h2 className="roadmap-section-title">📅 Your 7-Day Study Plan</h2>
              <p style={{fontSize:12,color:"var(--sub)",marginBottom:14}}>Auto-generated based on your weak topics. Personalized daily tasks to maximise improvement.</p>
              {weekPlan.map((day,i)=>(
                <div key={i} className="roadmap-day-card">
                  <div className="roadmap-day-header">
                    <span style={{fontWeight:900,fontSize:14,color:"var(--purple)"}}>{day.day}</span>
                    <span style={{fontSize:11,color:"var(--sub)"}}>{day.tasks.reduce((a,t)=>a+t.mins,0)} min total</span>
                  </div>
                  {day.tasks.map((task,j)=>(
                    <div key={j} className="roadmap-task-row">
                      <div className="roadmap-task-dot" style={{background:task.color}} />
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{task.subject}</div>
                        <div style={{fontSize:11,color:"var(--sub)"}}>{task.type} · {task.mins} min</div>
                      </div>
                      <div style={{fontSize:11,fontWeight:700,color:task.color,padding:"3px 8px",background:`${task.color}15`,borderRadius:20}}>{task.mins}m</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && tab === "progress" && (
          <>
            <div className="roadmap-section">
              <h2 className="roadmap-section-title">🎯 Set Your Goal</h2>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"var(--sub)",marginBottom:6}}>Target Exam</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {EXAMS.map(e=>(
                      <button key={e} onClick={()=>setGoalExam(e)}
                        style={{padding:"6px 14px",borderRadius:20,border:"1.5px solid",borderColor:goalExam===e?"var(--purple)":"var(--border)",background:goalExam===e?"var(--purple)":"transparent",color:goalExam===e?"#fff":"var(--sub)",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"var(--sub)",marginBottom:6}}>Target Score: <span style={{color:"var(--purple)"}}>{goalTarget}%</span></div>
                  <input type="range" min={40} max={100} step={5} value={goalTarget} onChange={e=>setGoalTarget(Number(e.target.value))}
                    style={{width:"100%",accentColor:"var(--purple)"}}/>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--sub)"}}>
                    <span>40%</span><span>100%</span>
                  </div>
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"var(--sub)",marginBottom:6}}>Days Until Exam: <span style={{color:"var(--purple)"}}>{goalDays} days</span></div>
                  <input type="range" min={7} max={365} step={7} value={goalDays} onChange={e=>setGoalDays(Number(e.target.value))}
                    style={{width:"100%",accentColor:"var(--purple)"}}/>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--sub)"}}>
                    <span>7 days</span><span>365 days</span>
                  </div>
                </div>
                <button onClick={saveGoal} style={{padding:"11px",borderRadius:12,background:"var(--purple)",color:"#fff",border:"none",fontWeight:700,fontSize:14,cursor:"pointer"}}>💾 Save Goal</button>
              </div>
            </div>

            {/* From Weak to Strong */}
            {topics.length > 0 && (
              <div className="roadmap-section">
                <h2 className="roadmap-section-title">📈 From Weak to Strong</h2>
                <p style={{fontSize:12,color:"var(--sub)",marginBottom:14}}>Your transformation journey. {topics.filter(t=>t.pct>=goalTarget).length}/{topics.length} topics meet your goal.</p>
                {topics.map(t=>{
                  const meets = t.pct >= goalTarget;
                  const gap = Math.max(0, goalTarget - t.pct);
                  return (
                    <div key={t.subject} style={{marginBottom:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,alignItems:"center"}}>
                        <span style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{t.icon} {t.subject}</span>
                        <span style={{fontSize:12,fontWeight:700,color:meets?"#16a34a":"#dc2626"}}>{t.pct}%{meets?" ✓":" ("+gap+"% to go)"}</span>
                      </div>
                      <div style={{position:"relative",height:10,background:"rgba(0,0,0,0.07)",borderRadius:99}}>
                        <div style={{height:"100%",background:t.color,borderRadius:99,width:`${t.pct}%`,transition:"width 800ms"}} />
                        {/* Goal marker */}
                        <div style={{position:"absolute",top:-4,left:`${goalTarget}%`,width:2,height:18,background:"var(--purple)",borderRadius:99,transform:"translateX(-50%)"}} />
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",marginTop:2}}>
                        <span style={{fontSize:10,color:"var(--sub)"}}>Current: {t.pct}%</span>
                        <span style={{fontSize:10,color:"var(--purple)"}}>Goal: {goalTarget}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Exam history chart */}
            {data?.examHistory && data.examHistory.length > 0 && (
              <div className="roadmap-section">
                <h2 className="roadmap-section-title">📊 Recent Performance</h2>
                <div style={{overflowX:"auto",paddingBottom:8}}>
                  <svg viewBox={`0 0 ${Math.min(data.examHistory.length,15)*40+20} 110`} style={{width:"100%",height:110,minWidth:200}}>
                    {data.examHistory.slice(-15).map((e,i,arr)=>{
                      const h=(e.pct/100)*70;
                      const col=e.pct>=80?"#16a34a":e.pct>=50?"#d97706":"#dc2626";
                      return (
                        <g key={i}>
                          <rect x={i*40+10} y={80-h} width={32} height={h} rx={5} fill={col} opacity="0.85"/>
                          <text x={i*40+26} y={78-h} textAnchor="middle" fontSize="9" fontWeight="700" fill={col}>{e.pct}%</text>
                          <text x={i*40+26} y={97} textAnchor="middle" fontSize="8" fill="var(--sub)" fontFamily="Roboto,sans-serif">{e.title.slice(0,10)}</text>
                          {i>0&&<line x1={(i-1)*40+26} y1={80-(data.examHistory.slice(-15)[i-1].pct/100)*70} x2={i*40+26} y2={80-h} stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="3,2" opacity="0.5"/>}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
