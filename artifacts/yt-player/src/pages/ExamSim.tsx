import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import MathText from "../components/MathText";
import { USER_NAME_KEY } from "../App";

interface Option  { id: string; text: string }
interface Question { id: string; text: string; options: Option[] }
interface Quiz    { id: string; title: string; desc: string; timeMinutes: number; questions: Question[] }
interface ResultQ { id: string; text: string; options: Option[]; chosen: string|null; correct: string; isRight: boolean; solution?: string; subject?: string; timeSecs: number }

const T = () => localStorage.getItem("rr_user_token")||"";
const ah = (): HeadersInit => {
  const t=T(); return t?{Authorization:`Bearer ${t}`,"Content-Type":"application/json"}:{"Content-Type":"application/json"};
};

function saveToErrorNotebook(q: ResultQ) {
  try {
    const notes: any[] = JSON.parse(localStorage.getItem("rr_error_notebook")||"[]");
    notes.unshift({
      question: q.text.slice(0,120), yourAnswer: q.options.find(o=>o.id===q.chosen)?.text||q.chosen||"Skipped",
      correct: q.options.find(o=>o.id===q.correct)?.text||q.correct, solution: q.solution||"",
      date: new Date().toISOString().slice(0,10),
    });
    localStorage.setItem("rr_error_notebook", JSON.stringify(notes.slice(0,100)));
  } catch {}
}

export default function ExamSim() {
  const { examId } = useParams<{ examId: string }>();
  const [, navigate]    = useLocation();
  const [quiz, setQuiz] = useState<Quiz|null>(null);
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [questionTimes, setQTimes] = useState<Record<string,number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults]     = useState<ResultQ[]>([]);
  const [score, setScore]         = useState(0);
  const [total, setTotal]         = useState(0);
  const [secsLeft, setSecsLeft]   = useState(0);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [focusMode, setFocusMode] = useState(true);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [qStartTime, setQStart]   = useState(Date.now());
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [paused, setPaused]       = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const token = T();
  const headers = ah();

  useEffect(() => {
    fetch(`/api/quizzes/${examId}`, { headers })
      .then(r => r.json())
      .then(d => {
        if (d.error) { navigate("/exams"); return; }
        setQuiz(d); setSecsLeft((d.timeMinutes||30)*60);
      })
      .catch(() => navigate("/exams"))
      .finally(() => setLoading(false));
  }, [examId]);

  useEffect(() => {
    if (!quiz || submitted || paused) return;
    timerRef.current = setInterval(() => {
      setSecsLeft(s => {
        if (s <= 1) { if (timerRef.current) clearInterval(timerRef.current); handleSubmit(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [quiz, submitted, paused]);

  const handleSubmit = useCallback(async () => {
    if (submitting||submitted) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const r = await fetch("/api/quiz-submit", {
        method:"POST", headers,
        body: JSON.stringify({ quizId:examId, answers }),
      });
      const d = await r.json();
      // Enrich results with timeSecs
      const enriched: ResultQ[] = (d.results||[]).map((q: ResultQ) => ({
        ...q, timeSecs: questionTimes[q.id]||0,
      }));
      // Save wrong to error notebook
      enriched.filter(q=>!q.isRight).forEach(saveToErrorNotebook);
      setScore(d.score); setTotal(d.total); setResults(enriched); setSubmitted(true);
      // Gamification
      const username = localStorage.getItem(USER_NAME_KEY)||"";
      const timeUsed = quiz ? (quiz.timeMinutes*60) - secsLeft : 0;
      fetch("/api/gamification/exam-complete", {
        method:"POST", headers:{"Content-Type":"application/json",...(username?{"x-username":username}:{})},
        body: JSON.stringify({ quizId:examId, quizTitle:quiz?.title||"Exam Sim", score:d.score, total:d.total, timeSecs:timeUsed }),
      }).catch(()=>{});
    } finally { setSubmitting(false); }
  }, [examId, answers, submitting, submitted, quiz, secsLeft, questionTimes]);

  function selectAnswer(qId: string, optId: string) {
    if (paused) return;
    const timeSecs = Math.round((Date.now()-qStartTime)/1000);
    setQTimes(prev => ({ ...prev, [qId]: (prev[qId]||0) + timeSecs }));
    setAnswers(a => ({ ...a, [qId]: optId }));
    setQStart(Date.now());
    // Auto-advance to next question
    if (quiz && currentQIdx < quiz.questions.length-1) {
      setTimeout(() => { setCurrentQIdx(i=>i+1); setQStart(Date.now()); }, 350);
    }
  }

  const fmt = (s:number) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const answered = Object.keys(answers).length;
  const timerWarn = secsLeft<=120&&!submitted;
  const timerDanger = secsLeft<=30&&!submitted;

  if (loading) return (
    <div style={{minHeight:"100svh",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <div style={{fontSize:48,animation:"spin 1s linear infinite"}}>⏱</div>
      <p style={{color:"rgba(255,255,255,0.7)",fontSize:15}}>Loading exam simulation...</p>
    </div>
  );
  if (!quiz) return null;

  /* ── RESULTS SCREEN ─────────────────────────────────────── */
  if (submitted) {
    const pct = Math.round((score/total)*100);
    const grade = pct>=90?"🏆 Outstanding":pct>=75?"🎉 Excellent":pct>=60?"👍 Good":pct>=45?"📚 Keep Going":"💪 Try Again";
    const avgTime = results.length>0?Math.round(results.reduce((a,r)=>a+r.timeSecs,0)/results.length):0;
    const speed = results.length>0?Math.round(results.length/Math.max(1,(results.reduce((a,r)=>a+r.timeSecs,0)/60))):0;
    // Topic breakdown
    const topicBreak: Record<string,{c:number,t:number}> = {};
    results.forEach(r => {
      const subject = r.subject||"General";
      if (!topicBreak[subject]) topicBreak[subject]={c:0,t:0};
      topicBreak[subject].t++;
      if(r.isRight)topicBreak[subject].c++;
    });
    // Predicted readiness
    const readiness = Math.min(100,Math.round(pct*0.7+(avgTime<45?20:avgTime<90?10:0)+(score>0?10:0)));

    return (
      <div style={{background:"var(--bg)",minHeight:"100svh"}}>
        {/* Header */}
        <div style={{background:"var(--navy)",padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>navigate("/exams")} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:20,padding:0}}>←</button>
          <div style={{flex:1,color:"#fff",fontWeight:700,fontSize:15}}>Exam Simulation Results</div>
        </div>

        <div style={{padding:"0 14px 60px"}}>
          {/* Score card */}
          <div style={{background:pct>=60?"linear-gradient(135deg,#1e40af,#7c3aed)":"linear-gradient(135deg,#dc2626,#9a3412)",borderRadius:20,padding:24,margin:"16px 0",textAlign:"center",color:"#fff"}}>
            <div style={{fontSize:36,marginBottom:8}}>{grade}</div>
            <div style={{fontSize:52,fontWeight:900,fontFamily:"Lato,sans-serif",lineHeight:1}}>{score}<span style={{fontSize:24,opacity:0.7}}>/{total}</span></div>
            <div style={{fontSize:18,opacity:0.9,marginTop:4}}>{pct}%</div>
          </div>

          {/* 4 Analytics cards */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            {[
              { icon:"✅", label:"Correct", val:String(score), color:"#16a34a" },
              { icon:"❌", label:"Wrong", val:String(total-score), color:"#dc2626" },
              { icon:"⚡", label:"Speed", val:`${speed} Q/min`, color:"#7c3aed" },
              { icon:"🎯", label:"Readiness", val:`${readiness}%`, color:"#0891b2" },
            ].map(c=>(
              <div key={c.label} style={{background:"var(--card)",borderRadius:14,padding:"14px 12px",border:"1.5px solid var(--border)",textAlign:"center"}}>
                <div style={{fontSize:24,marginBottom:4}}>{c.icon}</div>
                <div style={{fontSize:20,fontWeight:900,color:c.color,fontFamily:"Lato,sans-serif"}}>{c.val}</div>
                <div style={{fontSize:11,color:"var(--sub)",fontWeight:600}}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Predicted readiness meter */}
          <div style={{background:"var(--card)",borderRadius:16,padding:16,border:"1px solid var(--border)",marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:800,color:"var(--text)",marginBottom:10}}>📊 Exam Readiness Prediction</div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{flex:1,height:12,background:"rgba(0,0,0,0.08)",borderRadius:99,overflow:"hidden"}}>
                <div style={{height:"100%",background:readiness>=75?"linear-gradient(90deg,#16a34a,#0891b2)":readiness>=50?"linear-gradient(90deg,#d97706,#16a34a)":"linear-gradient(90deg,#dc2626,#d97706)",borderRadius:99,width:`${readiness}%`,transition:"width 1s ease"}} />
              </div>
              <span style={{fontWeight:900,color:"var(--purple)",fontSize:15,flexShrink:0}}>{readiness}%</span>
            </div>
            <div style={{fontSize:12,color:"var(--sub)",marginTop:8}}>
              {readiness<50?"Needs significant improvement before exam":""}
              {readiness>=50&&readiness<75?"Getting there — focus on weak areas":""}
              {readiness>=75&&readiness<90?"Almost ready! Review mistakes daily":""}
              {readiness>=90?"You're well-prepared for the exam!":""}
            </div>
          </div>

          {/* Topic breakdown */}
          {Object.keys(topicBreak).length > 1 && (
            <div style={{background:"var(--card)",borderRadius:16,padding:16,border:"1px solid var(--border)",marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:800,color:"var(--text)",marginBottom:12}}>📚 Topic Breakdown</div>
              {Object.entries(topicBreak).map(([subject,{c,t}])=>{
                const p=Math.round((c/t)*100);
                const col=p>=75?"#16a34a":p>=50?"#d97706":"#dc2626";
                return (
                  <div key={subject} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:12,fontWeight:700,color:"var(--text)"}}>{subject}</span>
                      <span style={{fontSize:12,color:col,fontWeight:700}}>{c}/{t} ({p}%)</span>
                    </div>
                    <div style={{height:6,background:"rgba(0,0,0,0.07)",borderRadius:99}}>
                      <div style={{height:"100%",background:col,borderRadius:99,width:`${p}%`}} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Question details */}
          <div style={{fontWeight:800,fontSize:14,color:"var(--text)",margin:"14px 0 10px"}}>Detailed Review</div>
          {results.map((q,idx)=>(
            <div key={q.id} style={{background:"var(--card)",borderRadius:14,padding:14,marginBottom:10,border:`1.5px solid ${q.isRight?"#bbf7d0":"#fecaca"}`}}>
              <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"flex-start"}}>
                <span style={{fontWeight:900,fontSize:12,color:q.isRight?"#16a34a":"#dc2626",flexShrink:0,paddingTop:1}}>{q.isRight?"✅":"❌"} Q{idx+1}</span>
                <div style={{fontSize:13,lineHeight:1.4,color:"var(--text)",flex:1}}><MathText text={q.text}/></div>
              </div>
              {!q.isRight&&(
                <div style={{fontSize:12,color:"#16a34a",marginBottom:4}}>✓ Correct: <strong>{q.options.find(o=>o.id===q.correct)?.text}</strong></div>
              )}
              {q.solution&&<div style={{fontSize:12,color:"#7c3aed",padding:"6px 10px",background:"rgba(124,58,237,0.06)",borderRadius:8,marginTop:6}}>💡 {q.solution}</div>}
              <div style={{fontSize:11,color:"var(--sub)",marginTop:6}}>Time: {q.timeSecs}s</div>
            </div>
          ))}

          <div style={{display:"flex",gap:10,marginTop:16}}>
            <button onClick={()=>navigate("/exams")} style={{flex:1,padding:13,borderRadius:12,border:"1.5px solid var(--purple)",background:"transparent",color:"var(--purple)",fontWeight:700,fontSize:14,cursor:"pointer"}}>Back to Exams</button>
            <button onClick={()=>navigate("/vault")} style={{flex:1,padding:13,borderRadius:12,background:"var(--purple)",color:"#fff",border:"none",fontWeight:700,fontSize:14,cursor:"pointer"}}>🔐 Review Mistakes</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── EXAM SCREEN ─────────────────────────────────────────── */
  const q = quiz.questions[currentQIdx];

  return (
    <div style={{background:"#0f172a",minHeight:"100svh",display:"flex",flexDirection:"column"}}>
      {/* Dark exam header */}
      <div style={{background:"#0d1a36",borderBottom:"1px solid #1c3255",padding:"12px 16px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,zIndex:100}}>
        <div style={{flex:1}}>
          <div style={{fontSize:11,color:"#7a9bc4",fontWeight:700,marginBottom:1,textTransform:"uppercase",letterSpacing:"0.06em"}}>Red Rose 🥀 · Exam Simulation</div>
          <div style={{fontSize:14,fontWeight:800,color:"#dde5f8",fontFamily:"Lato,sans-serif",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{quiz.title}</div>
        </div>
        {/* Pause button */}
        <button
          onClick={() => setPaused(p=>!p)}
          style={{background:paused?"rgba(245,158,11,0.15)":"rgba(79,142,247,0.10)",border:`1.5px solid ${paused?"#f59e0b":"#1c3255"}`,borderRadius:8,padding:"5px 12px",cursor:"pointer",color:paused?"#f59e0b":"#7a9bc4",fontWeight:700,fontSize:12,flexShrink:0}}
        >
          {paused ? "▶ Resume" : "⏸ Pause"}
        </button>
        {/* Timer */}
        <div style={{background:timerDanger?"rgba(248,113,113,0.2)":timerWarn?"rgba(249,115,22,0.15)":"rgba(29,78,216,0.2)",border:`1.5px solid ${timerDanger?"#f87171":timerWarn?"#f97316":"#1c3255"}`,borderRadius:10,padding:"7px 14px",fontSize:19,fontWeight:900,fontFamily:"monospace",color:timerDanger?"#f87171":timerWarn?"#f97316":"#dde5f8",letterSpacing:2,flexShrink:0}}>
          {paused?"⏸":""}{fmt(secsLeft)}
        </div>
        {/* Q counter */}
        <div style={{background:"rgba(255,255,255,0.05)",border:"1px solid #1c3255",borderRadius:8,padding:"7px 10px",fontSize:12,fontWeight:700,color:"#7a9bc4",flexShrink:0}}>
          {answered}/{quiz.questions.length}
        </div>
      </div>
      {/* Paused banner */}
      {paused&&(
        <div style={{background:"rgba(245,158,11,0.12)",borderBottom:"1px solid rgba(245,158,11,0.3)",padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
          <span style={{fontSize:16}}>⏸</span>
          <span style={{fontWeight:700,color:"#f59e0b",fontSize:13}}>Exam Paused — Timer stopped</span>
          <button onClick={()=>setPaused(false)} style={{background:"#f59e0b",color:"#000",border:"none",borderRadius:8,padding:"4px 14px",fontWeight:800,fontSize:12,cursor:"pointer",marginLeft:4}}>Resume ▶</button>
        </div>
      )}

      {/* Progress bar */}
      <div style={{height:3,background:"#1e293b"}}>
        <div style={{height:3,background:"linear-gradient(90deg,#7c3aed,#db2777)",width:`${(answered/quiz.questions.length)*100}%`,transition:"width 300ms"}} />
      </div>

      {/* Q navigation pills */}
      <div style={{overflowX:"auto",scrollbarWidth:"none",background:"#1e293b",padding:"8px 14px",display:"flex",gap:6}}>
        {quiz.questions.map((qq,i)=>{
          const ans = answers[qq.id];
          const isActive = i === currentQIdx;
          return (
            <button key={i} onClick={()=>{setCurrentQIdx(i);setQStart(Date.now());}}
              style={{minWidth:34,height:34,borderRadius:8,border:"none",fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0,
                background: isActive?"var(--purple)":ans?"#16a34a":"#334155",
                color: (isActive||ans)?"#fff":"#94a3b8",
                outline: isActive?"2px solid #a78bfa":"none",outlineOffset:2,
              }}>
              {i+1}
            </button>
          );
        })}
      </div>

      {/* Question */}
      <div style={{flex:1,padding:"16px 14px 100px",overflowY:"auto"}}>
        {q && (
          <>
            <div style={{background:"#1e293b",borderRadius:16,padding:16,marginBottom:14,border:"1px solid #334155"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#64748b",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>Question {currentQIdx+1}</div>
              <div style={{fontSize:15,lineHeight:1.7,color:"#f1f5f9"}}><MathText text={q.text}/></div>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {q.options.map(opt=>{
                const selected = answers[q.id]===opt.id;
                return (
                  <button key={opt.id} onClick={()=>selectAnswer(q.id,opt.id)}
                    style={{display:"flex",alignItems:"flex-start",gap:12,padding:"14px",borderRadius:14,border:`1.5px solid ${selected?"#7c3aed":"#334155"}`,background:selected?"rgba(124,58,237,0.15)":"#1e293b",cursor:"pointer",textAlign:"left",transition:"all 150ms",color:"#f1f5f9"}}>
                    <span style={{minWidth:30,height:30,borderRadius:50,background:selected?"var(--purple)":"#334155",color:selected?"#fff":"#94a3b8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{opt.id}</span>
                    <span style={{flex:1,fontSize:14,lineHeight:1.6}}><MathText text={opt.text}/></span>
                    {selected&&<span style={{fontSize:16,flexShrink:0}}>✓</span>}
                  </button>
                );
              })}
            </div>

            {/* Prev / Next */}
            <div style={{display:"flex",gap:10,marginTop:16}}>
              {currentQIdx>0&&<button onClick={()=>{setCurrentQIdx(i=>i-1);setQStart(Date.now());}}
                style={{flex:1,padding:12,borderRadius:12,border:"1px solid #334155",background:"transparent",color:"#94a3b8",fontWeight:700,cursor:"pointer"}}>← Prev</button>}
              {currentQIdx<quiz.questions.length-1&&<button onClick={()=>{setCurrentQIdx(i=>i+1);setQStart(Date.now());}}
                style={{flex:1,padding:12,borderRadius:12,border:"1px solid #334155",background:"#334155",color:"#f1f5f9",fontWeight:700,cursor:"pointer"}}>Next →</button>}
            </div>
          </>
        )}
      </div>

      {/* Submit bar */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#1e293b",borderTop:"1px solid #334155",padding:"12px 16px",display:"flex",gap:10,zIndex:100}}>
        <div style={{flex:1}}>
          <div style={{fontSize:12,color:"#64748b"}}>Answered: <b style={{color:"#a78bfa"}}>{answered}</b>/{quiz.questions.length}</div>
          {answered<quiz.questions.length&&<div style={{fontSize:11,color:"#d97706"}}>{quiz.questions.length-answered} remaining</div>}
        </div>
        {paused ? (
          <button onClick={()=>setPaused(false)} style={{padding:"12px 20px",borderRadius:12,background:"rgba(245,158,11,0.15)",color:"#f59e0b",border:"1.5px solid #f59e0b",fontWeight:700,fontSize:14,cursor:"pointer"}}>▶ Resume Exam</button>
        ) : showSubmitConfirm ? (
          <>
            <div style={{fontSize:12,color:"#f59e0b",alignSelf:"center"}}>Confirm submit?</div>
            <button onClick={()=>setShowSubmitConfirm(false)} style={{padding:"10px 16px",borderRadius:10,border:"1px solid #1c3255",background:"transparent",color:"#7a9bc4",fontWeight:700,cursor:"pointer"}}>No</button>
            <button onClick={handleSubmit} disabled={submitting} style={{padding:"10px 18px",borderRadius:10,background:"#4f8ef7",color:"#fff",border:"none",fontWeight:700,cursor:"pointer"}}>
              {submitting?"...":"Yes, Submit"}
            </button>
          </>
        ) : (
          <button onClick={()=>{if(answered<quiz.questions.length)setShowSubmitConfirm(true);else handleSubmit();}} disabled={submitting}
            style={{padding:"12px 22px",borderRadius:12,background:answered===quiz.questions.length?"#4f8ef7":"rgba(255,255,255,0.06)",color:answered===quiz.questions.length?"#fff":"#7a9bc4",border:`1px solid ${answered===quiz.questions.length?"#4f8ef7":"#1c3255"}`,fontWeight:700,fontSize:15,cursor:"pointer"}}>
            {submitting?"Submitting...":"Submit Exam ✓"}
          </button>
        )}
      </div>
    </div>
  );
}
