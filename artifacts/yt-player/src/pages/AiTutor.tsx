import { useEffect, useRef, useState } from "react";
import Header from "../components/Header";
import MathText from "../components/MathText";

interface Msg { role: "user" | "assistant"; content: string; ts?: number }

const STORAGE = "rr_ai_chat_v1";

const SUGGESTIONS: { emoji: string; text: string }[] = [
  { emoji: "📘", text: "Newton's first law explain in Bangla" },
  { emoji: "∫",  text: "Solve: $\\int x^2 \\,dx$" },
  { emoji: "⚗️", text: "Balance: H₂ + O₂ → H₂O" },
  { emoji: "🎯", text: "HSC physics 2024 important topics" },
  { emoji: "📝", text: "Generate 5 MCQs on Photosynthesis" },
  { emoji: "🧮", text: "Quadratic formula derivation" },
];

function fmtTime(t?: number) {
  if (!t) return "";
  const d = new Date(t);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AiTutor({ embedded, onBack }: { embedded?: boolean; onBack?: () => void } = {}) {
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE) || "[]"); }
    catch { return []; }
  });
  const [input,    setInput]   = useState("");
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef     = useRef<HTMLTextAreaElement>(null);
  const abortRef  = useRef<AbortController | null>(null);

  useEffect(() => { localStorage.setItem(STORAGE, JSON.stringify(msgs.slice(-40))); }, [msgs]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  // Autosize textarea
  useEffect(() => {
    const ta = taRef.current; if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(140, ta.scrollHeight) + "px";
  }, [input]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError("");
    const next: Msg[] = [...msgs, { role: "user", content: trimmed, ts: Date.now() }];
    setMsgs(next);
    setInput("");
    setLoading(true);

    // Append placeholder assistant for streaming
    setMsgs(m => [...m, { role: "assistant", content: "", ts: Date.now() }]);

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

  function stop() {
    abortRef.current?.abort();
    setLoading(false);
  }

  function clearChat() {
    if (msgs.length && !confirm("Clear this conversation?")) return;
    setMsgs([]); setError(""); localStorage.removeItem(STORAGE);
  }

  // Render bubble content. Show typing dots if it's the streaming assistant placeholder with no content yet.
  const renderBubbleContent = (m: Msg, isLastAssistantStreaming: boolean) => {
    if (m.role === "assistant" && isLastAssistantStreaming && !m.content) {
      return (
        <div className="ai-typing" aria-label="Red Rose AI is typing">
          <span /><span /><span />
        </div>
      );
    }
    return <MathText text={m.content} block />;
  };

  return (
    <div className="ai-shell">
      {!embedded && <Header showBack backTo={onBack ? "#" : "/"} onBack={onBack} />}

      {/* Polished chat header */}
      <div className="ai-header">
        <div className="ai-avatar">🌹</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ai-title">Red Rose 🥀 AI</div>
          <div className="ai-subtitle">
            <span className="ai-status-dot" />
            <span>Online · Bangla + English · Math · Chemistry</span>
          </div>
        </div>
        {msgs.length > 0 && (
          <button onClick={clearChat} className="ai-header-btn" title="Clear conversation">
            ↺ Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="ai-messages">
        {msgs.length === 0 && (
          <div className="ai-welcome">
            <div className="ai-welcome-emoji">🌹🤖</div>
            <div className="ai-welcome-title">How can I help you today?</div>
            <div className="ai-welcome-sub">
              Ask me anything about your studies — math, chemistry, physics, biology, English. Bangla or English, your choice. I support equations, chemistry, and rich formatting.
            </div>
            <div className="ai-suggestions">
              {SUGGESTIONS.map(s => (
                <button key={s.text} onClick={() => send(s.text)} className="ai-suggest-chip">
                  <span className="ai-suggest-chip-emoji">{s.emoji}</span>
                  <span>{s.text.replace(/\$[^$]+\$/g, "…")}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) => {
          const isLast = i === msgs.length - 1;
          const isLastAssistantStreaming = isLast && loading && m.role === "assistant";
          const isUser = m.role === "user";
          return (
            <div key={i} className={`ai-row ${isUser ? "user" : "bot"}`}>
              {!isUser && <div className="ai-bubble-avatar">🌹</div>}
              <div className={`ai-bubble ${isUser ? "user user-bubble" : "bot"}`}>
                {renderBubbleContent(m, isLastAssistantStreaming)}
                {m.ts && m.content && (
                  <div className="ai-bubble-meta">{fmtTime(m.ts)}</div>
                )}
              </div>
            </div>
          );
        })}

        {error && (
          <div className="ai-error">
            <span className="ai-error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="ai-composer"
      >
        <textarea
          ref={taRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
          }}
          placeholder="Ask anything…  (Shift + Enter = new line)"
          rows={1}
          className="ai-textarea"
        />
        {loading ? (
          <button type="button" onClick={stop} className="ai-stop-btn" title="Stop generating" aria-label="Stop">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="ai-send-btn"
            title="Send"
            aria-label="Send"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.5 12 22 3l-9 19.5-2.5-9L2.5 12z"/>
            </svg>
          </button>
        )}
      </form>
    </div>
  );
}
