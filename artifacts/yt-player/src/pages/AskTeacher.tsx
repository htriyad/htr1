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
function openPdf(data: string, name: string) {
  const arr = data.split(","); const mime = arr[0].match(/:(.*?);/)?.[1] || "application/pdf";
  const bytes = atob(arr[1]); const buf = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([buf], { type: mime }));
  window.open(url, "_blank");
}

const SUBJECTS = ["General","Physics","Chemistry","Biology","Math","English","Bangla","ICT","History","Geography","Economics","BCS","Admission"];

/* ── hooks ─────────────────────────────────────────────── */
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
      const mr = new MediaRecorder(stream); mrRef.current = mr; chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => setAudioData(reader.result as string);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(); setRecording(true); setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch { alert("Microphone access denied. Please allow mic permission."); }
  }, []);
  const stop  = useCallback(() => { mrRef.current?.stop(); setRecording(false); if (timerRef.current) clearInterval(timerRef.current); }, []);
  const clear = useCallback(() => { setAudioData(null); setSeconds(0); }, []);
  return { recording, audioData, seconds, start, stop, clear };
}

function useFilePicker(accept: string, maxBytes: number, label: string) {
  const [data, setData]   = useState<string | null>(null);
  const [name, setName]   = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  function pick() { inputRef.current?.click(); }
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > maxBytes) { alert(`${label} too large (max ${Math.round(maxBytes/1_000_000)} MB)`); return; }
    const reader = new FileReader();
    reader.onload = () => { setData(reader.result as string); setName(f.name); };
    reader.readAsDataURL(f);
    e.target.value = "";
  }
  const clear = () => { setData(null); setName(""); };
  const input = <input ref={inputRef} type="file" accept={accept} style={{ display:"none" }} onChange={onFile} />;
  return { data, name, pick, clear, input };
}

/* ── attachment display helpers ─────────────────────────── */
function AttachPill({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
  return (
    <span onClick={onClick}
      style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:20,
        background:"rgba(108,127,255,0.1)", color:"var(--purple)", fontSize:11, fontWeight:700,
        cursor: onClick ? "pointer" : "default", border:"1px solid rgba(108,127,255,0.2)" }}>
      {icon} {label}
    </span>
  );
}
function LinkChip({ url }: { url: string }) {
  let label = url; try { label = new URL(url).hostname; } catch {}
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 12px", borderRadius:20,
        background:"rgba(37,99,235,0.08)", color:"#3b82f6", fontSize:12, fontWeight:700, textDecoration:"none",
        border:"1px solid rgba(37,99,235,0.2)", maxWidth:"100%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
      🔗 {label}
    </a>
  );
}

/* ── interfaces ─────────────────────────────────────────── */
interface DoubtReply {
  text?: string; audioData?: string; imageData?: string;
  pdfData?: string; pdfName?: string; links?: string[];
  repliedAt: string;
}
interface DoubtQ {
  id: string; question: string; fullName?: string; subject?: string;
  audioData?: string; imageData?: string; pdfData?: string; pdfName?: string;
  links?: string[];
  timestamp: string; status: "open" | "answered";
  reply?: DoubtReply;
}

/* ══════════════════════════════════════════════════════════
   DOUBT CARD
══════════════════════════════════════════════════════════ */
function DoubtCard({ d }: { d: DoubtQ }) {
  const [open, setOpen] = useState(false);
  const answered = d.status === "answered";
  return (
    <div style={{ background:"var(--surface)", borderRadius:18, marginBottom:12, overflow:"hidden",
      border:`1.5px solid ${answered ? "rgba(34,197,94,0.25)" : "var(--border)"}`,
      boxShadow: answered ? "0 0 0 3px rgba(34,197,94,0.06)" : "0 2px 10px rgba(0,0,0,0.07)" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width:"100%", textAlign:"left", padding:"14px 16px", border:"none", background:"transparent", cursor:"pointer", display:"flex", alignItems:"flex-start", gap:10 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, padding:"2px 9px", borderRadius:20, fontWeight:800,
              background: answered ? "#dcfce7" : "#fef3c7",
              color:       answered ? "#166534" : "#92400e" }}>
              {answered ? "✅ Answered" : "⏳ Pending"}
            </span>
            {d.subject && <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:"rgba(108,127,255,0.1)", color:"var(--purple)", fontWeight:700 }}>{d.subject}</span>}
            <span style={{ fontSize:11, color:"var(--sub)" }}>{fmt(d.timestamp)}</span>
          </div>
          <div style={{ fontWeight:600, fontSize:13, color:"var(--text)", lineHeight:1.5 }}>
            {d.question ? (d.question.length > 110 ? d.question.slice(0,110)+"…" : d.question) : "🎤 Voice question"}
          </div>
          <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap" }}>
            {d.audioData  && <AttachPill icon="🎤" label="Voice"/>}
            {d.imageData  && <AttachPill icon="📷" label="Photo"/>}
            {d.pdfData    && <AttachPill icon="📄" label={d.pdfName || "PDF"}/>}
            {d.links?.map((l,i) => <AttachPill key={i} icon="🔗" label="Link"/>)}
          </div>
        </div>
        <span style={{ color:"var(--sub)", fontSize:16, flexShrink:0, marginTop:2 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding:"0 16px 16px" }}>
          <div style={{ borderTop:"1px solid var(--border)", paddingTop:12 }}>
            {/* Question */}
            {d.question && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:800, color:"var(--sub)", marginBottom:4 }}>YOUR QUESTION</div>
                <div style={{ fontSize:14, color:"var(--text)", lineHeight:1.7, whiteSpace:"pre-wrap" }}>{d.question}</div>
              </div>
            )}
            {d.audioData && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:800, color:"var(--sub)", marginBottom:4 }}>🎤 VOICE QUESTION</div>
                <audio src={d.audioData} controls style={{ width:"100%", height:36 }} />
              </div>
            )}
            {d.imageData && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:800, color:"var(--sub)", marginBottom:4 }}>📷 PHOTO</div>
                <img src={d.imageData} alt="attachment" style={{ maxWidth:"100%", borderRadius:12, border:"1.5px solid var(--border)" }} />
              </div>
            )}
            {d.pdfData && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:800, color:"var(--sub)", marginBottom:4 }}>📄 PDF ATTACHMENT</div>
                <button onClick={() => openPdf(d.pdfData!, d.pdfName || "document.pdf")}
                  style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"8px 16px", borderRadius:10,
                    background:"rgba(239,68,68,0.08)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.2)", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                  📄 Open {d.pdfName || "PDF"}
                </button>
              </div>
            )}
            {d.links && d.links.length > 0 && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:800, color:"var(--sub)", marginBottom:6 }}>🔗 LINKS</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {d.links.map((l,i) => <LinkChip key={i} url={l} />)}
                </div>
              </div>
            )}

            {/* Teacher reply */}
            {d.reply ? (
              <div style={{ background:"linear-gradient(135deg,rgba(34,197,94,0.06),rgba(21,128,61,0.04))",
                border:"1.5px solid rgba(34,197,94,0.3)", borderRadius:14, padding:14, marginTop:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <div style={{ width:32, height:32, borderRadius:10, background:"linear-gradient(135deg,#16a34a,#22c55e)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>👨‍🏫</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:800, color:"#166534" }}>Teacher Reply</div>
                    <div style={{ fontSize:11, color:"#4ade80" }}>{fmt(d.reply.repliedAt)}</div>
                  </div>
                </div>
                {d.reply.text && (
                  <div style={{ fontSize:14, color:"var(--text)", lineHeight:1.8, whiteSpace:"pre-wrap", marginBottom:8 }}>{d.reply.text}</div>
                )}
                {d.reply.audioData && (
                  <div style={{ marginBottom:8 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#166534", marginBottom:4 }}>🎤 Voice Reply</div>
                    <audio src={d.reply.audioData} controls style={{ width:"100%", height:36 }} />
                  </div>
                )}
                {d.reply.imageData && (
                  <div style={{ marginBottom:8 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#166534", marginBottom:4 }}>📷 Photo</div>
                    <img src={d.reply.imageData} alt="teacher photo" style={{ maxWidth:"100%", borderRadius:10, border:"1.5px solid rgba(34,197,94,0.3)" }} />
                  </div>
                )}
                {d.reply.pdfData && (
                  <div style={{ marginBottom:8 }}>
                    <button onClick={() => openPdf(d.reply!.pdfData!, d.reply!.pdfName || "teacher-reply.pdf")}
                      style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"8px 16px", borderRadius:10,
                        background:"rgba(239,68,68,0.08)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.2)", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                      📄 Open {d.reply.pdfName || "PDF"}
                    </button>
                  </div>
                )}
                {d.reply.links && d.reply.links.length > 0 && (
                  <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:4 }}>
                    {d.reply.links.map((l,i) => <LinkChip key={i} url={l} />)}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign:"center", padding:"14px 0", color:"var(--sub)", fontSize:13 }}>
                ⏳ Waiting for teacher reply…
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   HUMAN TEACHER — Q&A
══════════════════════════════════════════════════════════ */
function HumanTeacher() {
  const [view, setView]           = useState<"list" | "ask">("list");
  const [doubts, setDoubts]       = useState<DoubtQ[]>([]);
  const [loading, setLoading]     = useState(false);
  const [sending, setSending]     = useState(false);
  const [msg, setMsg]             = useState("");
  const [question, setQuestion]   = useState("");
  const [subject, setSubject]     = useState("General");
  const [toast, setToast]         = useState("");
  const [aiAns, setAiAns]         = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [links, setLinks]         = useState<string[]>([]);
  const prevAnswered              = useRef(-1);
  const voice = useVoiceRecorder();
  const photo = useFilePicker("image/*",          5_000_000, "Image");
  const pdf   = useFilePicker("application/pdf", 10_000_000, "PDF");

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

  useEffect(() => { load(); const t = setInterval(load, 20_000); return () => clearInterval(t); }, [load]);

  async function getAiAnswer() {
    if (!question.trim()) { setMsg("Type your question first to get an AI answer."); return; }
    setAiLoading(true); setAiAns("");
    try {
      const r = await fetch("/api/doubts/ai-instant", { method:"POST", headers: authHdr(), body: JSON.stringify({ question }) });
      const d = await r.json();
      if (d.answer) setAiAns(d.answer); else setMsg(d.error || "AI failed. Try again.");
    } catch { setMsg("Network error. Try again."); } finally { setAiLoading(false); }
  }

  function addLink() {
    const u = linkInput.trim();
    if (!u) return;
    let url = u;
    try { if (!url.startsWith("http")) url = "https://" + url; new URL(url); } catch { setMsg("Invalid URL"); return; }
    setLinks(l => [...l, url]); setLinkInput(""); setMsg("");
  }
  function removeLink(i: number) { setLinks(l => l.filter((_,j) => j !== i)); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() && !voice.audioData) { setMsg("Please type a question or record audio."); return; }
    setSending(true); setMsg("");
    try {
      const r = await fetch("/api/doubts", {
        method:"POST", headers: authHdr(),
        body: JSON.stringify({
          question, subject,
          audioData: voice.audioData || undefined,
          imageData: photo.data || undefined,
          pdfData:   pdf.data || undefined,
          pdfName:   pdf.name || undefined,
          links:     links.length ? links : undefined,
          fullName:  localStorage.getItem(USER_NAME_KEY) || undefined,
        }),
      });
      if (r.ok) {
        setQuestion(""); setSubject("General"); voice.clear(); photo.clear(); pdf.clear(); setLinks([]); setAiAns("");
        setMsg("✅ Your question has been sent to the teacher!");
        setView("list"); load();
      } else {
        const d = await r.json().catch(() => ({})); setMsg(d.error || "Failed to send question.");
      }
    } catch { setMsg("Network error. Try again."); } finally { setSending(false); }
  }

  const unanswered = doubts.filter(d => d.status === "open").length;
  const answered   = doubts.filter(d => d.status === "answered").length;

  return (
    <div style={{ padding:"16px 14px", maxWidth:580, margin:"0 auto", paddingBottom:90 }}>
      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", top:70, left:"50%", transform:"translateX(-50%)", zIndex:9999,
          background:"linear-gradient(135deg,#166534,#16a34a)", color:"#fff", padding:"12px 20px",
          borderRadius:14, boxShadow:"0 8px 24px rgba(0,0,0,0.2)", fontWeight:700, fontSize:14,
          display:"flex", alignItems:"center", gap:8, whiteSpace:"nowrap" }}>
          🔔 {toast}
        </div>
      )}

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:18 }}>
        {[[doubts.length, "Total", "var(--purple)"], [unanswered, "Pending", "#d97706"], [answered, "Answered", "#16a34a"]].map(([v, l, c]) => (
          <div key={String(l)} style={{ background:"var(--surface)", borderRadius:14, padding:"12px 10px", textAlign:"center", border:"1.5px solid var(--border)" }}>
            <div style={{ fontSize:24, fontWeight:900, color:String(c) }}>{v}</div>
            <div style={{ fontSize:11, color:"var(--sub)" }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", gap:8, marginBottom:18 }}>
        <button onClick={() => setView("list")}
          style={{ flex:1, padding:"10px 0", borderRadius:12, border:"none", cursor:"pointer", fontWeight:700, fontSize:13,
            background: view==="list" ? "var(--purple)" : "var(--surface)", color: view==="list" ? "#fff" : "var(--text)" }}>
          📋 My Questions {unanswered > 0 && `(${unanswered} pending)`}
        </button>
        <button onClick={() => setView("ask")}
          style={{ flex:1, padding:"10px 0", borderRadius:12, border:"none", cursor:"pointer", fontWeight:700, fontSize:13,
            background: view==="ask" ? "var(--purple)" : "var(--surface)", color: view==="ask" ? "#fff" : "var(--text)" }}>
          ✏️ Ask New Question
        </button>
      </div>

      {/* ── ASK FORM ── */}
      {view === "ask" && (
        <form onSubmit={submit}>
          <div style={{ background:"var(--surface)", borderRadius:18, padding:18, border:"1.5px solid var(--border)", display:"flex", flexDirection:"column", gap:14 }}>

            {/* Subject picker */}
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--sub)", marginBottom:6 }}>📚 SUBJECT</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {SUBJECTS.map(s => (
                  <button key={s} type="button" onClick={() => setSubject(s)}
                    style={{ padding:"5px 12px", borderRadius:20, border:`1.5px solid ${subject===s?"var(--purple)":"var(--border)"}`,
                      background: subject===s ? "rgba(108,127,255,0.15)" : "transparent",
                      color: subject===s ? "var(--purple)" : "var(--sub)",
                      fontSize:11, fontWeight:700, cursor:"pointer" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Text question */}
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--sub)", marginBottom:6 }}>✍️ QUESTION</div>
              <textarea value={question} onChange={e => { setQuestion(e.target.value); setAiAns(""); }}
                placeholder="Write your question here (Bangla or English)…" rows={4}
                style={{ width:"100%", borderRadius:12, border:"1.5px solid var(--border)", background:"var(--bg)",
                  color:"var(--text)", padding:"10px 12px", fontSize:14, resize:"vertical", boxSizing:"border-box", fontFamily:"inherit" }}/>
              <button type="button" onClick={getAiAnswer} disabled={aiLoading || !question.trim()}
                style={{ marginTop:8, padding:"7px 16px", borderRadius:10, border:"none",
                  background: aiLoading ? "#a78bfa" : "linear-gradient(135deg,#7c3aed,#a855f7)",
                  color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                {aiLoading ? "⏳ Getting AI answer…" : "⚡ Get Instant AI Answer"}
              </button>
              {aiAns && (
                <div style={{ marginTop:10, background:"linear-gradient(135deg,rgba(34,197,94,0.07),rgba(21,128,61,0.04))",
                  border:"1.5px solid rgba(34,197,94,0.3)", borderRadius:12, padding:"12px 14px" }}>
                  <div style={{ fontSize:11, fontWeight:800, color:"#166534", marginBottom:6 }}>🤖 AI INSTANT ANSWER</div>
                  <div style={{ fontSize:13, color:"var(--text)", lineHeight:1.8, whiteSpace:"pre-wrap" }}>{aiAns}</div>
                  <div style={{ fontSize:11, color:"var(--sub)", marginTop:8, fontStyle:"italic" }}>Still want a human teacher's perspective? Send the question below.</div>
                </div>
              )}
            </div>

            {/* Attachment toolbar */}
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--sub)", marginBottom:8 }}>📎 ATTACHMENTS</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>

                {/* Voice */}
                <div>
                  {photo.input}{pdf.input}
                  {!voice.audioData ? (
                    !voice.recording ? (
                      <button type="button" onClick={voice.start}
                        style={{ padding:"8px 14px", borderRadius:10, border:"1.5px solid var(--border)", background:"var(--bg)", color:"var(--text)", fontWeight:700, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                        🎤 Voice
                      </button>
                    ) : (
                      <button type="button" onClick={voice.stop}
                        style={{ padding:"8px 14px", borderRadius:10, border:"none", background:"#dc2626", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                        ⏹ Stop ({voice.seconds}s) ● REC
                      </button>
                    )
                  ) : null}
                </div>

                {/* Photo */}
                {!photo.data && (
                  <button type="button" onClick={photo.pick}
                    style={{ padding:"8px 14px", borderRadius:10, border:"1.5px solid var(--border)", background:"var(--bg)", color:"var(--text)", fontWeight:700, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                    📷 Photo
                  </button>
                )}

                {/* PDF */}
                {!pdf.data && (
                  <button type="button" onClick={pdf.pick}
                    style={{ padding:"8px 14px", borderRadius:10, border:"1.5px solid var(--border)", background:"var(--bg)", color:"var(--text)", fontWeight:700, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                    📄 PDF
                  </button>
                )}
              </div>

              {/* Attached previews */}
              <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:8 }}>
                {voice.audioData && (
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    <audio src={voice.audioData} controls style={{ width:"100%", height:36 }} />
                    <button type="button" onClick={voice.clear}
                      style={{ alignSelf:"flex-start", padding:"3px 10px", borderRadius:6, border:"none", background:"#fee2e2", color:"#dc2626", fontSize:11, cursor:"pointer", fontWeight:700 }}>
                      ✕ Remove Voice
                    </button>
                  </div>
                )}
                {photo.data && (
                  <div style={{ position:"relative", display:"inline-block" }}>
                    <img src={photo.data} alt="attachment" style={{ maxWidth:220, maxHeight:160, borderRadius:12, border:"1.5px solid var(--border)", display:"block" }} />
                    <button type="button" onClick={photo.clear}
                      style={{ position:"absolute", top:4, right:4, width:22, height:22, borderRadius:"50%", border:"none", background:"#dc2626", color:"#fff", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900 }}>
                      ✕
                    </button>
                  </div>
                )}
                {pdf.data && (
                  <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:12, background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)" }}>
                    <span style={{ fontSize:24 }}>📄</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{pdf.name}</div>
                      <div style={{ fontSize:11, color:"var(--sub)" }}>PDF ready to attach</div>
                    </div>
                    <button type="button" onClick={pdf.clear}
                      style={{ padding:"4px 10px", borderRadius:8, border:"none", background:"#fee2e2", color:"#dc2626", fontSize:11, cursor:"pointer", fontWeight:700 }}>
                      ✕ Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Links */}
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--sub)", marginBottom:6 }}>🔗 LINKS (optional)</div>
              <div style={{ display:"flex", gap:8 }}>
                <input value={linkInput} onChange={e => setLinkInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
                  placeholder="Paste a URL and press Add…"
                  style={{ flex:1, padding:"8px 12px", borderRadius:10, border:"1.5px solid var(--border)", background:"var(--bg)", color:"var(--text)", fontSize:13, fontFamily:"inherit" }}/>
                <button type="button" onClick={addLink}
                  style={{ padding:"8px 14px", borderRadius:10, border:"none", background:"rgba(108,127,255,0.15)", color:"var(--purple)", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                  Add
                </button>
              </div>
              {links.length > 0 && (
                <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:5 }}>
                  {links.map((l, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <LinkChip url={l} />
                      <button type="button" onClick={() => removeLink(i)}
                        style={{ padding:"2px 8px", borderRadius:6, border:"none", background:"#fee2e2", color:"#dc2626", fontSize:11, cursor:"pointer", fontWeight:700 }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {msg && (
              <div style={{ padding:"8px 12px", borderRadius:10,
                background: msg.startsWith("✅") ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                color: msg.startsWith("✅") ? "#16a34a" : "#dc2626", fontSize:13, fontWeight:600 }}>
                {msg}
              </div>
            )}

            <button type="submit" disabled={sending || voice.recording}
              style={{ padding:"13px 0", borderRadius:14, border:"none",
                background: sending ? "#a78bfa" : "var(--purple)", color:"#fff", fontWeight:800, fontSize:15, cursor:"pointer" }}>
              {sending ? "Sending…" : "📨 Send to Teacher"}
            </button>
          </div>
        </form>
      )}

      {/* ── MY QUESTIONS ── */}
      {view === "list" && (
        <div>
          {loading && doubts.length === 0 && (
            <div style={{ textAlign:"center", color:"var(--sub)", padding:32 }}>Loading…</div>
          )}
          {!loading && doubts.length === 0 && (
            <div style={{ textAlign:"center", padding:40 }}>
              <div style={{ fontSize:52, marginBottom:12 }}>🤔</div>
              <div style={{ color:"var(--sub)", fontSize:14 }}>No questions yet.<br/>Ask your first question above!</div>
              <button onClick={() => setView("ask")}
                style={{ marginTop:16, padding:"10px 24px", borderRadius:12, border:"none", background:"var(--purple)", color:"#fff", fontWeight:700, cursor:"pointer" }}>
                Ask a Question
              </button>
            </div>
          )}
          {doubts.map(d => <DoubtCard key={d.id} d={d} />)}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
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
      <Header showBack={view === "human"} onBack={() => setView("hub")} backTo="/" />

      {view === "hub" && (
        <div style={{ padding:"24px 16px", maxWidth:480, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:32 }}>
            <div style={{ fontSize:52, marginBottom:8 }}>💬</div>
            <h1 style={{ fontSize:22, fontWeight:900, color:"var(--purple)", fontFamily:"Lato,sans-serif", margin:0 }}>Ask a Teacher</h1>
            <p style={{ fontSize:14, color:"var(--sub)", marginTop:6 }}>Choose how you want help</p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <button onClick={() => setView("ai")}
              style={{ display:"flex", alignItems:"center", gap:18, padding:22,
                background:"linear-gradient(135deg,#7c3aed,#a78bfa)", borderRadius:20, border:"none", cursor:"pointer", textAlign:"left",
                boxShadow:"0 6px 24px rgba(124,58,237,0.28)", transition:"transform .15s" }}
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

            <button onClick={() => setView("human")}
              style={{ display:"flex", alignItems:"center", gap:18, padding:22,
                background:"var(--surface)", borderRadius:20, border:"2px solid var(--border)", cursor:"pointer", textAlign:"left",
                boxShadow:"0 4px 16px rgba(0,0,0,0.07)", transition:"transform .15s" }}
              onMouseDown={e => (e.currentTarget.style.transform="scale(0.97)")}
              onMouseUp={e   => (e.currentTarget.style.transform="")}>
              <div style={{ fontSize:48, flexShrink:0 }}>👨‍🏫</div>
              <div>
                <div style={{ fontSize:18, fontWeight:900, color:"var(--text)", fontFamily:"Lato,sans-serif" }}>Human Teacher</div>
                <div style={{ fontSize:13, color:"var(--sub)", marginTop:3, lineHeight:1.5 }}>
                  Send your question · Get a personal reply with any format
                </div>
                <div style={{ marginTop:8, display:"flex", gap:6, flexWrap:"wrap" }}>
                  {["🎤 Voice","📷 Photo","📄 PDF","🔗 Links"].map(tag => (
                    <span key={tag} style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:"rgba(108,127,255,0.1)", color:"var(--purple)", fontWeight:600 }}>{tag}</span>
                  ))}
                </div>
              </div>
            </button>
          </div>

          <div style={{ marginTop:28, padding:"14px 16px", background:"var(--surface)", borderRadius:14, display:"flex", gap:10, alignItems:"flex-start", border:"1.5px solid var(--border)" }}>
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
