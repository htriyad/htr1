import { useState, useEffect, useMemo, useCallback } from "react";
import Header from "../components/Header";
import MathText from "../components/MathText";

/* SM-2 spaced repetition algorithm */
interface SRCard {
  id: string; front: string; back: string; source: string;
  interval: number; easiness: number; repetitions: number; nextReview: string;
}
interface ErrorNote {
  question: string; yourAnswer: string; correct: string; solution?: string; date: string;
}
interface AutoNote {
  qId: string; question: string; subject: string; concept: string; formula?: string; date: string; correct: boolean;
}
interface SavedCard {
  id: string; question: string; answer: string; tags?: string[]; savedAt: string;
}

function sm2(card: SRCard, quality: 1|2|3|4|5): SRCard {
  // quality: 1=blackout, 2=wrong with hint, 3=wrong remembered, 4=correct hard, 5=correct easy
  let { interval, easiness, repetitions } = card;
  if (quality < 3) {
    repetitions = 0; interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easiness);
    repetitions++;
    easiness = Math.max(1.3, easiness + 0.1 - (5-quality)*(0.08+(5-quality)*0.02));
  }
  const next = new Date(); next.setDate(next.getDate() + interval);
  return { ...card, interval, easiness, repetitions, nextReview: next.toISOString().slice(0,10) };
}

function getSRCards(): SRCard[] {
  try { return JSON.parse(localStorage.getItem("rr_sr_cards")||"[]"); } catch { return []; }
}
function saveSRCards(cards: SRCard[]) {
  localStorage.setItem("rr_sr_cards", JSON.stringify(cards));
}
function addSRCard(front: string, back: string, source: string) {
  const cards = getSRCards();
  if (cards.some(c => c.front === front)) return;
  cards.push({
    id: Date.now().toString(), front, back, source,
    interval: 1, easiness: 2.5, repetitions: 0,
    nextReview: new Date().toISOString().slice(0,10),
  });
  saveSRCards(cards);
}

const TODAY = new Date().toISOString().slice(0,10);

export default function Vault() {
  const [tab, setTab] = useState<"mistakes"|"saved"|"notes"|"review">("mistakes");
  const [search, setSearch] = useState("");
  const [srCards, setSRCards] = useState<SRCard[]>([]);
  const [srIdx, setSRIdx] = useState(0);
  const [srFlipped, setSRFlipped] = useState(false);
  const [srDone, setSRDone] = useState(false);
  const [reviewResults, setReviewResults] = useState<{q:1|2|3|4|5}[]>([]);
  const [formulas, setFormulas] = useState<any[]>([]);

  // Error notebook
  const errors: ErrorNote[] = useMemo(() => {
    try { const v=localStorage.getItem("rr_error_notebook"); return v?JSON.parse(v):[]; } catch { return []; }
  }, [tab]);

  // Auto-notes
  const autoNotes: AutoNote[] = useMemo(() => {
    try { const v=localStorage.getItem("rr_auto_notes"); return v?JSON.parse(v):[]; } catch { return []; }
  }, [tab]);

  // Saved cards
  const savedCards: SavedCard[] = useMemo(() => {
    try { const v=localStorage.getItem("rr_vault_saved"); return v?JSON.parse(v):[]; } catch { return []; }
  }, [tab]);

  const dueCards = useMemo(() => getSRCards().filter(c => c.nextReview <= TODAY), [srCards]);

  useEffect(() => {
    const allCards = getSRCards();
    setSRCards(allCards);
    fetch("/api/formulas").then(r=>r.json()).then(d=>{ if(Array.isArray(d))setFormulas(d); }).catch(()=>{});
  }, [tab]);

  // Load SR session
  const srQueue = useMemo(() => getSRCards().filter(c=>c.nextReview<=TODAY), [tab, srCards]);

  function startReview() {
    setSRIdx(0); setSRFlipped(false); setSRDone(false); setReviewResults([]);
  }

  function handleRate(q: 1|2|3|4|5) {
    const allCards = getSRCards();
    const cardIdx = allCards.findIndex(c=>c.id===srQueue[srIdx]?.id);
    if (cardIdx >= 0) {
      allCards[cardIdx] = sm2(allCards[cardIdx], q);
      saveSRCards(allCards);
      setSRCards([...allCards]);
    }
    const newResults = [...reviewResults, {q}];
    setReviewResults(newResults);
    if (srIdx + 1 >= srQueue.length) { setSRDone(true); }
    else { setSRIdx(i=>i+1); setSRFlipped(false); }
  }

  function deleteError(i: number) {
    try {
      const arr: ErrorNote[] = JSON.parse(localStorage.getItem("rr_error_notebook")||"[]");
      arr.splice(i,1);
      localStorage.setItem("rr_error_notebook", JSON.stringify(arr));
    } catch {}
    window.location.reload();
  }
  function deleteNote(i: number) {
    try {
      const arr: AutoNote[] = JSON.parse(localStorage.getItem("rr_auto_notes")||"[]");
      arr.splice(i,1);
      localStorage.setItem("rr_auto_notes", JSON.stringify(arr));
    } catch {}
    window.location.reload();
  }
  function addErrorToSR(err: ErrorNote) {
    addSRCard(err.question.slice(0,100), `Correct: ${err.correct}${err.solution?"\n\n💡 "+err.solution:""}`, "Error Notebook");
    setSRCards(getSRCards());
    alert("✅ Added to Spaced Repetition queue!");
  }
  function deleteFormulaSaved(i: number) {
    try {
      const arr: SavedCard[] = JSON.parse(localStorage.getItem("rr_vault_saved")||"[]");
      arr.splice(i,1);
      localStorage.setItem("rr_vault_saved", JSON.stringify(arr));
    } catch {}
    window.location.reload();
  }

  const srRating = [
    { q:1 as 1|2|3|4|5, label:"🫥 Forgot", color:"#dc2626", desc:"Complete blackout" },
    { q:2 as 1|2|3|4|5, label:"😕 Hard", color:"#ea580c", desc:"Wrong, needed hint" },
    { q:3 as 1|2|3|4|5, label:"🤔 Hmm", color:"#d97706", desc:"Wrong but remembered" },
    { q:4 as 1|2|3|4|5, label:"😊 OK", color:"#16a34a", desc:"Correct, difficult" },
    { q:5 as 1|2|3|4|5, label:"🎯 Easy!", color:"#0891b2", desc:"Perfect recall" },
  ];

  return (
    <div className="vault-shell">
      <Header showBack backTo="/" />

      {/* Hero */}
      <div className="vault-hero">
        <div className="vault-hero-icon">🔐</div>
        <div>
          <h1 className="vault-hero-title">Memory Vault</h1>
          <p className="vault-hero-sub">Your personal knowledge bank · Spaced repetition powered</p>
        </div>
        <div className="vault-hero-badge">
          <div style={{fontSize:20,fontWeight:900,color:"#fff"}}>{dueCards.length}</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.8)"}}>Due today</div>
        </div>
      </div>

      {/* Summary bar */}
      <div className="vault-summary">
        {[
          { tab:"mistakes" as const, icon:"❌", label:"Mistakes", count:errors.length, color:"#dc2626" },
          { tab:"saved" as const, icon:"⭐", label:"Saved", count:savedCards.length, color:"#d97706" },
          { tab:"notes" as const, icon:"📓", label:"Auto-Notes", count:autoNotes.length, color:"#7c3aed" },
          { tab:"review" as const, icon:"🔁", label:"Review", count:dueCards.length, color:"#0891b2" },
        ].map(t=>(
          <button key={t.tab} className={`vault-tab-btn ${tab===t.tab?"active":""}`}
            style={tab===t.tab?{borderColor:t.color,background:t.color+"15"}:{}}
            onClick={()=>{ setTab(t.tab); setSearch(""); }}>
            <span style={{fontSize:18}}>{t.icon}</span>
            <span style={{fontSize:12,fontWeight:700,color:tab===t.tab?t.color:"var(--text)"}}>{t.label}</span>
            {t.count>0&&<span className="vault-count-badge" style={{background:t.color}}>{t.count}</span>}
          </button>
        ))}
      </div>

      <div className="vault-content">
        {/* Search bar */}
        {tab !== "review" && (
          <div style={{padding:"10px 14px 0"}}>
            <input className="cc-search" value={search} onChange={e=>setSearch(e.target.value)}
              placeholder={`Search ${tab}...`} style={{width:"100%",boxSizing:"border-box"}}/>
          </div>
        )}

        {/* MISTAKES TAB */}
        {tab === "mistakes" && (
          <div style={{padding:"12px 14px 60px"}}>
            {errors.length===0&&(
              <div style={{textAlign:"center",padding:"50px 0"}}>
                <div style={{fontSize:48,marginBottom:12}}>✅</div>
                <h3 style={{color:"var(--text)"}}>No mistakes recorded!</h3>
                <p style={{color:"var(--sub)",fontSize:13}}>Wrong answers from Smart Quiz and Exams appear here.</p>
              </div>
            )}
            {errors.filter(e=>!search||e.question.toLowerCase().includes(search.toLowerCase())).map((err,i)=>(
              <div key={i} className="vault-mistake-card">
                <div style={{display:"flex",gap:10,marginBottom:8,alignItems:"flex-start"}}>
                  <div className="vault-card-icon" style={{background:"#fee2e2",color:"#dc2626"}}>❌</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--text)",lineHeight:1.4}}><MathText text={err.question}/></div>
                    <div style={{fontSize:11,color:"var(--sub)",marginTop:2}}>{err.date}</div>
                  </div>
                </div>
                <div style={{fontSize:12,color:"#dc2626",marginBottom:2}}>Your answer: <span style={{fontWeight:700}}>{err.yourAnswer}</span></div>
                <div style={{fontSize:12,color:"#16a34a",marginBottom:err.solution?6:0}}>Correct: <span style={{fontWeight:700}}>{err.correct}</span></div>
                {err.solution&&<div style={{fontSize:12,color:"#7c3aed",padding:"8px 10px",background:"rgba(124,58,237,0.06)",borderRadius:8,lineHeight:1.5}}>💡 {err.solution}</div>}
                <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                  <button onClick={()=>addErrorToSR(err)} style={{fontSize:11,padding:"5px 12px",borderRadius:20,border:"1px solid #0891b2",background:"transparent",color:"#0891b2",fontWeight:700,cursor:"pointer"}}>🔁 Add to SR Queue</button>
                  <button onClick={()=>deleteError(i)} style={{fontSize:11,padding:"5px 12px",borderRadius:20,border:"1px solid #dc2626",background:"transparent",color:"#dc2626",cursor:"pointer"}}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SAVED TAB */}
        {tab === "saved" && (
          <div style={{padding:"12px 14px 60px"}}>
            {savedCards.length===0&&(
              <div style={{textAlign:"center",padding:"50px 0"}}>
                <div style={{fontSize:48,marginBottom:12}}>⭐</div>
                <h3 style={{color:"var(--text)"}}>No saved items yet!</h3>
                <p style={{color:"var(--sub)",fontSize:13}}>Save questions and formulas for quick access.</p>
              </div>
            )}
            {savedCards.filter(c=>!search||(c.question+c.answer).toLowerCase().includes(search.toLowerCase())).map((card,i)=>(
              <div key={i} className="vault-mistake-card">
                <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}>
                  <div className="vault-card-icon" style={{background:"#fef3c7",color:"#d97706"}}>⭐</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--text)",lineHeight:1.4}}><MathText text={card.question}/></div>
                    <div style={{fontSize:11,color:"var(--sub)",marginTop:2}}>{card.savedAt?.slice(0,10)}</div>
                  </div>
                  <button onClick={()=>deleteFormulaSaved(i)} style={{border:"none",background:"none",cursor:"pointer",fontSize:16,color:"var(--sub)"}}>✕</button>
                </div>
                {card.answer&&<div style={{fontSize:12,color:"var(--sub)",padding:"8px 10px",background:"var(--bg)",borderRadius:8,lineHeight:1.5}}><MathText text={card.answer}/></div>}
                {card.tags&&card.tags.length>0&&(
                  <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                    {card.tags.map(tag=><span key={tag} style={{fontSize:10,padding:"2px 8px",background:"rgba(124,58,237,0.1)",color:"var(--purple)",borderRadius:20,fontWeight:700}}>{tag}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* AUTO-NOTES TAB */}
        {tab === "notes" && (
          <div style={{padding:"12px 14px 60px"}}>
            {autoNotes.length===0&&(
              <div style={{textAlign:"center",padding:"50px 0"}}>
                <div style={{fontSize:48,marginBottom:12}}>📓</div>
                <h3 style={{color:"var(--text)"}}>No auto-notes yet!</h3>
                <p style={{color:"var(--sub)",fontSize:13}}>Take the Smart Quiz — notes are automatically created for every question you answer.</p>
                <button onClick={()=>window.location.href="/smart-quiz"} style={{marginTop:16,padding:"11px 22px",borderRadius:12,background:"var(--purple)",color:"#fff",border:"none",fontWeight:700,cursor:"pointer"}}>🧠 Take Smart Quiz</button>
              </div>
            )}
            {autoNotes.filter(n=>!search||(n.question+n.concept+n.subject).toLowerCase().includes(search.toLowerCase())).map((note,i)=>(
              <div key={i} className="vault-note-card" style={{borderLeftColor:note.correct?"#16a34a":"#dc2626"}}>
                <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}>
                  <div className="vault-card-icon" style={{background:note.correct?"#dcfce7":"#fee2e2",color:note.correct?"#16a34a":"#dc2626"}}>{note.correct?"✅":"📝"}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:800,color:"var(--purple)",marginBottom:4}}>{note.concept} · {note.subject}</div>
                    <div style={{fontSize:13,color:"var(--text)",lineHeight:1.4}}><MathText text={note.question}/></div>
                  </div>
                  <button onClick={()=>deleteNote(i)} style={{border:"none",background:"none",cursor:"pointer",fontSize:16,color:"var(--sub)"}}>✕</button>
                </div>
                {note.formula&&<div style={{fontSize:12,color:"#7c3aed",fontFamily:"monospace",padding:"6px 10px",background:"rgba(124,58,237,0.06)",borderRadius:8,marginBottom:6}}>💡 {note.formula}</div>}
                <div style={{fontSize:10,color:"var(--sub)"}}>{note.date}</div>
              </div>
            ))}
          </div>
        )}

        {/* SPACED REVIEW TAB */}
        {tab === "review" && (
          <div style={{padding:"12px 14px 60px"}}>
            {srQueue.length === 0 && (
              <div style={{textAlign:"center",padding:"40px 0"}}>
                <div style={{fontSize:56,marginBottom:12}}>🎉</div>
                <h3 style={{fontWeight:800,color:"var(--text)",marginBottom:8}}>All caught up!</h3>
                <p style={{color:"var(--sub)",fontSize:13,lineHeight:1.6,marginBottom:20}}>No cards due for review today. Come back tomorrow!<br/>Total cards in queue: {getSRCards().length}</p>
                <div style={{background:"var(--card)",borderRadius:14,padding:16,border:"1px solid var(--border)",textAlign:"left",marginBottom:16}}>
                  <div style={{fontSize:13,fontWeight:700,marginBottom:8,color:"var(--text)"}}>📥 How to add cards:</div>
                  {["Take the Smart Quiz — wrong answers are auto-added","Go to Mistakes tab and click 'Add to SR Queue'","Any error notebook entry can become a review card"].map((tip,i)=>(
                    <div key={i} style={{fontSize:12,color:"var(--sub)",marginBottom:4,display:"flex",gap:8}}><span>•</span><span>{tip}</span></div>
                  ))}
                </div>
                {getSRCards().length === 0 && (
                  <button onClick={()=>window.location.href="/smart-quiz"} style={{padding:"12px 24px",borderRadius:12,background:"var(--purple)",color:"#fff",border:"none",fontWeight:700,cursor:"pointer"}}>🧠 Take Smart Quiz to get started</button>
                )}
              </div>
            )}

            {srQueue.length > 0 && !srDone && (
              <>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <h3 style={{fontWeight:800,color:"var(--text)",fontSize:15}}>🔁 Spaced Review</h3>
                  <span style={{fontSize:12,color:"var(--sub)"}}>{srIdx+1}/{srQueue.length} due today</span>
                </div>
                {/* Progress */}
                <div style={{height:5,background:"rgba(0,0,0,0.07)",borderRadius:99,marginBottom:16}}>
                  <div style={{height:"100%",background:"linear-gradient(90deg,var(--purple),#0891b2)",borderRadius:99,width:`${(srIdx/srQueue.length)*100}%`,transition:"width 300ms"}} />
                </div>
                {/* Card */}
                <div className="vault-sr-card" onClick={()=>setSRFlipped(f=>!f)}>
                  <div className={`vault-sr-inner ${srFlipped?"flipped":""}`}>
                    <div className="vault-sr-face vault-sr-front">
                      <div style={{fontSize:11,fontWeight:700,color:"var(--sub)",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>Question</div>
                      <div style={{fontSize:15,lineHeight:1.6,color:"var(--text)"}}><MathText text={srQueue[srIdx].front}/></div>
                      <div style={{fontSize:11,color:"var(--sub)",marginTop:12}}>Tap to reveal</div>
                      <div style={{fontSize:10,color:"var(--sub)",marginTop:6}}>Source: {srQueue[srIdx].source}</div>
                    </div>
                    <div className="vault-sr-face vault-sr-back">
                      <div style={{fontSize:11,fontWeight:700,color:"#166534",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>Answer</div>
                      <div style={{fontSize:14,lineHeight:1.7,color:"var(--text)",whiteSpace:"pre-wrap"}}><MathText text={srQueue[srIdx].back}/></div>
                    </div>
                  </div>
                </div>
                {/* Rating (only after flip) */}
                {srFlipped && (
                  <div style={{marginTop:16}}>
                    <div style={{fontSize:12,fontWeight:700,color:"var(--sub)",marginBottom:10,textAlign:"center"}}>How well did you remember?</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6}}>
                      {srRating.map(r=>(
                        <button key={r.q} onClick={()=>handleRate(r.q)} style={{padding:"10px 4px",borderRadius:12,border:`2px solid ${r.color}20`,background:`${r.color}10`,cursor:"pointer",textAlign:"center"}}>
                          <div style={{fontSize:13,fontWeight:700,color:r.color}}>{r.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {srDone && (
              <div style={{textAlign:"center",padding:"40px 0"}}>
                <div style={{fontSize:56,marginBottom:12}}>🎊</div>
                <h3 style={{fontWeight:800,color:"var(--text)"}}>Review complete!</h3>
                <p style={{color:"var(--sub)",fontSize:13,marginTop:8}}>You reviewed {srQueue.length} cards today.</p>
                <div style={{display:"flex",gap:12,justifyContent:"center",marginTop:20}}>
                  <button onClick={startReview} style={{padding:"11px 20px",borderRadius:12,border:"1.5px solid var(--purple)",background:"transparent",color:"var(--purple)",fontWeight:700,cursor:"pointer"}}>Review Again</button>
                  <button onClick={()=>window.location.href="/"} style={{padding:"11px 20px",borderRadius:12,background:"var(--purple)",color:"#fff",border:"none",fontWeight:700,cursor:"pointer"}}>← Dashboard</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* Helper: save question to vault */
export function saveToVault(question: string, answer: string, tags?: string[]) {
  try {
    const cards: SavedCard[] = JSON.parse(localStorage.getItem("rr_vault_saved")||"[]");
    if (cards.some(c => c.question === question)) return;
    cards.unshift({ id: Date.now().toString(), question, answer, tags, savedAt: new Date().toISOString().slice(0,10) });
    localStorage.setItem("rr_vault_saved", JSON.stringify(cards.slice(0,200)));
  } catch {}
}
