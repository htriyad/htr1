import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import Header from "../components/Header";
import { RoleBadge } from "./ModPanel";
import { getModToken, getModUsername, modHeaders } from "./ModLogin";

const UN = () => localStorage.getItem("rr_username") || "guest";
const xhdr = () => ({ "Content-Type": "application/json", "x-username": UN() });
function timeAgo(ts: string) {
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  if (d < 60) return "Just now";
  if (d < 3600) return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
}
function avatarColor(u: string) {
  const palette = ["#7c3aed","#0ea5e9","#f59e0b","#ef4444","#10b981","#6366f1","#ec4899","#14b8a6","#f97316","#8b5cf6"];
  let n = 0; for (const c of u) n += c.charCodeAt(0); return palette[n % palette.length];
}
function Avatar({ u, size = 36 }: { u: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size / 2.8, background: avatarColor(u),
      display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.42,fontWeight:900,color:"#fff",flexShrink:0 }}>
      {u[0]?.toUpperCase()}
    </div>
  );
}
function ytId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    return u.searchParams.get("v");
  } catch { return null; }
}

const REACTIONS = [
  { emoji:"👍", label:"Like" },{ emoji:"❤️", label:"Love" },
  { emoji:"😂", label:"Haha" },{ emoji:"😮", label:"Wow" },
  { emoji:"😢", label:"Sad" },{ emoji:"😡", label:"Angry" },
];
const BG_COLORS = [
  "linear-gradient(135deg,#7c3aed,#a855f7)","linear-gradient(135deg,#0ea5e9,#38bdf8)",
  "linear-gradient(135deg,#f59e0b,#fbbf24)","linear-gradient(135deg,#ef4444,#f97316)",
  "linear-gradient(135deg,#10b981,#34d399)","linear-gradient(135deg,#ec4899,#f43f5e)",
  "linear-gradient(135deg,#1e3a5f,#2563eb)","linear-gradient(135deg,#1a1a2e,#6c7fff)",
];
const SUBJECTS = ["General","Physics","Chemistry","Biology","Math","English","Bangla","ICT","BCS","Admission"];

/* ── interfaces ─────────────────────────────────────────── */
interface Comment { id:string; author:string; text:string; createdAt:string; reactions:Record<string,string[]>; }
interface Post {
  id:string; author:string; text:string;
  imageData?:string; videoUrl?:string; subject?:string;
  createdAt:string;
  reactions:Record<string,string[]>;
  comments:Comment[];
}
interface Story { id:string; author:string; text?:string; imageData?:string; bgColor:string; createdAt:string; expiresAt:string; views:string[]; }

/* ══════════════════════════════════════════════════════════
   STORY VIEWER
══════════════════════════════════════════════════════════ */
function StoryViewer({ stories, startIdx, onClose, me }: { stories:Story[]; startIdx:number; onClose:()=>void; me:string }) {
  const [idx, setIdx] = useState(startIdx);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const s = stories[idx];
    if (!s) return;
    fetch(`/api/community/stories/${s.id}/view`, { method:"POST", headers: xhdr() }).catch(()=>{});
    setProgress(0);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / 5000) * 100);
      setProgress(pct);
      if (pct >= 100) { if (idx < stories.length - 1) setIdx(i => i + 1); else onClose(); }
    }, 50);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [idx, stories.length]);

  const s = stories[idx];
  if (!s) return null;

  return (
    <div style={{ position:"fixed",inset:0,zIndex:9000,background:"#000",display:"flex",alignItems:"center",justifyContent:"center" }}
      onClick={onClose}>
      <div style={{ position:"relative",width:"min(420px,100vw)",height:"100svh",overflow:"hidden" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ position:"absolute",inset:0,background:s.imageData?"#000":s.bgColor }}>
          {s.imageData && <img src={s.imageData} alt="" style={{ width:"100%",height:"100%",objectFit:"cover",opacity:0.95 }}/>}
        </div>
        <div style={{ position:"absolute",top:12,left:12,right:12,display:"flex",gap:4,zIndex:10 }}>
          {stories.map((_,i) => (
            <div key={i} style={{ flex:1,height:3,borderRadius:2,background:"rgba(255,255,255,0.3)",overflow:"hidden" }}>
              <div style={{ height:"100%",background:"#fff",borderRadius:2,
                width: i < idx ? "100%" : i === idx ? `${progress}%` : "0%" }}/>
            </div>
          ))}
        </div>
        <div style={{ position:"absolute",top:28,left:16,right:50,zIndex:10,display:"flex",alignItems:"center",gap:10 }}>
          <Avatar u={s.author} size={38}/>
          <div>
            <div style={{ color:"#fff",fontWeight:800,fontSize:14,textShadow:"0 1px 4px rgba(0,0,0,0.5)" }}>{s.author}</div>
            <div style={{ color:"rgba(255,255,255,0.75)",fontSize:11 }}>{timeAgo(s.createdAt)}</div>
          </div>
        </div>
        <button onClick={onClose} style={{ position:"absolute",top:28,right:16,zIndex:10,background:"rgba(0,0,0,0.4)",border:"none",color:"#fff",width:34,height:34,borderRadius:"50%",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
        {s.text && (
          <div style={{ position:"absolute",bottom:60,left:16,right:16,zIndex:10,textAlign:"center" }}>
            <div style={{ color:"#fff",fontSize:22,fontWeight:800,textShadow:"0 2px 8px rgba(0,0,0,0.6)",lineHeight:1.4 }}>{s.text}</div>
          </div>
        )}
        <div style={{ position:"absolute",bottom:20,left:16,zIndex:10,color:"rgba(255,255,255,0.75)",fontSize:12 }}>
          👁 {s.views.length} views
        </div>
        <div style={{ position:"absolute",left:0,top:0,width:"40%",height:"100%",zIndex:5 }}
          onClick={() => { if (idx > 0) setIdx(i => i - 1); else onClose(); }}/>
        <div style={{ position:"absolute",right:0,top:0,width:"40%",height:"100%",zIndex:5 }}
          onClick={() => { if (idx < stories.length - 1) setIdx(i => i + 1); else onClose(); }}/>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   STORIES BAR
══════════════════════════════════════════════════════════ */
function StoriesBar({ stories, me, onNew, onReload }: { stories:Story[]; me:string; onNew:()=>void; onReload:()=>void }) {
  const [viewer, setViewer] = useState<{open:boolean;idx:number}>({open:false,idx:0});
  const authorMap = new Map<string, Story>();
  for (const s of stories) { if (!authorMap.has(s.author)) authorMap.set(s.author, s); }
  const grouped = Array.from(authorMap.values());

  function openStory(author: string) {
    const idx = grouped.findIndex(s => s.author === author);
    if (idx >= 0) setViewer({open:true, idx});
  }

  return (
    <>
      <div style={{ display:"flex",gap:12,overflowX:"auto",padding:"4px 16px 4px",scrollbarWidth:"none" }}>
        <button onClick={onNew}
          style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:4,flexShrink:0,background:"none",border:"none",cursor:"pointer" }}>
          <div style={{ width:64,height:64,borderRadius:20,background:"var(--surface)",border:"2px dashed var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,position:"relative" }}>
            <div style={{ fontSize:22 }}>+</div>
            <div style={{ position:"absolute",bottom:-2,right:-2,width:22,height:22,borderRadius:"50%",background:"var(--purple)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:14,fontWeight:900 }}>+</div>
          </div>
          <span style={{ fontSize:10,fontWeight:700,color:"var(--sub)",whiteSpace:"nowrap" }}>Add Story</span>
        </button>
        {grouped.map(s => {
          const hasViewed = s.views.includes(me);
          const isMe = s.author === me;
          return (
            <button key={s.id} onClick={() => openStory(s.author)}
              style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:4,flexShrink:0,background:"none",border:"none",cursor:"pointer" }}>
              <div style={{ width:64,height:64,borderRadius:20,background:s.bgColor,border:`3px solid ${hasViewed?"var(--border)":"var(--purple)"}`,overflow:"hidden",position:"relative",flexShrink:0 }}>
                {s.imageData ? <img src={s.imageData} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> :
                  <div style={{ width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:900,color:"#fff" }}>{s.author[0]?.toUpperCase()}</div>}
                {isMe && <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.15)" }}/>}
              </div>
              <span style={{ fontSize:10,fontWeight:700,color:"var(--text)",maxWidth:64,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                {isMe ? "Your Story" : s.author}
              </span>
            </button>
          );
        })}
      </div>
      {viewer.open && (
        <StoryViewer stories={grouped} startIdx={viewer.idx} me={me}
          onClose={() => { setViewer({open:false,idx:0}); onReload(); }}/>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   CREATE STORY MODAL
══════════════════════════════════════════════════════════ */
function CreateStoryModal({ onClose, onDone }: { onClose:()=>void; onDone:()=>void }) {
  const [text, setText] = useState("");
  const [bg, setBg] = useState(BG_COLORS[0]);
  const [imageData, setImageData] = useState<string|null>(null);
  const [sending, setSending] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);

  function onImg(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 5_000_000) { alert("Image too large (5MB max)"); return; }
    const r = new FileReader(); r.onload = () => setImageData(r.result as string); r.readAsDataURL(f); e.target.value = "";
  }

  async function create() {
    if (!text.trim() && !imageData) return;
    setSending(true);
    await fetch("/api/community/stories", { method:"POST", headers: xhdr(),
      body: JSON.stringify({ text: text || undefined, imageData: imageData || undefined, bgColor: bg }) });
    setSending(false); onDone(); onClose();
  }

  return (
    <div style={{ position:"fixed",inset:0,zIndex:8000,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",justifyContent:"center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width:"100%",maxWidth:480,background:"var(--surface)",borderRadius:"24px 24px 0 0",padding:"20px 20px 32px" }}>
        <div style={{ width:40,height:4,borderRadius:2,background:"var(--border)",margin:"0 auto 18px" }}/>
        <div style={{ fontSize:16,fontWeight:800,color:"var(--text)",marginBottom:14 }}>Create Story</div>
        <div style={{ width:"100%",height:200,borderRadius:16,background:imageData?"#000":bg,overflow:"hidden",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center",position:"relative" }}>
          {imageData && <img src={imageData} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>}
          {text && <div style={{ position:"absolute",fontSize:20,fontWeight:800,color:"#fff",textAlign:"center",padding:"0 20px",textShadow:"0 2px 8px rgba(0,0,0,0.6)" }}>{text}</div>}
        </div>
        {!imageData && (
          <div style={{ display:"flex",gap:8,marginBottom:12,overflowX:"auto" }}>
            {BG_COLORS.map(c => (
              <button key={c} onClick={() => setBg(c)}
                style={{ width:36,height:36,borderRadius:10,background:c,border:bg===c?"3px solid var(--purple)":"3px solid transparent",flexShrink:0,cursor:"pointer" }}/>
            ))}
          </div>
        )}
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Add text to your story…"
          style={{ width:"100%",padding:"10px 14px",borderRadius:12,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:14,fontFamily:"inherit",boxSizing:"border-box",marginBottom:10 }}/>
        <input ref={imgRef} type="file" accept="image/*" style={{ display:"none" }} onChange={onImg}/>
        <div style={{ display:"flex",gap:10,marginBottom:14 }}>
          <button onClick={() => imgRef.current?.click()}
            style={{ flex:1,padding:"10px",borderRadius:12,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontWeight:700,fontSize:13,cursor:"pointer" }}>
            📷 Add Photo
          </button>
          {imageData && <button onClick={() => setImageData(null)}
            style={{ padding:"10px 14px",borderRadius:12,border:"none",background:"#fee2e2",color:"#dc2626",fontWeight:700,fontSize:13,cursor:"pointer" }}>✕</button>}
        </div>
        <button onClick={create} disabled={sending || (!text.trim() && !imageData)}
          style={{ width:"100%",padding:"13px",borderRadius:14,border:"none",background:"var(--purple)",color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer" }}>
          {sending ? "Sharing…" : "Share Story ✨"}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   REPORT MODAL
══════════════════════════════════════════════════════════ */
function ReportModal({ postId, onClose }: { postId:string; onClose:()=>void }) {
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const REASONS = ["Spam or irrelevant","Hate speech or bullying","Misinformation","Inappropriate content","Cheating / answer sharing","Other"];

  async function submit(r: string) {
    await fetch(`/api/community/posts/${postId}/report`, { method:"POST", headers:xhdr(), body:JSON.stringify({ reason:r }) });
    setDone(true); setTimeout(onClose, 1500);
  }

  return (
    <div style={{ position:"fixed",inset:0,zIndex:7000,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"flex-end",justifyContent:"center" }}
      onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ width:"100%",maxWidth:480,background:"var(--surface)",borderRadius:"24px 24px 0 0",padding:"20px 20px 32px" }}>
        <div style={{ width:40,height:4,borderRadius:2,background:"var(--border)",margin:"0 auto 16px" }}/>
        {done ? (
          <div style={{ textAlign:"center",padding:"16px 0" }}>
            <div style={{ fontSize:40,marginBottom:8 }}>✅</div>
            <div style={{ fontSize:15,fontWeight:800,color:"var(--text)" }}>Report submitted</div>
            <div style={{ fontSize:13,color:"var(--sub)",marginTop:4 }}>Moderators will review this post</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize:15,fontWeight:800,color:"var(--text)",marginBottom:4 }}>Report Post</div>
            <div style={{ fontSize:12,color:"var(--sub)",marginBottom:14 }}>Why are you reporting this post?</div>
            {REASONS.map(r => (
              <button key={r} onClick={() => submit(r)}
                style={{ width:"100%",textAlign:"left",padding:"12px 16px",borderRadius:12,border:"1px solid var(--border)",background:"transparent",color:"var(--text)",fontSize:13,cursor:"pointer",marginBottom:8,fontFamily:"inherit",fontWeight:600 }}>
                {r}
              </button>
            ))}
            {reason === "Other" && (
              <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Describe the issue…"
                style={{ width:"100%",padding:"10px 14px",borderRadius:12,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13,fontFamily:"inherit",boxSizing:"border-box",marginBottom:10 }}/>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   CREATE POST
══════════════════════════════════════════════════════════ */
function CreatePost({ me, onDone }: { me:string; onDone:(p:Post)=>void }) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [subject, setSubject] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [imageData, setImageData] = useState<string|null>(null);
  const [sending, setSending] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);

  function onImg(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 5_000_000) { alert("Image too large (5MB max)"); return; }
    const r = new FileReader(); r.onload = () => setImageData(r.result as string); r.readAsDataURL(f); e.target.value = "";
  }

  async function post() {
    if (!text.trim() && !imageData && !videoUrl.trim()) return;
    setSending(true);
    const r = await fetch("/api/community/posts", { method:"POST", headers: xhdr(),
      body: JSON.stringify({ text, imageData: imageData||undefined, videoUrl: videoUrl||undefined, subject: subject||undefined }) });
    const d: Post = await r.json();
    setSending(false); setText(""); setImageData(null); setVideoUrl(""); setSubject(""); setExpanded(false);
    onDone(d);
  }

  return (
    <div style={{ background:"var(--surface)",borderRadius:18,padding:"14px 16px",marginBottom:12,border:"1.5px solid var(--border)" }}>
      <input ref={imgRef} type="file" accept="image/*" style={{ display:"none" }} onChange={onImg}/>
      <div style={{ display:"flex",gap:12,alignItems:"center" }} onClick={() => setExpanded(true)}>
        <Avatar u={me} size={40}/>
        <div style={{ flex:1,padding:"10px 16px",borderRadius:24,background:"var(--bg)",border:"1.5px solid var(--border)",color:"var(--sub)",fontSize:14,cursor:"text",userSelect:"none" }}>
          What's on your mind, {me}?
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop:12 }}>
          <textarea value={text} onChange={e => setText(e.target.value)} autoFocus
            placeholder={`What's on your mind, ${me}?`} rows={3}
            style={{ width:"100%",borderRadius:12,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",padding:"10px 14px",fontSize:15,resize:"none",boxSizing:"border-box",fontFamily:"inherit",lineHeight:1.5 }}/>
          {imageData && (
            <div style={{ position:"relative",marginTop:8,display:"inline-block" }}>
              <img src={imageData} alt="" style={{ maxWidth:"100%",maxHeight:300,borderRadius:12,border:"1.5px solid var(--border)",display:"block" }}/>
              <button onClick={() => setImageData(null)} style={{ position:"absolute",top:6,right:6,width:26,height:26,borderRadius:"50%",border:"none",background:"rgba(0,0,0,0.6)",color:"#fff",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
            </div>
          )}
          {videoUrl && ytId(videoUrl) && (
            <div style={{ marginTop:8,borderRadius:12,overflow:"hidden",position:"relative" }}>
              <iframe src={`https://www.youtube.com/embed/${ytId(videoUrl)}`} style={{ width:"100%",height:200,border:"none" }} allowFullScreen title="video"/>
              <button onClick={() => setVideoUrl("")} style={{ position:"absolute",top:6,right:6,width:26,height:26,borderRadius:"50%",border:"none",background:"rgba(0,0,0,0.6)",color:"#fff",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
            </div>
          )}
          <div style={{ display:"flex",gap:6,marginTop:10,flexWrap:"wrap" }}>
            {SUBJECTS.map(s => (
              <button key={s} type="button" onClick={() => setSubject(s === subject ? "" : s)}
                style={{ padding:"4px 10px",borderRadius:20,border:`1.5px solid ${s===subject?"var(--purple)":"var(--border)"}`,background:s===subject?"rgba(108,127,255,0.12)":"transparent",color:s===subject?"var(--purple)":"var(--sub)",fontSize:11,fontWeight:700,cursor:"pointer" }}>
                {s}
              </button>
            ))}
          </div>
          <div style={{ display:"flex",gap:8,marginTop:12,alignItems:"center" }}>
            <button onClick={() => imgRef.current?.click()} style={{ padding:"8px 14px",borderRadius:10,border:"1.5px solid var(--border)",background:"transparent",color:"var(--text)",cursor:"pointer",fontSize:14,fontWeight:700 }}>📷</button>
            <button onClick={() => { const u=prompt("YouTube URL:"); if(u) setVideoUrl(u); }} style={{ padding:"8px 14px",borderRadius:10,border:"1.5px solid var(--border)",background:"transparent",color:"var(--text)",cursor:"pointer",fontSize:14,fontWeight:700 }}>▶️</button>
            <button onClick={() => { setExpanded(false); setText(""); setImageData(null); setVideoUrl(""); }} style={{ padding:"8px 14px",borderRadius:10,border:"none",background:"var(--bg)",color:"var(--sub)",cursor:"pointer",fontSize:13,fontWeight:700 }}>Cancel</button>
            <button onClick={post} disabled={sending || (!text.trim() && !imageData && !videoUrl.trim())}
              style={{ marginLeft:"auto",padding:"9px 22px",borderRadius:12,border:"none",background:sending?"#a78bfa":"var(--purple)",color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer" }}>
              {sending ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      )}
      {!expanded && (
        <div style={{ display:"flex",gap:8,marginTop:12,borderTop:"1px solid var(--border)",paddingTop:10 }}>
          <button onClick={() => { setExpanded(true); setTimeout(()=>imgRef.current?.click(),100); }} style={{ flex:1,padding:"7px",borderRadius:10,border:"none",background:"transparent",color:"var(--sub)",cursor:"pointer",fontSize:12,fontWeight:700 }}>📷 Photo</button>
          <button onClick={() => setExpanded(true)} style={{ flex:1,padding:"7px",borderRadius:10,border:"none",background:"transparent",color:"var(--sub)",cursor:"pointer",fontSize:12,fontWeight:700 }}>▶️ Video</button>
          <button onClick={() => setExpanded(true)} style={{ flex:1,padding:"7px",borderRadius:10,border:"none",background:"transparent",color:"var(--sub)",cursor:"pointer",fontSize:12,fontWeight:700 }}>✍️ Write</button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   REACTION PICKER
══════════════════════════════════════════════════════════ */
function ReactionPicker({ onPick, onClose }: { onPick:(e:string)=>void; onClose:()=>void }) {
  return (
    <div style={{ position:"absolute",bottom:"calc(100% + 8px)",left:0,zIndex:200,background:"var(--surface)",borderRadius:40,padding:"8px 12px",boxShadow:"0 8px 32px rgba(0,0,0,0.25)",border:"1px solid var(--border)",display:"flex",gap:4 }}
      onMouseLeave={onClose}>
      {REACTIONS.map(r => (
        <button key={r.emoji} onClick={() => { onPick(r.emoji); onClose(); }} title={r.label}
          style={{ background:"none",border:"none",fontSize:26,cursor:"pointer",padding:"2px 4px",borderRadius:8,transition:"transform 200ms" }}
          onMouseEnter={e => (e.currentTarget.style.transform="scale(1.35) translateY(-4px)")}
          onMouseLeave={e => (e.currentTarget.style.transform="")}>
          {r.emoji}
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   POST CARD
══════════════════════════════════════════════════════════ */
interface PostCardProps {
  post: Post; me: string;
  roles: Record<string,string>;
  pins: string[];
  announces: string[];
  isMod: boolean;
  onDelete: (id:string)=>void;
  onUpdate: (p:Post)=>void;
  onPin: (id:string)=>void;
}

function PostCard({ post, me, roles, pins, announces, isMod, onDelete, onUpdate, onPin }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isPinned = pins.includes(post.id);
  const isAnn    = announces.includes(post.id);
  const myReaction = REACTIONS.find(r => post.reactions[r.emoji]?.includes(me))?.emoji;
  const totalReactions = Object.values(post.reactions).reduce((sum, arr) => sum + arr.length, 0);
  const topReactions = REACTIONS.filter(r => (post.reactions[r.emoji]||[]).length > 0)
    .sort((a,b) => (post.reactions[b.emoji]||[]).length - (post.reactions[a.emoji]||[]).length).slice(0, 3);

  useEffect(() => {
    if (!showMenu) return;
    function h(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showMenu]);

  async function react(emoji: string) {
    const r = await fetch(`/api/community/posts/${post.id}/react`, { method:"POST", headers: xhdr(), body: JSON.stringify({ emoji }) });
    onUpdate({ ...post, reactions: await r.json() });
  }
  async function comment() {
    if (!commentText.trim() || sending) return;
    setSending(true);
    const r = await fetch(`/api/community/posts/${post.id}/comments`, { method:"POST", headers: xhdr(), body: JSON.stringify({ text: commentText }) });
    const c = await r.json();
    setSending(false); setCommentText(""); onUpdate({ ...post, comments: [...post.comments, c] });
  }
  function copy() {
    navigator.clipboard.writeText(`${window.location.origin}/community#${post.id}`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }
  async function modDelete() {
    if (!confirm("Delete this post?")) return;
    const h: Record<string,string> = { ...xhdr(), ...(getModToken() ? { "x-mod-token": getModToken() } : {}) };
    await fetch(`/api/community/posts/${post.id}`, { method:"DELETE", headers: h });
    onDelete(post.id);
  }

  const canDelete = post.author === me || isMod;

  return (
    <div id={post.id}
      style={{ background:"var(--surface)",borderRadius:18,marginBottom:12,overflow:"hidden",
        border:`1px solid ${isAnn?"rgba(245,158,11,0.5)":isPinned?"rgba(108,127,255,0.5)":"var(--border)"}`,
        boxShadow:isAnn?"0 0 0 1px rgba(245,158,11,0.2)":isPinned?"0 0 0 1px rgba(108,127,255,0.1)":"none" }}>

      {/* Announcement / Pinned banner */}
      {isAnn && (
        <div style={{ background:"linear-gradient(90deg,rgba(245,158,11,0.15),transparent)",padding:"6px 16px",display:"flex",alignItems:"center",gap:6,fontSize:11,fontWeight:800,color:"#f59e0b",borderBottom:"1px solid rgba(245,158,11,0.15)" }}>
          📢 Community Announcement
        </div>
      )}
      {!isAnn && isPinned && (
        <div style={{ background:"linear-gradient(90deg,rgba(108,127,255,0.1),transparent)",padding:"5px 16px",display:"flex",alignItems:"center",gap:6,fontSize:11,fontWeight:700,color:"var(--purple)",borderBottom:"1px solid rgba(108,127,255,0.1)" }}>
          📌 Pinned post
        </div>
      )}

      {/* Header */}
      <div style={{ padding:"14px 16px 10px",display:"flex",alignItems:"flex-start",gap:10 }}>
        <Avatar u={post.author} size={42}/>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
            <span style={{ fontSize:15,fontWeight:800,color:"var(--text)" }}>{post.author}</span>
            {roles[post.author] && <RoleBadge role={roles[post.author]}/>}
            {post.subject && <span style={{ fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(108,127,255,0.12)",color:"var(--purple)",fontWeight:700 }}>{post.subject}</span>}
          </div>
          <div style={{ fontSize:12,color:"var(--sub)",marginTop:1 }}>{timeAgo(post.createdAt)}</div>
        </div>

        {/* ⋯ menu */}
        <div style={{ position:"relative" }} ref={menuRef}>
          <button onClick={() => setShowMenu(v=>!v)} style={{ background:"none",border:"none",color:"var(--sub)",cursor:"pointer",fontSize:20,padding:"0 4px",borderRadius:8 }}>⋯</button>
          {showMenu && (
            <div style={{ position:"absolute",top:"calc(100% + 4px)",right:0,zIndex:300,background:"var(--surface)",borderRadius:14,border:"1px solid var(--border)",boxShadow:"0 8px 24px rgba(0,0,0,0.2)",minWidth:170,overflow:"hidden" }}>
              <button onClick={() => { copy(); setShowMenu(false); }} style={{ width:"100%",textAlign:"left",padding:"11px 16px",border:"none",background:"none",color:"var(--text)",fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>↗ Copy link</button>
              {isMod && <button onClick={() => { onPin(post.id); setShowMenu(false); }} style={{ width:"100%",textAlign:"left",padding:"11px 16px",border:"none",background:"none",color:"var(--purple)",fontSize:13,cursor:"pointer",fontFamily:"inherit",fontWeight:700 }}>📌 {isPinned?"Unpin":"Pin post"}</button>}
              {canDelete && <button onClick={() => { setShowMenu(false); modDelete(); }} style={{ width:"100%",textAlign:"left",padding:"11px 16px",border:"none",background:"none",color:"#dc2626",fontSize:13,cursor:"pointer",fontFamily:"inherit",fontWeight:700 }}>🗑️ Delete post</button>}
              {!isMod && post.author !== me && <button onClick={() => { setShowMenu(false); setShowReport(true); }} style={{ width:"100%",textAlign:"left",padding:"11px 16px",border:"none",background:"none",color:"#ef4444",fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>⚠️ Report</button>}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {post.text && <div style={{ padding:"0 16px 12px",fontSize:15,color:"var(--text)",lineHeight:1.65,whiteSpace:"pre-wrap" }}>{post.text}</div>}
      {post.imageData && <img src={post.imageData} alt="" style={{ width:"100%",maxHeight:400,objectFit:"cover",display:"block" }}/>}
      {post.videoUrl && ytId(post.videoUrl) && (
        <div style={{ position:"relative",paddingBottom:"56.25%",height:0,overflow:"hidden" }}>
          <iframe src={`https://www.youtube.com/embed/${ytId(post.videoUrl)}`} style={{ position:"absolute",top:0,left:0,width:"100%",height:"100%",border:"none" }} allowFullScreen title="video"/>
        </div>
      )}

      {/* Reaction summary */}
      {totalReactions > 0 && (
        <div style={{ padding:"8px 16px 0",display:"flex",alignItems:"center",gap:6 }}>
          <div style={{ display:"flex" }}>
            {topReactions.map(r => <span key={r.emoji} style={{ fontSize:16,marginRight:-4 }}>{r.emoji}</span>)}
          </div>
          <span style={{ fontSize:13,color:"var(--sub)" }}>{totalReactions}</span>
          <span style={{ marginLeft:"auto",fontSize:13,color:"var(--sub)",cursor:"pointer" }} onClick={() => setShowComments(true)}>
            {post.comments.length > 0 ? `${post.comments.length} comment${post.comments.length>1?"s":""}` : ""}
          </span>
        </div>
      )}

      {/* Action bar */}
      <div style={{ display:"flex",padding:"4px 8px",borderTop:"1px solid var(--border)",marginTop:8 }}>
        <div style={{ flex:1,position:"relative" }}>
          <button
            style={{ width:"100%",padding:"9px 0",borderRadius:10,border:"none",background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,color:myReaction?"var(--purple)":"var(--sub)",fontWeight:myReaction?800:600,fontSize:14 }}
            onMouseDown={() => { longPressRef.current = setTimeout(() => setShowReactionPicker(true), 500); }}
            onMouseUp={() => { if (longPressRef.current) clearTimeout(longPressRef.current); }}
            onTouchStart={() => { longPressRef.current = setTimeout(() => setShowReactionPicker(true), 500); }}
            onTouchEnd={() => { if (longPressRef.current) clearTimeout(longPressRef.current); }}
            onClick={() => { if (!showReactionPicker) react("👍"); }}>
            {myReaction || "👍"} {myReaction ? "Reacted" : "Like"}
          </button>
          {showReactionPicker && <ReactionPicker onPick={react} onClose={() => setShowReactionPicker(false)}/>}
        </div>
        <button onClick={() => setShowComments(c => !c)} style={{ flex:1,padding:"9px 0",borderRadius:10,border:"none",background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,color:"var(--sub)",fontWeight:600,fontSize:14 }}>💬 Comment</button>
        <button onClick={copy} style={{ flex:1,padding:"9px 0",borderRadius:10,border:"none",background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,color:"var(--sub)",fontWeight:600,fontSize:14 }}>
          {copied ? "✓ Copied" : "↗ Share"}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div style={{ borderTop:"1px solid var(--border)",padding:"12px 16px",display:"flex",flexDirection:"column",gap:10 }}>
          {post.comments.map(c => (
            <div key={c.id} style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
              <Avatar u={c.author} size={32}/>
              <div>
                <div style={{ background:"var(--bg)",borderRadius:"0 14px 14px 14px",padding:"8px 12px",display:"inline-block" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:2 }}>
                    <span style={{ fontSize:12,fontWeight:800,color:"var(--purple)" }}>{c.author}</span>
                    {roles[c.author] && <RoleBadge role={roles[c.author]} small/>}
                  </div>
                  <div style={{ fontSize:13,color:"var(--text)",lineHeight:1.5 }}>{c.text}</div>
                </div>
                <div style={{ fontSize:11,color:"var(--sub)",marginTop:2,paddingLeft:4 }}>{timeAgo(c.createdAt)}</div>
              </div>
            </div>
          ))}
          <div style={{ display:"flex",gap:10,alignItems:"center",marginTop:4 }}>
            <Avatar u={me} size={32}/>
            <div style={{ flex:1,display:"flex",gap:8,alignItems:"center",background:"var(--bg)",borderRadius:24,padding:"6px 10px 6px 14px",border:"1.5px solid var(--border)" }}>
              <input value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); comment(); } }}
                placeholder="Write a comment…"
                style={{ flex:1,background:"none",border:"none",color:"var(--text)",fontSize:13,outline:"none",fontFamily:"inherit" }}/>
              <button onClick={comment} disabled={sending||!commentText.trim()}
                style={{ width:32,height:32,borderRadius:"50%",background:commentText.trim()?"var(--purple)":"var(--border)",border:"none",color:"#fff",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                ➤
              </button>
            </div>
          </div>
        </div>
      )}

      {showReport && <ReportModal postId={post.id} onClose={() => setShowReport(false)}/>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMMUNITY PAGE
══════════════════════════════════════════════════════════ */
export default function Community() {
  const me = UN();
  const [,navigate] = useLocation();
  const isMod = !!getModToken();
  const modName = getModUsername();

  const [posts,    setPosts]   = useState<Post[]>([]);
  const [stories,  setStories] = useState<Story[]>([]);
  const [roles,    setRoles]   = useState<Record<string,string>>({});
  const [pins,     setPins]    = useState<string[]>([]);
  const [announces,setAnn]     = useState<string[]>([]);
  const [loading,  setLoading] = useState(true);
  const [showStoryCreate, setShowStoryCreate] = useState(false);
  const [page,     setPage]    = useState(0);
  const [hasMore,  setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMeta = useCallback(async () => {
    try {
      const [roR, piR] = await Promise.all([fetch("/api/community/roles"), fetch("/api/community/pins")]);
      if (roR.ok) setRoles(await roR.json());
      if (piR.ok) { const d=await piR.json(); setPins(d.pins||[]); setAnn(d.announces||[]); }
    } catch {}
  }, []);

  const loadPosts = useCallback(async (pg = 0, append = false) => {
    if (!append) setLoading(true); else setLoadingMore(true);
    try {
      const r = await fetch(`/api/community/feed?page=${pg}`, { headers: xhdr() });
      const d: Post[] = await r.json();
      if (append) setPosts(prev => [...prev, ...d]); else setPosts(d);
      setHasMore(d.length === 20);
    } finally { setLoading(false); setLoadingMore(false); }
  }, []);

  const loadStories = useCallback(async () => {
    try { const r = await fetch("/api/community/stories", { headers: xhdr() }); const d: Story[] = await r.json(); setStories(d); } catch {}
  }, []);

  useEffect(() => {
    loadPosts(0); loadStories(); loadMeta();
    const t = setInterval(() => { loadStories(); loadMeta(); }, 30_000);
    return () => clearInterval(t);
  }, []);

  async function deletePost(id: string) {
    await fetch(`/api/community/posts/${id}`, { method:"DELETE", headers: xhdr() });
    setPosts(prev => prev.filter(p => p.id !== id));
  }

  async function pinPost(id: string) {
    const h: Record<string,string> = { ...modHeaders() };
    await fetch(`/api/community/posts/${id}/pin`, { method:"POST", headers: h });
    loadMeta();
  }

  function loadMore() { if (!loadingMore && hasMore) { const next = page + 1; setPage(next); loadPosts(next, true); } }

  // Sort: pinned/announced first, then by date
  const sortedPosts = [...posts].sort((a, b) => {
    const aPin = pins.includes(a.id) || announces.includes(a.id);
    const bPin = pins.includes(b.id) || announces.includes(b.id);
    if (aPin && !bPin) return -1; if (!aPin && bPin) return 1;
    return 0;
  });

  return (
    <div style={{ minHeight:"100svh",background:"var(--bg)" }}>
      <Header/>
      <div style={{ maxWidth:600,margin:"0 auto",padding:"0 0 80px" }}>
        {/* Mod banner */}
        {isMod && (
          <div style={{ background:"linear-gradient(90deg,#1e0a3c,#3b0764)",padding:"8px 16px",display:"flex",alignItems:"center",gap:10 }}>
            <span style={{ fontSize:14 }}>🛡️</span>
            <span style={{ fontSize:12,color:"rgba(255,255,255,0.8)",fontWeight:700,flex:1 }}>Mod Mode: {modName}</span>
            <button onClick={() => navigate("/mod")}
              style={{ padding:"4px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.3)",background:"transparent",color:"rgba(255,255,255,0.9)",fontSize:11,cursor:"pointer",fontWeight:700 }}>
              Open Panel →
            </button>
          </div>
        )}

        {/* Stories bar */}
        <div style={{ background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"12px 0 8px",marginBottom:10,position:"sticky",top:56,zIndex:50 }}>
          <StoriesBar stories={stories} me={me} onNew={() => setShowStoryCreate(true)} onReload={loadStories}/>
        </div>

        <div style={{ padding:"0 12px" }}>
          <CreatePost me={me} onDone={p => setPosts(prev => [p, ...prev])}/>

          {loading ? (
            <div style={{ textAlign:"center",padding:40,color:"var(--sub)" }}>
              <div style={{ fontSize:32,marginBottom:8 }}>🌐</div>Loading community…
            </div>
          ) : sortedPosts.length === 0 ? (
            <div style={{ textAlign:"center",padding:48 }}>
              <div style={{ fontSize:52,marginBottom:12 }}>🌱</div>
              <div style={{ fontSize:18,fontWeight:800,color:"var(--text)",marginBottom:6 }}>Be the first to post!</div>
              <div style={{ color:"var(--sub)",fontSize:14 }}>Share knowledge, ask questions, motivate each other.</div>
            </div>
          ) : (
            sortedPosts.map(p => (
              <PostCard key={p.id} post={p} me={me} roles={roles} pins={pins} announces={announces} isMod={isMod}
                onDelete={deletePost} onUpdate={updated => setPosts(prev => prev.map(x => x.id===updated.id?updated:x))}
                onPin={pinPost}/>
            ))
          )}

          {hasMore && !loading && (
            <button onClick={loadMore} disabled={loadingMore}
              style={{ width:"100%",padding:"13px",borderRadius:14,border:"1.5px solid var(--border)",background:"transparent",color:"var(--sub)",fontWeight:700,fontSize:14,cursor:"pointer",marginTop:4 }}>
              {loadingMore ? "Loading…" : "Load more posts"}
            </button>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="dash-bottom-nav">
        <button className="dash-bottom-nav-item" onClick={() => navigate("/")}><span style={{ fontSize:22 }}>🏠</span><span style={{ fontSize:10 }}>Home</span></button>
        <button className="dash-bottom-nav-item" style={{ color:"var(--purple)" }}><span style={{ fontSize:22 }}>🌐</span><span style={{ fontSize:10,fontWeight:800 }}>Community</span></button>
        <button className="dash-bottom-nav-item" onClick={() => navigate("/messages")}><span style={{ fontSize:22 }}>💬</span><span style={{ fontSize:10 }}>Messages</span></button>
        <button className="dash-bottom-nav-item" onClick={() => navigate("/ask")}><span style={{ fontSize:22 }}>❓</span><span style={{ fontSize:10 }}>Q&A</span></button>
        <button className="dash-bottom-nav-item" onClick={() => navigate("/profile")}><span style={{ fontSize:22 }}>👤</span><span style={{ fontSize:10 }}>Profile</span></button>
      </div>

      {showStoryCreate && <CreateStoryModal onClose={() => setShowStoryCreate(false)} onDone={loadStories}/>}
    </div>
  );
}
