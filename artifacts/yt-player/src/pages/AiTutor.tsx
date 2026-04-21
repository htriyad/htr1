import { useEffect, useRef, useState } from "react";
import Header from "../components/Header";
import MathText from "../components/MathText";

interface Msg { role: "user" | "assistant"; content: string }

const STORAGE = "rr_ai_chat_v1";

export default function AiTutor() {
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE) || "[]"); }
    catch { return []; }
  });
  const [input,    setInput]   = useState("");
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef  = useRef<AbortController | null>(null);

  useEffect(() => { localStorage.setItem(STORAGE, JSON.stringify(msgs.slice(-40))); }, [msgs]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError("");
    const next: Msg[] = [...msgs, { role: "user", content: trimmed }];
    setMsgs(next);
    setInput("");
    setLoading(true);

    // Append placeholder assistant for streaming
    setMsgs(m => [...m, { role: "assistant", content: "" }]);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
        signal: abortRef.current.signal,
      });
      if (!r.ok || !r.body) throw new Error(`Request failed (${r.status})`);

      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const j = JSON.parse(line.slice(5).trim());
            if (j.error) { setError(j.error); break; }
            if (j.done) continue;
            if (j.content) {
              setMsgs(m => {
                const copy = m.slice();
                const last = copy[copy.length - 1];
                if (last && last.role === "assistant") {
                  copy[copy.length - 1] = { ...last, content: last.content + j.content };
                }
                return copy;
              });
            }
          } catch {}
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") setError(e.message || "Network error");
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function clearChat() {
    setMsgs([]); setError(""); localStorage.removeItem(STORAGE);
  }

  const SUGGESTIONS = [
    "Newton's first law explain in Bangla",
    "Solve: $\\int x^2 dx$",
    "Balance: H₂ + O₂ → H₂O",
    "HSC physics 2024 important topics",
    "Generate 5 MCQs on Photosynthesis",
  ];

  return (
    <div style={{ background: "var(--bg)", minHeight: "100svh", display: "flex", flexDirection: "column" }}>
      <Header showBack backTo="/" />

      {/* Hero */}
      <div style={{ padding: "12px 14px 6px" }}>
        <div style={{
          background: "linear-gradient(135deg,#7c3aed 0%,#2563eb 100%)",
          color: "#fff", borderRadius: 14, padding: 14,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ fontSize: 32, lineHeight: 1 }}>🤖</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16, fontFamily: "Lato,sans-serif" }}>
              AI Tutor & Doubt Solver
            </div>
            <div style={{ fontSize: 11, opacity: 0.95, marginTop: 2 }}>
              Bangla + English • Math • Chemistry • Always free
            </div>
          </div>
          {msgs.length > 0 && (
            <button onClick={clearChat} style={{
              background: "rgba(255,255,255,0.18)", border: "none",
              color: "#fff", padding: "6px 10px", borderRadius: 8,
              fontSize: 11, cursor: "pointer", fontWeight: 600,
            }}>Clear</button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, padding: "10px 12px 14px",
        overflowY: "auto", display: "flex", flexDirection: "column", gap: 10,
      }}>
        {msgs.length === 0 && (
          <div style={{ color: "var(--sub)", fontSize: 13, textAlign: "center", padding: "30px 10px" }}>
            👋 Ask me anything about your studies. Math, chemistry, physics, biology, English — Bangla or English, your choice.
            <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} style={{
                  background: "var(--card)", border: "1px solid var(--border)",
                  color: "var(--text)", padding: "6px 10px", borderRadius: 999,
                  fontSize: 11, cursor: "pointer",
                }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "88%",
            background: m.role === "user" ? "linear-gradient(135deg,#7c3aed,#db2777)" : "var(--card)",
            color: m.role === "user" ? "#fff" : "var(--text)",
            padding: "10px 14px", borderRadius: 14,
            borderBottomRightRadius: m.role === "user" ? 4 : 14,
            borderBottomLeftRadius:  m.role === "assistant" ? 4 : 14,
            boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
            fontSize: 14, lineHeight: 1.55,
            wordBreak: "break-word", overflowWrap: "anywhere",
          }}>
            {m.role === "assistant"
              ? <MathText text={m.content || (loading && i === msgs.length - 1 ? "…" : "")} block />
              : <span style={{ whiteSpace: "pre-wrap" }}>{m.content}</span>
            }
          </div>
        ))}

        {error && (
          <div style={{
            alignSelf: "flex-start", background: "#fee2e2", color: "#991b1b",
            padding: "8px 12px", borderRadius: 10, fontSize: 12,
          }}>⚠ {error}</div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        style={{
          padding: "8px 10px 14px",
          background: "var(--card)",
          borderTop: "1px solid var(--border)",
          display: "flex", gap: 8, alignItems: "flex-end",
          position: "sticky", bottom: 0,
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
          }}
          placeholder="Ask anything... (Bangla or English)"
          rows={1}
          style={{
            flex: 1, padding: "10px 12px", borderRadius: 12,
            border: "1px solid var(--border)", background: "var(--bg)",
            color: "var(--text)", fontFamily: "'Roboto','Noto Sans Bengali',sans-serif",
            fontSize: 14, resize: "none", maxHeight: 140, outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            background: loading ? "#94a3b8" : "linear-gradient(135deg,#7c3aed,#2563eb)",
            color: "#fff", border: "none", borderRadius: 12,
            padding: "10px 16px", fontWeight: 700, fontSize: 14,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            opacity: loading || !input.trim() ? 0.7 : 1,
          }}
        >
          {loading ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
