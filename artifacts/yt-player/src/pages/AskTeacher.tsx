import { useState, useRef, useEffect, useCallback } from "react";
import Header from "../components/Header";
import AiTutor from "./AiTutor";

const USER_TOKEN_KEY = "rr_user_token";
const USER_NAME_KEY  = "rr_username";

function authHdr(): HeadersInit {
  const t = localStorage.getItem(USER_TOKEN_KEY) || "";
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

function fmt(ts: string) {
  try { return new Date(ts).toLocaleString("en-BD", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }); }
  catch { return ts; }
}

/* ── voice recorder hook ───────────────────────────────── */
function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [seconds,   setSeconds]   = useState(0);
  const mrRef    = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mrRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => setAudioData(reader.result as string);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch {
      alert("Microphone access denied. Please allow mic permission.");
    }
  }, []);

  const stop = useCallback(() => {
    mrRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const clear = useCallback(() => {
    setAudioData(null);
    setSeconds(0);
  }, []);

  return { recording, audioData, seconds, start, stop, clear };
}

/* ── image picker ─────────────────────────────────────── */
function useImagePicker() {
  const [imageData, setImageData] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function pick() { inputRef.current?.click(); }
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5_000_000) { alert("Image too large (max 5 MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => setImageData(reader.result as string);
    reader.readAsDataURL(f);
    e.target.value = "";
  }
  const clear = () => setImageData(null);

  const input = <input ref={inputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={onFile} />;
  return { imageData, pick, clear, input };
}

/* ═══════════════════════════════════════════════════════
   HUMAN TEACHER — Q&A
═══════════════════════════════════════════════════════ */
interface DoubtQ {
  id: string; question: string; fullName?: string;
  audioData?: string; imageData?: string;
  timestamp: string; status: "open" | "answered";
  reply?: { text?: string; audioData?: string; repliedAt: string };
}

function HumanTeacher() {
  const [view, setView]           = useState<"list"|"ask">("list");
  const [doubts, setDoubts]       = useState<DoubtQ[]>([]);
  const [loading, setLoading]     = useState(false);
  const [sending, setSending]     = useState(false);
  const [msg, setMsg]             = useState("");
  const [question, setQuestion]   = useState("");
  const [toast, setToast]         = useState("");
  const [aiAns, setAiAns]         = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const prevAnswered              = useRef(-1);
  const voice  = useVoiceRecorder();
  const image  = useImagePicker();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/doubts/my", { headers: authHdr() });
      if (r.ok) {
        const data: DoubtQ[] = await r.json();
        setDoubts(data);
        const answeredNow = data.filter(d => d.status === "answered").length;
        if (prevAnswered.current >= 0 && answeredNow > prevAnswered.current) {
          setToast("👨‍🏫 Your teacher answered your question!");
          setTimeout(() => setToast(""), 5000);
        }
        prevAnswered.current = answeredNow;
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [load]);

  async function getAiAnswer() {
    if (!question.trim()) { setMsg("Type your question first to get an AI answer."); return; }
    setAiLoading(true); setAiAns("");
    try {
      const r = await fetch("/api/doubts/ai-instant", {
        method: "POST", headers: authHdr(),
        body: JSON.stringify({ question }),
      });
      const d = await r.json();
      if (d.answer) setAiAns(d.answer);
      else setMsg(d.error || "AI failed. Try again.");
    } catch { setMsg("Network error. Try again."); }
    finally { setAiLoading(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() && !voice.audioData) { setMsg("Please type a question or record audio."); return; }
    setSending(true); setMsg("");
    try {
      const r = await fetch("/api/doubts", {
        method: "POST",
        headers: authHdr(),
        body: JSON.stringify({
          question,
          audioData: voice.audioData || undefined,
          imageData: image.imageData || undefined,
          fullName: localStorage.getItem(USER_NAME_KEY) || undefined,
        }),
      });
      if (r.ok) {
        setQuestion(""); voice.clear(); image.clear();
        setMsg("✅ Your question has been sent to the teacher!");
        setView("list");
        load();
      } else {
        const d = await r.json().catch(() => ({}));
        setMsg(d.error || "Failed to send question.");
      }
    } catch { setMsg("Network error. Try again."); }
    finally { setSending(false); }
  }

  const unanswered = doubts.filter(d => d.status === "open").length;
  const answered   = doubts.filter(d => d.status === "answered").length;

  return (
    <div style={{ padding:"16px 14px", maxWidth:580, margin:"0 auto", paddingBottom:80 }}>
      {/* Toast notification */}
      {toast && (
        <div style={{ position:"fixed", top:70, left:"50%", transform:"translateX(-50%)", zIndex:9999,
          background:"linear-gradient(135deg,#166534,#16a34a)", color:"#fff", padding:"12px 20px",
          borderRadius:14, boxShadow:"0 8px 24px rgba(0,0,0,0.2)", fontWeight:700, fontSize:14,
          animation:"slideDown .3s ease", display:"flex", alignItems:"center", gap:8, whiteSpace:"nowrap" }}>
          🔔 {toast}
        </div>
      )}
      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18 }}>
        <div style={{ background:"var(--surface)", borderRadius:14, padding:"14px 16px", textAlign:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:26, fontWeight:900, color:"var(--purple)" }}>{doubts.length}</div>
          <div style={{ fontSize:12, color:"var(--sub)" }}>Total Questions</div>
        </div>
        <div style={{ background:"var(--surface)", borderRadius:14, padding:"14px 16px", textAlign:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:26, fontWeight:900, color:answered?"#16a34a":"#d97706" }}>{answered}</div>
          <div style={{ fontSize:12, color:"var(--sub)" }}>Answered</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", gap:8, marginBottom:18 }}>
        <button
          onClick={() => setView("list")}
          style={{ flex:1, padding:"10px 0", borderRadius:10, border:"none", cursor:"pointer", fontWeight:700, fontSize:13,
            background: view==="list" ? "var(--purple)" : "var(--surface)",
            color: view==="list" ? "#fff" : "var(--text)" }}>
          📋 My Questions {unanswered > 0 && `(${unanswered} pending)`}
        </button>
        <button
          onClick={() => setView("ask")}
          style={{ flex:1, padding:"10px 0", borderRadius:10, border:"none", cursor:"pointer", fontWeight:700, fontSize:13,
            background: view==="ask" ? "var(--purple)" : "var(--surface)",
            color: view==="ask" ? "#fff" : "var(--text)" }}>
          ✏️ Ask New Question
        </button>
      </div>

      {/* Ask form */}
      {view === "ask" && (
        <form onSubmit={submit}>
          <div style={{ background:"var(--surface)", borderRadius:16, padding:18, boxShadow:"0 2px 12px rgba(0,0,0,0.08)" }}>
            <div style={{ fontWeight:700, color:"var(--purple)", marginBottom:12, fontSize:15 }}>✍️ Type Your Question</div>
            <textarea
              value={question}
              onChange={e => { setQuestion(e.target.value); setAiAns(""); }}
              placeholder="Write your question here (Bangla or English)…"
              rows={4}
              style={{ width:"100%", borderRadius:10, border:"1.5px solid var(--border)", background:"var(--bg)",
                color:"var(--text)", padding:"10px 12px", fontSize:14, resize:"vertical", boxSizing:"border-box", fontFamily:"inherit" }}
            />

            {/* AI instant answer */}
            <div style={{ marginTop:10 }}>
              <button type="button" onClick={getAiAnswer} disabled={aiLoading || !question.trim()}
                style={{ padding:"8px 18px", borderRadius:10, border:"none",
                  background: aiLoading ? "#a78bfa" : "linear-gradient(135deg,#7c3aed,#a855f7)",
                  color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                {aiLoading ? "⏳ Getting AI answer…" : "⚡ Get Instant AI Answer"}
              </button>
              {aiAns && (
                <div style={{ marginTop:10, background:"linear-gradient(135deg,#f0fdf4,#dcfce7)", border:"1.5px solid #bbf7d0",
                  borderRadius:12, padding:"12px 14px" }}>
                  <div style={{ fontSize:11, fontWeight:800, color:"#166534", marginBottom:6 }}>🤖 AI INSTANT ANSWER</div>
                  <div style={{ fontSize:13, color:"#14532d", lineHeight:1.8, whiteSpace:"pre-wrap" }}>{aiAns}</div>
                  <div style={{ fontSize:11, color:"#15803d", marginTop:8, fontStyle:"italic" }}>
                    Still want a human teacher's perspective? Send the question below.
                  </div>
                </div>
              )}
            </div>

            {/* Voice recorder */}
            <div style={{ marginTop:12 }}>
              <div style={{ fontWeight:600, color:"var(--text)", fontSize:13, marginBottom:8 }}>🎤 Or Record Audio Question</div>
              {!voice.audioData ? (
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  {!voice.recording ? (
                    <button type="button" onClick={voice.start}
                      style={{ padding:"9px 18px", borderRadius:10, border:"none", background:"#7c3aed", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                      🎤 Start Recording
                    </button>
                  ) : (
                    <>
                      <button type="button" onClick={voice.stop}
                        style={{ padding:"9px 18px", borderRadius:10, border:"none", background:"#dc2626", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                        ⏹ Stop ({voice.seconds}s)
                      </button>
                      <div style={{ fontSize:12, color:"#dc2626", fontWeight:700, animation:"pulse 1s infinite" }}>● REC</div>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <audio src={voice.audioData} controls style={{ width:"100%", height:36 }} />
                  <button type="button" onClick={voice.clear}
                    style={{ alignSelf:"flex-start", padding:"4px 12px", borderRadius:8, border:"none", background:"#fee2e2", color:"#dc2626", fontSize:12, cursor:"pointer", fontWeight:700 }}>
                    ✕ Remove Audio
                  </button>
                </div>
              )}
            </div>

            {/* Image attachment */}
            <div style={{ marginTop:12 }}>
              <div style={{ fontWeight:600, color:"var(--text)", fontSize:13, marginBottom:8 }}>📷 Attach Image (optional)</div>
              {image.input}
              {!image.imageData ? (
                <button type="button" onClick={image.pick}
                  style={{ padding:"9px 18px", borderRadius:10, border:"1.5px dashed var(--border)", background:"transparent", color:"var(--sub)", fontSize:13, cursor:"pointer" }}>
                  📎 Choose Image
                </button>
              ) : (
                <div style={{ position:"relative", display:"inline-block" }}>
                  <img src={image.imageData} alt="attachment" style={{ maxWidth:200, maxHeight:150, borderRadius:10, border:"1.5px solid var(--border)" }} />
                  <button type="button" onClick={image.clear}
                    style={{ position:"absolute", top:4, right:4, width:22, height:22, borderRadius:"50%", border:"none", background:"#dc2626", color:"#fff", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    ✕
                  </button>
                </div>
              )}
            </div>

            {msg && (
              <div style={{ marginTop:12, padding:"8px 12px", borderRadius:8,
                background: msg.startsWith("✅") ? "#dcfce7" : "#fee2e2",
                color: msg.startsWith("✅") ? "#166534" : "#991b1b", fontSize:13 }}>
                {msg}
              </div>
            )}

            <button type="submit" disabled={sending || voice.recording}
              style={{ marginTop:14, width:"100%", padding:"12px 0", borderRadius:12, border:"none",
                background: sending ? "#a78bfa" : "var(--purple)", color:"#fff", fontWeight:800, fontSize:15, cursor:"pointer" }}>
              {sending ? "Sending…" : "📨 Send to Teacher"}
            </button>
          </div>
        </form>
      )}

      {/* My questions list */}
      {view === "list" && (
        <div>
          {loading && <div style={{ textAlign:"center", color:"var(--sub)", padding:24 }}>Loading…</div>}
          {!loading && doubts.length === 0 && (
            <div style={{ textAlign:"center", padding:40 }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🤔</div>
              <div style={{ color:"var(--sub)", fontSize:14 }}>No questions yet.<br/>Ask your first question above!</div>
              <button onClick={() => setView("ask")}
                style={{ marginTop:16, padding:"10px 24px", borderRadius:10, border:"none", background:"var(--purple)", color:"#fff", fontWeight:700, cursor:"pointer" }}>
                Ask a Question
              </button>
            </div>
          )}
          {doubts.map(d => (
            <DoubtCard key={d.id} d={d} />
          ))}
        </div>
      )}
    </div>
  );
}

function DoubtCard({ d }: { d: DoubtQ }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background:"var(--surface)", borderRadius:16, marginBottom:12, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,0.07)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width:"100%", textAlign:"left", padding:"14px 16px", border:"none", background:"transparent", cursor:"pointer",
          display:"flex", alignItems:"flex-start", gap:10 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, fontWeight:700,
              background: d.status==="answered" ? "#dcfce7" : "#fef3c7",
              color:       d.status==="answered" ? "#166534" : "#92400e" }}>
              {d.status==="answered" ? "✅ Answered" : "⏳ Pending"}
            </span>
            <span style={{ fontSize:11, color:"var(--sub)" }}>{fmt(d.timestamp)}</span>
          </div>
          <div style={{ fontWeight:600, fontSize:13, color:"var(--text)", lineHeight:1.5 }}>
            {d.question ? (d.question.length > 100 ? d.question.slice(0,100)+"…" : d.question) : "Voice question"}
          </div>
          {d.audioData && <div style={{ fontSize:11, color:"var(--sub)", marginTop:2 }}>🎤 Has audio</div>}
          {d.imageData  && <div style={{ fontSize:11, color:"var(--sub)", marginTop:2 }}>📷 Has image</div>}
        </div>
        <span style={{ color:"var(--sub)", fontSize:16, flexShrink:0 }}>{open?"▲":"▼"}</span>
      </button>

      {open && (
        <div style={{ padding:"0 16px 16px" }}>
          <div style={{ borderTop:"1px solid var(--border)", paddingTop:12 }}>
            {d.question && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"var(--sub)", marginBottom:4 }}>YOUR QUESTION</div>
                <div style={{ fontSize:14, color:"var(--text)", lineHeight:1.7, whiteSpace:"pre-wrap" }}>{d.question}</div>
              </div>
            )}
            {d.audioData && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"var(--sub)", marginBottom:4 }}>🎤 AUDIO QUESTION</div>
                <audio src={d.audioData} controls style={{ width:"100%", height:36 }} />
              </div>
            )}
            {d.imageData && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"var(--sub)", marginBottom:4 }}>📷 ATTACHED IMAGE</div>
                <img src={d.imageData} alt="question attachment" style={{ maxWidth:"100%", borderRadius:10, border:"1.5px solid var(--border)" }} />
              </div>
            )}

            {d.reply ? (
              <div style={{ background:"#f0fdf4", border:"1.5px solid #bbf7d0", borderRadius:12, padding:14, marginTop:10 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#166534", marginBottom:8 }}>👨‍🏫 TEACHER REPLY · {fmt(d.reply.repliedAt)}</div>
                {d.reply.text && (
                  <div style={{ fontSize:14, color:"#166534", lineHeight:1.7, whiteSpace:"pre-wrap" }}>{d.reply.text}</div>
                )}
                {d.reply.audioData && (
                  <div style={{ marginTop:8 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"#166534", marginBottom:4 }}>🎤 Voice Reply</div>
                    <audio src={d.reply.audioData} controls style={{ width:"100%", height:36 }} />
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign:"center", padding:"12px 0", color:"var(--sub)", fontSize:13 }}>
                ⏳ Waiting for teacher reply…
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN — ASK TEACHER PAGE (Hub)
═══════════════════════════════════════════════════════ */
type View = "hub" | "ai" | "human";

export default function AskTeacher() {
  const [view, setView] = useState<View>("hub");

  if (view === "ai") {
    return (
      <div className="ai-shell" style={{ position:"fixed", inset:0, zIndex:10, background:"var(--bg)", overflow:"hidden", display:"flex", flexDirection:"column" }}>
        <AiTutor embedded onBack={() => setView("hub")} />
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100svh", background:"var(--bg)" }}>
      <Header showBack={view==="human"} onBack={() => setView("hub")} backTo="/" />

      {view === "hub" && (
        <div style={{ padding:"24px 16px", maxWidth:480, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:32 }}>
            <div style={{ fontSize:52, marginBottom:8 }}>💬</div>
            <h1 style={{ fontSize:22, fontWeight:900, color:"var(--purple)", fontFamily:"Lato,sans-serif", margin:0 }}>Ask a Teacher</h1>
            <p style={{ fontSize:14, color:"var(--sub)", marginTop:6 }}>Choose how you want help</p>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {/* AI Teacher card */}
            <button onClick={() => setView("ai")} style={{
              display:"flex", alignItems:"center", gap:18, padding:22,
              background:"linear-gradient(135deg,#7c3aed,#a78bfa)",
              borderRadius:20, border:"none", cursor:"pointer", textAlign:"left",
              boxShadow:"0 6px 24px rgba(124,58,237,0.28)", transition:"transform .15s",
            }}
            onMouseDown={e => (e.currentTarget.style.transform="scale(0.97)")}
            onMouseUp={e   => (e.currentTarget.style.transform="")}>
              <div style={{ fontSize:48, flexShrink:0 }}>🤖</div>
              <div>
                <div style={{ fontSize:18, fontWeight:900, color:"#fff", fontFamily:"Lato,sans-serif" }}>AI Teacher</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.85)", marginTop:3, lineHeight:1.5 }}>
                  Instant Gemini AI answers · Math, Science, Bangla · 24/7 available
                </div>
                <div style={{ marginTop:8, display:"flex", gap:6, flexWrap:"wrap" }}>
                  {["LaTeX Math","Chemistry","Bangla+English"].map(tag => (
                    <span key={tag} style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:"rgba(255,255,255,0.2)", color:"#fff", fontWeight:600 }}>{tag}</span>
                  ))}
                </div>
              </div>
            </button>

            {/* Human Teacher card */}
            <button onClick={() => setView("human")} style={{
              display:"flex", alignItems:"center", gap:18, padding:22,
              background:"var(--surface)", borderRadius:20, border:"2px solid var(--border)",
              cursor:"pointer", textAlign:"left", boxShadow:"0 4px 16px rgba(0,0,0,0.07)", transition:"transform .15s",
            }}
            onMouseDown={e => (e.currentTarget.style.transform="scale(0.97)")}
            onMouseUp={e   => (e.currentTarget.style.transform="")}>
              <div style={{ fontSize:48, flexShrink:0 }}>👨‍🏫</div>
              <div>
                <div style={{ fontSize:18, fontWeight:900, color:"var(--text)", fontFamily:"Lato,sans-serif" }}>Human Teacher</div>
                <div style={{ fontSize:13, color:"var(--sub)", marginTop:3, lineHeight:1.5 }}>
                  Send your question to a real teacher · Get a personal reply with voice
                </div>
                <div style={{ marginTop:8, display:"flex", gap:6, flexWrap:"wrap" }}>
                  {["Voice Question","Photo Attachment","Teacher Reply"].map(tag => (
                    <span key={tag} style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:"var(--bg)", color:"var(--purple)", fontWeight:600, border:"1px solid var(--purple)" }}>{tag}</span>
                  ))}
                </div>
              </div>
            </button>
          </div>

          <div style={{ marginTop:28, padding:"14px 16px", background:"var(--surface)", borderRadius:14, display:"flex", gap:10, alignItems:"flex-start" }}>
            <span style={{ fontSize:20 }}>💡</span>
            <div style={{ fontSize:12, color:"var(--sub)", lineHeight:1.6 }}>
              <b style={{ color:"var(--text)" }}>Tip:</b> For quick concept explanations, use the AI Teacher. For homework help, difficult problems, or personal guidance, ask the Human Teacher.
            </div>
          </div>
        </div>
      )}

      {view === "human" && (
        <div>
          <div style={{ padding:"14px 16px 0", maxWidth:580, margin:"0 auto" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
              <div style={{ fontSize:28 }}>👨‍🏫</div>
              <div>
                <div style={{ fontSize:18, fontWeight:900, color:"var(--text)", fontFamily:"Lato,sans-serif" }}>Human Teacher Q&A</div>
                <div style={{ fontSize:12, color:"var(--sub)" }}>Your questions are answered by real teachers</div>
              </div>
            </div>
          </div>
          <HumanTeacher />
        </div>
      )}
    </div>
  );
}
