import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import Header from "../components/Header";

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
function Avatar({ u, size=40 }:{ u:string; size?:number }) {
  return (
    <div style={{ width:size,height:size,borderRadius:size/2.5,background:avatarColor(u),
      display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.44,fontWeight:900,color:"#fff",flexShrink:0 }}>
      {u[0]?.toUpperCase()}
    </div>
  );
}

type Tab = "discover"|"trending"|"people"|"channels"|"search";

interface TrendingTag { tag:string; count:number; }
interface PopularPost { id:string; author:string; text:string; reactions:number; }
interface Channel { id:string; name:string; description:string; category:string; subscribers:string[]; }
interface User { username:string; }

export default function Explore() {
  const me = UN();
  const [,navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("discover");
  const [search, setSearch] = useState("");
  const [trending, setTrending] = useState<TrendingTag[]>([]);
  const [popular, setPopular] = useState<PopularPost[]>([]);
  const [suggested, setSuggested] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<{posts:any[];users:User[];channels:Channel[];groups:any[]}>({posts:[],users:[],channels:[],groups:[]});
  const [searching, setSearching] = useState(false);
  const [activeTag, setActiveTag] = useState<string|null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const loadData = useCallback(async()=>{
    const [trendR, sugR, chR] = await Promise.all([
      fetch("/api/explore/trending").then(r=>r.json()).catch(()=>({trending:[],popular:[]})),
      fetch("/api/social/suggested",{headers:xhdr()}).then(r=>r.json()).catch(()=>[]),
      fetch("/api/channels").then(r=>r.json()).catch(()=>[]),
    ]);
    setTrending(Array.isArray(trendR.trending)?trendR.trending:[]);
    setPopular(Array.isArray(trendR.popular)?trendR.popular:[]);
    setSuggested(Array.isArray(sugR)?sugR:[]);
    setChannels(Array.isArray(chR)?chR:[]);
    // Load my following list
    fetch(`/api/social/following/${me}`,{headers:xhdr()}).then(r=>r.json()).then(d=>{if(Array.isArray(d))setFollowing(d);}).catch(()=>{});
  },[me]);

  useEffect(()=>{loadData();},[loadData]);

  async function follow(username:string) {
    const r = await fetch(`/api/social/follow/${username}`,{method:"POST",headers:xhdr()});
    const d = await r.json();
    if(d.following)setFollowing(prev=>[...prev,username]);
    else setFollowing(prev=>prev.filter(u=>u!==username));
  }

  function doSearch(q:string) {
    if(!q.trim()){setSearchResults({posts:[],users:[],channels:[],groups:[]});return;}
    setSearching(true);
    fetch(`/api/explore/search?q=${encodeURIComponent(q)}`).then(r=>r.json()).then(d=>{
      setSearchResults(d||{posts:[],users:[],channels:[],groups:[]});
      setSearching(false);
    }).catch(()=>setSearching(false));
  }

  function onSearchChange(v:string) {
    setSearch(v);
    if(searchTimer.current)clearTimeout(searchTimer.current);
    searchTimer.current=setTimeout(()=>doSearch(v),400);
    if(v)setTab("search");else setTab("discover");
  }

  async function subscribe(chId:string) {
    await fetch(`/api/channels/${chId}/subscribe`,{method:"POST",headers:xhdr()});
    setChannels(prev=>prev.map(c=>c.id===chId?{...c,subscribers:c.subscribers.includes(me)?c.subscribers.filter(s=>s!==me):[...c.subscribers,me]}:c));
  }

  const TABS: {id:Tab;label:string;icon:string}[] = [
    {id:"discover",label:"Discover",icon:"🌟"},
    {id:"trending",label:"Trending",icon:"🔥"},
    {id:"people",label:"People",icon:"👥"},
    {id:"channels",label:"Channels",icon:"📢"},
  ];

  return (
    <div style={{ minHeight:"100svh",background:"var(--bg)" }}>
      <Header/>

      {/* Search bar */}
      <div style={{ background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"12px 14px",position:"sticky",top:56,zIndex:50 }}>
        <div style={{ background:"var(--bg)",borderRadius:24,border:"1.5px solid var(--border)",display:"flex",alignItems:"center",padding:"10px 16px",gap:10 }}>
          <span style={{ color:"var(--sub)",fontSize:18 }}>🔍</span>
          <input value={search} onChange={e=>onSearchChange(e.target.value)}
            placeholder="Search people, posts, channels, groups…"
            style={{ flex:1,background:"none",border:"none",color:"var(--text)",fontSize:14,outline:"none",fontFamily:"inherit" }}/>
          {search&&<button onClick={()=>onSearchChange("")} style={{ background:"none",border:"none",color:"var(--sub)",fontSize:16,cursor:"pointer" }}>✕</button>}
        </div>

        {/* Tabs (only when not searching) */}
        {!search&&(
          <div style={{ display:"flex",gap:0,marginTop:10,overflow:"hidden",borderRadius:12,border:"1.5px solid var(--border)" }}>
            {TABS.map((t,i)=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{ flex:1,padding:"8px 0",border:"none",
                  background:tab===t.id?"var(--purple)":"transparent",
                  color:tab===t.id?"#fff":"var(--sub)",fontWeight:tab===t.id?800:600,fontSize:11,cursor:"pointer",
                  borderLeft:i>0?"1px solid var(--border)":"none" }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding:"10px 12px 80px" }}>

        {/* SEARCH RESULTS */}
        {tab==="search"&&(
          <>
            {searching&&<div style={{ textAlign:"center",padding:40,color:"var(--sub)" }}>Searching…</div>}
            {!searching&&(
              <>
                {searchResults.users.length>0&&(
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:13,fontWeight:800,color:"var(--sub)",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.06em" }}>People</div>
                    {searchResults.users.map(u=>(
                      <div key={u.username} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"var(--surface)",borderRadius:14,marginBottom:8,border:"1px solid var(--border)" }}>
                        <Avatar u={u.username} size={44}/>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:14,fontWeight:800,color:"var(--text)" }}>{u.username}</div>
                        </div>
                        <button onClick={()=>follow(u.username)}
                          style={{ padding:"6px 14px",borderRadius:20,border:"1.5px solid var(--purple)",
                            background:following.includes(u.username)?"var(--purple)":"transparent",
                            color:following.includes(u.username)?"#fff":"var(--purple)",fontWeight:700,fontSize:12,cursor:"pointer" }}>
                          {following.includes(u.username)?"✓ Following":"Follow"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.channels.length>0&&(
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:13,fontWeight:800,color:"var(--sub)",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.06em" }}>Channels</div>
                    {searchResults.channels.map((c:Channel)=>(
                      <div key={c.id} onClick={()=>navigate("/channels")}
                        style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"var(--surface)",borderRadius:14,marginBottom:8,border:"1px solid var(--border)",cursor:"pointer" }}>
                        <div style={{ width:44,height:44,borderRadius:12,background:avatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:900,color:"#fff" }}>{c.name[0]?.toUpperCase()}</div>
                        <div style={{ flex:1 }}><div style={{ fontSize:14,fontWeight:800,color:"var(--text)" }}>📢 {c.name}</div><div style={{ fontSize:12,color:"var(--sub)" }}>{c.subscribers?.length||0} subscribers</div></div>
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.posts.length>0&&(
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:13,fontWeight:800,color:"var(--sub)",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.06em" }}>Posts</div>
                    {searchResults.posts.map((p:any)=>(
                      <div key={p.id} style={{ background:"var(--surface)",borderRadius:14,padding:"12px 14px",marginBottom:8,border:"1px solid var(--border)" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
                          <Avatar u={p.author} size={32}/>
                          <span style={{ fontSize:13,fontWeight:700,color:"var(--purple)" }}>{p.author}</span>
                        </div>
                        <div style={{ fontSize:13,color:"var(--text)",lineHeight:1.5 }}>{p.text}</div>
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.users.length===0&&searchResults.channels.length===0&&searchResults.posts.length===0&&(
                  <div style={{ textAlign:"center",padding:48 }}>
                    <div style={{ fontSize:48,marginBottom:10 }}>🔍</div>
                    <div style={{ fontSize:15,fontWeight:800,color:"var(--text)" }}>No results found</div>
                    <div style={{ color:"var(--sub)",marginTop:6,fontSize:13 }}>Try a different search term</div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* DISCOVER TAB */}
        {tab==="discover"&&(
          <>
            {/* Trending hashtags strip */}
            {trending.length>0&&(
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:14,fontWeight:800,color:"var(--text)",marginBottom:10 }}>🔥 Trending Now</div>
                <div style={{ display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none",paddingBottom:4 }}>
                  {trending.slice(0,10).map(({tag,count})=>(
                    <button key={tag} onClick={()=>{setActiveTag(tag);setSearch(tag);onSearchChange(tag);}}
                      style={{ padding:"6px 14px",borderRadius:20,border:"1.5px solid var(--border)",background:activeTag===tag?"var(--purple)":"var(--surface)",
                        color:activeTag===tag?"#fff":"var(--text)",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0 }}>
                      {tag} <span style={{ fontSize:11,opacity:0.7 }}>{count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Popular posts */}
            {popular.length>0&&(
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:14,fontWeight:800,color:"var(--text)",marginBottom:10 }}>⭐ Popular Posts</div>
                {popular.map(p=>(
                  <div key={p.id} style={{ background:"var(--surface)",borderRadius:14,padding:"12px 14px",marginBottom:8,border:"1px solid var(--border)" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
                      <Avatar u={p.author} size={32}/>
                      <span style={{ fontSize:13,fontWeight:700,color:"var(--purple)" }}>{p.author}</span>
                      <span style={{ marginLeft:"auto",fontSize:12,color:"var(--sub)" }}>❤️ {p.reactions}</span>
                    </div>
                    <div style={{ fontSize:13,color:"var(--text)",lineHeight:1.5 }}>{p.text}</div>
                  </div>
                ))}
              </div>
            )}
            {/* Featured channels */}
            {channels.length>0&&(
              <div style={{ marginBottom:20 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                  <div style={{ fontSize:14,fontWeight:800,color:"var(--text)" }}>📢 Channels to Join</div>
                  <button onClick={()=>navigate("/channels")} style={{ background:"none",border:"none",color:"var(--purple)",fontSize:12,fontWeight:700,cursor:"pointer" }}>See all →</button>
                </div>
                <div style={{ display:"flex",gap:10,overflowX:"auto",scrollbarWidth:"none",paddingBottom:4 }}>
                  {channels.slice(0,6).map(c=>(
                    <div key={c.id} onClick={()=>navigate("/channels")}
                      style={{ background:"var(--surface)",borderRadius:16,padding:"14px",border:"1px solid var(--border)",flexShrink:0,width:160,cursor:"pointer" }}>
                      <div style={{ width:44,height:44,borderRadius:12,background:avatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:900,color:"#fff",marginBottom:8 }}>{c.name[0]?.toUpperCase()}</div>
                      <div style={{ fontSize:13,fontWeight:800,color:"var(--text)",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>📢 {c.name}</div>
                      <div style={{ fontSize:11,color:"var(--sub)",marginBottom:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.description||c.category}</div>
                      <div style={{ fontSize:11,color:"var(--sub)" }}>👥 {c.subscribers?.length||0} subscribers</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Suggested people */}
            {suggested.length>0&&(
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:14,fontWeight:800,color:"var(--text)",marginBottom:10 }}>👥 People You May Know</div>
                {suggested.slice(0,8).map(u=>(
                  <div key={u.username} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"var(--surface)",borderRadius:14,marginBottom:8,border:"1px solid var(--border)" }}>
                    <Avatar u={u.username} size={44}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14,fontWeight:800,color:"var(--text)" }}>{u.username}</div>
                      <div style={{ fontSize:12,color:"var(--sub)" }}>Red Rose 🥀 member</div>
                    </div>
                    <button onClick={()=>follow(u.username)}
                      style={{ padding:"6px 14px",borderRadius:20,border:"1.5px solid var(--purple)",
                        background:following.includes(u.username)?"var(--purple)":"transparent",
                        color:following.includes(u.username)?"#fff":"var(--purple)",fontWeight:700,fontSize:12,cursor:"pointer" }}>
                      {following.includes(u.username)?"✓ Following":"+ Follow"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* TRENDING TAB */}
        {tab==="trending"&&(
          <div>
            <div style={{ fontSize:14,fontWeight:800,color:"var(--text)",marginBottom:14 }}>🔥 Trending Hashtags</div>
            {trending.length===0&&<div style={{ textAlign:"center",padding:40,color:"var(--sub)" }}>No trending topics yet</div>}
            {trending.map(({tag,count},i)=>(
              <div key={tag} onClick={()=>{setSearch(tag);onSearchChange(tag);}}
                style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"var(--surface)",borderRadius:14,marginBottom:8,border:"1px solid var(--border)",cursor:"pointer" }}>
                <div style={{ width:36,height:36,borderRadius:10,background:"rgba(108,127,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"var(--purple)",flexShrink:0 }}>
                  #{i+1}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14,fontWeight:800,color:"var(--purple)" }}>{tag}</div>
                  <div style={{ fontSize:12,color:"var(--sub)" }}>{count} post{count!==1?"s":""}</div>
                </div>
                <span style={{ fontSize:20 }}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":"🔥"}</span>
              </div>
            ))}
          </div>
        )}

        {/* PEOPLE TAB */}
        {tab==="people"&&(
          <div>
            <div style={{ fontSize:14,fontWeight:800,color:"var(--text)",marginBottom:14 }}>👥 Suggested People</div>
            {suggested.length===0&&<div style={{ textAlign:"center",padding:40,color:"var(--sub)" }}>No suggestions available</div>}
            {suggested.map(u=>(
              <div key={u.username} style={{ display:"flex",alignItems:"center",gap:12,padding:"14px 16px",background:"var(--surface)",borderRadius:16,marginBottom:10,border:"1px solid var(--border)" }}>
                <Avatar u={u.username} size={52}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15,fontWeight:800,color:"var(--text)" }}>{u.username}</div>
                  <div style={{ fontSize:12,color:"var(--sub)",marginTop:2 }}>Red Rose 🥀 student</div>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                  <button onClick={()=>follow(u.username)}
                    style={{ padding:"6px 16px",borderRadius:20,border:"1.5px solid var(--purple)",
                      background:following.includes(u.username)?"var(--purple)":"transparent",
                      color:following.includes(u.username)?"#fff":"var(--purple)",fontWeight:700,fontSize:12,cursor:"pointer" }}>
                    {following.includes(u.username)?"✓ Following":"+ Follow"}
                  </button>
                  <button onClick={async()=>{
                    const r=await fetch("/api/dm/threads",{method:"POST",headers:xhdr(),body:JSON.stringify({other:u.username})});
                    const d=await r.json(); if(d.id)navigate("/messages");
                  }} style={{ padding:"5px 14px",borderRadius:20,border:"1px solid var(--border)",background:"transparent",color:"var(--sub)",fontWeight:600,fontSize:11,cursor:"pointer" }}>
                    💬 Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CHANNELS TAB */}
        {tab==="channels"&&(
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
              <div style={{ fontSize:14,fontWeight:800,color:"var(--text)" }}>📢 All Channels</div>
              <button onClick={()=>navigate("/channels")} style={{ background:"none",border:"none",color:"var(--purple)",fontSize:12,fontWeight:700,cursor:"pointer" }}>Open →</button>
            </div>
            {channels.length===0&&<div style={{ textAlign:"center",padding:40,color:"var(--sub)" }}>No channels yet</div>}
            {channels.map(c=>(
              <div key={c.id} onClick={()=>navigate("/channels")}
                style={{ display:"flex",alignItems:"center",gap:12,padding:"14px 16px",background:"var(--surface)",borderRadius:16,marginBottom:10,border:"1px solid var(--border)",cursor:"pointer" }}>
                <div style={{ width:52,height:52,borderRadius:14,background:avatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:900,color:"#fff",flexShrink:0 }}>{c.name[0]?.toUpperCase()}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15,fontWeight:800,color:"var(--text)" }}>📢 {c.name}</div>
                  <div style={{ fontSize:12,color:"var(--sub)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.description}</div>
                  <div style={{ fontSize:11,color:"var(--sub)",marginTop:4 }}>👥 {c.subscribers?.length||0} · 📂 {c.category}</div>
                </div>
                <button onClick={e=>{e.stopPropagation();subscribe(c.id);}}
                  style={{ padding:"6px 14px",borderRadius:20,border:"1.5px solid var(--purple)",
                    background:c.subscribers?.includes(me)?"var(--purple)":"transparent",
                    color:c.subscribers?.includes(me)?"#fff":"var(--purple)",fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0 }}>
                  {c.subscribers?.includes(me)?"✓":"Join"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="dash-bottom-nav">
        <button className="dash-bottom-nav-item" onClick={()=>navigate("/")}><span style={{ fontSize:22 }}>🏠</span><span style={{ fontSize:10 }}>Home</span></button>
        <button className="dash-bottom-nav-item" onClick={()=>navigate("/community")}><span style={{ fontSize:22 }}>🌐</span><span style={{ fontSize:10 }}>Community</span></button>
        <button className="dash-bottom-nav-item" onClick={()=>navigate("/messages")}><span style={{ fontSize:22 }}>💬</span><span style={{ fontSize:10 }}>Messages</span></button>
        <button className="dash-bottom-nav-item" onClick={()=>navigate("/channels")}><span style={{ fontSize:22 }}>📢</span><span style={{ fontSize:10 }}>Channels</span></button>
        <button className="dash-bottom-nav-item" style={{ color:"var(--purple)" }}><span style={{ fontSize:22 }}>🔍</span><span style={{ fontSize:10,fontWeight:800 }}>Explore</span></button>
      </div>
    </div>
  );
}
