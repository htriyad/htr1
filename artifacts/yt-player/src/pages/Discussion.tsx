import { useEffect, useState, useRef } from "react";
import Header from "../components/Header";

const USER_TOKEN_KEY = "rr_user_token";
const USER_NAME_KEY  = "rr_username";
function authHdr(): HeadersInit {
  const t = localStorage.getItem(USER_TOKEN_KEY) || "";
  return t ? { Authorization: `Bearer ${t}`, "Content-Type":"application/json" } : { "Content-Type":"application/json" };
}

interface Reply  { id:string; body:string; author:string; createdAt:string; isTeacher?:boolean; }
interface Post   { id:string; subject:string; title:string; body:string; author:string; createdAt:string; pinned?:boolean; replies:Reply[]; upvotes:string[]; }

function fmt(ts:string){ try{ return new Date(ts).toLocaleString("en-BD",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}); }catch{return ts;} }

export default function Discussion() {
  const [posts,   setPosts]   = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("All");
  const [view,    setView]    = useState<"list"|"new"|Post>("list");
  const [subs,    setSubs]    = useState<string[]>([]);

  const load = () => {
    fetch("/api/discussions", { headers: authHdr() })
      .then(r => r.ok ? r.json() : [])
      .then(d => {
        if (Array.isArray(d)) {
          setPosts(d);
          const s = Array.from(new Set(d.map((p:Post) => p.subject).filter(Boolean)));
          setSubs(s as string[]);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const shown = subject==="All" ? posts : posts.filter(p=>p.subject===subject);
  const pinned = shown.filter(p=>p.pinned);
  const regular = shown.filter(p=>!p.pinned);
  const ordered = [...pinned, ...regular];

  if (typeof view === "object") {
    return <PostDetail post={view} onBack={() => { load(); setView("list"); }} />;
  }

  if (view === "new") {
    return <NewPost onDone={() => { load(); setView("list"); }} onBack={() => setView("list")} />;
  }

  return (
    <div style={{ minHeight:"100svh", background:"var(--bg)" }}>
      <Header showBack backTo="/" />
      <div style={{ padding:"16px 14px", maxWidth:640, margin:"0 auto" }}>
        {/* Hero */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:900, color:"var(--purple)", fontFamily:"Lato,sans-serif", margin:0 }}>💬 Discussion Board</h1>
            <p style={{ fontSize:12, color:"var(--sub)", marginTop:2 }}>Ask questions, share knowledge with students</p>
          </div>
          <button onClick={() => setView("new")}
            style={{ padding:"9px 16px", borderRadius:12, border:"none", background:"var(--purple)", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            + Post
          </button>
        </div>

        {/* Subject filter */}
        <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4, marginBottom:16 }}>
          {["All",...subs].map(s => (
            <button key={s} onClick={() => setSubject(s)}
              style={{ flexShrink:0, padding:"6px 14px", borderRadius:20, border:"none", cursor:"pointer", fontSize:12, fontWeight:700,
                background: subject===s?"var(--purple)":"var(--surface)",
                color: subject===s?"#fff":"var(--text)" }}>
              {s}
            </button>
          ))}
        </div>

        {loading && <div style={{textAlign:"center",padding:40,color:"var(--sub)"}}>Loading…</div>}

        {!loading && ordered.length === 0 && (
          <div style={{textAlign:"center",padding:48}}>
            <div style={{fontSize:48,marginBottom:12}}>💬</div>
            <div style={{color:"var(--sub)",fontSize:14}}>No discussions yet.<br/>Start the first one!</div>
            <button onClick={() => setView("new")}
              style={{marginTop:16,padding:"10px 24px",borderRadius:10,border:"none",background:"var(--purple)",color:"#fff",fontWeight:700,cursor:"pointer"}}>
              Start Discussion
            </button>
          </div>
        )}

        {ordered.map(post => (
          <button key={post.id} onClick={() => setView(post)}
            style={{ width:"100%", textAlign:"left", background:"var(--surface)", borderRadius:14, marginBottom:10,
              padding:"14px 16px", border:post.pinned?"2px solid var(--purple)":"none", cursor:"pointer",
              boxShadow:"0 2px 8px rgba(0,0,0,0.07)" }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6 }}>
                  {post.pinned && <span style={{fontSize:10,background:"#ede9fe",color:"var(--purple)",padding:"1px 8px",borderRadius:20,fontWeight:700}}>📌 Pinned</span>}
                  {post.subject && <span style={{fontSize:10,background:"var(--bg)",color:"var(--sub)",padding:"1px 8px",borderRadius:20}}>{post.subject}</span>}
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:"var(--text)", marginBottom:4, lineHeight:1.4 }}>{post.title}</div>
                <div style={{ fontSize:12, color:"var(--sub)", lineHeight:1.5, marginBottom:6 }}>
                  {post.body.length > 100 ? post.body.slice(0,100)+"…" : post.body}
                </div>
                <div style={{ display:"flex", gap:12, fontSize:11, color:"var(--sub)" }}>
                  <span>👤 {post.author}</span>
                  <span>💬 {post.replies.length} replies</span>
                  <span>❤️ {post.upvotes.length}</span>
                  <span>{fmt(post.createdAt)}</span>
                </div>
              </div>
              <span style={{color:"var(--sub)",fontSize:14,flexShrink:0}}>›</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PostDetail({ post, onBack }: { post: Post; onBack: () => void }) {
  const [replies, setReplies] = useState<Reply[]>(post.replies);
  const [reply,   setReply]   = useState("");
  const [sending, setSending] = useState(false);
  const [upvotes, setUpvotes] = useState(post.upvotes.length);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    const r = await fetch(`/api/discussions/${post.id}/reply`, {
      method:"POST", headers: authHdr(),
      body: JSON.stringify({ body: reply }),
    });
    if (r.ok) {
      const d = await r.json();
      setReplies(prev => [...prev, d]);
      setReply("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:"smooth" }), 100);
    }
    setSending(false);
  }

  async function toggleUpvote() {
    const r = await fetch(`/api/discussions/${post.id}/upvote`, { method:"PATCH", headers: authHdr() });
    if (r.ok) { const d = await r.json(); setUpvotes(d.upvotes); }
  }

  return (
    <div style={{ minHeight:"100svh", background:"var(--bg)", display:"flex", flexDirection:"column" }}>
      <Header showBack onBack={onBack} />
      <div style={{ flex:1, overflowY:"auto", padding:"16px 14px 100px", maxWidth:640, margin:"0 auto", width:"100%" }}>
        {/* Post */}
        <div style={{ background:"var(--surface)", borderRadius:16, padding:"16px", marginBottom:16, boxShadow:"0 2px 10px rgba(0,0,0,0.07)" }}>
          <div style={{ display:"flex", gap:6, marginBottom:8, flexWrap:"wrap" }}>
            {post.pinned && <span style={{fontSize:10,background:"#ede9fe",color:"var(--purple)",padding:"2px 8px",borderRadius:20,fontWeight:700}}>📌 Pinned</span>}
            {post.subject && <span style={{fontSize:10,background:"var(--bg)",color:"var(--sub)",padding:"2px 8px",borderRadius:20}}>{post.subject}</span>}
          </div>
          <h2 style={{ fontSize:17, fontWeight:800, color:"var(--text)", marginBottom:10, lineHeight:1.4 }}>{post.title}</h2>
          <div style={{ fontSize:14, color:"var(--text)", lineHeight:1.8, whiteSpace:"pre-wrap", marginBottom:14 }}>{post.body}</div>
          <div style={{ display:"flex", alignItems:"center", gap:14, borderTop:"1px solid var(--border)", paddingTop:10 }}>
            <span style={{ fontSize:12, color:"var(--sub)" }}>👤 {post.author} · {fmt(post.createdAt)}</span>
            <button onClick={toggleUpvote}
              style={{ marginLeft:"auto", padding:"5px 14px", borderRadius:20, border:"1.5px solid var(--border)", background:"transparent", cursor:"pointer", fontSize:13, color:"var(--text)", fontWeight:600 }}>
              ❤️ {upvotes}
            </button>
          </div>
        </div>

        {/* Replies */}
        <div style={{ fontSize:13, fontWeight:700, color:"var(--sub)", marginBottom:10 }}>
          {replies.length} REPLIES
        </div>
        {replies.map(r => (
          <div key={r.id} style={{
            background: r.isTeacher ? "#f0fdf4" : "var(--surface)",
            border: r.isTeacher ? "1.5px solid #bbf7d0" : "none",
            borderRadius:12, padding:"12px 14px", marginBottom:8,
            boxShadow:"0 1px 6px rgba(0,0,0,0.05)"
          }}>
            <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background: r.isTeacher?"#166534":"var(--purple)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"#fff", fontWeight:700, flexShrink:0 }}>
                {r.isTeacher ? "T" : r.author[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <span style={{ fontSize:12, fontWeight:700, color: r.isTeacher?"#166534":"var(--text)" }}>
                  {r.author}{r.isTeacher && " 👨‍🏫 Teacher"}
                </span>
                <span style={{ fontSize:11, color:"var(--sub)", marginLeft:8 }}>{fmt(r.createdAt)}</span>
              </div>
            </div>
            <div style={{ fontSize:13, color:"var(--text)", lineHeight:1.7, whiteSpace:"pre-wrap" }}>{r.body}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      <form onSubmit={submitReply} style={{ position:"sticky", bottom:0, background:"var(--surface)", borderTop:"1px solid var(--border)", padding:"10px 14px", display:"flex", gap:8 }}>
        <textarea value={reply} onChange={e=>setReply(e.target.value)} placeholder="Write a reply…" rows={1}
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submitReply(e as any);}}}
          style={{ flex:1, borderRadius:12, border:"1.5px solid var(--border)", background:"var(--bg)", color:"var(--text)", padding:"10px 12px", fontSize:13, resize:"none", fontFamily:"inherit", outline:"none" }} />
        <button type="submit" disabled={sending||!reply.trim()}
          style={{ padding:"10px 18px", borderRadius:12, border:"none", background:"var(--purple)", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", flexShrink:0 }}>
          {sending?"…":"Send"}
        </button>
      </form>
    </div>
  );
}

function NewPost({ onDone, onBack }: { onDone:()=>void; onBack:()=>void }) {
  const [form, setForm] = useState({ subject:"", title:"", body:"" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) { setMsg("Title and body are required."); return; }
    setSaving(true);
    const r = await fetch("/api/discussions", {
      method:"POST", headers: authHdr(),
      body: JSON.stringify(form),
    });
    if (r.ok) { onDone(); }
    else { const d = await r.json().catch(()=>({})); setMsg(d.error||"Failed"); setSaving(false); }
  }

  return (
    <div style={{ minHeight:"100svh", background:"var(--bg)" }}>
      <Header showBack onBack={onBack} />
      <div style={{ padding:"16px 14px", maxWidth:640, margin:"0 auto" }}>
        <h1 style={{ fontSize:18, fontWeight:900, color:"var(--purple)", fontFamily:"Lato,sans-serif", marginBottom:20 }}>Start a Discussion</h1>
        <form onSubmit={submit}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:"var(--sub)", marginBottom:5 }}>SUBJECT (optional)</div>
              <input value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="Physics, Math, Chemistry…"
                style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid var(--border)", background:"var(--bg)", color:"var(--text)", fontSize:13, fontFamily:"inherit", boxSizing:"border-box" as const }} />
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:"var(--sub)", marginBottom:5 }}>TITLE *</div>
              <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="What's your question or topic?"
                style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid var(--border)", background:"var(--bg)", color:"var(--text)", fontSize:13, fontFamily:"inherit", boxSizing:"border-box" as const }} />
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:"var(--sub)", marginBottom:5 }}>DETAILS *</div>
              <textarea value={form.body} onChange={e=>setForm({...form,body:e.target.value})} placeholder="Describe your question in detail (Bangla or English)…" rows={5}
                style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid var(--border)", background:"var(--bg)", color:"var(--text)", fontSize:13, resize:"vertical", fontFamily:"inherit", boxSizing:"border-box" as const }} />
            </div>
            {msg && <div style={{ padding:"8px 12px", borderRadius:8, background:"#fee2e2", color:"#dc2626", fontSize:13 }}>{msg}</div>}
            <button type="submit" disabled={saving}
              style={{ padding:"12px 0", borderRadius:12, border:"none", background:"var(--purple)", color:"#fff", fontWeight:800, fontSize:15, cursor:"pointer" }}>
              {saving ? "Posting…" : "📤 Post Discussion"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
