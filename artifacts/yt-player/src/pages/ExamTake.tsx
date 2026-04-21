import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import Header from "../components/Header";
import MathText from "../components/MathText";

interface Option  { id: string; text: string }
interface Question { id: string; text: string; options: Option[] }
interface Quiz     { id: string; title: string; desc: string; timeMinutes: number; questions: Question[] }
interface ResultQ  { id: string; text: string; options: Option[]; chosen: string|null; correct: string; isRight: boolean; solution?: string }

const OPT_COLORS = { correct:"#d4edda", wrong:"#f8d7da", neutral:"var(--surface)" };

export default function ExamTake() {
  const { examId } = useParams<{ examId: string }>();
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
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const token = localStorage.getItem("rr_user_token") || "";
  const headers = token ? { Authorization: `Bearer ${token}`, "Content-Type":"application/json" } : { "Content-Type":"application/json" };

  useEffect(() => {
    fetch(`/api/quizzes/${examId}`, { headers })
      .then(r => r.json())
      .then(d => {
        if (d.error) { navigate("/exams"); return; }
        setQuiz(d);
        setSecsLeft((d.timeMinutes || 30) * 60);
      })
      .catch(() => navigate("/exams"))
      .finally(() => setLoading(false));
  }, [examId]);

  useEffect(() => {
    if (!quiz || submitted) return;
    timerRef.current = setInterval(() => {
      setSecsLeft(s => {
        if (s <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [quiz, submitted]);

  const handleSubmit = useCallback(async () => {
    if (submitting || submitted) return;
    clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const r = await fetch("/api/quiz-submit", {
        method:"POST", headers,
        body: JSON.stringify({ quizId: examId, answers }),
      });
      const d = await r.json();
      setScore(d.score); setTotal(d.total); setResults(d.results || []);
      setSubmitted(true);

      // Award XP / update streak / check badges
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

  if (loading) return (
    <div style={{ minHeight:"100svh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}><div style={{ fontSize:36 }}>⏳</div><p style={{ color:"var(--sub)", marginTop:10 }}>Loading exam...</p></div>
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

          {/* Score card */}
          <div style={{ background:"var(--purple)", color:"#fff", margin:"16px 12px", borderRadius:16, padding:24, textAlign:"center" }}>
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

          {/* Question results */}
          <div style={{ padding:"0 12px 40px" }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:"var(--text)", fontFamily:"Lato,sans-serif", marginBottom:12 }}>Detailed Results</h2>
            {results.map((q, idx) => (
              <div key={q.id} className="questionBlock">
                <div className="q-number">Q{idx+1}</div>
                <div className="questionText">
                  <MathText text={q.text} />
                </div>
                <div className="q-options">
                  {q.options.map(opt => {
                    const isCorrect = opt.id === q.correct;
                    const isChosen  = opt.id === q.chosen;
                    const bg = isCorrect ? "#d4edda" : (isChosen && !isCorrect) ? "#f8d7da" : "var(--bg)";
                    const border = isCorrect ? "2px solid #28a745" : (isChosen && !isCorrect) ? "2px solid #dc3545" : "1.5px solid var(--border)";
                    return (
                      <div key={opt.id} className="questionOption" style={{ background:bg, border, borderRadius:10, padding:"10px 12px", marginBottom:8, display:"flex", alignItems:"flex-start", gap:10 }}>
                        <span className="input-group-text" style={{ minWidth:28, height:28, borderRadius:50, background: isCorrect?"#28a745":(isChosen&&!isCorrect)?"#dc3545":"var(--border)", color: (isCorrect||(isChosen&&!isCorrect))?"#fff":"var(--text)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>
                          {opt.id}
                        </span>
                        <div style={{ flex:1 }}>
                          <MathText text={opt.text} />
                        </div>
                        {isCorrect && <i className="fas fa-check" style={{ color:"#28a745", fontSize:14, marginTop:2 }} />}
                        {isChosen && !isCorrect && <i className="fas fa-times" style={{ color:"#dc3545", fontSize:14, marginTop:2 }} />}
                      </div>
                    );
                  })}
                </div>
                {q.solution && (
                  <div className="solveText">
                    <div style={{ fontSize:12, fontWeight:700, color:"#0c6139", marginBottom:4 }}>💡 Solution</div>
                    <MathText text={q.solution} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ padding:"0 12px 40px", display:"flex", gap:10 }}>
            <button onClick={() => navigate("/exams")} style={{ flex:1, padding:13, borderRadius:12, border:"1.5px solid var(--purple)", background:"transparent", color:"var(--purple)", fontWeight:700, fontSize:15, cursor:"pointer" }}>
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
        <div style={{ position:"sticky", top:56, zIndex:99, background:"var(--navy)", color:"#fff", padding:"10px 16px", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, fontFamily:"Lato,sans-serif", marginBottom:2 }}>{quiz.title}</div>
            <div style={{ fontSize:11, opacity:0.75 }}>{answered}/{quiz.questions.length} answered</div>
          </div>
          {/* Timer */}
          <div style={{ background: timerWarn?"#dc3545":"rgba(255,255,255,0.15)", borderRadius:8, padding:"6px 14px", fontSize:18, fontWeight:900, fontFamily:"monospace", letterSpacing:2, color: timerWarn?"#fff":"#fff" }}>
            ⏱ {fmt(secsLeft)}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height:4, background:"var(--border)" }}>
          <div style={{ height:4, background:"var(--purple)", width:`${pct}%`, transition:"width 300ms" }} />
        </div>

        {/* Questions */}
        <div style={{ padding:"12px 12px 0" }}>
          {quiz.questions.map((q, idx) => (
            <div key={q.id} className="questionBlock">
              <div className="q-number">Q{idx+1}</div>
              <div className="questionText">
                <MathText text={q.text} />
              </div>
              <div className="q-options">
                {q.options.map(opt => {
                  const selected = answers[q.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      className={`questionOption${selected ? " selected" : ""}`}
                      onClick={() => setAnswers(a => ({ ...a, [q.id]: opt.id }))}
                      style={{ display:"flex", alignItems:"flex-start", gap:10, width:"100%", textAlign:"left", padding:"10px 12px", marginBottom:8, borderRadius:10, cursor:"pointer", background: selected ? "rgba(123,47,165,0.10)":"var(--bg)", border: selected ? "2px solid var(--purple)":"1.5px solid var(--border)", transition:"all 150ms" }}
                    >
                      <span className="input-group-text" style={{ minWidth:28, height:28, borderRadius:50, background: selected?"var(--purple)":"var(--border)", color: selected?"#fff":"var(--text)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>
                        {opt.id}
                      </span>
                      <span style={{ flex:1, lineHeight:1.6 }}><MathText text={opt.text} /></span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"var(--surface)", padding:"12px 16px", boxShadow:"0 -2px 10px rgba(0,0,0,0.10)", display:"flex", gap:10, zIndex:100 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, color:"var(--sub)" }}>Answered: <b style={{ color:"var(--purple)" }}>{answered}</b>/{quiz.questions.length}</div>
            {answered < quiz.questions.length && <div style={{ fontSize:11, color:"var(--orange)" }}>{quiz.questions.length - answered} unanswered</div>}
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ background:"var(--purple)", color:"#fff", border:"none", padding:"12px 24px", borderRadius:12, fontWeight:700, fontSize:15, cursor:submitting?"wait":"pointer", fontFamily:"Roboto,sans-serif" }}
          >
            {submitting ? "Submitting..." : "Submit Exam ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}
