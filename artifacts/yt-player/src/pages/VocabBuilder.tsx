import { useState, useEffect, useMemo } from "react";
import Header from "../components/Header";

interface Word { id:string; word:string; meaning:string; bangla:string; example:string; subject:string; difficulty:string; }

const FALLBACK: Word[] = [
  {id:"1",word:"Acceleration",meaning:"Rate of change of velocity",bangla:"ত্বরণ",example:"A car accelerates from 0 to 60 mph.",subject:"Physics",difficulty:"medium"},
  {id:"2",word:"Osmosis",meaning:"Diffusion of water through a semi-permeable membrane",bangla:"অভিস্রবণ",example:"Water enters root cells via osmosis.",subject:"Biology",difficulty:"medium"},
  {id:"3",word:"Catalyst",meaning:"Substance that speeds up a reaction without being consumed",bangla:"অনুঘটক",example:"Enzymes are biological catalysts.",subject:"Chemistry",difficulty:"hard"},
  {id:"4",word:"Photosynthesis",meaning:"Process by which plants convert light into food",bangla:"সালোকসংশ্লেষণ",example:"Leaves carry out photosynthesis in sunlight.",subject:"Biology",difficulty:"easy"},
  {id:"5",word:"Mitosis",meaning:"Cell division producing two identical daughter cells",bangla:"মাইটোসিস",example:"Skin cells replace themselves via mitosis.",subject:"Biology",difficulty:"medium"},
  {id:"6",word:"Electrolysis",meaning:"Chemical decomposition using electric current",bangla:"তড়িৎ বিশ্লেষণ",example:"Water can be split by electrolysis.",subject:"Chemistry",difficulty:"hard"},
  {id:"7",word:"Momentum",meaning:"Product of mass and velocity",bangla:"ভরবেগ",example:"A moving car has momentum.",subject:"Physics",difficulty:"medium"},
  {id:"8",word:"Democracy",meaning:"System of government by elected representatives",bangla:"গণতন্ত্র",example:"Bangladesh is a parliamentary democracy.",subject:"Civics",difficulty:"easy"},
];

function todayKey() { return new Date().toISOString().slice(0,10); }

export default function VocabBuilder() {
  const [words, setWords]   = useState<Word[]>([]);
  const [learned, setLearned] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("rr_vocab_learned")||"[]")); } catch { return new Set(); }
  });
  const [quizWord, setQuizWord] = useState<Word|null>(null);
  const [quizOpts, setQuizOpts] = useState<string[]>([]);
  const [picked, setPicked]     = useState<string|null>(null);
  const [showBack, setShowBack] = useState(false);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("All");

  useEffect(() => {
    fetch("/api/vocabulary")
      .then(r=>r.json())
      .then(d=>{ setWords(Array.isArray(d)&&d.length ? d : FALLBACK); })
      .catch(()=>setWords(FALLBACK));
  }, []);

  useEffect(() => {
    localStorage.setItem("rr_vocab_learned", JSON.stringify([...learned]));
  }, [learned]);

  const todayWord = useMemo(() => {
    if (!words.length) return null;
    const storedId = localStorage.getItem(`rr_vocab_today_${todayKey()}`);
    if (storedId) { const w = words.find(x=>x.id===storedId); if (w) return w; }
    const idx = Math.abs(todayKey().split("").reduce((a,c)=>a+c.charCodeAt(0),0)) % words.length;
    const w = words[idx];
    localStorage.setItem(`rr_vocab_today_${todayKey()}`, w.id);
    return w;
  }, [words]);

  const filtered = useMemo(() => {
    let list = words;
    if (filter !== "All") list = list.filter(w=>w.subject===filter);
    if (search) list = list.filter(w=>
      w.word.toLowerCase().includes(search.toLowerCase()) ||
      w.bangla.includes(search) ||
      w.meaning.toLowerCase().includes(search.toLowerCase())
    );
    return list;
  }, [words, filter, search]);

  const subjects = useMemo(() => ["All", ...Array.from(new Set(words.map(w=>w.subject)))], [words]);
  const pct = words.length ? Math.round(learned.size/words.length*100) : 0;

  function startQuiz(w: Word) {
    setQuizWord(w); setPicked(null);
    const wrong = words.filter(x=>x.id!==w.id).sort(()=>Math.random()-0.5).slice(0,3).map(x=>x.meaning);
    setQuizOpts([w.meaning, ...wrong].sort(()=>Math.random()-0.5));
  }

  const inp: React.CSSProperties = {padding:"8px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text)",fontSize:13,width:"100%"};

  return (
    <div style={{background:"var(--bg)",minHeight:"100svh",paddingBottom:40}}>
      <Header showBack backTo="/" />
      <div style={{padding:"12px 14px"}}>

        {/* Hero */}
        <div style={{background:"linear-gradient(135deg,#1d4ed8,#7c3aed)",borderRadius:16,padding:"18px 20px",color:"#fff",marginBottom:16}}>
          <div style={{fontSize:30,marginBottom:4}}>📖</div>
          <h1 style={{fontSize:20,fontWeight:900,fontFamily:"Lato,sans-serif",marginBottom:4}}>Vocabulary Builder</h1>
          <p style={{fontSize:12,opacity:0.9,marginBottom:14}}>Master key academic terms for SSC · HSC · BCS</p>
          <div style={{background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:12}}>
            <div style={{flex:1}}>
              <div style={{fontSize:11,opacity:0.8,marginBottom:6}}>Overall Progress — {learned.size} / {words.length} learned</div>
              <div style={{height:8,background:"rgba(255,255,255,0.2)",borderRadius:4,overflow:"hidden"}}>
                <div style={{width:`${pct}%`,height:"100%",background:"#fff",borderRadius:4,transition:"width 600ms"}}/>
              </div>
            </div>
            <div style={{fontSize:22,fontWeight:900,minWidth:44,textAlign:"center"}}>{pct}%</div>
          </div>
        </div>

        {/* Word of the Day */}
        {todayWord && (
          <div style={{background:"var(--surface)",border:"2px solid var(--purple)",borderRadius:14,padding:16,marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:800,color:"var(--purple)",letterSpacing:"0.12em",marginBottom:10}}>⭐ WORD OF THE DAY</div>
            <div onClick={()=>setShowBack(f=>!f)} style={{cursor:"pointer",minHeight:90,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center"}}>
              {!showBack ? (
                <>
                  <div style={{fontSize:28,fontWeight:900,color:"var(--text)",fontFamily:"Lato,sans-serif",marginBottom:6}}>{todayWord.word}</div>
                  <div style={{fontSize:12,color:"var(--purple)",fontWeight:600,marginBottom:6}}>{todayWord.subject}</div>
                  <div style={{fontSize:11,color:"var(--sub)"}}>Tap to reveal meaning →</div>
                </>
              ) : (
                <>
                  <div style={{fontSize:20,fontWeight:800,color:"var(--green)",marginBottom:4}}>{todayWord.meaning}</div>
                  <div style={{fontSize:18,color:"var(--gold)",fontWeight:700,marginBottom:6}}>{todayWord.bangla}</div>
                  {todayWord.example && <div style={{fontSize:12,color:"var(--sub)",fontStyle:"italic",maxWidth:280}}>"{todayWord.example}"</div>}
                  <div style={{fontSize:10,color:"var(--sub)",marginTop:6}}>↩ tap to flip</div>
                </>
              )}
            </div>
            <div style={{display:"flex",gap:8,marginTop:12,justifyContent:"center"}}>
              <button onClick={()=>{setLearned(p=>{const n=new Set(p);n.add(todayWord.id);return n;});}}
                disabled={learned.has(todayWord.id)}
                style={{padding:"7px 18px",borderRadius:8,background:learned.has(todayWord.id)?"var(--green)":"transparent",color:learned.has(todayWord.id)?"#fff":"var(--green)",border:"2px solid var(--green)",fontWeight:700,fontSize:12,cursor:learned.has(todayWord.id)?"default":"pointer"}}>
                {learned.has(todayWord.id) ? "✅ Learned!" : "Mark Learned"}
              </button>
              <button onClick={()=>startQuiz(todayWord)}
                style={{padding:"7px 18px",borderRadius:8,background:"var(--purple)",color:"#fff",border:"none",fontWeight:700,fontSize:12,cursor:"pointer"}}>
                🧠 Quiz Me
              </button>
            </div>
          </div>
        )}

        {/* Quiz */}
        {quizWord && (
          <div style={{background:"var(--surface)",border:"2px solid var(--gold)",borderRadius:14,padding:16,marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:800,color:"var(--gold)",letterSpacing:"0.12em",marginBottom:10}}>🎯 QUICK QUIZ</div>
            <div style={{fontSize:20,fontWeight:900,color:"var(--text)",textAlign:"center",marginBottom:14}}>{quizWord.word}</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {quizOpts.map(opt => {
                const isCorrect = opt===quizWord.meaning;
                const isPicked  = opt===picked;
                let bg="var(--bg)",clr="var(--text)",bdr="var(--border)";
                if (picked) {
                  if (isCorrect)     { bg="#0a2a0a"; clr="var(--green)"; bdr="var(--green)"; }
                  else if (isPicked) { bg="#2a0a0a"; clr="var(--red-txt)"; bdr="#dc2626"; }
                }
                return (
                  <button key={opt} disabled={!!picked} onClick={()=>{setPicked(opt);if(opt===quizWord.meaning)setLearned(p=>{const n=new Set(p);n.add(quizWord.id);return n;});}}
                    style={{padding:"10px 14px",borderRadius:10,background:bg,color:clr,border:`1.5px solid ${bdr}`,textAlign:"left",cursor:picked?"default":"pointer",fontSize:13,fontWeight:picked&&isCorrect?700:400,transition:"all 200ms"}}>
                    {picked&&isCorrect&&"✅ "}{picked&&isPicked&&!isCorrect&&"❌ "}{opt}
                  </button>
                );
              })}
            </div>
            {picked && (
              <div style={{marginTop:12,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:13,fontWeight:700,color:picked===quizWord.meaning?"var(--green)":"var(--orange)"}}>
                  {picked===quizWord.meaning ? "🎉 Correct!" : `Correct: ${quizWord.meaning}`}
                </span>
                <button onClick={()=>{setQuizWord(null);setPicked(null);}} style={{padding:"5px 12px",borderRadius:6,background:"var(--border)",border:"none",color:"var(--text)",cursor:"pointer",fontSize:11}}>Close ✕</button>
              </div>
            )}
          </div>
        )}

        {/* Search & filter */}
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search words…"
            style={{...inp,flex:1,minWidth:140}}/>
          <select value={filter} onChange={e=>setFilter(e.target.value)} style={{...inp,width:"auto"}}>
            {subjects.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Word list */}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {filtered.map(w => (
            <div key={w.id} style={{background:"var(--surface)",border:`1.5px solid ${learned.has(w.id)?"var(--green)":"var(--border)"}`,borderRadius:12,padding:"12px 14px",display:"flex",gap:12,alignItems:"flex-start"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                  <span style={{fontSize:15,fontWeight:800,color:"var(--text)",fontFamily:"Lato,sans-serif"}}>{w.word}</span>
                  <span style={{fontSize:10,background:"var(--bg)",color:"var(--sub)",padding:"2px 7px",borderRadius:10,border:"1px solid var(--border)"}}>{w.subject}</span>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,fontWeight:700,background:w.difficulty==="hard"?"rgba(220,38,38,0.1)":w.difficulty==="medium"?"rgba(217,119,6,0.1)":"rgba(22,163,74,0.1)",color:w.difficulty==="hard"?"var(--red-txt)":w.difficulty==="medium"?"var(--gold)":"var(--green)"}}>{w.difficulty}</span>
                  {learned.has(w.id) && <span style={{fontSize:12,color:"var(--green)"}}>✅</span>}
                </div>
                <div style={{fontSize:12,color:"var(--gold)",fontWeight:600,marginBottom:2}}>{w.bangla}</div>
                <div style={{fontSize:12,color:"var(--sub)",lineHeight:1.5}}>{w.meaning}</div>
                {w.example && <div style={{fontSize:11,color:"var(--sub)",fontStyle:"italic",marginTop:3}}>"{w.example}"</div>}
              </div>
              <button onClick={()=>startQuiz(w)}
                style={{padding:"6px 11px",borderRadius:8,background:"rgba(108,127,255,0.1)",border:"1px solid rgba(108,127,255,0.25)",color:"var(--purple)",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>
                Quiz
              </button>
            </div>
          ))}
          {!filtered.length && (
            <div style={{textAlign:"center",padding:"32px 0",color:"var(--sub)"}}>
              <div style={{fontSize:32,marginBottom:8}}>📭</div>
              <div>No words found</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
