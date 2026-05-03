import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import Header from "../components/Header";

const TOKEN = () => localStorage.getItem("rr_user_token") || "";
const ah = () => ({ Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" });

interface Deck { id:string; name:string; subject:string; description:string; cardCount:number; createdAt:string; }
interface Card { id:string; deckId:string; front:string; back:string; hint?:string; order:number; }

type StudyResult = "easy"|"hard"|"skip";

const BANGLA_QUOTES = [
  "জ্ঞানই শক্তি — Knowledge is power",
  "প্রতিটি কার্ড একটি পদক্ষেপ সামনে",
  "কঠিন পরিশ্রম কখনো বৃথা যায় না",
  "আজকের প্রচেষ্টা, কালকের সাফল্য",
  "মনোযোগ দিয়ে পড়লে সব সহজ হয়",
];

export default function Flashcards() {
  const [decks, setDecks]     = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView]       = useState<"list"|{deck:Deck; cards:Card[]}>("list");
  const [, navigate]          = useLocation();

  const load = useCallback(() => {
    fetch("/api/flashcard-decks", { headers: { Authorization: `Bearer ${TOKEN()}` } })
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setDecks(d); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function startStudy(deck: Deck) {
    const r = await fetch(`/api/flashcard-decks/${deck.id}/cards`, { headers: { Authorization: `Bearer ${TOKEN()}` } });
    if (!r.ok) return;
    const cards: Card[] = await r.json();
    if (!cards.length) return alert("This deck has no cards yet!");
    setView({ deck, cards: [...cards].sort(() => Math.random() - 0.5) });
  }

  if (typeof view === "object") {
    return <StudyMode deck={view.deck} cards={view.cards} onBack={() => { load(); setView("list"); }} />;
  }

  const getProgress = (deckId: string) => {
    try { const v = localStorage.getItem(`rr_fc_${deckId}`); return v ? JSON.parse(v) : null; } catch { return null; }
  };

  return (
    <div className="fc-shell">
      <Header showBack backTo="/" />
      <div className="fc-content">
        {/* Hero */}
        <div className="fc-hero">
          <div className="fc-hero-icon">🃏</div>
          <div>
            <h1 className="fc-hero-title">Flashcards</h1>
            <p className="fc-hero-sub">Spaced repetition learning — remember more, faster</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="fc-stats-row">
          {[
            { label:"Total Decks", value: decks.length, icon:"📚" },
            { label:"Total Cards", value: decks.reduce((a,d)=>a+d.cardCount,0), icon:"🃏" },
            { label:"Studied Today", value: (() => { try { return Number(localStorage.getItem("rr_fc_today")||0); } catch {return 0;} })(), icon:"✅" },
          ].map(s => (
            <div key={s.label} className="fc-stat-card">
              <div className="fc-stat-icon">{s.icon}</div>
              <div className="fc-stat-value">{s.value}</div>
              <div className="fc-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {loading && <div className="fc-loading"><div className="fc-loading-dots"><span/><span/><span/></div></div>}

        {!loading && decks.length === 0 && (
          <div className="fc-empty">
            <div style={{fontSize:56,marginBottom:12}}>🃏</div>
            <h3>No Flashcard Decks Yet</h3>
            <p>Your teacher will add study decks here soon.</p>
          </div>
        )}

        <div className="fc-decks-grid">
          {decks.map(deck => {
            const prog = getProgress(deck.id);
            const pct = prog ? Math.round((prog.easy / (prog.total||1)) * 100) : 0;
            const colors = ["#7c3aed","#2563eb","#16a34a","#dc2626","#d97706","#0891b2"];
            const color = colors[deck.name.length % colors.length];
            return (
              <div key={deck.id} className="fc-deck-card" style={{ "--deck-color": color } as React.CSSProperties}>
                <div className="fc-deck-top">
                  <div className="fc-deck-emoji">📖</div>
                  {deck.subject && <span className="fc-deck-tag">{deck.subject}</span>}
                </div>
                <h3 className="fc-deck-name">{deck.name}</h3>
                {deck.description && <p className="fc-deck-desc">{deck.description}</p>}
                <div className="fc-deck-meta">
                  <span className="fc-deck-count">{deck.cardCount} cards</span>
                  {prog && <span className="fc-deck-prog">{pct}% mastered</span>}
                </div>
                {prog && (
                  <div className="fc-deck-bar">
                    <div className="fc-deck-bar-fill" style={{width:`${pct}%`, background: color}} />
                  </div>
                )}
                <button className="fc-deck-btn" onClick={() => startStudy(deck)} style={{background:color}}>
                  {prog ? "Continue Study →" : "Start Studying →"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StudyMode({ deck, cards, onBack }: { deck: Deck; cards: Card[]; onBack: () => void }) {
  const [idx, setIdx]         = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<StudyResult[]>([]);
  const [done, setDone]       = useState(false);
  const [hint, setHint]       = useState(false);
  const quote                 = BANGLA_QUOTES[idx % BANGLA_QUOTES.length];

  function answer(r: StudyResult) {
    const newResults = [...results, r];
    setResults(newResults);
    if (idx + 1 >= cards.length) {
      // Save progress
      const easy = newResults.filter(x => x === "easy").length;
      const prog = { easy, total: cards.length, date: new Date().toDateString() };
      try {
        localStorage.setItem(`rr_fc_${deck.id}`, JSON.stringify(prog));
        const today = Number(localStorage.getItem("rr_fc_today")||0);
        localStorage.setItem("rr_fc_today", String(today + cards.length));
      } catch {}
      setDone(true);
    } else {
      setIdx(i => i + 1);
      setFlipped(false);
      setHint(false);
    }
  }

  if (done) {
    const easy = results.filter(x => x === "easy").length;
    const hard = results.filter(x => x === "hard").length;
    const skip = results.filter(x => x === "skip").length;
    const pct  = Math.round((easy / cards.length) * 100);
    return (
      <div className="fc-shell">
        <Header showBack onBack={onBack} />
        <div className="fc-done">
          <div className="fc-done-emoji">{pct >= 80 ? "🎉" : pct >= 50 ? "💪" : "📚"}</div>
          <h2 className="fc-done-title">Study Session Complete!</h2>
          <p className="fc-done-sub">{deck.name}</p>
          <div className="fc-done-stats">
            <div className="fc-done-stat" style={{background:"#dcfce7",color:"#166534"}}>
              <div className="fc-done-stat-val">{easy}</div>
              <div className="fc-done-stat-lbl">✅ Easy</div>
            </div>
            <div className="fc-done-stat" style={{background:"#fef3c7",color:"#92400e"}}>
              <div className="fc-done-stat-val">{hard}</div>
              <div className="fc-done-stat-lbl">🔄 Hard</div>
            </div>
            <div className="fc-done-stat" style={{background:"#f1f5f9",color:"#475569"}}>
              <div className="fc-done-stat-val">{skip}</div>
              <div className="fc-done-stat-lbl">⏭ Skipped</div>
            </div>
          </div>
          <div className="fc-done-pct">{pct}% Mastery</div>
          <div className="fc-done-bar"><div style={{width:`${pct}%`,height:"100%",background:"linear-gradient(90deg,#7c3aed,#2563eb)",borderRadius:99,transition:"width 1s ease"}} /></div>
          <div style={{display:"flex",gap:12,marginTop:24}}>
            <button onClick={onBack} className="fc-done-btn-sec">Back to Decks</button>
            <button onClick={() => { setIdx(0); setFlipped(false); setResults([]); setDone(false); }} className="fc-done-btn-pri">Study Again</button>
          </div>
        </div>
      </div>
    );
  }

  const card = cards[idx];
  const progress = ((idx + 1) / cards.length) * 100;

  return (
    <div className="fc-shell">
      <Header showBack onBack={onBack} />
      <div className="fc-study">
        {/* Progress */}
        <div className="fc-study-header">
          <div className="fc-study-progress-bar"><div className="fc-study-progress-fill" style={{width:`${progress}%`}} /></div>
          <div className="fc-study-counter">{idx + 1} / {cards.length}</div>
        </div>

        <p className="fc-study-quote">"{quote}"</p>

        {/* Card */}
        <div className="fc-card-wrap" onClick={() => setFlipped(f => !f)}>
          <div className={`fc-card-inner ${flipped ? "flipped" : ""}`}>
            {/* Front */}
            <div className="fc-card-face fc-card-front">
              <div className="fc-card-label">QUESTION</div>
              <div className="fc-card-text">{card.front}</div>
              {!flipped && <div className="fc-tap-hint">Tap to reveal answer</div>}
            </div>
            {/* Back */}
            <div className="fc-card-face fc-card-back">
              <div className="fc-card-label" style={{color:"#166534"}}>ANSWER</div>
              <div className="fc-card-text">{card.back}</div>
              {card.hint && hint && <div className="fc-card-hint">💡 {card.hint}</div>}
            </div>
          </div>
        </div>

        {/* Hint button */}
        {card.hint && !flipped && !hint && (
          <button className="fc-hint-btn" onClick={(e) => { e.stopPropagation(); setHint(true); }}>
            💡 Show Hint
          </button>
        )}
        {card.hint && hint && !flipped && (
          <div className="fc-hint-text">💡 {card.hint}</div>
        )}

        {/* Action buttons */}
        {flipped ? (
          <div className="fc-actions">
            <button className="fc-action-btn fc-skip" onClick={() => answer("skip")}>
              <span>⏭</span><span>Skip</span>
            </button>
            <button className="fc-action-btn fc-hard" onClick={() => answer("hard")}>
              <span>🔄</span><span>Hard</span>
            </button>
            <button className="fc-action-btn fc-easy" onClick={() => answer("easy")}>
              <span>✅</span><span>Easy</span>
            </button>
          </div>
        ) : (
          <div className="fc-flip-instruction">
            <span className="fc-flip-icon">👆</span> Tap the card to see the answer
          </div>
        )}

        {/* Mini progress dots */}
        <div className="fc-dots">
          {cards.slice(0, Math.min(10, cards.length)).map((_, i) => (
            <div key={i} className={`fc-dot ${i < idx ? "done" : i === idx ? "active" : ""}`} />
          ))}
          {cards.length > 10 && <span style={{fontSize:11,color:"var(--sub)"}}>+{cards.length-10}</span>}
        </div>
      </div>
    </div>
  );
}
