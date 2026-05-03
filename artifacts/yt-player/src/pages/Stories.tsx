import { useState, useEffect, useRef, useCallback } from "react";
import { USER_NAME_KEY } from "../App";
import Header from "../components/Header";

const ME = () => localStorage.getItem(USER_NAME_KEY) || "";
const api = (p: string, o: RequestInit = {}) =>
  fetch(p, { ...o, headers: { "Content-Type": "application/json", "x-username": ME(), ...(o.headers as any || {}) } });

const BG_COLORS = ["#1e1b4b","#0c4a6e","#064e3b","#4a0013","#292524","#1c1917","linear-gradient(135deg,#e05c8a,#7c3aed)","linear-gradient(135deg,#f59e0b,#dc2626)","linear-gradient(135deg,#0891b2,#1d4ed8)","linear-gradient(135deg,#16a34a,#0891b2)"];

export default function Stories() {
  const [stories, setStories] = useState<any[]>([]);
  const [myStories, setMyStories] = useState<any[]>([]);
  const [archived, setArchived] = useState<any[]>([]);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [viewing, setViewing] = useState<any>(null);
  const [viewIdx, setViewIdx] = useState(0);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<"feed"|"archive"|"highlights">("feed");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState("");
  const [viewersList, setViewersList] = useState(false);
  const [hlForm, setHlForm] = useState({ name: "", icon: "⭐" });
  const [addHl, setAddHl] = useState(false);

  const [draft, setDraft] = useState({ text: "", bgColor: BG_COLORS[0], image: "", textColor: "#ffffff", fontSize: 24, stickerType: "none" as "none"|"question"|"poll", stickerQ: "", pollA: "", pollB: "" });

  const imgRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [all, mine, arch, hl] = await Promise.all([
      api("/api/community/stories").then(r => r.json()).catch(() => []),
      api("/api/community/stories/mine").then(r => r.json()).catch(() => []),
      api("/api/community/stories/archive").then(r => r.json()).catch(() => []),
      api("/api/community/story-highlights").then(r => r.json()).catch(() => []),
    ]);
    const now = Date.now();
    const active = (Array.isArray(all) ? all : []).filter((s: any) => now - new Date(s.ts || s.createdAt).getTime() < 86_400_000);
    setStories(active);
    setMyStories(Array.isArray(mine) ? mine : []);
    setArchived(Array.isArray(arch) ? arch : []);
    setHighlights(Array.isArray(hl) ? hl : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(0);
    timerRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(timerRef.current!);
          nextStory();
          return 0;
        }
        return p + 2;
      });
    }, 100);
  }

  function openStory(story: any, idx = 0) {
    setViewing(story);
    setViewIdx(idx);
    setReplyText("");
    setViewersList(false);
    startTimer();
    if (story.author !== ME()) {
      api(`/api/community/stories/${story.id}/view`, { method: "POST" }).catch(() => {});
    }
  }

  function nextStory() {
    if (!viewing) return;
    const byAuthor = stories.filter(s => s.author === viewing.author);
    if (viewIdx < byAuthor.length - 1) { openStory(byAuthor[viewIdx + 1], viewIdx + 1); }
    else { setViewing(null); setProgress(0); if (timerRef.current) clearInterval(timerRef.current!); }
  }

  function prevStory() {
    if (!viewing || viewIdx === 0) return;
    const byAuthor = stories.filter(s => s.author === viewing.author);
    openStory(byAuthor[viewIdx - 1], viewIdx - 1);
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current!); }, []);

  async function sendReply() {
    if (!replyText.trim() || !viewing) return;
    await api(`/api/community/stories/${viewing.id}/reply`, { method: "POST", body: JSON.stringify({ text: replyText }) });
    setReplyText("");
  }

  async function reactStory(emoji: string) {
    if (!viewing) return;
    await api(`/api/community/stories/${viewing.id}/react`, { method: "POST", body: JSON.stringify({ emoji }) });
  }

  async function createStory() {
    if (!draft.text.trim() && !draft.image) return;
    const body: any = { text: draft.text, bgColor: draft.bgColor, image: draft.image, textColor: draft.textColor, fontSize: draft.fontSize };
    if (draft.stickerType === "question") body.sticker = { type: "question", question: draft.stickerQ };
    if (draft.stickerType === "poll") body.sticker = { type: "poll", question: draft.stickerQ, optionA: draft.pollA, optionB: draft.pollB };
    await api("/api/community/stories", { method: "POST", body: JSON.stringify(body) });
    setCreating(false);
    setDraft({ text: "", bgColor: BG_COLORS[0], image: "", textColor: "#ffffff", fontSize: 24, stickerType: "none", stickerQ: "", pollA: "", pollB: "" });
    load();
  }

  async function deleteMyStory(id: string) {
    if (!confirm("Delete this story?")) return;
    await api(`/api/community/stories/${id}`, { method: "DELETE" });
    load();
  }

  async function createHighlight() {
    if (!hlForm.name.trim()) return;
    await api("/api/community/story-highlights", { method: "POST", body: JSON.stringify(hlForm) });
    setHlForm({ name: "", icon: "⭐" });
    setAddHl(false);
    load();
  }

  async function votePoll(storyId: string, option: "A" | "B") {
    await api(`/api/community/stories/${storyId}/poll-vote`, { method: "POST", body: JSON.stringify({ option }) });
    load();
  }

  // Group stories by author
  const byAuthor: Record<string, any[]> = {};
  stories.forEach(s => { if (!byAuthor[s.author]) byAuthor[s.author] = []; byAuthor[s.author].push(s); });

  const inp: React.CSSProperties = { padding: "10px 12px", borderRadius: 9, border: "1.5px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none" };

  return (
    <div style={{ minHeight: "100svh", background: "var(--bg)", fontFamily: "Roboto,'Noto Sans Bengali',sans-serif" }}>
      <Header title="Stories" />
      <input ref={imgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
        const f = e.target.files?.[0]; if (!f) return;
        if (f.size > 2_000_000) { alert("Image too large (max 2MB)"); return; }
        const r = new FileReader(); r.onload = () => setDraft(d => ({ ...d, image: r.result as string })); r.readAsDataURL(f); e.target.value = "";
      }} />

      {/* Story viewer fullscreen */}
      {viewing && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", display: "flex", flexDirection: "column" }}>
          {/* Progress bar */}
          <div style={{ height: 3, background: "rgba(255,255,255,0.2)", position: "absolute", top: 0, left: 0, right: 0, zIndex: 2 }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "#fff", transition: "width 100ms linear" }} />
          </div>
          {/* Header */}
          <div style={{ position: "absolute", top: 8, left: 0, right: 0, zIndex: 2, display: "flex", alignItems: "center", gap: 10, padding: "8px 16px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--purple)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 15 }}>{viewing.author?.[0]?.toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>@{viewing.author}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>{new Date(viewing.ts || viewing.createdAt).toLocaleString()}</div>
            </div>
            {viewing.author === ME() && (
              <button onClick={() => setViewersList(v => !v)} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", padding: "4px 10px", borderRadius: 99, fontSize: 11, cursor: "pointer" }}>👁 {(viewing.viewers || []).length}</button>
            )}
            <button onClick={() => { setViewing(null); if (timerRef.current) clearInterval(timerRef.current!); }} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", padding: "4px 10px", borderRadius: 99, fontSize: 13, cursor: "pointer" }}>✕</button>
          </div>
          {/* Story content */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", background: viewing.image ? `url(${viewing.image}) center/cover` : viewing.bgColor || "#1e1b4b", cursor: "pointer" }}
            onClick={e => { const x = e.clientX; if (x < window.innerWidth / 2) prevStory(); else nextStory(); }}>
            {viewing.text && !viewing.image && <div style={{ color: viewing.textColor || "#fff", fontSize: viewing.fontSize || 24, fontWeight: 700, textAlign: "center", padding: 20, textShadow: "0 2px 8px rgba(0,0,0,0.5)", pointerEvents: "none" }}>{viewing.text}</div>}
            {viewing.text && viewing.image && <div style={{ position: "absolute", bottom: 80, left: 16, right: 16, color: "#fff", fontSize: 18, fontWeight: 700, textAlign: "center", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>{viewing.text}</div>}
            {/* Poll sticker */}
            {viewing.sticker?.type === "poll" && (
              <div style={{ position: "absolute", bottom: 100, left: 20, right: 20, background: "rgba(255,255,255,0.15)", borderRadius: 16, padding: 16, backdropFilter: "blur(10px)" }}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, textAlign: "center", marginBottom: 12 }}>{viewing.sticker.question}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {["A", "B"].map(opt => (
                    <button key={opt} onClick={e => { e.stopPropagation(); votePoll(viewing.id, opt as "A"|"B"); }} style={{ flex: 1, padding: "10px", border: "2px solid rgba(255,255,255,0.5)", borderRadius: 10, background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                      {opt === "A" ? viewing.sticker.optionA : viewing.sticker.optionB}
                      <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>{(viewing.sticker[`votes${opt}`] || 0)} votes</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Question sticker */}
            {viewing.sticker?.type === "question" && (
              <div style={{ position: "absolute", bottom: 110, left: 20, right: 20, background: "rgba(255,255,255,0.15)", borderRadius: 16, padding: 14, backdropFilter: "blur(10px)", textAlign: "center" }}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 8 }}>❓ {viewing.sticker.question}</div>
              </div>
            )}
          </div>
          {/* Reactions + reply */}
          <div style={{ padding: "10px 16px", background: "rgba(0,0,0,0.6)", display: "flex", gap: 8, alignItems: "center" }}>
            {["❤️","🔥","😂","😮","👏","🙏"].map(e => (
              <button key={e} onClick={() => reactStory(e)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", padding: "4px 6px", borderRadius: 8 }}>{e}</button>
            ))}
            <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Reply…" style={{ flex: 1, padding: "8px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 13, outline: "none" }} onKeyDown={e => e.key === "Enter" && sendReply()} />
            <button onClick={sendReply} style={{ background: "var(--purple)", border: "none", borderRadius: 20, padding: "8px 14px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Send</button>
          </div>
          {/* Viewers list */}
          {viewersList && viewing.author === ME() && (
            <div style={{ position: "absolute", bottom: 70, left: 16, right: 16, background: "rgba(0,0,0,0.85)", borderRadius: 14, padding: 14, maxHeight: 200, overflowY: "auto" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 8 }}>👁 Viewers ({(viewing.viewers || []).length})</div>
              {(viewing.viewers || []).map((v: string, i: number) => <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", padding: "3px 0" }}>@{v}</div>)}
            </div>
          )}
        </div>
      )}

      {/* Create story button */}
      <div style={{ padding: "12px 16px" }}>
        <button onClick={() => setCreating(true)} style={{ width: "100%", padding: "12px", borderRadius: 14, border: "2px dashed var(--border)", background: "var(--surface)", color: "var(--purple)", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          ✨ Create New Story
        </button>
      </div>

      {/* Story creator */}
      {creating && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 500, background: "var(--surface)", borderRadius: "20px 20px 0 0", padding: 20, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>✨ Create Story</h3>
              <button onClick={() => setCreating(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--sub)" }}>✕</button>
            </div>
            {/* Preview */}
            <div style={{ height: 180, borderRadius: 14, background: draft.image ? `url(${draft.image}) center/cover` : draft.bgColor, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, position: "relative", overflow: "hidden" }}>
              {draft.text && <div style={{ color: draft.textColor, fontSize: draft.fontSize, fontWeight: 700, textAlign: "center", padding: 12, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>{draft.text}</div>}
              {!draft.text && !draft.image && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Story preview</div>}
            </div>
            {/* BG colors */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {BG_COLORS.map(c => <div key={c} onClick={() => setDraft(d => ({ ...d, bgColor: c, image: "" }))} style={{ width: 32, height: 32, borderRadius: 8, background: c, border: draft.bgColor === c && !draft.image ? "3px solid var(--text)" : "2px solid transparent", cursor: "pointer" }} />)}
              <button onClick={() => imgRef.current?.click()} style={{ width: 32, height: 32, borderRadius: 8, background: "var(--bg)", border: "2px dashed var(--border)", cursor: "pointer", fontSize: 16 }}>📷</button>
            </div>
            <textarea value={draft.text} onChange={e => setDraft(d => ({ ...d, text: e.target.value }))} rows={2} placeholder="Add text to your story…" style={{ padding: "10px 12px", borderRadius: 9, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none", resize: "vertical", marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <div><label style={{ fontSize: 11, fontWeight: 700, color: "var(--sub)" }}>Text Color</label><input type="color" value={draft.textColor} onChange={e => setDraft(d => ({ ...d, textColor: e.target.value }))} style={{ display: "block", width: 36, height: 30, borderRadius: 6, border: "none", cursor: "pointer" }} /></div>
              <div style={{ flex: 1 }}><label style={{ fontSize: 11, fontWeight: 700, color: "var(--sub)" }}>Font Size</label><input type="range" min={14} max={42} value={draft.fontSize} onChange={e => setDraft(d => ({ ...d, fontSize: parseInt(e.target.value) }))} style={{ width: "100%" }} /></div>
            </div>
            {/* Sticker */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--sub)", textTransform: "uppercase" }}>Add Sticker</label>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                {(["none","question","poll"] as const).map(t => <button key={t} onClick={() => setDraft(d => ({ ...d, stickerType: t }))} style={{ padding: "6px 14px", borderRadius: 20, border: `2px solid ${draft.stickerType === t ? "var(--purple)" : "var(--border)"}`, background: draft.stickerType === t ? "rgba(124,58,237,0.1)" : "var(--bg)", color: "var(--text)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>{t === "none" ? "None" : t === "question" ? "❓ Question" : "📊 Poll"}</button>)}
              </div>
              {draft.stickerType !== "none" && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  <input value={draft.stickerQ} onChange={e => setDraft(d => ({ ...d, stickerQ: e.target.value }))} placeholder={draft.stickerType === "question" ? "Ask your audience…" : "Poll question…"} style={{ padding: "9px 12px", borderRadius: 9, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, outline: "none" }} />
                  {draft.stickerType === "poll" && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input value={draft.pollA} onChange={e => setDraft(d => ({ ...d, pollA: e.target.value }))} placeholder="Option A" style={{ flex: 1, padding: "9px 12px", borderRadius: 9, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, outline: "none" }} />
                      <input value={draft.pollB} onChange={e => setDraft(d => ({ ...d, pollB: e.target.value }))} placeholder="Option B" style={{ flex: 1, padding: "9px 12px", borderRadius: 9, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, outline: "none" }} />
                    </div>
                  )}
                </div>
              )}
            </div>
            <button onClick={createStory} disabled={!draft.text.trim() && !draft.image} style={{ width: "100%", padding: 13, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#e05c8a,#7c3aed)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Share Story ✨</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 16px" }}>
        {([["feed","🔔 Feed"],["archive","📦 Archive"],["highlights","⭐ Highlights"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: "11px 4px", border: "none", background: "none", fontWeight: tab === id ? 700 : 500, color: tab === id ? "var(--purple)" : "var(--sub)", fontSize: 12, cursor: "pointer", borderBottom: tab === id ? "2px solid var(--purple)" : "2px solid transparent" }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: "16px" }}>
        {tab === "feed" && (
          <>
            {loading && <div style={{ textAlign: "center", padding: 40, color: "var(--sub)" }}>Loading stories…</div>}
            {/* Story rings row */}
            {!loading && Object.keys(byAuthor).length > 0 && (
              <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 12, marginBottom: 16 }}>
                {Object.entries(byAuthor).map(([author, authorStories]) => (
                  <div key={author} onClick={() => openStory(authorStories[0], 0)} style={{ flexShrink: 0, textAlign: "center", cursor: "pointer" }}>
                    <div style={{ width: 64, height: 64, borderRadius: "50%", padding: 3, background: "linear-gradient(135deg,#e05c8a,#7c3aed)", boxSizing: "border-box" }}>
                      <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--bg)" }}>
                        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--purple)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 20 }}>{author[0]?.toUpperCase()}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text)", marginTop: 4, fontWeight: 600, maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{author === ME() ? "You" : "@" + author}</div>
                    <div style={{ fontSize: 9, color: "var(--sub)" }}>{authorStories.length} {authorStories.length === 1 ? "story" : "stories"}</div>
                  </div>
                ))}
              </div>
            )}
            {!loading && Object.keys(byAuthor).length === 0 && <div style={{ textAlign: "center", padding: "32px 0", color: "var(--sub)" }}><div style={{ fontSize: 36 }}>✨</div><p style={{ marginTop: 10 }}>No stories yet. Be the first!</p></div>}
          </>
        )}

        {tab === "archive" && (
          <>
            {archived.length === 0 && <div style={{ textAlign: "center", padding: "32px 0", color: "var(--sub)" }}><div style={{ fontSize: 36 }}>📦</div><p style={{ marginTop: 10 }}>No archived stories</p></div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {archived.map((s: any) => (
                <div key={s.id} style={{ borderRadius: 12, background: s.bgColor || "#1e1b4b", aspectRatio: "9/16", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 10, cursor: "pointer", position: "relative", overflow: "hidden" }}
                  onClick={() => openStory(s)}>
                  {s.image && <div style={{ position: "absolute", inset: 0, background: `url(${s.image}) center/cover` }} />}
                  {s.text && <div style={{ position: "relative", color: s.textColor || "#fff", fontSize: 14, fontWeight: 700, textAlign: "center", textShadow: "0 2px 6px rgba(0,0,0,0.5)" }}>{s.text.slice(0, 60)}</div>}
                  <div style={{ position: "absolute", bottom: 6, right: 6 }}>
                    <button onClick={e => { e.stopPropagation(); deleteMyStory(s.id); }} style={{ background: "rgba(220,38,38,0.8)", border: "none", color: "#fff", borderRadius: 20, padding: "3px 8px", fontSize: 10, cursor: "pointer" }}>🗑️</button>
                  </div>
                  <div style={{ position: "absolute", bottom: 4, left: 6, fontSize: 9, color: "rgba(255,255,255,0.7)" }}>{new Date(s.ts || s.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "highlights" && (
          <>
            <button onClick={() => setAddHl(true)} style={{ width: "100%", padding: 11, borderRadius: 12, border: "2px dashed var(--border)", background: "var(--surface)", color: "var(--purple)", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 16 }}>+ Create Highlight</button>
            {addHl && (
              <div style={{ background: "var(--surface)", borderRadius: 14, padding: 16, marginBottom: 16, border: "1px solid var(--border)" }}>
                <input value={hlForm.name} onChange={e => setHlForm(f => ({ ...f, name: e.target.value }))} placeholder="Highlight name (e.g. Vacation, Study)" style={{ padding: "9px 12px", borderRadius: 9, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none", marginBottom: 8 }} />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {["⭐","📚","🏆","🎉","✈️","🎨","💪","❤️","🔥","😂"].map(ic => <span key={ic} onClick={() => setHlForm(f => ({ ...f, icon: ic }))} style={{ fontSize: 22, cursor: "pointer", padding: "4px", borderRadius: 8, background: hlForm.icon === ic ? "rgba(124,58,237,0.2)" : "transparent" }}>{ic}</span>)}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={createHighlight} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "none", background: "var(--purple)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Create</button>
                  <button onClick={() => setAddHl(false)} style={{ padding: "9px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "none", color: "var(--sub)", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}
            {highlights.length === 0 && <div style={{ textAlign: "center", padding: "32px 0", color: "var(--sub)" }}><div style={{ fontSize: 36 }}>⭐</div><p style={{ marginTop: 10 }}>No highlights yet</p></div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {highlights.map((h: any) => (
                <div key={h.id} style={{ textAlign: "center", cursor: "pointer" }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#e05c8a,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", fontSize: 26 }}>{h.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", marginTop: 4 }}>{h.name}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
