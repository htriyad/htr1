import { useState, useEffect, useCallback, useRef } from "react";
import Header from "../components/Header";
import MathText from "../components/MathText";
import { USER_NAME_KEY } from "../App";

const T = () => localStorage.getItem("rr_user_token") || "";
const ah = (): HeadersInit => {
  const t = T(); return t ? { Authorization:`Bearer ${t}`, "Content-Type":"application/json" } : { "Content-Type":"application/json" };
};

interface QOption { id: string; text: string }
interface PoolQ {
  id: string; text: string; options: QOption[];
  correct: string; solution?: string; quizTitle?: string;
  subject?: string; difficulty: 1|2|3;
}
interface SessionResult {
  q: PoolQ; chosen: string|null; correct: boolean; confidence: number; timeSecs: number;
}

const DIFF_LABELS: Record<number,string> = { 1:"🟢 Easy", 2:"🟡 Medium", 3:"🔴 Hard" };
const DIFF_COLORS: Record<number,string> = { 1:"#16a34a", 2:"#d97706", 3:"#dc2626" };
const CONF_LABELS = ["","😰 Guessed","🤔 Unsure","😐 Okay","😊 Confident","🎯 Sure!"];

function saveAutoNote(q: PoolQ, correct: boolean) {
  try {
    const notes: any[] = JSON.parse(localStorage.getItem("rr_auto_notes")||"[]");
    if (notes.some(n => n.qId === q.id)) return;
    notes.unshift({
      qId: q.id, question: q.text.slice(0,120), subject: q.quizTitle||q.subject||"General",
      concept: q.quizTitle || "Quiz Question", formula: q.solution ? q.solution.slice(0,100) : "",
      correct, date: new Date().toISOString().slice(0,10),
    });
    localStorage.setItem("rr_auto_notes", JSON.stringify(notes.slice(0,200)));
  } catch {}
}
function saveToErrorNotebook(q: PoolQ, chosenText: string) {
  try {
    const notes: any[] = JSON.parse(localStorage.getItem("rr_error_notebook")||"[]");
    notes.unshift({
      question: q.text.slice(0,120), yourAnswer: chosenText,
      correct: q.options.find(o=>o.id===q.correct)?.text||q.correct,
      solution: q.solution||"", date: new Date().toISOString().slice(0,10),
    });
    localStorage.setItem("rr_error_notebook", JSON.stringify(notes.slice(0,100)));
  } catch {}
}

/* ── Setup Screen ──────────────────────────────────────────── */
function Setup({ onStart }: { onStart:(count:number,startDiff:1|2|3,subject:string)=>void }) {
  const [count, setCount] = useState(10);
  const [diff, setDiff]   = useState<1|2|3>(2);
  const [sub, setSub]     = useState("All");
  const SUBJECTS = ["All","Physics","Chemistry","Biology","Mathematics","English","Bangla","ICT","History"];
  return (
    <div className="sq-setup">
      <div className="sq-setup-hero">
        <div className="sq-setup-icon">🧠</div>
        <h1 className="sq-setup-title">Smart Adaptive Quiz</h1>
        <p className="sq-setup-sub">Your quiz adapts to your performance — gets harder when you're strong, easier when you struggle</p>
      </div>
      <div className="sq-setup-card">
        <div className="sq-field-label">Subject</div>
        <div className="sq-subject-chips">
          {SUBJECTS.map(s => (
            <button key={s} className={`sq-chip ${sub===s?"active":""}`} onClick={()=>setSub(s)}>{s}</button>
          ))}
        </div>
        <div className="sq-field-label" style={{marginTop:18}}>Starting Difficulty</div>
        <div style={{display:"flex",gap:10}}>
          {([1,2,3] as (1|2|3)[]).map(d=>(
            <button key={d} className={`sq-diff-btn ${diff===d?"active":""}`}
              style={diff===d?{borderColor:DIFF_COLORS[d],background:DIFF_COLORS[d]}:{}}
              onClick={()=>setDiff(d)}>{DIFF_LABELS[d]}</button>
          ))}
        </div>
        <div className="sq-field-label" style={{marginTop:18}}>Number of Questions</div>
        <div style={{display:"flex",gap:10}}>
          {[5,10,20,30].map(n=>(
            <button key={n} className={`sq-count-btn ${count===n?"active":""}`} onClick={()=>setCount(n)}>{n} Q</button>
          ))}
        </div>
        <button className="sq-start-btn" onClick={()=>onStart(count,diff,sub)}>
          Start Adaptive Quiz →
        </button>
      </div>
      <div className="sq-features-row">
        {[
          { icon:"🔄", label:"Adapts to you", desc:"Difficulty changes based on your answers" },
          { icon:"💡", label:"Instant review", desc:"See why you were wrong immediately" },
          { icon:"⭐", label:"Confidence rating", desc:"Rate how sure you were after each question" },
          { icon:"📓", label:"Auto notes", desc:"Wrong answers saved to your notebook" },
        ].map(f=>(
          <div key={f.label} className="sq-feature-card">
            <div style={{fontSize:22,marginBottom:6}}>{f.icon}</div>
            <div style={{fontSize:12,fontWeight:800,color:"var(--text)"}}>{f.label}</div>
            <div style={{fontSize:11,color:"var(--sub)",marginTop:2,lineHeight:1.4}}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Quiz Engine ─────────────────────────────────────── */
export default function SmartQuiz() {
  const [phase, setPhase] = useState<"setup"|"loading"|"quiz"|"review"|"done">("setup");
  const [pool, setPool]   = useState<PoolQ[]>([]);
  const [queue, setQueue] = useState<PoolQ[]>([]);
  const [idx, setIdx]     = useState(0);
  const [chosen, setChosen] = useState<string|null>(null);
  const [confidence, setConf] = useState(0);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [difficulty, setDifficulty] = useState<1|2|3>(2);
  const [targetCount, setTargetCount] = useState(10);
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [qStartTime, setQStart] = useState(Date.now());
  const [noteSaved, setNoteSaved] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  const handleStart = useCallback(async (count:number, startDiff:1|2|3, subject:string) => {
    setPhase("loading");
    setTargetCount(count);
    setDifficulty(startDiff);
    setSubjectFilter(subject);
    try {
      const r = await fetch("/api/smart-quiz/pool", { headers: ah() });
      const data: PoolQ[] = await r.json();
      let filtered = Array.isArray(data) ? data : [];
      if (subject !== "All") filtered = filtered.filter(q => (q.subject||q.quizTitle||"").toLowerCase().includes(subject.toLowerCase()));
      if (!filtered.length) filtered = Array.isArray(data) ? data : [];
      // Build adaptive queue: start at difficulty, pick questions
      const byDiff: Record<number, PoolQ[]> = { 1:[], 2:[], 3:[] };
      filtered.forEach(q => byDiff[q.difficulty].push(q));
      // Shuffle each bucket
      [1,2,3].forEach(d => { for(let i=byDiff[d].length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1));[byDiff[d][i],byDiff[d][j]]=[byDiff[d][j],byDiff[d][i]]; } });
      // Build queue: pick first 'count' questions from appropriate buckets
      const built: PoolQ[] = [];
      let cur = startDiff;
      for (let i=0;i<count;i++) {
        const bucket = byDiff[cur];
        if (bucket.length > 0) { built.push(bucket.shift()!); }
        else {
          const fallback = [1,2,3].find(d=>byDiff[d].length>0);
          if (fallback !== undefined) built.push(byDiff[fallback].shift()!);
        }
        // Rotate difficulty for variety
        if (i % 3 === 2) cur = cur; // keep current until adaptive kicks in
      }
      if (!built.length) { setPhase("setup"); alert("No questions available. Ask your teacher to add some!"); return; }
      setPool(filtered);
      setQueue(built);
      setIdx(0); setResults([]); setChosen(null); setConf(0);
      setQStart(Date.now());
      setPhase("quiz");
    } catch {
      setPhase("setup");
      alert("Failed to load questions. Please try again.");
    }
  }, []);

  const currentQ = queue[idx];

  function handleAnswer(optId: string) {
    if (chosen !== null) return; // already answered
    setChosen(optId);
    const correct = optId === currentQ.correct;
    // Save auto-note for every question
    saveAutoNote(currentQ, correct);
    setNoteSaved(!!currentQ.solution);
    // Save to error notebook if wrong
    if (!correct) {
      const chosenText = currentQ.options.find(o=>o.id===optId)?.text||optId;
      saveToErrorNotebook(currentQ, chosenText);
    }
    setPhase("review");
  }

  function handleNext() {
    if (confidence === 0) return; // must rate confidence
    const timeSecs = Math.round((Date.now() - qStartTime) / 1000);
    const correct = chosen === currentQ.correct;
    const newResult: SessionResult = { q:currentQ, chosen, correct, confidence, timeSecs };
    const newResults = [...results, newResult];
    setResults(newResults);
    // Adaptive difficulty: adjust based on last 3 results
    if (newResults.length >= 2) {
      const last3 = newResults.slice(-3);
      const correctRate = last3.filter(r=>r.correct).length / last3.length;
      if (correctRate >= 0.8 && difficulty < 3) setDifficulty(d => Math.min(3, d+1) as 1|2|3);
      else if (correctRate <= 0.4 && difficulty > 1) setDifficulty(d => Math.max(1, d-1) as 1|2|3);
    }
    if (idx + 1 >= queue.length) {
      // Done — award XP
      const correct = newResults.filter(r=>r.correct).length;
      const xp = Math.round(10 + (correct / newResults.length) * 40 + newResults.length * 2);
      setXpEarned(xp);
      const username = localStorage.getItem(USER_NAME_KEY)||"";
      fetch("/api/gamification/exam-complete", {
        method:"POST", headers:{"Content-Type":"application/json",...(username?{"x-username":username}:{})},
        body: JSON.stringify({ quizId:"smart-quiz", quizTitle:`Smart Quiz (${subjectFilter})`, score:correct, total:newResults.length, timeSecs:newResults.reduce((a,r)=>a+r.timeSecs,0) }),
      }).catch(()=>{});
      setPhase("done");
    } else {
      setIdx(i=>i+1);
      setChosen(null); setConf(0); setNoteSaved(false);
      setQStart(Date.now());
      setPhase("quiz");
    }
  }

  /* ── Results Screen ──────────────────────────────────────── */
  if (phase === "done") {
    const correct = results.filter(r=>r.correct).length;
    const pct = Math.round((correct/results.length)*100);
    const avgConf = Math.round(results.reduce((a,r)=>a+r.confidence,0)/results.length*10)/10;
    const avgTime = Math.round(results.reduce((a,r)=>a+r.timeSecs,0)/results.length);
    const weakQ = results.filter(r=>!r.correct);
    const byDiff: Record<number,{c:number,t:number}> = { 1:{c:0,t:0}, 2:{c:0,t:0}, 3:{c:0,t:0} };
    results.forEach(r => { byDiff[r.q.difficulty].t++; if(r.correct)byDiff[r.q.difficulty].c++; });
    const grade = pct>=90?"🏆 Outstanding":pct>=75?"🎉 Excellent":pct>=60?"👍 Good":pct>=45?"📚 Keep Going":"💪 Try Again";
    return (
      <div className="sq-shell">
        <Header showBack backTo="/" />
        <div className="sq-done">
          <div className="sq-done-hero" style={{background:pct>=60?"linear-gradient(135deg,#7c3aed,#2563eb)":"linear-gradient(135deg,#dc2626,#d97706)"}}>
            <div style={{fontSize:40,marginBottom:8}}>{grade}</div>
            <div style={{fontSize:48,fontWeight:900,color:"#fff",fontFamily:"Lato,sans-serif"}}>{correct}<span style={{fontSize:24,opacity:0.8}}>/{results.length}</span></div>
            <div style={{fontSize:18,color:"rgba(255,255,255,0.9)"}}>{pct}% correct</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.75)",marginTop:6}}>+{xpEarned} XP earned · Avg confidence {avgConf}/5 · {avgTime}s/question</div>
          </div>

          {/* Difficulty breakdown */}
          <div className="sq-done-section">
            <h3 className="sq-done-sec-title">Performance by Difficulty</h3>
            <div style={{display:"flex",gap:10}}>
              {([1,2,3] as (1|2|3)[]).map(d=>{
                const { c,t } = byDiff[d];
                if (!t) return null;
                const p = Math.round((c/t)*100);
                return (
                  <div key={d} style={{flex:1,textAlign:"center",background:"var(--bg)",borderRadius:14,padding:"14px 8px",border:`2px solid ${DIFF_COLORS[d]}20`}}>
                    <div style={{fontSize:11,fontWeight:800,color:DIFF_COLORS[d]}}>{DIFF_LABELS[d]}</div>
                    <div style={{fontSize:26,fontWeight:900,color:DIFF_COLORS[d],fontFamily:"Lato,sans-serif",margin:"6px 0"}}>{p}%</div>
                    <div style={{fontSize:11,color:"var(--sub)"}}>{c}/{t} correct</div>
                    <div style={{height:4,background:"rgba(0,0,0,0.08)",borderRadius:99,marginTop:8}}>
                      <div style={{height:"100%",background:DIFF_COLORS[d],borderRadius:99,width:`${p}%`,transition:"width 800ms"}} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Wrong answers */}
          {weakQ.length > 0 && (
            <div className="sq-done-section">
              <h3 className="sq-done-sec-title">❌ Review These ({weakQ.length})</h3>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {weakQ.map((r,i)=>(
                  <div key={i} style={{background:"#fff0f0",border:"1px solid #fecaca",borderRadius:12,padding:"12px 14px"}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#991b1b",marginBottom:4,lineHeight:1.4}}>{r.q.text.slice(0,100)}{r.q.text.length>100?"…":""}</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:r.q.solution?6:0}}>
                      <span style={{fontSize:11,color:"#dc2626"}}>You: {r.q.options.find(o=>o.id===r.chosen)?.text.slice(0,40)||r.chosen||"Skipped"}</span>
                      <span style={{fontSize:11,color:"#16a34a",fontWeight:700}}>✓ {r.q.options.find(o=>o.id===r.q.correct)?.text.slice(0,40)}</span>
                    </div>
                    {r.q.solution&&<div style={{fontSize:12,color:"#7c3aed",marginTop:4}}>💡 {r.q.solution.slice(0,120)}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{padding:"0 14px 60px",display:"flex",gap:10}}>
            <button onClick={()=>{ setPhase("setup"); setResults([]); setIdx(0); setQueue([]); }} className="sq-restart-btn" style={{flex:1}}>🔄 New Quiz</button>
            <button onClick={()=>window.history.back()} className="sq-back-btn" style={{flex:1}}>← Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Loading ──────────────────────────────────────────────── */
  if (phase === "loading") return (
    <div className="sq-shell">
      <Header showBack backTo="/" />
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",gap:16}}>
        <div style={{fontSize:48,animation:"spin 1s linear infinite"}}>🧠</div>
        <p style={{color:"var(--sub)",fontSize:15}}>Building your adaptive quiz...</p>
      </div>
    </div>
  );

  /* ── Setup ───────────────────────────────────────────────── */
  if (phase === "setup") return (
    <div className="sq-shell">
      <Header showBack backTo="/" />
      <Setup onStart={handleStart} />
    </div>
  );

  /* ── Quiz / Review ───────────────────────────────────────── */
  const isReview = phase === "review";
  const pct = ((idx + (isReview?1:0)) / queue.length) * 100;

  return (
    <div className="sq-shell">
      <Header showBack backTo="/" />

      {/* Sticky header */}
      <div className="sq-header">
        <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0}}>
          <div className="sq-q-counter">{idx+1}<span style={{opacity:0.6,fontWeight:400}}>/{queue.length}</span></div>
          <div>
            <div style={{fontSize:11,fontWeight:800,letterSpacing:"0.05em",color:"rgba(255,255,255,0.7)",textTransform:"uppercase"}}>Adaptive Quiz</div>
            <div style={{display:"flex",alignItems:"center",gap:5,marginTop:1}}>
              <span style={{fontSize:11,fontWeight:700,color:DIFF_COLORS[difficulty]}}>{DIFF_LABELS[difficulty]}</span>
              {subjectFilter!=="All"&&<span style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>· {subjectFilter}</span>}
            </div>
          </div>
        </div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",textAlign:"right"}}>
          {results.filter(r=>r.correct).length}✓ {results.filter(r=>!r.correct).length}✗
        </div>
      </div>

      {/* Progress bar */}
      <div style={{height:4,background:"rgba(124,58,237,0.15)"}}>
        <div style={{height:4,background:"linear-gradient(90deg,var(--purple),#db2777)",width:`${pct}%`,transition:"width 400ms ease"}} />
      </div>

      <div style={{padding:"16px 14px 80px"}}>
        {currentQ && (
          <>
            {/* Question */}
            <div className="sq-question-card">
              {currentQ.quizTitle&&<div className="sq-q-subject">{currentQ.quizTitle}</div>}
              <div className="sq-q-text"><MathText text={currentQ.text} /></div>
            </div>

            {/* Options */}
            <div style={{display:"flex",flexDirection:"column",gap:10,margin:"12px 0"}}>
              {currentQ.options.map(opt => {
                const isChosen = chosen === opt.id;
                const isCorrect = opt.id === currentQ.correct;
                let bg = "var(--card)";
                let border = "1.5px solid var(--border)";
                let labelBg = "var(--border)";
                let labelColor = "var(--text)";
                if (isReview) {
                  if (isCorrect) { bg="#dcfce7"; border="2px solid #16a34a"; labelBg="#16a34a"; labelColor="#fff"; }
                  else if (isChosen&&!isCorrect) { bg="#fee2e2"; border="2px solid #dc2626"; labelBg="#dc2626"; labelColor="#fff"; }
                } else if (isChosen) {
                  bg="rgba(124,58,237,0.08)"; border="2px solid var(--purple)"; labelBg="var(--purple)"; labelColor="#fff";
                }
                return (
                  <button key={opt.id} className="sq-option-btn"
                    style={{ background:bg, border, cursor:isReview?"default":"pointer" }}
                    onClick={()=>!isReview&&handleAnswer(opt.id)}
                    disabled={isReview}
                  >
                    <span className="sq-opt-label" style={{background:labelBg,color:labelColor}}>{opt.id}</span>
                    <span style={{flex:1,textAlign:"left",lineHeight:1.5,fontSize:14}}><MathText text={opt.text} /></span>
                    {isReview&&isCorrect&&<span style={{fontSize:16}}>✅</span>}
                    {isReview&&isChosen&&!isCorrect&&<span style={{fontSize:16}}>❌</span>}
                  </button>
                );
              })}
            </div>

            {/* Instant Review Panel */}
            {isReview && (
              <div className="sq-review-panel" style={{borderLeftColor:chosen===currentQ.correct?"#16a34a":"#dc2626"}}>
                <div className="sq-review-header">
                  <span style={{fontSize:22}}>{chosen===currentQ.correct?"✅":"❌"}</span>
                  <span style={{fontWeight:800,fontSize:15,color:chosen===currentQ.correct?"#16a34a":"#dc2626"}}>
                    {chosen===currentQ.correct?"Correct! Great job.":"Wrong answer."}
                  </span>
                  {noteSaved&&<span className="sq-note-badge">📓 Note saved</span>}
                </div>
                {chosen!==currentQ.correct&&(
                  <div className="sq-review-correct">
                    Correct answer: <strong>{currentQ.options.find(o=>o.id===currentQ.correct)?.text}</strong>
                  </div>
                )}
                {currentQ.solution&&(
                  <div className="sq-review-explain">
                    <span style={{fontSize:13,fontWeight:700,color:"#7c3aed"}}>💡 Explanation: </span>
                    <span style={{fontSize:13,color:"var(--text)",lineHeight:1.6}}><MathText text={currentQ.solution} /></span>
                  </div>
                )}
                {/* Concept tag */}
                {currentQ.quizTitle&&(
                  <div style={{marginTop:8}}>
                    <span style={{fontSize:11,background:"rgba(124,58,237,0.1)",color:"var(--purple)",borderRadius:20,padding:"3px 10px",fontWeight:700}}>
                      📚 {currentQ.quizTitle}
                    </span>
                  </div>
                )}

                {/* Confidence rating */}
                <div className="sq-conf-section">
                  <div style={{fontSize:12,fontWeight:700,color:"var(--sub)",marginBottom:8}}>How confident were you?</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {[1,2,3,4,5].map(n=>(
                      <button key={n} className={`sq-conf-btn ${confidence===n?"active":""}`}
                        onClick={()=>setConf(n)}>
                        {CONF_LABELS[n]}
                      </button>
                    ))}
                  </div>
                </div>

                <button className="sq-next-btn" onClick={handleNext} disabled={confidence===0}>
                  {confidence===0?"Rate confidence to continue →":"Next Question →"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
