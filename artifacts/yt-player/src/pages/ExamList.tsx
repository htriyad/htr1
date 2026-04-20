import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Header from "../components/Header";

interface QuizSummary {
  id: string; title: string; desc: string;
  timeMinutes: number; questionCount: number; createdAt: string;
}

export default function ExamList() {
  const [, navigate] = useLocation();
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("rr_user_token") || "";
    fetch("/api/quizzes", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setQuizzes(d); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ background:"var(--bg)", minHeight:"100svh" }}>
      <div className="page">
        <Header showBack backTo="/" />
        <div style={{ padding:"16px 16px 0" }}>
          <h1 style={{ fontSize:20, fontWeight:800, color:"var(--purple)", fontFamily:"Lato,sans-serif", marginBottom:4 }}>
            📝 Exams & Quizzes
          </h1>
          <p style={{ fontSize:13, color:"var(--sub)", marginBottom:16 }}>
            Select an exam to begin. Your answers are submitted once.
          </p>
        </div>

        {loading && (
          <div style={{ textAlign:"center", padding:48 }}>
            <div style={{ fontSize:36 }}>⏳</div>
            <p style={{ color:"var(--sub)", marginTop:10 }}>Loading exams...</p>
          </div>
        )}

        <div style={{ padding:"0 12px 40px", display:"flex", flexDirection:"column", gap:12 }}>
          {quizzes.map(q => (
            <div key={q.id} style={{
              background:"var(--surface)", borderRadius:14, padding:16,
              boxShadow:"0 2px 10px rgba(0,0,0,0.07)", borderLeft:"4px solid var(--purple)",
            }}>
              <div style={{ fontSize:16, fontWeight:700, color:"var(--text)", fontFamily:"Lato,sans-serif", marginBottom:4 }}>{q.title}</div>
              {q.desc && <div style={{ fontSize:13, color:"var(--sub)", marginBottom:10 }}>{q.desc}</div>}
              <div style={{ display:"flex", gap:16, marginBottom:14, flexWrap:"wrap" }}>
                <span style={badge("var(--purple)")}>{q.questionCount} Questions</span>
                <span style={badge("var(--navy)")}>{q.timeMinutes} Minutes</span>
                <span style={badge("#888")}>{new Date(q.createdAt).toLocaleDateString()}</span>
              </div>
              <button
                onClick={() => navigate(`/exam/${q.id}`)}
                style={{
                  background:"var(--purple)", color:"#fff", border:"none",
                  padding:"10px 20px", borderRadius:10, fontWeight:700,
                  fontSize:14, cursor:"pointer", width:"100%",
                  fontFamily:"Roboto,sans-serif",
                }}
              >
                Start Exam →
              </button>
            </div>
          ))}
          {!loading && quizzes.length === 0 && (
            <div style={{ textAlign:"center", padding:48, color:"var(--sub)" }}>
              <div style={{ fontSize:40 }}>📭</div>
              <p style={{ marginTop:12, fontSize:15 }}>No exams published yet.</p>
              <p style={{ fontSize:13, marginTop:6 }}>Check back later!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function badge(bg: string): React.CSSProperties {
  return { background:bg, color:"#fff", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700 };
}
