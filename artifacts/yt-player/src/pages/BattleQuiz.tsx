import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import Header from "../components/Header";
import MathText from "../components/MathText";

interface Q { id:string; text:string; options:{id:string;text:string}[]; correct:string; quizTitle?:string; }

const SECS = 15;
const COMBO_THRES = 3;
const PAD = (n:number) => String(n).padStart(2,"0");
const CIRC = 2*Math.PI*22;

export default function BattleQuiz() {
  const [, navigate]   = useLocation();
  const [pool, setPool] = useState<Q[]>([]);
  const [screen, setScreen] = useState<"setup"|"playing"|"done">("setup");
  const [count, setCount]   = useState(10);
  const [qIdx, setQIdx]     = useState(0);
  const [score, setScore]   = useState(0);
  const [combo, setCombo]   = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [secsLeft, setSecsLeft] = useState(SECS);
  const [picked, setPicked] = useState<string|null>(null);
  const [history, setHistory] = useState<{q:Q;chosen:string|null;correct:boolean;pts:number}[]>([]);
  const [xpEarned, setXpEarned] = useState(0);
  const [comboFlash, setComboFlash] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const questions = pool.slice(0, count);

  useEffect(() => {
    fetch("/api/smart-quiz/pool")
      .then(r=>r.json())
      .then(d=>{ if (Array.isArray(d)) setPool(d.sort(()=>Math.random()-0.5)); })
      .catch(()=>{});
  }, []);

  const advance = useCallback((chosen: string|null) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const q = questions[qIdx];
    const isCorrect = chosen === q.correct;
    const newCombo = isCorrect ? combo+1 : 0;
    const pts = isCorrect ? 10 + Math.min(secsLeft, 10) + (newCombo >= COMBO_THRES ? 5 : 0) : 0;
    const entry = { q, chosen, correct: isCorrect, pts };
    setHistory(h => [...h, entry]);
    if (isCorrect) setScore(s => s+pts);
    setCombo(newCombo);
    setMaxCombo(m => Math.max(m, newCombo));
    if (newCombo >= COMBO_THRES && isCorrect) { setComboFlash(true); setTimeout(()=>setComboFlash(false), 1400); }
    if (qIdx+1 >= questions.length) {
      const correctCount = history.filter(h=>h.correct).length + (isCorrect ? 1 : 0);
      const totalXp = 60 + score + pts;
      setXpEarned(totalXp);
      setScreen("done");
      try {
        const username = localStorage.getItem("rr_username") || "";
        fetch("/api/gamification/exam-complete", {
          method:"POST", headers:{"Content-Type":"application/json","x-username":username},
          body:JSON.stringify({quizId:"battle",quizTitle:"⚡ Battle Quiz",score:correctCount,total:questions.length,timeSecs:count*SECS}),
        });
      } catch {}
    } else {
      setTimeout(() => { setQIdx(i=>i+1); setPicked(null); setSecsLeft(SECS); }, 800);
    }
  }, [qIdx, questions, combo, secsLeft, score, history, count]);

  useEffect(() => {
    if (screen !== "playing" || picked !== null) return;
    timerRef.current = setInterval(() => {
      setSecsLeft(s => {
        if (s <= 1) { advance(null); return SECS; }
        return s-1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [screen, qIdx, picked, advance]);

  function start() {
    setScreen("playing"); setQIdx(0); setScore(0); setCombo(0); setMaxCombo(0);
    setSecsLeft(SECS); setPicked(null); setHistory([]);
  }
  function pick(id: string) {
    if (picked) return;
    setPicked(id);
    advance(id);
  }

  /* ─── Setup ─── */
  if (screen === "setup") return (
    <div style={{background:"var(--bg)",minHeight:"100svh"}}>
      <Header showBack backTo="/" />
      <div style={{padding:"24px 14px",display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:18,maxWidth:380,margin:"0 auto"}}>
        <div style={{fontSize:60,lineHeight:1}}>⚡</div>
        <h1 style={{fontSize:28,fontWeight:900,fontFamily:"Lato,sans-serif",color:"var(--text)",margin:0}}>Battle Quiz</h1>
        <p style={{fontSize:14,color:"var(--sub)",lineHeight:1.6,margin:0}}>
          {SECS} seconds per question. Build combos for bonus XP.<br/>How fast can you answer?
        </p>
        <div style={{background:"var(--surface)",borderRadius:16,padding:20,width:"100%",border:"1px solid var(--border)"}}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--text)",marginBottom:12}}>Number of Questions</div>
          <div style={{display:"flex",gap:8,justifyContent:"center"}}>
            {[5,10,15,20].map(n=>(
              <button key={n} onClick={()=>setCount(n)}
                style={{padding:"10px 20px",borderRadius:10,background:count===n?"var(--purple)":"var(--bg)",color:count===n?"#fff":"var(--text)",border:`2px solid ${count===n?"var(--purple)":"var(--border)"}`,fontWeight:700,fontSize:15,cursor:"pointer",transition:"all 200ms"}}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:16,width:"100%",justifyContent:"center"}}>
          {[["⏱",`${SECS}s each`],["🔥","Combos"],["⚡","Bonus XP"]].map(([i,l])=>(
            <div key={String(l)} style={{textAlign:"center",background:"rgba(108,127,255,0.08)",borderRadius:12,padding:"12px 16px",flex:1,border:"1px solid rgba(108,127,255,0.15)"}}>
              <div style={{fontSize:24,marginBottom:4}}>{i}</div>
              <div style={{fontSize:11,color:"var(--sub)",fontWeight:600}}>{l}</div>
            </div>
          ))}
        </div>
        <button onClick={start} disabled={!pool.length}
          style={{padding:"15px 0",borderRadius:14,background:"linear-gradient(135deg,var(--purple),#1d4ed8)",color:"#fff",border:"none",fontSize:18,fontWeight:900,cursor:"pointer",width:"100%",opacity:pool.length?1:0.6}}>
          {pool.length ? "⚡ Start Battle!" : "⏳ Loading pool..."}
        </button>
      </div>
    </div>
  );

  /* ─── Done ─── */
  if (screen === "done") {
    const correctCount = history.filter(h=>h.correct).length;
    const acc = questions.length ? Math.round(correctCount/questions.length*100) : 0;
    const grade = acc>=90?"🏆 Excellent!":acc>=70?"🎯 Great!":acc>=50?"👍 Good!":"💪 Keep Going!";
    return (
      <div style={{background:"var(--bg)",minHeight:"100svh",paddingBottom:40}}>
        <Header showBack backTo="/" />
        <div style={{padding:"16px 14px"}}>
          <div style={{background:"linear-gradient(135deg,#1d1060,#1d4ed8)",borderRadius:18,padding:"24px 20px",color:"#fff",textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:44,marginBottom:8}}>{acc>=80?"🏆":acc>=50?"🎯":"💪"}</div>
            <h2 style={{fontSize:22,fontWeight:900,fontFamily:"Lato,sans-serif",margin:"0 0 4px"}}>{grade}</h2>
            <div style={{fontSize:14,opacity:0.9,marginBottom:20}}>+{xpEarned} XP earned</div>
            <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
              {[["Score",score],["Accuracy",`${acc}%`],["Best Combo",`×${maxCombo}`],["Correct",`${correctCount}/${questions.length}`]].map(([l,v])=>(
                <div key={String(l)} style={{background:"rgba(255,255,255,0.15)",borderRadius:12,padding:"10px 16px",minWidth:70}}>
                  <div style={{fontSize:20,fontWeight:900}}>{v}</div>
                  <div style={{fontSize:10,opacity:0.8}}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
            {history.map(({q,chosen,correct,pts},i)=>(
              <div key={i} style={{background:"var(--surface)",borderRadius:10,padding:"10px 14px",border:`1.5px solid ${correct?"rgba(34,197,94,0.3)":"rgba(220,38,38,0.2)"}`}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontSize:11,fontWeight:700,color:correct?"var(--green)":"var(--red-txt)"}}>{correct?`✅ +${pts}pts`:"❌ +0pts"}</span>
                </div>
                <div style={{fontSize:12,color:"var(--text)",lineHeight:1.4}}><MathText text={q.text.slice(0,100)}/></div>
                {!correct && <div style={{fontSize:11,color:"var(--sub)",marginTop:4}}>
                  Your: <span style={{color:"var(--red-txt)"}}>{q.options.find(o=>o.id===chosen)?.text||"—"}</span> · Correct: <span style={{color:"var(--green)"}}>{q.options.find(o=>o.id===q.correct)?.text}</span>
                </div>}
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={start} style={{flex:1,padding:"13px",borderRadius:12,background:"var(--purple)",color:"#fff",border:"none",fontWeight:800,fontSize:14,cursor:"pointer"}}>⚡ Play Again</button>
            <button onClick={()=>navigate("/")} style={{flex:1,padding:"13px",borderRadius:12,background:"var(--surface)",color:"var(--text)",border:"1.5px solid var(--border)",fontWeight:700,fontSize:14,cursor:"pointer"}}>🏠 Home</button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Playing ─── */
  const q = questions[qIdx];
  const timerPct = secsLeft/SECS;
  const timerColor = secsLeft>8 ? "var(--green)" : secsLeft>4 ? "var(--gold)" : "#dc2626";

  return (
    <div style={{background:"var(--bg)",minHeight:"100svh"}}>
      {/* Top bar */}
      <div style={{background:"var(--surface)",padding:"10px 14px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid var(--border)",position:"sticky",top:0,zIndex:10}}>
        <div style={{flex:1,height:6,background:"var(--border)",borderRadius:3,overflow:"hidden"}}>
          <div style={{width:`${((qIdx)/questions.length)*100}%`,height:"100%",background:"var(--purple)",transition:"width 300ms"}}/>
        </div>
        <span style={{fontSize:12,fontWeight:700,color:"var(--sub)",minWidth:40,textAlign:"center"}}>{qIdx+1}/{questions.length}</span>
        {/* Timer ring */}
        <svg width={52} height={52} viewBox="0 0 52 52">
          <circle cx={26} cy={26} r={22} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={4}/>
          <circle cx={26} cy={26} r={22} fill="none" stroke={timerColor} strokeWidth={4} strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={CIRC*(1-timerPct)}
            transform="rotate(-90 26 26)" style={{transition:"stroke-dashoffset 1s linear,stroke 300ms"}}/>
          <text x={26} y={30} textAnchor="middle" fontSize={14} fontWeight={900} fill={timerColor} fontFamily="monospace">{secsLeft}</text>
        </svg>
        <div style={{fontSize:14,fontWeight:900,color:"var(--gold)",minWidth:50,textAlign:"right"}}>⚡{score}</div>
      </div>

      {/* Combo flash */}
      {comboFlash && (
        <div style={{position:"fixed",top:"40%",left:"50%",transform:"translate(-50%,-50%)",fontSize:28,fontWeight:900,color:"#f59e0b",textShadow:"0 0 24px #f59e0b",pointerEvents:"none",zIndex:99,animation:"combo-pop 1.4s ease-out forwards"}}>
          🔥 COMBO ×{combo}!
        </div>
      )}

      <div style={{padding:"14px 14px"}}>
        {combo >= COMBO_THRES && (
          <div style={{textAlign:"center",fontSize:11,fontWeight:800,color:"var(--gold)",letterSpacing:"0.12em",marginBottom:10,padding:"5px",borderRadius:6,background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)"}}>
            🔥 COMBO ×{combo} — BONUS +5 PTS ACTIVE!
          </div>
        )}
        {/* Question */}
        <div style={{background:"var(--surface)",borderRadius:14,padding:"18px 16px",marginBottom:14,minHeight:100,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid var(--border)"}}>
          <div style={{textAlign:"center",fontSize:16,fontWeight:700,color:"var(--text)",lineHeight:1.6,width:"100%"}}>
            <MathText text={q.text}/>
          </div>
        </div>
        {/* Options */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {q.options.map(opt => {
            const isCorrect = opt.id === q.correct;
            const isPicked  = opt.id === picked;
            let bg="var(--surface)", bdr="var(--border)", clr="var(--text)";
            if (picked) {
              if (isCorrect)     { bg="rgba(34,197,94,0.1)";  bdr="var(--green)";   clr="var(--green)"; }
              else if (isPicked) { bg="rgba(220,38,38,0.1)";  bdr="#dc2626";        clr="var(--red-txt)"; }
            }
            return (
              <button key={opt.id} onClick={()=>pick(opt.id)} disabled={!!picked}
                style={{padding:"13px 16px",borderRadius:12,background:bg,color:clr,border:`2px solid ${bdr}`,textAlign:"left",cursor:picked?"default":"pointer",fontSize:14,transition:"all 200ms",display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontWeight:900,color:"var(--purple)",minWidth:20}}>{opt.id}.</span>
                <span style={{flex:1}}><MathText text={opt.text}/></span>
                {picked && isCorrect  && <span>✅</span>}
                {picked && isPicked && !isCorrect && <span>❌</span>}
              </button>
            );
          })}
        </div>
      </div>
      <style>{`@keyframes combo-pop{0%{opacity:0;transform:translate(-50%,-50%) scale(0.4)}25%{opacity:1;transform:translate(-50%,-50%) scale(1.3)}70%{opacity:1;transform:translate(-50%,-50%) scale(1.05)}100%{opacity:0;transform:translate(-50%,-65%) scale(0.9)}}`}</style>
    </div>
  );
}
