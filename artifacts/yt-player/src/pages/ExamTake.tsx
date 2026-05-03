import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import Header from "../components/Header";
import MathText from "../components/MathText";

interface Option  { id: string; text: string }
interface Question { id: string; text: string; options: Option[] }
interface Quiz     { id: string; title: string; desc: string; timeMinutes: number; questions: Question[] }
interface ResultQ  { id: string; text: string; options: Option[]; chosen: string|null; correct: string; isRight: boolean; solution?: string }

export default function ExamTake() {
  const rawParams = useParams() as Record<string,string>;
  const examId = rawParams.examId || rawParams[0] || "";
  const [, navigate]  = useLocation();
  const [quiz, setQuiz]       = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<ResultQ[]>([]);
  const [score, setScore]     = useState(0);
  const [total, setTotal]     = useState(0);
  const [secsLeft, setSecsLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paused, setPaused]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const token = localStorage.getItem("rr_user_token") || "";
  const headers: HeadersInit = token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/quizzes/${examId}`, { headers });
        const d = await r.json();
        if (cancelled) return;
        if (d.error) { navigate("/exams"); return; }
        setQuiz(d);
        setSecsLeft((d.timeMinutes || 30) * 60);
      } catch { if (!cancelled) navigate("/exams"); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [examId]);

  useEffect(() => {
    if (!quiz || submitted || paused) return;
    timerRef.current = setInterval(() => {
      setSecsLeft(s => {
        if (s <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [quiz, submitted, paused]);

  const handleSubmit = useCallback(async () => {
    if (submitting || submitted) return;
    clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const r = await fetch("/api/quiz-submit", {
        method: "POST", headers,
        body: JSON.stringify({ quizId: examId, answers }),
      });
      const d = await r.json();
      setScore(d.score); setTotal(d.total); setResults(d.results || []);
      setSubmitted(true);

      const username = localStorage.getItem("rr_username") || "";
      const timeUsed = quiz ? (quiz.timeMinutes * 60) - secsLeft : 0;
      try {
        await fetch("/api/gamification/exam-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(username ? { "x-username": username } : {}) },
          body: JSON.stringify({
            quizId: examId,
            quizTitle: quiz?.title || "Quiz",
            score: d.score, total: d.total,
            timeSecs: timeUsed,
          }),
        });
      } catch {}
    } finally { setSubmitting(false); }
  }, [examId, answers, submitting, submitted, quiz, secsLeft]);

  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const answered = Object.keys(answers).length;
  const pct = quiz ? Math.round((answered / quiz.questions.length) * 100) : 0;
  const timerWarn = secsLeft <= 120 && !submitted;
  const timerDanger = secsLeft <= 30 && !submitted;

  if (loading) return (
    <div style={{ minHeight:"100svh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:36 }}>⏳</div>
        <p style={{ color:"var(--sub)", marginTop:10 }}>Loading exam...</p>
      </div>
    </div>
  );

  if (!quiz) return null;

  /* ── RESULTS SCREEN ─────────────────────────────────────── */
  if (submitted) {
    const pctScore = Math.round((score / total) * 100);
    const grade = pctScore >= 80 ? "🏆 Excellent" : pctScore >= 60 ? "👍 Good" : pctScore >= 40 ? "📚 Keep Studying" : "💪 Try Again";
    return (
      <div style={{ background:"var(--bg)", minHeight:"100svh" }}>
        <div className="page">
          <Header showBack backTo="/exams" />

          <div style={{ background:"linear-gradient(135deg,#1d4ed8,#6c7fff)", color:"#fff", margin:"16px 12px", borderRadius:16, padding:24, textAlign:"center" }}>
            <div style={{ fontSize:40, marginBottom:8 }}>{grade}</div>
            <div style={{ fontSize:40, fontWeight:900, fontFamily:"Lato,sans-serif" }}>{score}<span style={{ fontSize:22, opacity:0.8 }}>/{total}</span></div>
            <div style={{ fontSize:16, opacity:0.9, marginTop:4 }}>{pctScore}% correct</div>
            <div style={{ display:"flex", justifyContent:"center", gap:16, marginTop:16 }}>
              <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:10, padding:"8px 16px" }}>
                <div style={{ fontSize:18, fontWeight:700 }}>{score}</div>
                <div style={{ fontSize:11, opacity:0.8 }}>Correct</div>
              </div>
              <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:10, padding:"8px 16px" }}>
                <div style={{ fontSize:18, fontWeight:700 }}>{total-score}</div>
                <div style={{ fontSize:11, opacity:0.8 }}>Wrong</div>
              </div>
            </div>
          </div>

          <div style={{ padding:"0 12px 40px" }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:"var(--text)", fontFamily:"Lato,sans-serif", marginBottom:12 }}>Detailed Results</h2>
            {results.map((q, idx) => (
              <div key={q.id} className="questionBlock">
                <div className="q-number">Q{idx+1}</div>
                <div className="questionText"><MathText text={q.text} /></div>
                <div className="q-options">
                  {q.options.map(opt => {
                    const isCorrect = opt.id === q.correct;
                    const isChosen  = opt.id === q.chosen;
                    const bg = isCorrect ? "rgba(34,197,94,0.15)" : (isChosen && !isCorrect) ? "rgba(248,113,113,0.15)" : "var(--bg)";
                    const border = isCorrect ? "2px solid #22c55e" : (isChosen && !isCorrect) ? "2px solid #f87171" : "1.5px solid var(--border)";
                    return (
                      <div key={opt.id} className="questionOption" style={{ background:bg, border, borderRadius:10, padding:"10px 12px", marginBottom:8, display:"flex", alignItems:"flex-start", gap:10 }}>
                        <span className="input-group-text" style={{ minWidth:28, height:28, borderRadius:50, background: isCorrect?"#22c55e":(isChosen&&!isCorrect)?"#f87171":"var(--border)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>
                          {opt.id}
                        </span>
                        <div style={{ flex:1 }}><MathText text={opt.text} /></div>
                        {isCorrect && <i className="fas fa-check" style={{ color:"#22c55e", fontSize:14, marginTop:2 }} />}
                        {isChosen && !isCorrect && <i className="fas fa-times" style={{ color:"#f87171", fontSize:14, marginTop:2 }} />}
                      </div>
                    );
                  })}
                </div>
                {q.solution && (
                  <div className="solveText">
                    <div style={{ fontSize:12, fontWeight:700, color:"var(--accent)", marginBottom:4 }}>💡 Solution</div>
                    <MathText text={q.solution} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ padding:"0 12px 40px", display:"flex", gap:10 }}>
            <button onClick={() => navigate("/exams")} style={{ flex:1, padding:13, borderRadius:12, border:"1.5px solid var(--accent)", background:"transparent", color:"var(--accent)", fontWeight:700, fontSize:15, cursor:"pointer" }}>
              ← Back to Exams
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── EXAM SCREEN ─────────────────────────────────────────── */
  return (
    <div style={{ background:"var(--bg)", minHeight:"100svh" }}>
      <div className="page" style={{ paddingBottom:100 }}>
        <Header showBack backTo="/exams" />

        {/* Sticky exam header */}
        <div style={{ position:"sticky", top:56, zIndex:99, background:"var(--surface)", borderBottom:"1px solid var(--border)", padding:"10px 16px", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, fontFamily:"Lato,sans-serif", marginBottom:2, color:"var(--text)" }}>{quiz.title}</div>
            <div style={{ fontSize:11, color:"var(--sub)" }}>{answered}/{quiz.questions.length} answered</div>
          </div>

          {/* Pause button */}
          <button
            onClick={() => setPaused(p => !p)}
            title={paused ? "Resume exam" : "Pause exam"}
            style={{ background: paused ? "rgba(245,158,11,0.15)" : "rgba(79,142,247,0.10)", border: `1.5px solid ${paused ? "var(--gold)" : "var(--border)"}`, borderRadius:8, padding:"5px 12px", cursor:"pointer", color: paused ? "var(--gold)" : "var(--sub)", fontWeight:700, fontSize:12 }}
          >
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>

          {/* Timer */}
          <div style={{ background: timerDanger ? "rgba(248,113,113,0.2)" : timerWarn ? "rgba(249,115,22,0.15)" : "rgba(79,142,247,0.10)", border: `1.5px solid ${timerDanger ? "var(--red-txt)" : timerWarn ? "var(--orange)" : "var(--border)"}`, borderRadius:8, padding:"6px 14px", fontSize:18, fontWeight:900, fontFamily:"monospace", letterSpacing:2, color: timerDanger ? "var(--red-txt)" : timerWarn ? "var(--orange)" : "var(--text)" }}>
            {paused ? "⏸" : "⏱"} {fmt(secsLeft)}
          </div>
        </div>

        {/* Paused overlay */}
        {paused && (
          <div style={{ position:"sticky", top:112, zIndex:98, background:"rgba(245,158,11,0.10)", border:"1px solid var(--gold)", borderRadius:0, padding:"10px 16px", textAlign:"center", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
            <span style={{ fontSize:18 }}>⏸</span>
            <span style={{ fontWeight:700, color:"var(--gold)", fontSize:14 }}>Exam Paused — Timer stopped</span>
            <button onClick={() => setPaused(false)} style={{ background:"var(--gold)", color:"#000", border:"none", borderRadius:8, padding:"5px 14px", fontWeight:800, fontSize:13, cursor:"pointer" }}>Resume ▶</button>
          </div>
        )}

        {/* Progress bar */}
        <div style={{ height:4, background:"var(--border)" }}>
          <div style={{ height:4, background:"linear-gradient(90deg,var(--navy),var(--purple))", width:`${pct}%`, transition:"width 300ms" }} />
        </div>

        {/* Questions */}
        <div style={{ padding:"12px 12px 0" }}>
          {quiz.questions.map((q, idx) => (
            <div key={q.id} className="questionBlock">
              <div className="q-number">Q{idx+1}</div>
              <div className="questionText"><MathText text={q.text} /></div>
              <div className="q-options">
                {q.options.map(opt => {
                  const selected = answers[q.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      className={`questionOption${selected ? " selected" : ""}`}
                      onClick={() => !paused && setAnswers(a => ({ ...a, [q.id]: opt.id }))}
                      style={{ display:"flex", alignItems:"flex-start", gap:10, width:"100%", textAlign:"left", padding:"10px 12px", marginBottom:8, borderRadius:10, cursor: paused ? "not-allowed" : "pointer", background: selected ? "rgba(79,142,247,0.12)" : "var(--bg)", border: selected ? "2px solid var(--accent)" : "1.5px solid var(--border)", transition:"all 150ms", opacity: paused ? 0.6 : 1 }}
                    >
                      <span className="input-group-text" style={{ minWidth:28, height:28, borderRadius:50, background: selected ? "var(--accent)" : "var(--border)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>
                        {opt.id}
                      </span>
                      <span style={{ flex:1, lineHeight:1.6, color:"var(--text)" }}><MathText text={opt.text} /></span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Submit bar */}
        <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"var(--surface)", borderTop:"1px solid var(--border)", padding:"12px 16px", display:"flex", gap:10, zIndex:100 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, color:"var(--sub)" }}>Answered: <b style={{ color:"var(--accent)" }}>{answered}</b>/{quiz.questions.length}</div>
            {answered < quiz.questions.length && <div style={{ fontSize:11, color:"var(--orange)" }}>{quiz.questions.length - answered} unanswered</div>}
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || paused}
            style={{ background: paused ? "var(--border)" : "var(--accent)", color:"#fff", border:"none", padding:"12px 24px", borderRadius:12, fontWeight:700, fontSize:15, cursor: (submitting || paused) ? "not-allowed" : "pointer", fontFamily:"Roboto,sans-serif", opacity: paused ? 0.5 : 1 }}
          >
            {paused ? "⏸ Paused" : submitting ? "Submitting..." : "Submit Exam ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}
