import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import Header from "../components/Header";
import { getModToken } from "./ModLogin";

const UN = () => localStorage.getItem("rr_username") || "guest";
const xhdr = () => ({ "Content-Type": "application/json", "x-username": UN() });
function timeAgo(ts: string) {
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  if (d < 60) return "Just now"; if (d < 3600) return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`; return `${Math.floor(d/86400)}d ago`;
}
function avatarColor(u: string) {
  const p=["#7c3aed","#0ea5e9","#f59e0b","#ef4444","#10b981","#6366f1","#ec4899","#14b8a6"];
  let n=0; for(const c of u)n+=c.charCodeAt(0); return p[n%p.length];
}

interface Channel { id:string; name:string; description:string; category:string; owner:string; admins:string[]; subscribers:string[]; createdAt:string; postCount:number; imageData?:string; }
interface CPost { id:string; channelId:string; author:string; text?:string; imageData?:string; fileData?:string; fileName?:string; poll?:any; reactions:Record<string,string[]>; views:string[]; ts:string; }
const REACTIONS = ["👍","❤️","🔥","😮","💯","🎯"];
const CATEGORIES = ["General","Physics","Chemistry","Biology","Math","English","BCS","Admission","ICT","Science"];

function ChannelAvatar({ ch, size=48 }:{ ch:Channel; size?:number }) {
  if (ch.imageData) return <img src={ch.imageData} alt="" style={{ width:size,height:size,borderRadius:size/3,objectFit:"cover" }}/>;
  return (
    <div style={{ width:size,height:size,borderRadius:size/3,background:avatarColor(ch.name),
      display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.44,fontWeight:900,color:"#fff",flexShrink:0 }}>
      {ch.name[0]?.toUpperCase()}
    </div>
  );
}

function ChannelPostCard({ post, channel, onReact }:{ post:CPost; channel:Channel; onReact:(postId:string, emoji:string)=>void }) {
  const me = UN();
  const total = Object.values(post.reactions||{}).reduce((s,a)=>s+a.length,0);
  return (
    <div style={{ background:"var(--surface)",borderRadius:16,padding:"14px 16px",marginBottom:10,border:"1px solid var(--border)" }}>
      <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10 }}>
        <ChannelAvatar ch={channel} size={32}/>
        <div>
          <div style={{ fontSize:13,fontWeight:800,color:"var(--text)" }}>{channel.name}</div>
          <div style={{ fontSize:11,color:"var(--sub)" }}>{timeAgo(post.ts)}</div>
        </div>
        <div style={{ marginLeft:"auto",fontSize:11,color:"var(--sub)" }}>👁 {post.views?.length||0}</div>
      </div>
      {post.text && <div style={{ fontSize:14,color:"var(--text)",lineHeight:1.65,whiteSpace:"pre-wrap",marginBottom:10 }}>{post.text}</div>}
      {post.imageData && <img src={post.imageData} alt="" style={{ width:"100%",maxHeight:350,objectFit:"cover",borderRadius:12,display:"block",marginBottom:10 }}/>}
      {post.fileData && post.fileName && (
        <a href={post.fileData} download={post.fileName}
          style={{ display:"flex",gap:10,alignItems:"center",padding:"10px 14px",borderRadius:12,border:"1px solid var(--border)",background:"var(--bg)",color:"var(--text)",textDecoration:"none",marginBottom:10 }}>
          <span style={{ fontSize:24 }}>📄</span>
          <div><div style={{ fontSize:13,fontWeight:700 }}>{post.fileName}</div><div style={{ fontSize:11,color:"var(--sub)" }}>Download file</div></div>
        </a>
      )}
      {post.poll && (
        <div style={{ padding:"10px 14px",borderRadius:12,border:"1px solid var(--border)",background:"var(--bg)",marginBottom:10 }}>
          <div style={{ fontSize:13,fontWeight:700,color:"var(--text)",marginBottom:8 }}>📊 {post.poll.question}</div>
          {post.poll.options?.map((opt:any,i:number)=>{
            const total2=post.poll.options.reduce((s:number,o:any)=>s+(o.votes?.length||0),0);
            const pct=total2?Math.round((opt.votes?.length||0)/total2*100):0;
            const voted=(opt.votes||[]).includes(me);
            return (
              <div key={i} style={{ marginBottom:6 }}>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3 }}>
                  <span style={{ color:voted?"var(--purple)":"var(--text)",fontWeight:voted?700:400 }}>{voted?"✓ ":""}{opt.text}</span>
                  <span style={{ color:"var(--sub)" }}>{pct}%</span>
                </div>
                <div style={{ height:4,borderRadius:4,background:"var(--border)",overflow:"hidden" }}>
                  <div style={{ height:"100%",width:`${pct}%`,background:voted?"var(--purple)":"var(--sub)",borderRadius:4,transition:"width 0.3s" }}/>
                </div>
              </div>
            );
          })}
          <div style={{ fontSize:10,color:"var(--sub)",marginTop:4 }}>{post.poll.options?.reduce((s:number,o:any)=>s+(o.votes?.length||0),0)||0} votes</div>
        </div>
      )}
      {/* Reactions */}
      <div style={{ display:"flex",gap:6,flexWrap:"wrap",paddingTop:8,borderTop:"1px solid var(--border)" }}>
        {REACTIONS.map(emoji=>{
          const users = post.reactions?.[emoji]||[];
          const hasReacted = users.includes(me);
          return (
            <button key={emoji} onClick={()=>onReact(post.id,emoji)}
              style={{ padding:"4px 10px",borderRadius:20,border:"1px solid var(--border)",
                background:hasReacted?"rgba(124,58,237,0.15)":"transparent",
                color:hasReacted?"var(--purple)":"var(--sub)",
                fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:4 }}>
              {emoji}{users.length>0&&<span style={{ fontSize:11 }}>{users.length}</span>}
            </button>
          );
        })}
        {total>0&&<span style={{ marginLeft:"auto",fontSize:12,color:"var(--sub)",alignSelf:"center" }}>{total} reaction{total!==1?"s":""}</span>}
      </div>
    </div>
  );
}

function ChannelView({ channel: initialCh, onBack }:{ channel:Channel; onBack:()=>void }) {
  const me = UN(); const isMod = !!getModToken();
  const [ch, setCh] = useState(initialCh);
  const [posts, setPosts] = useState<CPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [postText, setPostText] = useState("");
  const [postImg, setPostImg] = useState<string|null>(null);
  const [posting, setPosting] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const isAdmin = ch.admins?.includes(me) || isMod;
  const isSubscribed = ch.subscribers?.includes(me);
  const imgRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileData, setFileData] = useState<string|null>(null);
  const [fileName, setFileName] = useState<string>("");

  useEffect(()=>{
    fetch(`/api/channels/${ch.id}/posts`,{headers:xhdr()}).then(r=>r.json()).then(d=>{if(Array.isArray(d))setPosts(d);setLoading(false);}).catch(()=>setLoading(false));
    const t=setInterval(()=>{
      fetch(`/api/channels/${ch.id}/posts?since=${encodeURIComponent(posts[0]?.ts||"")}`,{headers:xhdr()}).then(r=>r.json()).then(d=>{if(Array.isArray(d)&&d.length)setPosts(prev=>{const ids=new Set(prev.map(p=>p.id));const fresh=d.filter(p=>!ids.has(p.id));return fresh.length?[...fresh,...prev]:prev;});}).catch(()=>{});
    },10000);
    return()=>clearInterval(t);
  },[ch.id]);

  async function subscribe() {
    const r = await fetch(`/api/channels/${ch.id}/subscribe`,{method:"POST",headers:xhdr()});
    const d = await r.json();
    setCh(prev=>({...prev,subscribers:d.subscribed?[...prev.subscribers,me]:prev.subscribers.filter(s=>s!==me)}));
  }
  async function createPost() {
    if(!postText.trim()&&!postImg&&!fileData)return;
    setPosting(true);
    const r = await fetch(`/api/channels/${ch.id}/posts`,{method:"POST",headers:xhdr(),body:JSON.stringify({text:postText,imageData:postImg||undefined,fileData:fileData||undefined,fileName:fileName||undefined})});
    const d = await r.json();
    if(d.id){setPosts(prev=>[d,...prev]);}
    setPosting(false);setPostText("");setPostImg(null);setFileData(null);setFileName("");setShowCompose(false);
  }
  function onImg(e:React.ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>setPostImg(r.result as string);r.readAsDataURL(f);e.target.value="";}
  function onFile(e:React.ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{setFileData(r.result as string);setFileName(f.name);};r.readAsDataURL(f);e.target.value="";}
  async function react(postId:string, emoji:string) {
    const r = await fetch(`/api/channels/${ch.id}/posts/${postId}/react`,{method:"POST",headers:xhdr(),body:JSON.stringify({emoji})});
    const d = await r.json();
    setPosts(prev=>prev.map(p=>p.id===postId?{...p,reactions:d}:p));
  }

  return (
    <div style={{ minHeight:"100svh",background:"var(--bg)" }}>
      {/* Header */}
      <div style={{ background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"10px 16px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:50 }}>
        <button onClick={onBack} style={{ background:"none",border:"none",color:"var(--text)",fontSize:22,cursor:"pointer",padding:"0 4px" }}>←</button>
        <ChannelAvatar ch={ch} size={40}/>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15,fontWeight:800,color:"var(--text)" }}>📢 {ch.name}</div>
          <div style={{ fontSize:11,color:"var(--sub)" }}>{ch.subscribers?.length||0} subscribers</div>
        </div>
        <button onClick={subscribe}
          style={{ padding:"6px 16px",borderRadius:20,border:"1.5px solid var(--purple)",
            background:isSubscribed?"var(--purple)":"transparent",
            color:isSubscribed?"#fff":"var(--purple)",fontWeight:700,fontSize:12,cursor:"pointer" }}>
          {isSubscribed?"✓ Subscribed":"Subscribe"}
        </button>
      </div>

      {/* Channel info */}
      <div style={{ padding:"14px 16px",background:"var(--surface)",borderBottom:"1px solid var(--border)",marginBottom:10 }}>
        {ch.description&&<div style={{ fontSize:13,color:"var(--sub)",marginBottom:6 }}>{ch.description}</div>}
        <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
          <span style={{ fontSize:11,padding:"2px 10px",borderRadius:20,background:"rgba(108,127,255,0.12)",color:"var(--purple)",fontWeight:700 }}>📂 {ch.category}</span>
          <span style={{ fontSize:11,padding:"2px 10px",borderRadius:20,background:"rgba(108,127,255,0.08)",color:"var(--sub)" }}>👤 {ch.owner}</span>
          <span style={{ fontSize:11,padding:"2px 10px",borderRadius:20,background:"rgba(108,127,255,0.08)",color:"var(--sub)" }}>📝 {ch.postCount||0} posts</span>
        </div>
      </div>

      {/* Compose (admin only) */}
      {isAdmin && (
        <div style={{ padding:"0 12px 10px" }}>
          {!showCompose ? (
            <button onClick={()=>setShowCompose(true)}
              style={{ width:"100%",padding:"12px",borderRadius:14,border:"2px dashed var(--border)",background:"transparent",color:"var(--purple)",cursor:"pointer",fontSize:13,fontWeight:800 }}>
              📢 Post to Channel
            </button>
          ):(
            <div style={{ background:"var(--surface)",borderRadius:16,padding:14,border:"1px solid var(--border)" }}>
              <textarea value={postText} onChange={e=>setPostText(e.target.value)} placeholder="Write a post…" rows={3}
                style={{ width:"100%",borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",padding:"10px 12px",fontSize:14,resize:"none",boxSizing:"border-box",fontFamily:"inherit" }}/>
              {postImg&&<img src={postImg} alt="" style={{ maxWidth:"100%",maxHeight:200,borderRadius:10,marginTop:8,display:"block" }}/>}
              {fileData&&fileName&&<div style={{ padding:"8px 12px",borderRadius:10,background:"var(--bg)",marginTop:8,fontSize:12,color:"var(--text)",display:"flex",gap:8,alignItems:"center" }}><span>📄</span>{fileName}<button onClick={()=>{setFileData(null);setFileName("");}} style={{ marginLeft:"auto",background:"none",border:"none",color:"#dc2626",cursor:"pointer" }}>✕</button></div>}
              <input ref={imgRef} type="file" accept="image/*" style={{ display:"none" }} onChange={onImg}/>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.pptx,.xlsx,.txt,.zip" style={{ display:"none" }} onChange={onFile}/>
              <div style={{ display:"flex",gap:8,marginTop:10 }}>
                <button onClick={()=>imgRef.current?.click()} style={{ padding:"7px 12px",borderRadius:10,border:"1px solid var(--border)",background:"transparent",color:"var(--text)",cursor:"pointer",fontSize:13 }}>📷</button>
                <button onClick={()=>fileRef.current?.click()} style={{ padding:"7px 12px",borderRadius:10,border:"1px solid var(--border)",background:"transparent",color:"var(--text)",cursor:"pointer",fontSize:13 }}>📎</button>
                <button onClick={()=>setShowCompose(false)} style={{ padding:"7px 14px",borderRadius:10,border:"none",background:"var(--bg)",color:"var(--sub)",cursor:"pointer",fontSize:13 }}>Cancel</button>
                <button onClick={createPost} disabled={posting||(!postText.trim()&&!postImg&&!fileData)}
                  style={{ marginLeft:"auto",padding:"7px 18px",borderRadius:10,border:"none",background:"var(--purple)",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer" }}>
                  {posting?"Posting…":"Post"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Posts */}
      <div style={{ padding:"0 12px 80px" }}>
        {loading&&<div style={{ textAlign:"center",padding:40,color:"var(--sub)" }}>Loading posts…</div>}
        {!loading&&posts.length===0&&(
          <div style={{ textAlign:"center",padding:48 }}>
            <div style={{ fontSize:48,marginBottom:10 }}>📢</div>
            <div style={{ fontSize:15,fontWeight:800,color:"var(--text)" }}>No posts yet</div>
            {isAdmin&&<div style={{ color:"var(--sub)",marginTop:6,fontSize:13 }}>Be the first to post in this channel!</div>}
          </div>
        )}
        {posts.map(p=><ChannelPostCard key={p.id} post={p} channel={ch} onReact={react}/>)}
      </div>
    </div>
  );
}

function CreateChannelModal({ onClose, onDone }:{ onClose:()=>void; onDone:(c:Channel)=>void }) {
  const [name, setName] = useState(""); const [desc, setDesc] = useState(""); const [cat, setCat] = useState("General");
  const [creating, setCreating] = useState(false);
  async function create() {
    if(!name.trim())return; setCreating(true);
    const r = await fetch("/api/channels",{method:"POST",headers:xhdr(),body:JSON.stringify({name,description:desc,category:cat})});
    const d = await r.json(); setCreating(false); if(d.id)onDone(d);
  }
  return (
    <div style={{ position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:"var(--surface)",borderRadius:20,padding:20,width:"100%",maxWidth:420 }}>
        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:16 }}>
          <div style={{ fontSize:17,fontWeight:900,color:"var(--text)" }}>📢 New Channel</div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"var(--sub)",fontSize:20,cursor:"pointer" }}>✕</button>
        </div>
        {[{v:name,s:setName,p:"Channel name…"},{v:desc,s:setDesc,p:"Description…"}].map(({v,s,p},i)=>(
          <input key={i} value={v} onChange={e=>s(e.target.value)} placeholder={p}
            style={{ width:"100%",padding:"10px 12px",borderRadius:12,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13,fontFamily:"inherit",marginBottom:10,boxSizing:"border-box" }}/>
        ))}
        <select value={cat} onChange={e=>setCat(e.target.value)}
          style={{ width:"100%",padding:"10px 12px",borderRadius:12,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13,marginBottom:16,boxSizing:"border-box" }}>
          {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={create} disabled={creating||!name.trim()}
          style={{ width:"100%",padding:12,borderRadius:12,border:"none",background:"var(--purple)",color:"#fff",fontWeight:900,fontSize:15,cursor:"pointer" }}>
          {creating?"Creating…":"Create Channel 📢"}
        </button>
      </div>
    </div>
  );
}

export default function Channels() {
  const me = UN(); const isMod = !!getModToken();
  const [,navigate] = useLocation();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [viewChannel, setViewChannel] = useState<Channel|null>(null);

  const load = useCallback(async()=>{
    const r = await fetch("/api/channels"); const d = await r.json();
    if(Array.isArray(d))setChannels(d); setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  async function subscribe(ch:Channel) {
    const r = await fetch(`/api/channels/${ch.id}/subscribe`,{method:"POST",headers:xhdr()});
    const d = await r.json();
    setChannels(prev=>prev.map(c=>c.id===ch.id?{...c,subscribers:d.subscribed?[...c.subscribers,me]:c.subscribers.filter(s=>s!==me)}:c));
  }

  if (viewChannel) return <ChannelView channel={viewChannel} onBack={()=>setViewChannel(null)}/>;

  const cats = ["All",...CATEGORIES];
  const filtered = channels.filter(c=>{
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())||c.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCat==="All"||c.category===activeCat;
    return matchSearch&&matchCat;
  });

  return (
    <div style={{ minHeight:"100svh",background:"var(--bg)" }}>
      <Header/>
      {/* Header bar */}
      <div style={{ background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"10px 14px" }}>
        <div style={{ display:"flex",gap:10,alignItems:"center",marginBottom:10 }}>
          <div style={{ flex:1,background:"var(--bg)",borderRadius:24,border:"1.5px solid var(--border)",display:"flex",alignItems:"center",padding:"8px 14px",gap:8 }}>
            <span style={{ color:"var(--sub)",fontSize:15 }}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search channels…"
              style={{ flex:1,background:"none",border:"none",color:"var(--text)",fontSize:13,outline:"none",fontFamily:"inherit" }}/>
          </div>
          {isMod&&(
            <button onClick={()=>setShowCreate(true)}
              style={{ width:40,height:40,borderRadius:12,background:"var(--purple)",border:"none",color:"#fff",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>+</button>
          )}
        </div>
        {/* Category filter */}
        <div style={{ display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none",paddingBottom:2 }}>
          {cats.map(c=>(
            <button key={c} onClick={()=>setActiveCat(c)}
              style={{ padding:"4px 12px",borderRadius:20,border:`1.5px solid ${activeCat===c?"var(--purple)":"var(--border)"}`,
                background:activeCat===c?"rgba(108,127,255,0.12)":"transparent",
                color:activeCat===c?"var(--purple)":"var(--sub)",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0 }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Channels list */}
      <div style={{ padding:"10px 12px 80px" }}>
        {loading&&<div style={{ textAlign:"center",padding:40,color:"var(--sub)" }}>Loading channels…</div>}
        {!loading&&filtered.length===0&&(
          <div style={{ textAlign:"center",padding:48 }}>
            <div style={{ fontSize:48,marginBottom:10 }}>📢</div>
            <div style={{ fontSize:15,fontWeight:800,color:"var(--text)" }}>No channels found</div>
            {isMod&&<div style={{ color:"var(--sub)",marginTop:6,fontSize:13 }}>Create the first channel using the + button</div>}
          </div>
        )}
        {filtered.map(ch=>{
          const subbed=ch.subscribers?.includes(me);
          return (
            <div key={ch.id} style={{ background:"var(--surface)",borderRadius:16,padding:"14px 16px",marginBottom:10,border:"1px solid var(--border)",display:"flex",gap:12,alignItems:"center" }}>
              <div onClick={()=>setViewChannel(ch)} style={{ cursor:"pointer" }}>
                <ChannelAvatar ch={ch} size={52}/>
              </div>
              <div style={{ flex:1,minWidth:0,cursor:"pointer" }} onClick={()=>setViewChannel(ch)}>
                <div style={{ fontSize:15,fontWeight:800,color:"var(--text)",marginBottom:2 }}>📢 {ch.name}</div>
                {ch.description&&<div style={{ fontSize:12,color:"var(--sub)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:4 }}>{ch.description}</div>}
                <div style={{ display:"flex",gap:8 }}>
                  <span style={{ fontSize:10,color:"var(--sub)" }}>👥 {ch.subscribers?.length||0}</span>
                  <span style={{ fontSize:10,color:"var(--sub)" }}>📝 {ch.postCount||0} posts</span>
                  <span style={{ fontSize:10,padding:"1px 7px",borderRadius:10,background:"rgba(108,127,255,0.1)",color:"var(--purple)",fontWeight:700 }}>{ch.category}</span>
                </div>
              </div>
              <button onClick={()=>subscribe(ch)}
                style={{ padding:"6px 14px",borderRadius:20,border:"1.5px solid var(--purple)",
                  background:subbed?"var(--purple)":"transparent",
                  color:subbed?"#fff":"var(--purple)",fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0 }}>
                {subbed?"✓ Joined":"Join"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Bottom nav */}
      <div className="dash-bottom-nav">
        <button className="dash-bottom-nav-item" onClick={()=>navigate("/")}><span style={{ fontSize:22 }}>🏠</span><span style={{ fontSize:10 }}>Home</span></button>
        <button className="dash-bottom-nav-item" onClick={()=>navigate("/community")}><span style={{ fontSize:22 }}>🌐</span><span style={{ fontSize:10 }}>Community</span></button>
        <button className="dash-bottom-nav-item" onClick={()=>navigate("/messages")}><span style={{ fontSize:22 }}>💬</span><span style={{ fontSize:10 }}>Messages</span></button>
        <button className="dash-bottom-nav-item" style={{ color:"var(--purple)" }}><span style={{ fontSize:22 }}>📢</span><span style={{ fontSize:10,fontWeight:800 }}>Channels</span></button>
        <button className="dash-bottom-nav-item" onClick={()=>navigate("/explore")}><span style={{ fontSize:22 }}>🔍</span><span style={{ fontSize:10 }}>Explore</span></button>
      </div>

      {showCreate&&<CreateChannelModal onClose={()=>setShowCreate(false)} onDone={c=>{setChannels(prev=>[c,...prev]);setShowCreate(false);setViewChannel(c);}}/>}
    </div>
  );
}
