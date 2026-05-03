import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import Header from "../components/Header";

/* ── helpers ─────────────────────────────────────────────── */
const UN = () => localStorage.getItem("rr_username") || "guest";
const xhdr = () => ({ "Content-Type": "application/json", "x-username": UN() });
function timeAgo(ts: string) {
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  if (d < 60) return "Just now"; if (d < 3600) return `${Math.floor(d/60)}m`;
  if (d < 86400) return `${Math.floor(d/3600)}h`; return `${Math.floor(d/86400)}d`;
}
function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
}
function avatarColor(u: string) {
  const p = ["#7c3aed","#0ea5e9","#f59e0b","#ef4444","#10b981","#6366f1","#ec4899","#14b8a6","#f97316","#8b5cf6"];
  let n = 0; for (const c of u) n += c.charCodeAt(0); return p[n % p.length];
}

/* ── constants ───────────────────────────────────────────── */
const STUN = { iceServers: [{ urls:"stun:stun.l.google.com:19302" },{ urls:"stun:stun1.l.google.com:19302" }] };
const MSG_REACTIONS = ["👍","❤️","😂","😮","🔥","💯","🎯","✅","😢","😡"];
const STICKERS = [
  "📚","🎓","🔥","💡","✅","❌","📝","🏆","💎","🌟","⭐","🎯","🧠","💪","🤔",
  "😊","🥰","😎","🤓","👏","🙌","✌️","🫡","🎉","🎊","🥳","😅","🤯","💭","🎈",
  "🌈","🦋","🌸","🌺","🌻","🍀","🌙","☀️","⚡","🔮","📖","✏️","📐","📏","🔬",
  "🔭","🖊️","📊","📈","🗒️","🥺","😤","🤝","👋","🫂","❓","💬","🗣️","📢","🔔",
];

/* ── types ───────────────────────────────────────────────── */
interface Thread { id:string; participants:string[]; lastMsg?:string; lastAt?:string; updatedAt:string; pinned?:boolean; }
interface DMsg {
  id:string; threadId?:string; groupId?:string; author:string;
  text?:string; audioData?:string; imageData?:string;
  fileData?:string; fileName?:string;
  sticker?:string;
  replyTo?:{id:string;author:string;text?:string;imageData?:string};
  reactions:Record<string,string[]>;
  deletedFor?:string[]; deleted?:boolean;
  forwardedFrom?:string;
  readBy?:string[];
  ts:string; type?:string;
  poll?:{question:string;options:{text:string;votes:string[]}[];allowMultiple:boolean;closed:boolean};
  pinned?:boolean;
}
interface Group {
  id:string; name:string; description?:string;
  members:string[]; admins:string[]; createdBy:string;
  createdAt:string; imageData?:string; lastMsg?:string; lastAt?:string; pinned?:boolean;
}

/* ── hooks ───────────────────────────────────────────────── */
function useVoice() {
  const [recording, setRec] = useState(false);
  const [data, setData] = useState<string|null>(null);
  const [secs, setSecs] = useState(0);
  const mr = useRef<MediaRecorder|null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const timer = useRef<ReturnType<typeof setInterval>|null>(null);
  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      const rec = new MediaRecorder(stream); mr.current=rec; chunks.current=[];
      rec.ondataavailable = e => { if(e.data.size) chunks.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: rec.mimeType||"audio/webm" });
        const reader = new FileReader(); reader.onload=()=>setData(reader.result as string);
        reader.readAsDataURL(blob); stream.getTracks().forEach(t=>t.stop());
      };
      rec.start(); setRec(true); setSecs(0);
      timer.current = setInterval(()=>setSecs(s=>s+1), 1000);
    } catch { alert("Microphone access denied"); }
  }, []);
  const stop = useCallback(() => { mr.current?.stop(); setRec(false); if(timer.current) clearInterval(timer.current); }, []);
  const clear = useCallback(() => { setData(null); setSecs(0); }, []);
  return { recording, data, secs, start, stop, clear };
}

/* ── components ──────────────────────────────────────────── */
function Avatar({ u, size=36, online=false }: { u:string; size?:number; online?:boolean }) {
  return (
    <div style={{ position:"relative",flexShrink:0 }}>
      <div style={{ width:size,height:size,borderRadius:size/2.5,background:avatarColor(u),
        display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.44,fontWeight:900,color:"#fff" }}>
        {u[0]?.toUpperCase()}
      </div>
      {online && <div style={{ position:"absolute",bottom:1,right:1,width:10,height:10,borderRadius:"50%",background:"#22c55e",border:"2px solid var(--bg)" }}/>}
    </div>
  );
}
function GroupAvatar({ members, size=44 }: { members:string[]; size?:number }) {
  const top = members.slice(0, 3);
  return (
    <div style={{ width:size,height:size,position:"relative",flexShrink:0 }}>
      {top.map((m,i) => (
        <div key={m} style={{ position:"absolute",width:size*0.62,height:size*0.62,borderRadius:size*0.15,
          background:avatarColor(m),display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:size*0.26,fontWeight:900,color:"#fff",border:"1.5px solid var(--bg)",
          top:i===0?0:i===1?size*0.38:size*0.18,left:i===0?size*0.19:i===1?0:size*0.38,zIndex:3-i }}>
          {m[0]?.toUpperCase()}
        </div>
      ))}
    </div>
  );
}
function TypingDots() {
  return (
    <div style={{ display:"flex",gap:4,padding:"10px 14px",background:"var(--surface)",borderRadius:18,alignItems:"center",width:"fit-content",border:"1px solid var(--border)" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width:8,height:8,borderRadius:"50%",background:"var(--sub)",
          animation:`typingBounce 1.2s ease-in-out ${i*0.2}s infinite` }}/>
      ))}
    </div>
  );
}
function QuotedReply({ reply }: { reply:DMsg["replyTo"] }) {
  if (!reply) return null;
  return (
    <div style={{ padding:"5px 10px",borderLeft:"3px solid var(--purple)",background:"rgba(124,58,237,0.08)",borderRadius:"0 8px 8px 0",marginBottom:4 }}>
      <div style={{ fontSize:11,fontWeight:700,color:"var(--purple)",marginBottom:1 }}>{reply.author}</div>
      {reply.imageData && <img src={reply.imageData} alt="" style={{ width:36,height:36,objectFit:"cover",borderRadius:4,display:"block",marginBottom:2 }}/>}
      <div style={{ fontSize:12,color:"var(--sub)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:220 }}>
        {reply.text||"📎 Attachment"}
      </div>
    </div>
  );
}
function ReactionBar({ reactions, msgId, context, contextType, onUpdate }:{
  reactions:Record<string,string[]>; msgId:string; context:string; contextType:"dm"|"group";
  onUpdate:(r:Record<string,string[]>)=>void;
}) {
  const me = UN();
  const entries = Object.entries(reactions).filter(([,v])=>v.length>0);
  if (!entries.length) return null;
  async function toggle(emoji:string) {
    const url = contextType==="dm" ? `/api/dm/threads/${context}/messages/${msgId}/react` : `/api/groups/${context}/messages/${msgId}/react`;
    const r = await fetch(url, { method:"POST", headers:xhdr(), body:JSON.stringify({ emoji }) });
    onUpdate(await r.json());
  }
  return (
    <div style={{ display:"flex",flexWrap:"wrap",gap:3,marginTop:3 }}>
      {entries.map(([emoji, users]) => (
        <button key={emoji} onClick={()=>toggle(emoji)}
          style={{ padding:"2px 7px",borderRadius:12,border:"1px solid var(--border)",
            background:users.includes(me)?"rgba(124,58,237,0.2)":"var(--surface)",
            color:"var(--text)",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:3 }}>
          {emoji}<span style={{ fontSize:10,color:"var(--sub)" }}>{users.length}</span>
        </button>
      ))}
    </div>
  );
}
function PollView({ poll, msgId, context, contextType, onUpdate }:{
  poll:NonNullable<DMsg["poll"]>; msgId:string; context:string; contextType:"dm"|"group";
  onUpdate:(p:NonNullable<DMsg["poll"]>)=>void;
}) {
  const me = UN();
  const total = poll.options.reduce((s,o)=>s+(o.votes?.length||0),0);
  async function vote(idx:number) {
    if (poll.closed) return;
    const url = contextType==="dm" ? `/api/dm/threads/${context}/messages/${msgId}/vote` : `/api/groups/${context}/messages/${msgId}/vote`;
    const r = await fetch(url, { method:"POST", headers:xhdr(), body:JSON.stringify({ optionIndex:idx }) });
    const d = await r.json(); if (!d.error) onUpdate(d);
  }
  const hasVoted = poll.options.some(o=>(o.votes||[]).includes(me));
  return (
    <div style={{ padding:"10px 14px",borderRadius:14,background:"var(--surface)",border:"1px solid var(--border)",minWidth:200,maxWidth:280 }}>
      <div style={{ fontSize:13,fontWeight:700,color:"var(--text)",marginBottom:10 }}>📊 {poll.question}</div>
      {poll.options.map((opt,i) => {
        const pct = total ? Math.round((opt.votes?.length||0)/total*100) : 0;
        const voted = (opt.votes||[]).includes(me);
        return (
          <div key={i} onClick={()=>vote(i)} style={{ marginBottom:8,cursor:poll.closed?"default":"pointer" }}>
            <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3 }}>
              <span style={{ color:voted?"var(--purple)":"var(--text)",fontWeight:voted?700:400 }}>{voted?"✓ ":""}{opt.text}</span>
              {(hasVoted||poll.closed)&&<span style={{ color:"var(--sub)",fontSize:11 }}>{pct}%</span>}
            </div>
            {(hasVoted||poll.closed)&&(
              <div style={{ height:4,borderRadius:4,background:"var(--border)",overflow:"hidden" }}>
                <div style={{ height:"100%",width:`${pct}%`,background:voted?"var(--purple)":"var(--sub)",borderRadius:4,transition:"width 0.3s" }}/>
              </div>
            )}
          </div>
        );
      })}
      <div style={{ fontSize:10,color:"var(--sub)",marginTop:4 }}>{total} vote{total!==1?"s":""}
        {poll.closed?" · Closed":""}{poll.allowMultiple?" · Multiple choice":""}</div>
    </div>
  );
}
function MsgBubble({ msg, isMe, isFirst, context, contextType, onCtx, onReactionUpdate, onPollUpdate }:{
  msg:DMsg; isMe:boolean; isFirst:boolean;
  context:string; contextType:"dm"|"group";
  onCtx:(msg:DMsg, e:React.MouseEvent|React.TouchEvent)=>void;
  onReactionUpdate:(id:string, r:Record<string,string[]>)=>void;
  onPollUpdate:(id:string, p:NonNullable<DMsg["poll"]>)=>void;
}) {
  const me = UN();
  if ((msg.deletedFor||[]).includes(me)) return null;
  if (msg.type==="system") return (
    <div style={{ textAlign:"center",padding:"4px 0" }}>
      <span style={{ fontSize:11,color:"var(--sub)",background:"var(--surface)",padding:"3px 10px",borderRadius:12 }}>{msg.text}</span>
    </div>
  );
  const bubbleBg = isMe ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "var(--surface)";
  const clr = isMe ? "#fff" : "var(--text)";
  const br = isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px";
  const bd = isMe ? "none" : "1px solid var(--border)";
  return (
    <div style={{ display:"flex",flexDirection:isMe?"row-reverse":"row",gap:6,alignItems:"flex-end",marginBottom:1 }}
      onContextMenu={e=>{e.preventDefault();onCtx(msg,e);}}
      onTouchStart={e=>{const t=setTimeout(()=>onCtx(msg,e),500);const c=()=>clearTimeout(t);
        e.currentTarget.addEventListener("touchend",c,{once:true});e.currentTarget.addEventListener("touchmove",c,{once:true});}}>
      {!isMe && isFirst && <Avatar u={msg.author} size={28}/>}
      {!isMe && !isFirst && <div style={{ width:28,flexShrink:0 }}/>}
      <div style={{ maxWidth:"72%",display:"flex",flexDirection:"column",gap:1 }}>
        {!isMe && isFirst && <div style={{ fontSize:11,color:"var(--purple)",fontWeight:700,marginBottom:2,paddingLeft:2 }}>{msg.author}</div>}
        {msg.pinned && <div style={{ fontSize:10,color:"#f59e0b",paddingBottom:2 }}>📌 Pinned</div>}
        {msg.forwardedFrom && <div style={{ fontSize:11,color:"var(--sub)",paddingBottom:2 }}>↩️ Forwarded from {msg.forwardedFrom}</div>}
        {msg.replyTo && <div style={{ paddingLeft:4 }}><QuotedReply reply={msg.replyTo}/></div>}
        {msg.sticker && <div style={{ fontSize:42 }}>{msg.sticker}</div>}
        {msg.text && !msg.sticker && (
          <div style={{ padding:"9px 13px",borderRadius:br,background:bubbleBg,color:clr,fontSize:13,lineHeight:1.5,border:bd,wordBreak:"break-word" }}>
            {msg.deleted ? <em style={{ opacity:0.6 }}>{msg.text}</em> : msg.text}
          </div>
        )}
        {msg.audioData && (
          <div style={{ padding:"8px 12px",borderRadius:14,background:bubbleBg,border:bd }}>
            <audio src={msg.audioData} controls style={{ height:32,maxWidth:220 }}/>
          </div>
        )}
        {msg.imageData && <img src={msg.imageData} alt="" style={{ maxWidth:240,borderRadius:14,display:"block",border:"1px solid var(--border)" }}/>}
        {msg.fileData && msg.fileName && (
          <a href={msg.fileData} download={msg.fileName}
            style={{ padding:"10px 13px",borderRadius:14,background:bubbleBg,border:bd,color:clr,
              display:"flex",gap:8,alignItems:"center",textDecoration:"none",maxWidth:240 }}>
            <span style={{ fontSize:24 }}>📄</span>
            <div><div style={{ fontSize:12,fontWeight:700 }}>{msg.fileName}</div><div style={{ fontSize:11,opacity:0.7 }}>Tap to download</div></div>
          </a>
        )}
        {msg.poll && <PollView poll={msg.poll} msgId={msg.id} context={context} contextType={contextType} onUpdate={p=>onPollUpdate(msg.id,p)}/>}
        {msg.reactions && Object.values(msg.reactions).some(v=>v.length>0) && (
          <ReactionBar reactions={msg.reactions} msgId={msg.id} context={context} contextType={contextType} onUpdate={r=>onReactionUpdate(msg.id,r)}/>
        )}
        <div style={{ display:"flex",alignItems:"center",gap:4,justifyContent:isMe?"flex-end":"flex-start",paddingBottom:1 }}>
          <span style={{ fontSize:10,color:"var(--sub)" }}>{fmtTime(msg.ts)}</span>
          {isMe && (msg.readBy||[]).length>1 && <span style={{ fontSize:11,color:"#60a5fa" }}>✓✓</span>}
          {isMe && (msg.readBy||[]).length===1 && <span style={{ fontSize:11,color:"var(--sub)" }}>✓</span>}
        </div>
      </div>
    </div>
  );
}

/* ── Context Menu ─────────────────────────────────────────── */
function MsgCtxMenu({ msg, isMe, pos, onClose, onReply, onForward, onDelete, onPin, onCopy, onReact }:{
  msg:DMsg; isMe:boolean; pos:{x:number;y:number};
  onClose:()=>void; onReply:(m:DMsg)=>void; onForward:(m:DMsg)=>void;
  onDelete:(fa:boolean)=>void; onPin:()=>void; onCopy:()=>void; onReact:(e:string)=>void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))onClose();};
    document.addEventListener("mousedown",h); return()=>document.removeEventListener("mousedown",h);
  },[]);
  const top = Math.min(pos.y, window.innerHeight-340);
  const left = Math.min(pos.x, window.innerWidth-200);
  return (
    <div ref={ref} style={{ position:"fixed",top,left,zIndex:9100,background:"var(--surface)",borderRadius:16,
      boxShadow:"0 8px 40px rgba(0,0,0,0.4)",border:"1px solid var(--border)",padding:8,minWidth:185 }}>
      <div style={{ display:"flex",justifyContent:"space-around",padding:"6px 4px 10px",borderBottom:"1px solid var(--border)",marginBottom:4 }}>
        {MSG_REACTIONS.slice(0,6).map(e=>(
          <button key={e} onClick={()=>{onReact(e);onClose();}}
            style={{ width:32,height:32,borderRadius:"50%",border:"none",background:"none",fontSize:20,cursor:"pointer" }}>{e}</button>
        ))}
      </div>
      {[
        ["↩️ Reply",()=>{onReply(msg);onClose();}],
        ["📋 Copy text",()=>{onCopy();onClose();}],
        ["↪️ Forward",()=>{onForward(msg);onClose();}],
        ["📌 Pin message",()=>{onPin();onClose();}],
        ["🗑️ Delete for me",()=>{onDelete(false);onClose();}],
        ...(isMe?[["🚫 Delete for everyone",()=>{onDelete(true);onClose();}]]:[] as [string,()=>void][]),
      ].map(([label,action]) => (
        <button key={String(label)} onClick={action as ()=>void}
          style={{ width:"100%",textAlign:"left",padding:"10px 12px",border:"none",background:"transparent",
            color:String(label).includes("everyone")?"#ef4444":"var(--text)",
            fontSize:13,cursor:"pointer",borderRadius:8,display:"block",fontFamily:"inherit" }}
          onMouseEnter={e=>(e.currentTarget.style.background="var(--bg)")}
          onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
          {String(label)}
        </button>
      ))}
    </div>
  );
}

/* ── Sticker Picker ───────────────────────────────────────── */
function StickerPicker({ onPick, onClose }:{ onPick:(s:string)=>void; onClose:()=>void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))onClose();};
    document.addEventListener("mousedown",h); return()=>document.removeEventListener("mousedown",h);
  },[]);
  return (
    <div ref={ref} style={{ position:"absolute",bottom:"100%",right:0,background:"var(--surface)",borderRadius:16,
      boxShadow:"0 8px 32px rgba(0,0,0,0.3)",border:"1px solid var(--border)",padding:10,width:272,zIndex:200 }}>
      <div style={{ fontSize:11,fontWeight:700,color:"var(--sub)",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em" }}>STICKERS</div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:4 }}>
        {STICKERS.map(s=>(
          <button key={s} onClick={()=>onPick(s)}
            style={{ fontSize:24,background:"none",border:"none",cursor:"pointer",padding:3,borderRadius:6 }}
            onMouseEnter={e=>(e.currentTarget.style.background="var(--bg)")}
            onMouseLeave={e=>(e.currentTarget.style.background="none")}>{s}</button>
        ))}
      </div>
    </div>
  );
}

/* ── Poll Creator ─────────────────────────────────────────── */
function PollCreator({ onCreate, onClose }:{
  onCreate:(p:{question:string;options:{text:string;votes:string[]}[];allowMultiple:boolean;closed:boolean})=>void;
  onClose:()=>void;
}) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState(["",""]);
  const [multi, setMulti] = useState(false);
  function submit() {
    if (!q.trim()) return;
    const filled = opts.filter(o=>o.trim());
    if (filled.length<2) return;
    onCreate({ question:q.trim(), options:filled.map(t=>({text:t,votes:[]})), allowMultiple:multi, closed:false });
    onClose();
  }
  return (
    <div style={{ padding:14,background:"var(--surface)",borderRadius:16,border:"1px solid var(--border)",marginBottom:8 }}>
      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10 }}>
        <div style={{ fontSize:13,fontWeight:800,color:"var(--text)" }}>📊 Create Poll</div>
        <button onClick={onClose} style={{ background:"none",border:"none",color:"var(--sub)",fontSize:18,cursor:"pointer" }}>✕</button>
      </div>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Question…"
        style={{ width:"100%",padding:"8px 12px",borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13,fontFamily:"inherit",marginBottom:8,boxSizing:"border-box" }}/>
      {opts.map((o,i)=>(
        <div key={i} style={{ display:"flex",gap:6,marginBottom:6 }}>
          <input value={o} onChange={e=>{const n=[...opts];n[i]=e.target.value;setOpts(n);}} placeholder={`Option ${i+1}…`}
            style={{ flex:1,padding:"7px 10px",borderRadius:8,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:12,fontFamily:"inherit" }}/>
          {opts.length>2&&<button onClick={()=>setOpts(opts.filter((_,j)=>j!==i))}
            style={{ width:28,height:28,borderRadius:"50%",border:"none",background:"#fee2e2",color:"#dc2626",cursor:"pointer",fontWeight:900 }}>✕</button>}
        </div>
      ))}
      {opts.length<6&&<button onClick={()=>setOpts([...opts,""])} style={{ padding:"4px 12px",borderRadius:8,border:"1px dashed var(--border)",background:"none",color:"var(--sub)",fontSize:12,cursor:"pointer",marginBottom:8 }}>+ Add option</button>}
      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
        <input type="checkbox" id="pmulti" checked={multi} onChange={e=>setMulti(e.target.checked)} style={{ width:14,height:14 }}/>
        <label htmlFor="pmulti" style={{ fontSize:12,color:"var(--sub)",cursor:"pointer" }}>Allow multiple votes</label>
      </div>
      <button onClick={submit} style={{ width:"100%",padding:"8px",borderRadius:10,border:"none",background:"var(--purple)",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer" }}>Create Poll</button>
    </div>
  );
}

/* ── Create Group Modal ───────────────────────────────────── */
function CreateGroupModal({ onClose, onDone }:{ onClose:()=>void; onDone:(g:Group)=>void }) {
  const me = UN();
  const [name, setName] = useState(""); const [desc, setDesc] = useState("");
  const [mi, setMi] = useState(""); const [members, setMembers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const add = () => { const u=mi.trim(); if(u&&u!==me&&!members.includes(u)){setMembers([...members,u]);setMi("");} };
  async function create() {
    if (!name.trim()) return; setCreating(true);
    const r = await fetch("/api/groups", { method:"POST", headers:xhdr(), body:JSON.stringify({ name, description:desc, members }) });
    const d = await r.json(); setCreating(false); if (d.id) onDone(d);
  }
  return (
    <div style={{ position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:"var(--surface)",borderRadius:20,padding:20,width:"100%",maxWidth:400,maxHeight:"80vh",overflowY:"auto" }}>
        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:16 }}>
          <div style={{ fontSize:17,fontWeight:900,color:"var(--text)" }}>👥 New Group</div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"var(--sub)",fontSize:20,cursor:"pointer" }}>✕</button>
        </div>
        {[{v:name,s:setName,p:"Group name…"},{v:desc,s:setDesc,p:"Description (optional)…"}].map(({v,s,p},i)=>(
          <input key={i} value={v} onChange={e=>s(e.target.value)} placeholder={p}
            style={{ width:"100%",padding:"10px 12px",borderRadius:12,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13,fontFamily:"inherit",marginBottom:10,boxSizing:"border-box" }}/>
        ))}
        <div style={{ display:"flex",gap:8,marginBottom:10 }}>
          <input value={mi} onChange={e=>setMi(e.target.value)} placeholder="Add member by username…"
            onKeyDown={e=>{if(e.key==="Enter")add();}}
            style={{ flex:1,padding:"8px 12px",borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13,fontFamily:"inherit" }}/>
          <button onClick={add} style={{ padding:"8px 14px",borderRadius:10,border:"none",background:"var(--purple)",color:"#fff",fontWeight:800,cursor:"pointer" }}>Add</button>
        </div>
        <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:16 }}>
          {members.map(m=>(
            <div key={m} style={{ padding:"4px 10px",borderRadius:20,background:"rgba(124,58,237,0.15)",color:"var(--purple)",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:6 }}>
              {m}<button onClick={()=>setMembers(members.filter(x=>x!==m))} style={{ background:"none",border:"none",color:"var(--purple)",cursor:"pointer",padding:0,fontSize:12,fontWeight:900 }}>×</button>
            </div>
          ))}
          {!members.length&&<div style={{ fontSize:12,color:"var(--sub)" }}>You are added automatically</div>}
        </div>
        <button onClick={create} disabled={creating||!name.trim()}
          style={{ width:"100%",padding:12,borderRadius:12,border:"none",background:"var(--purple)",color:"#fff",fontWeight:900,fontSize:15,cursor:"pointer" }}>
          {creating?"Creating…":"Create Group 👥"}
        </button>
      </div>
    </div>
  );
}

/* ── Group Info Panel ─────────────────────────────────────── */
function GroupInfoPanel({ group, onClose, onUpdate, onLeave }:{
  group:Group; onClose:()=>void; onUpdate:(g:Group)=>void; onLeave:()=>void;
}) {
  const me = UN(); const isAdmin = group.admins?.includes(me);
  const [addM, setAddM] = useState(""); const [adding, setAdding] = useState(false);
  async function addMember() {
    if (!addM.trim()) return; setAdding(true);
    const r = await fetch(`/api/groups/${group.id}/members`, { method:"POST", headers:xhdr(), body:JSON.stringify({ username:addM.trim() }) });
    const d = await r.json(); setAdding(false); setAddM(""); if (d.id) onUpdate(d);
  }
  async function removeMember(u:string) {
    await fetch(`/api/groups/${group.id}/members/${u}`, { method:"DELETE", headers:xhdr() });
    onUpdate({ ...group, members:group.members.filter(m=>m!==u) });
  }
  async function leave() {
    await fetch(`/api/groups/${group.id}/members/${me}`, { method:"DELETE", headers:xhdr() });
    onLeave();
  }
  return (
    <div style={{ position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
      <div style={{ background:"var(--surface)",borderRadius:"20px 20px 0 0",padding:20,width:"100%",maxWidth:500,maxHeight:"80vh",overflowY:"auto" }}>
        <div style={{ width:40,height:4,borderRadius:4,background:"var(--border)",margin:"0 auto 16px" }}/>
        <div style={{ display:"flex",gap:12,alignItems:"center",marginBottom:16 }}>
          <GroupAvatar members={group.members} size={56}/>
          <div>
            <div style={{ fontSize:17,fontWeight:900,color:"var(--text)" }}>{group.name}</div>
            {group.description&&<div style={{ fontSize:12,color:"var(--sub)",marginTop:2 }}>{group.description}</div>}
            <div style={{ fontSize:11,color:"var(--sub)",marginTop:2 }}>{group.members.length} members</div>
          </div>
        </div>
        {isAdmin&&(
          <div style={{ display:"flex",gap:8,marginBottom:16 }}>
            <input value={addM} onChange={e=>setAddM(e.target.value)} placeholder="Add member by username…"
              style={{ flex:1,padding:"8px 12px",borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13,fontFamily:"inherit" }}/>
            <button onClick={addMember} disabled={adding}
              style={{ padding:"8px 14px",borderRadius:10,border:"none",background:"var(--purple)",color:"#fff",fontWeight:800,cursor:"pointer",fontSize:12 }}>
              {adding?"…":"Add"}
            </button>
          </div>
        )}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12,fontWeight:700,color:"var(--sub)",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em" }}>Members ({group.members.length})</div>
          {group.members.map(m=>(
            <div key={m} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid var(--border)" }}>
              <Avatar u={m} size={36}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,fontWeight:700,color:"var(--text)" }}>{m}</div>
                {group.admins?.includes(m)&&<div style={{ fontSize:10,color:"var(--purple)",fontWeight:700 }}>Admin</div>}
                {m===group.createdBy&&<div style={{ fontSize:10,color:"#f59e0b",fontWeight:700 }}>Creator</div>}
              </div>
              {isAdmin&&m!==me&&<button onClick={()=>removeMember(m)}
                style={{ padding:"4px 10px",borderRadius:8,border:"none",background:"#fee2e2",color:"#dc2626",fontSize:11,fontWeight:700,cursor:"pointer" }}>Remove</button>}
            </div>
          ))}
        </div>
        <button onClick={leave} style={{ width:"100%",padding:12,borderRadius:12,border:"none",background:"#fee2e2",color:"#dc2626",fontWeight:800,cursor:"pointer",marginBottom:8 }}>Leave Group</button>
        <button onClick={onClose} style={{ width:"100%",padding:12,borderRadius:12,border:"1px solid var(--border)",background:"none",color:"var(--text)",fontWeight:700,cursor:"pointer" }}>Close</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   WEBRTC CALL OVERLAY
══════════════════════════════════════════════════════════ */
interface CallOverlayProps { callId:string; caller:string; callee:string; isIncoming:boolean; callType:"audio"|"video"; offer?:any; onEnd:()=>void; }
function CallOverlay({ callId, caller, callee, isIncoming, callType, offer, onEnd }:CallOverlayProps) {
  const me = UN(); const other = me===caller?callee:caller;
  const [status, setStatus] = useState<"ringing"|"connecting"|"active"|"ended">(isIncoming?"ringing":"connecting");
  const [muted, setMuted] = useState(false); const [camOff, setCamOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const pcRef = useRef<RTCPeerConnection|null>(null);
  const localStream = useRef<MediaStream|null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const candidateQueue = useRef<any[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const durRef = useRef<ReturnType<typeof setInterval>|null>(null);
  useEffect(()=>{
    if(status==="active"){durRef.current=setInterval(()=>setDuration(d=>d+1),1000);return()=>{if(durRef.current)clearInterval(durRef.current);};}
    return undefined;
  },[status]);
  function fmtDur(s:number){return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;}
  async function setupPC(){
    const pc=new RTCPeerConnection(STUN);pcRef.current=pc;
    try{const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:callType==="video"});localStream.current=stream;stream.getTracks().forEach(t=>pc.addTrack(t,stream));if(localVideoRef.current)localVideoRef.current.srcObject=stream;}
    catch{try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});localStream.current=stream;stream.getTracks().forEach(t=>pc.addTrack(t,stream));}catch{}}
    pc.ontrack=e=>{if(remoteVideoRef.current)remoteVideoRef.current.srcObject=e.streams[0];};
    pc.onicecandidate=async(e)=>{if(e.candidate)await fetch(`/api/calls/${callId}/candidate`,{method:"POST",headers:xhdr(),body:JSON.stringify({candidate:e.candidate})});};

    pc.onconnectionstatechange=()=>{if(pc.connectionState==="connected")setStatus("active");if(pc.connectionState==="disconnected"||pc.connectionState==="failed")endCall();};
    return pc;
  }
  async function startCaller(){const pc=await setupPC();const offer=await pc.createOffer();await pc.setLocalDescription(offer);await fetch("/api/calls",{method:"POST",headers:xhdr(),body:JSON.stringify({callee,type:callType,offer})});pollForAnswer(pc);}
  async function acceptCall(){setStatus("connecting");const pc=await setupPC();await pc.setRemoteDescription(new RTCSessionDescription(offer));for(const c of candidateQueue.current)await pc.addIceCandidate(new RTCIceCandidate(c));candidateQueue.current=[];const answer=await pc.createAnswer();await pc.setLocalDescription(answer);await fetch(`/api/calls/${callId}/answer`,{method:"PATCH",headers:xhdr(),body:JSON.stringify({answer})});pollForCandidates(pc);}
  function pollForAnswer(pc:RTCPeerConnection){pollRef.current=setInterval(async()=>{const r=await fetch(`/api/calls/${callId}`,{headers:xhdr()});const d=await r.json();if(!d||d.status==="ended"||d.status==="rejected"){endCall();return;}if(d.answer&&pc.signalingState==="have-local-offer"){await pc.setRemoteDescription(new RTCSessionDescription(d.answer));clearInterval(pollRef.current!);pollForCandidates(pc);}},1000);}
  function pollForCandidates(pc:RTCPeerConnection){let lastCnt=0;pollRef.current=setInterval(async()=>{const r=await fetch(`/api/calls/${callId}`,{headers:xhdr()});const d=await r.json();if(!d||d.status==="ended"){endCall();return;}const candidates=me===d.caller?d.calleeCandidates:d.callerCandidates;for(let i=lastCnt;i<candidates.length;i++){try{await pc.addIceCandidate(new RTCIceCandidate(candidates[i]));}catch{}}lastCnt=candidates.length;},1000);}
  function endCall(){if(pollRef.current)clearInterval(pollRef.current);if(durRef.current)clearInterval(durRef.current);localStream.current?.getTracks().forEach(t=>t.stop());pcRef.current?.close();fetch(`/api/calls/${callId}`,{method:"DELETE",headers:xhdr()}).catch(()=>{});setStatus("ended");setTimeout(onEnd,800);}
  async function reject(){await fetch(`/api/calls/${callId}/reject`,{method:"PATCH",headers:xhdr(),body:"{}"});onEnd();}
  function toggleMute(){localStream.current?.getAudioTracks().forEach(t=>{t.enabled=muted;});setMuted(m=>!m);}
  function toggleCam(){localStream.current?.getVideoTracks().forEach(t=>{t.enabled=camOff;});setCamOff(c=>!c);}
  useEffect(()=>{if(!isIncoming)startCaller();return()=>{if(pollRef.current)clearInterval(pollRef.current);};},[]);
  const isVideo = callType==="video";
  return (
    <div style={{ position:"fixed",inset:0,zIndex:9999,background:"#0d0d1a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between",padding:"40px 20px 50px" }}>
      {isVideo&&(<div style={{ position:"absolute",inset:0,zIndex:0,background:"#000" }}><video ref={remoteVideoRef} autoPlay playsInline style={{ width:"100%",height:"100%",objectFit:"cover",opacity:status==="active"?1:0.4 }}/><video ref={localVideoRef} autoPlay playsInline muted style={{ position:"absolute",top:16,right:16,width:100,height:140,objectFit:"cover",borderRadius:14,border:"2px solid rgba(255,255,255,0.3)",zIndex:10 }}/></div>)}
      <div style={{ zIndex:10,textAlign:"center" }}>
        <Avatar u={other} size={88}/>
        <div style={{ fontSize:24,fontWeight:900,color:"#fff",marginTop:16 }}>{other}</div>
        <div style={{ fontSize:14,color:"rgba(255,255,255,0.6)",marginTop:6 }}>
          {status==="ringing"?isIncoming?`Incoming ${callType} call…`:"Calling…":status==="connecting"?"Connecting…":status==="active"?fmtDur(duration):"Call ended"}
        </div>
      </div>
      <div style={{ zIndex:10,display:"flex",gap:20,alignItems:"center" }}>
        {status==="ringing"&&isIncoming?(
          <>
            <button onClick={reject} style={{ width:64,height:64,borderRadius:"50%",background:"#ef4444",border:"none",color:"#fff",fontSize:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 24px rgba(239,68,68,0.5)" }}>✕</button>
            <button onClick={acceptCall} style={{ width:64,height:64,borderRadius:"50%",background:"#22c55e",border:"none",color:"#fff",fontSize:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 24px rgba(34,197,94,0.5)" }}>📞</button>
          </>
        ):(
          <>
            <button onClick={toggleMute} style={{ width:52,height:52,borderRadius:"50%",background:muted?"#ef4444":"rgba(255,255,255,0.15)",border:"none",color:"#fff",fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>{muted?"🔇":"🎤"}</button>
            {isVideo&&<button onClick={toggleCam} style={{ width:52,height:52,borderRadius:"50%",background:camOff?"#ef4444":"rgba(255,255,255,0.15)",border:"none",color:"#fff",fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>{camOff?"📷":"📹"}</button>}
            <button onClick={endCall} style={{ width:64,height:64,borderRadius:"50%",background:"#ef4444",border:"none",color:"#fff",fontSize:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 24px rgba(239,68,68,0.5)" }}>📵</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   CHAT VIEW (DM + Group combined)
══════════════════════════════════════════════════════════ */
function ChatView({ thread, group, onBack }:{ thread?:Thread; group?:Group; onBack:()=>void }) {
  const me = UN();
  const isGroup = !!group;
  const contextId = thread?.id || group?.id || "";
  const contextType: "dm"|"group" = isGroup ? "group" : "dm";
  const otherUser = thread?.participants.find(p=>p!==me) || "";
  const headerName = isGroup ? group!.name : otherUser;

  const [msgs, setMsgs] = useState<DMsg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<{id:string;type:"audio"|"video";caller:string;callee:string;incoming:boolean;offer?:any}|null>(null);
  const [typing, setTyping] = useState<string[]>([]);
  const [online, setOnline] = useState<Record<string,number>>({});
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [replyTo, setReplyTo] = useState<DMsg|null>(null);
  const [forwardMsg, setForwardMsg] = useState<DMsg|null>(null);
  const [ctxMenu, setCtxMenu] = useState<{msg:DMsg;pos:{x:number;y:number}}|null>(null);
  const [imageData, setImageData] = useState<string|null>(null);
  const [search, setSearch] = useState(""); const [showSearch, setShowSearch] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<Group|null>(group||null);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [showSR, setShowSR] = useState(false);
  // Feature #7: Schedule, #8: Self-destruct, #10: Translation
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [selfDestruct, setSelfDestruct] = useState(false);
  const [translatedMsgs, setTranslatedMsgs] = useState<Record<string,string>>({});
  const voice = useVoice();
  const chatEnd = useRef<HTMLDivElement>(null);
  const lastTs = useRef(""); const imgRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const apiBase = isGroup ? `/api/groups/${contextId}` : `/api/dm/threads/${contextId}`;

  // Load messages
  const poll = useCallback(async() => {
    const qs = lastTs.current ? `?since=${encodeURIComponent(lastTs.current)}` : "";
    const r = await fetch(`${apiBase}/messages${qs}`, { headers:xhdr() });
    const d: DMsg[] = await r.json();
    if (!Array.isArray(d)||!d.length) return;
    setMsgs(prev=>{
      const ids=new Set(prev.map(m=>m.id));
      const fresh=d.filter(m=>!ids.has(m.id));
      if(!fresh.length)return prev;
      lastTs.current=fresh[fresh.length-1].ts;
      return [...prev,...fresh].slice(-300);
    });
  }, [contextId, isGroup]);

  useEffect(()=>{
    fetch(`${apiBase}/messages`, { headers:xhdr() }).then(r=>r.json()).then((d:DMsg[])=>{
      if(Array.isArray(d)&&d.length){setMsgs(d);lastTs.current=d[d.length-1].ts;}
    });
    // Mark as read
    fetch(`${apiBase}/read`, { method:"POST", headers:xhdr() }).catch(()=>{});
    // Heartbeat online status
    fetch("/api/online", { method:"POST", headers:xhdr() }).catch(()=>{});
    const t = setInterval(poll, 2500);
    const onlineT = setInterval(()=>fetch("/api/online",{method:"POST",headers:xhdr()}).catch(()=>{}), 30000);
    const onlineGet = setInterval(async()=>{const r=await fetch("/api/online");const d=await r.json();setOnline(d);},10000);
    const typingPoll = setInterval(async()=>{const r=await fetch(`/api/dm/typing/${contextId}`);const d=await r.json();setTyping(d.filter((u:string)=>u!==me));},2000);
    return()=>{clearInterval(t);clearInterval(onlineT);clearInterval(onlineGet);clearInterval(typingPoll);};
  }, [contextId, poll]);

  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  // Poll for incoming calls (DM only)
  useEffect(()=>{
    if (isGroup) return;
    const t = setInterval(async()=>{
      if(activeCall)return;
      const r=await fetch("/api/calls/incoming",{headers:xhdr()});
      const d=await r.json();
      if(d&&d.caller===otherUser)setIncomingCall(d);
    },2000);
    return()=>clearInterval(t);
  },[otherUser,activeCall,isGroup]);

  function onTyping() {
    fetch("/api/dm/typing", { method:"POST", headers:xhdr(), body:JSON.stringify({ context:contextId }) }).catch(()=>{});
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(()=>{
      fetch("/api/dm/typing", { method:"DELETE", headers:xhdr(), body:JSON.stringify({ context:contextId }) }).catch(()=>{});
    }, 3000);
  }

  function onImg(e:React.ChangeEvent<HTMLInputElement>) {
    const f=e.target.files?.[0]; if(!f)return;
    const r=new FileReader(); r.onload=()=>setImageData(r.result as string); r.readAsDataURL(f); e.target.value="";
  }
  function onFile(e:React.ChangeEvent<HTMLInputElement>) {
    const f=e.target.files?.[0]; if(!f)return;
    if(f.size>20_000_000){alert("File too large (20MB max)");return;}
    const r=new FileReader(); r.onload=async()=>{
      await doSend({ fileData:r.result as string, fileName:f.name });
    }; r.readAsDataURL(f); e.target.value="";
  }

  async function doSend(extra:Record<string,any>={}) {
    setSending(true);
    const body:Record<string,any>={ ...extra };
    if (replyTo) body.replyTo = { id:replyTo.id, author:replyTo.author, text:replyTo.text, imageData:replyTo.imageData };
    await fetch(`${apiBase}/messages`, { method:"POST", headers:xhdr(), body:JSON.stringify(body) });
    setSending(false); setReplyTo(null); setImageData(null); voice.clear(); poll();
  }
  async function send() {
    const t=text.trim(); if((!t&&!voice.data&&!imageData)||sending)return;
    setText("");
    await doSend({ text:t||undefined, audioData:voice.data||undefined, imageData:imageData||undefined });
  }
  async function sendSticker(s:string) { setShowStickerPicker(false); await doSend({ sticker:s }); }
  async function sendPoll(poll:any) { await doSend({ poll }); }

  // Load smart replies when there are messages
  useEffect(()=>{
    if (!msgs.length) return;
    const last=msgs.filter(m=>m.author!==me).slice(-1)[0];
    if (!last?.text) return;
    fetch("/api/ai/smart-reply",{method:"POST",headers:xhdr(),body:JSON.stringify({text:last.text,context:"education"})})
      .then(r=>r.json()).then(d=>{if(Array.isArray(d))setSmartReplies(d.slice(0,4));}).catch(()=>{});
  },[msgs.length]);

  async function reactMsg(msgId:string, emoji:string) {
    const url = contextType==="dm" ? `/api/dm/threads/${contextId}/messages/${msgId}/react` : `/api/groups/${contextId}/messages/${msgId}/react`;
    const r = await fetch(url, { method:"POST", headers:xhdr(), body:JSON.stringify({ emoji }) });
    const d = await r.json();
    setMsgs(prev=>prev.map(m=>m.id===msgId?{...m,reactions:d}:m));
  }
  async function deleteMsg(msgId:string, forAll:boolean) {
    const url = contextType==="dm" ? `/api/dm/threads/${contextId}/messages/${msgId}` : `/api/groups/${contextId}/messages/${msgId}`;
    await fetch(url, { method:"DELETE", headers:xhdr(), body:JSON.stringify({ forAll }) });
    if (forAll) setMsgs(prev=>prev.map(m=>m.id===msgId?{...m,text:"🚫 This message was deleted",deleted:true}:m));
    else setMsgs(prev=>prev.filter(m=>m.id!==msgId));
  }
  async function pinMsg(msgId:string) {
    const url = contextType==="dm" ? `/api/dm/threads/${contextId}/messages/${msgId}/pin` : `/api/groups/${contextId}/messages/${msgId}/pin`;
    await fetch(url, { method:"PATCH", headers:xhdr(), body:"{}" });
    setMsgs(prev=>prev.map(m=>m.id===msgId?{...m,pinned:!m.pinned}:m));
  }

  const filteredMsgs = showSearch && search
    ? msgs.filter(m=>m.text?.toLowerCase().includes(search.toLowerCase()))
    : msgs;

  const isOnline = (u:string) => online[u] && (Date.now()-online[u])<120000;

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100svh",background:"var(--bg)",overflow:"hidden" }}>
      {/* Header */}
      <div style={{ background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"10px 14px",display:"flex",alignItems:"center",gap:12,flexShrink:0 }}>
        <button onClick={onBack} style={{ background:"none",border:"none",color:"var(--text)",fontSize:22,cursor:"pointer",padding:"0 4px",flexShrink:0 }}>←</button>
        <div onClick={()=>isGroup&&setShowGroupInfo(true)} style={{ cursor:isGroup?"pointer":"default" }}>
          {isGroup ? <GroupAvatar members={currentGroup?.members||[]} size={42}/> : <Avatar u={otherUser} size={40} online={isOnline(otherUser)}/>}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15,fontWeight:800,color:"var(--text)" }}>{headerName}</div>
          <div style={{ fontSize:11 }}>
            {typing.length>0
              ? <span style={{ color:"#22c55e" }}>{typing.join(", ")} typing…</span>
              : isGroup
              ? <span style={{ color:"var(--sub)" }}>{currentGroup?.members.length||0} members</span>
              : <span style={{ color:isOnline(otherUser)?"#22c55e":"var(--sub)" }}>{isOnline(otherUser)?"● Active now":"● Last seen "+timeAgo(String(online[otherUser]?new Date(online[otherUser]).toISOString():new Date().toISOString()))}</span>
            }
          </div>
        </div>
        <button onClick={()=>setShowSearch(s=>!s)}
          style={{ width:36,height:36,borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>🔍</button>
        {!isGroup&&(
          <>
            <button onClick={()=>setActiveCall({id:"pending",type:"audio",caller:me,callee:otherUser,incoming:false})}
              style={{ width:36,height:36,borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>📞</button>
            <button onClick={()=>setActiveCall({id:"pending",type:"video",caller:me,callee:otherUser,incoming:false})}
              style={{ width:36,height:36,borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>📹</button>
          </>
        )}
      </div>

      {/* Search bar */}
      {showSearch && (
        <div style={{ padding:"8px 14px",background:"var(--surface)",borderBottom:"1px solid var(--border)" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search messages…"
            style={{ width:"100%",padding:"8px 12px",borderRadius:12,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13,fontFamily:"inherit",boxSizing:"border-box" }}/>
        </div>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div style={{ padding:"8px 14px",background:"var(--surface)",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:8 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11,color:"var(--purple)",fontWeight:700 }}>Replying to {replyTo.author}</div>
            <div style={{ fontSize:12,color:"var(--sub)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{replyTo.text||"📎 Attachment"}</div>
          </div>
          <button onClick={()=>setReplyTo(null)} style={{ background:"none",border:"none",color:"var(--sub)",fontSize:18,cursor:"pointer" }}>✕</button>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:3 }}>
        {filteredMsgs.map((m,i)=>{
          const isMe=m.author===me;
          const prev=filteredMsgs[i-1];
          const isFirst=!prev||prev.author!==m.author;
          return (
            <MsgBubble key={m.id} msg={m} isMe={isMe} isFirst={isFirst}
              context={contextId} contextType={contextType}
              onCtx={(msg,e)=>{
                const x=(e as React.MouseEvent).clientX||((e as React.TouchEvent).touches?.[0]?.clientX||0);
                const y=(e as React.MouseEvent).clientY||((e as React.TouchEvent).touches?.[0]?.clientY||0);
                setCtxMenu({msg,pos:{x,y}});
              }}
              onReactionUpdate={(id,r)=>setMsgs(prev=>prev.map(m=>m.id===id?{...m,reactions:r}:m))}
              onPollUpdate={(id,p)=>setMsgs(prev=>prev.map(m=>m.id===id?{...m,poll:p}:m))}/>
          );
        })}
        {typing.length>0&&<TypingDots/>}
        <div ref={chatEnd}/>
      </div>

      {/* Smart replies */}
      {showSR && smartReplies.length>0 && (
        <div style={{ padding:"6px 14px",background:"var(--surface)",borderTop:"1px solid var(--border)",display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none" }}>
          {smartReplies.map(sr=>(
            <button key={sr} onClick={()=>{setText(sr);setShowSR(false);}}
              style={{ padding:"5px 12px",borderRadius:20,border:"1px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:12,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0 }}>
              {sr}
            </button>
          ))}
        </div>
      )}

      {/* Poll creator */}
      {showPollCreator && (
        <div style={{ padding:"8px 14px",background:"var(--surface)",borderTop:"1px solid var(--border)" }}>
          <PollCreator onCreate={sendPoll} onClose={()=>setShowPollCreator(false)}/>
        </div>
      )}

      {/* Voice preview */}
      {voice.data && (
        <div style={{ padding:"8px 14px",background:"var(--surface)",borderTop:"1px solid var(--border)",display:"flex",gap:8,alignItems:"center" }}>
          <audio src={voice.data} controls style={{ flex:1,height:32 }}/>
          <button onClick={voice.clear} style={{ padding:"4px 10px",borderRadius:8,border:"none",background:"#fee2e2",color:"#dc2626",fontSize:12,cursor:"pointer",fontWeight:700 }}>✕</button>
        </div>
      )}
      {imageData && (
        <div style={{ padding:"8px 14px",background:"var(--surface)",borderTop:"1px solid var(--border)",position:"relative",display:"inline-block" }}>
          <img src={imageData} alt="" style={{ maxHeight:80,borderRadius:10 }}/>
          <button onClick={()=>setImageData(null)} style={{ position:"absolute",top:4,right:4,width:20,height:20,borderRadius:"50%",border:"none",background:"#ef4444",color:"#fff",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900 }}>✕</button>
        </div>
      )}

      {/* Input bar */}
      <div style={{ background:"var(--surface)",borderTop:"1px solid var(--border)",padding:"8px 12px",display:"flex",gap:8,alignItems:"flex-end",flexShrink:0,position:"relative" }}>
        <input ref={imgRef} type="file" accept="image/*" style={{ display:"none" }} onChange={onImg}/>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.pptx,.xlsx,.zip" style={{ display:"none" }} onChange={onFile}/>
        <button onClick={()=>imgRef.current?.click()}
          style={{ width:36,height:36,borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:18,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center" }}>📷</button>
        <button onClick={()=>fileRef.current?.click()}
          style={{ width:36,height:36,borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:18,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center" }}>📎</button>
        {!voice.data&&(!voice.recording?(
          <button onClick={voice.start}
            style={{ width:36,height:36,borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:18,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center" }}>🎤</button>
        ):(
          <button onClick={voice.stop}
            style={{ width:36,height:36,borderRadius:10,border:"none",background:"#ef4444",color:"#fff",fontSize:14,cursor:"pointer",flexShrink:0,fontWeight:800 }}>⏹{voice.secs}</button>
        ))}
        <div style={{ position:"relative",flexShrink:0 }}>
          <button onClick={()=>setShowStickerPicker(s=>!s)}
            style={{ width:36,height:36,borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>😊</button>
          {showStickerPicker&&<StickerPicker onPick={sendSticker} onClose={()=>setShowStickerPicker(false)}/>}
        </div>
        <button onClick={()=>setShowPollCreator(p=>!p)}
          style={{ width:36,height:36,borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:18,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center" }}>📊</button>
        <div style={{ flex:1,background:"var(--bg)",borderRadius:20,border:"1.5px solid var(--border)",display:"flex",alignItems:"center",padding:"6px 14px",gap:8 }}>
          <textarea value={text} onChange={e=>{setText(e.target.value);onTyping();}}
            placeholder="Message…"
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
            rows={1} style={{ flex:1,background:"none",border:"none",color:"var(--text)",fontSize:14,resize:"none",outline:"none",fontFamily:"inherit",maxHeight:100,lineHeight:1.4 }}/>
          {smartReplies.length>0&&(
            <button onClick={()=>setShowSR(s=>!s)} style={{ background:"none",border:"none",color:"var(--purple)",fontSize:14,cursor:"pointer",padding:0 }}>💡</button>
          )}
        </div>
        <button onClick={send} disabled={sending||(!text.trim()&&!voice.data&&!imageData)}
          style={{ width:40,height:40,borderRadius:"50%",background:(text.trim()||voice.data||imageData)?"var(--purple)":"var(--border)",border:"none",color:"#fff",fontSize:18,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center" }}>➤</button>
      </div>

      {/* Forward modal */}
      {forwardMsg && (
        <div style={{ position:"fixed",inset:0,zIndex:9998,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
          <div style={{ background:"var(--surface)",borderRadius:20,padding:20,maxWidth:380,width:"100%" }}>
            <div style={{ fontSize:16,fontWeight:800,color:"var(--text)",marginBottom:12 }}>↪️ Forward Message</div>
            <div style={{ fontSize:13,color:"var(--sub)",marginBottom:16 }}>Enter username to forward to:</div>
            <input id="fwd-to" placeholder="Username…"
              style={{ width:"100%",padding:"10px 12px",borderRadius:12,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13,fontFamily:"inherit",boxSizing:"border-box",marginBottom:12 }}/>
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={async()=>{
                const to=(document.getElementById("fwd-to") as HTMLInputElement)?.value.trim();
                if(!to){setForwardMsg(null);return;}
                const r=await fetch("/api/dm/threads",{method:"POST",headers:xhdr(),body:JSON.stringify({other:to})});
                const t=await r.json();
                if(t.id){await fetch(`/api/dm/threads/${t.id}/messages`,{method:"POST",headers:xhdr(),body:JSON.stringify({text:forwardMsg.text,imageData:forwardMsg.imageData,audioData:forwardMsg.audioData,forwardedFrom:forwardMsg.author})});}
                setForwardMsg(null);
              }} style={{ flex:1,padding:10,borderRadius:12,border:"none",background:"var(--purple)",color:"#fff",fontWeight:800,cursor:"pointer" }}>Forward</button>
              <button onClick={()=>setForwardMsg(null)} style={{ flex:1,padding:10,borderRadius:12,border:"1px solid var(--border)",background:"none",color:"var(--text)",fontWeight:700,cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Context menu */}
      {ctxMenu&&(
        <MsgCtxMenu msg={ctxMenu.msg} isMe={ctxMenu.msg.author===me} pos={ctxMenu.pos}
          onClose={()=>setCtxMenu(null)}
          onReply={m=>{setReplyTo(m);setCtxMenu(null);}}
          onForward={m=>{setForwardMsg(m);setCtxMenu(null);}}
          onDelete={fa=>deleteMsg(ctxMenu.msg.id,fa)}
          onPin={()=>pinMsg(ctxMenu.msg.id)}
          onCopy={()=>navigator.clipboard.writeText(ctxMenu.msg.text||"").catch(()=>{})}
          onReact={e=>reactMsg(ctxMenu.msg.id,e)}/>
      )}

      {/* Incoming call toast */}
      {incomingCall&&!activeCall&&(
        <div style={{ position:"absolute",top:70,left:16,right:16,zIndex:500,background:"var(--surface)",borderRadius:18,padding:"14px 16px",boxShadow:"0 8px 32px rgba(0,0,0,0.3)",border:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12 }}>
          <Avatar u={incomingCall.caller} size={44}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14,fontWeight:800,color:"var(--text)" }}>{incomingCall.caller}</div>
            <div style={{ fontSize:12,color:"var(--sub)" }}>Incoming {incomingCall.type} call</div>
          </div>
          <button onClick={()=>{fetch(`/api/calls/${incomingCall.id}/reject`,{method:"PATCH",headers:xhdr(),body:"{}"});setIncomingCall(null);}}
            style={{ width:40,height:40,borderRadius:"50%",background:"#ef4444",border:"none",color:"#fff",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
          <button onClick={()=>{setActiveCall({id:incomingCall.id,type:incomingCall.type,caller:incomingCall.caller,callee:me,incoming:true,offer:incomingCall.offer});setIncomingCall(null);}}
            style={{ width:40,height:40,borderRadius:"50%",background:"#22c55e",border:"none",color:"#fff",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>📞</button>
        </div>
      )}
      {activeCall&&<CallOverlay callId={activeCall.id} caller={activeCall.caller} callee={activeCall.callee} isIncoming={activeCall.incoming} callType={activeCall.type} offer={activeCall.offer} onEnd={()=>setActiveCall(null)}/>}
      {showGroupInfo&&currentGroup&&<GroupInfoPanel group={currentGroup} onClose={()=>setShowGroupInfo(false)} onUpdate={g=>setCurrentGroup(g)} onLeave={()=>{setShowGroupInfo(false);onBack();}}/>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   INBOX (DMs + Groups tabs)
══════════════════════════════════════════════════════════ */
function MessagesHome({ onOpenThread, onOpenGroup }:{ onOpenThread:(t:Thread)=>void; onOpenGroup:(g:Group)=>void }) {
  const me = UN();
  const [tab, setTab] = useState<"dms"|"groups">("dms");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newDm, setNewDm] = useState("");
  const [starting, setStarting] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [online, setOnline] = useState<Record<string,number>>({});
  const [,navigate] = useLocation();

  const loadAll = useCallback(async()=>{
    const [tr, gr, on] = await Promise.all([
      fetch("/api/dm/threads",{headers:xhdr()}).then(r=>r.json()),
      fetch("/api/groups",{headers:xhdr()}).then(r=>r.json()),
      fetch("/api/online").then(r=>r.json()),
    ]);
    if(Array.isArray(tr))setThreads(tr);
    if(Array.isArray(gr))setGroups(gr);
    if(on&&typeof on==="object")setOnline(on);
    // heartbeat
    fetch("/api/online",{method:"POST",headers:xhdr()}).catch(()=>{});
  },[]);

  useEffect(()=>{loadAll();const t=setInterval(loadAll,5000);return()=>clearInterval(t);},[loadAll]);

  async function startDm() {
    if(!newDm.trim())return; setStarting(true);
    const r=await fetch("/api/dm/threads",{method:"POST",headers:xhdr(),body:JSON.stringify({other:newDm.trim()})});
    const d=await r.json(); setStarting(false); setNewDm(""); setShowNew(false);
    if(d.id){await loadAll();onOpenThread(d);}
  }
  const isOnline=(u:string)=>online[u]&&(Date.now()-online[u])<120000;

  const filtDm=threads.filter(t=>{const o=t.participants.find(p=>p!==me)||"";return o.toLowerCase().includes(search.toLowerCase());});
  const filtGr=groups.filter(g=>g.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100svh",background:"var(--bg)" }}>
      <Header/>
      {/* Search + New */}
      <div style={{ background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"10px 14px",display:"flex",gap:10,alignItems:"center" }}>
        <div style={{ flex:1,background:"var(--bg)",borderRadius:24,border:"1.5px solid var(--border)",display:"flex",alignItems:"center",padding:"8px 14px",gap:8 }}>
          <span style={{ color:"var(--sub)",fontSize:15 }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search messages, groups…"
            style={{ flex:1,background:"none",border:"none",color:"var(--text)",fontSize:13,outline:"none",fontFamily:"inherit" }}/>
        </div>
        <button onClick={()=>setShowNew(v=>!v)}
          style={{ width:40,height:40,borderRadius:12,background:"var(--purple)",border:"none",color:"#fff",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>✏️</button>
      </div>

      {/* New DM bar */}
      {showNew&&(
        <div style={{ padding:"10px 14px",background:"var(--surface)",borderBottom:"1px solid var(--border)",display:"flex",gap:10 }}>
          <input value={newDm} onChange={e=>setNewDm(e.target.value)} placeholder="Enter username…"
            onKeyDown={e=>{if(e.key==="Enter")startDm();}}
            style={{ flex:1,padding:"9px 12px",borderRadius:12,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13,fontFamily:"inherit" }}/>
          <button onClick={startDm} disabled={starting||!newDm.trim()}
            style={{ padding:"9px 16px",borderRadius:12,border:"none",background:"var(--purple)",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer" }}>{starting?"…":"Start DM"}</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex",background:"var(--surface)",borderBottom:"1px solid var(--border)" }}>
        {(["dms","groups"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{ flex:1,padding:"12px 0",border:"none",background:"none",cursor:"pointer",
              color:tab===t?"var(--purple)":"var(--sub)",fontWeight:tab===t?800:600,fontSize:13,
              borderBottom:tab===t?"2px solid var(--purple)":"2px solid transparent" }}>
            {t==="dms"?"💬 Direct Messages":"👥 Groups"}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ flex:1,overflowY:"auto" }}>
        {tab==="dms"&&(
          <>
            {filtDm.length===0&&(
              <div style={{ textAlign:"center",padding:48 }}>
                <div style={{ fontSize:48,marginBottom:10 }}>💬</div>
                <div style={{ fontSize:15,fontWeight:800,color:"var(--text)",marginBottom:6 }}>No messages yet</div>
                <div style={{ color:"var(--sub)",fontSize:13 }}>Start a DM using the pencil icon above</div>
              </div>
            )}
            {filtDm.map(t=>{
              const other=t.participants.find(p=>p!==me)||"?";
              return (
                <button key={t.id} onClick={()=>onOpenThread(t)}
                  style={{ width:"100%",textAlign:"left",padding:"14px 16px",border:"none",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:12,borderBottom:"1px solid var(--border)" }}>
                  <Avatar u={other} size={50} online={isOnline(other)}/>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:15,fontWeight:800,color:"var(--text)" }}>{other}</div>
                    <div style={{ fontSize:12,color:"var(--sub)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:2 }}>{t.lastMsg||"Start chatting…"}</div>
                  </div>
                  <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4 }}>
                    {t.lastAt&&<div style={{ fontSize:11,color:"var(--sub)" }}>{timeAgo(t.lastAt)}</div>}
                    {t.pinned&&<span style={{ fontSize:11 }}>📌</span>}
                  </div>
                </button>
              );
            })}
          </>
        )}
        {tab==="groups"&&(
          <>
            <div style={{ padding:"12px 14px" }}>
              <button onClick={()=>setShowCreateGroup(true)}
                style={{ width:"100%",padding:"12px",borderRadius:14,border:"2px dashed var(--border)",background:"transparent",color:"var(--purple)",cursor:"pointer",fontSize:14,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
                👥 Create New Group
              </button>
            </div>
            {filtGr.length===0&&(
              <div style={{ textAlign:"center",padding:32 }}>
                <div style={{ fontSize:40,marginBottom:8 }}>👥</div>
                <div style={{ fontSize:14,color:"var(--sub)" }}>No groups yet — create one above!</div>
              </div>
            )}
            {filtGr.map(g=>(
              <button key={g.id} onClick={()=>onOpenGroup(g)}
                style={{ width:"100%",textAlign:"left",padding:"14px 16px",border:"none",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:12,borderBottom:"1px solid var(--border)" }}>
                <GroupAvatar members={g.members} size={50}/>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:15,fontWeight:800,color:"var(--text)" }}>{g.name}</div>
                  <div style={{ fontSize:12,color:"var(--sub)",marginTop:2 }}>{g.members.length} members · {g.lastMsg||"No messages yet"}</div>
                </div>
                {g.lastAt&&<div style={{ fontSize:11,color:"var(--sub)",flexShrink:0 }}>{timeAgo(g.lastAt)}</div>}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Bottom nav */}
      <div className="dash-bottom-nav">
        <button className="dash-bottom-nav-item" onClick={()=>navigate("/")}><span style={{ fontSize:22 }}>🏠</span><span style={{ fontSize:10 }}>Home</span></button>
        <button className="dash-bottom-nav-item" onClick={()=>navigate("/community")}><span style={{ fontSize:22 }}>🌐</span><span style={{ fontSize:10 }}>Community</span></button>
        <button className="dash-bottom-nav-item" style={{ color:"var(--purple)" }}><span style={{ fontSize:22 }}>💬</span><span style={{ fontSize:10,fontWeight:800 }}>Messages</span></button>
        <button className="dash-bottom-nav-item" onClick={()=>navigate("/channels")}><span style={{ fontSize:22 }}>📢</span><span style={{ fontSize:10 }}>Channels</span></button>
        <button className="dash-bottom-nav-item" onClick={()=>navigate("/explore")}><span style={{ fontSize:22 }}>🔍</span><span style={{ fontSize:10 }}>Explore</span></button>
      </div>

      {showCreateGroup&&<CreateGroupModal onClose={()=>setShowCreateGroup(false)} onDone={g=>{setShowCreateGroup(false);setGroups(prev=>[g,...prev]);onOpenGroup(g);}}/>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ENTRY
══════════════════════════════════════════════════════════ */
export default function Messages() {
  const [activeThread, setActiveThread] = useState<Thread|null>(null);
  const [activeGroup, setActiveGroup] = useState<Group|null>(null);
  const [,params] = useRoute("/messages/:threadId");

  useEffect(()=>{
    if(params?.threadId){
      fetch("/api/dm/threads",{headers:xhdr()}).then(r=>r.json()).then((threads:Thread[])=>{
        const t=threads.find(x=>x.id===params.threadId);
        if(t)setActiveThread(t);
      });
    }
  },[params?.threadId]);

  if (activeThread) return <ChatView thread={activeThread} onBack={()=>setActiveThread(null)}/>;
  if (activeGroup) return <ChatView group={activeGroup} onBack={()=>setActiveGroup(null)}/>;
  return <MessagesHome onOpenThread={setActiveThread} onOpenGroup={setActiveGroup}/>;
}
