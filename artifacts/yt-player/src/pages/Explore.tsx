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
    <div style={{ width:size,height:size,borderRadius:"50%",background:avatarColor(u),
      display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.44,fontWeight:900,color:"#fff",flexShrink:0 }}>
      {u[0]?.toUpperCase()}
    </div>
  );
}

const SUBJECT_ICONS: Record<string,string> = { Physics:"⚡", Chemistry:"🧪", Biology:"🔬", Math:"🔢", English:"📝", Bangla:"📖", ICT:"💻", BCS:"🏛️", Admission:"🎓", General:"💬" };
type Tab = "discover"|"trending"|"topics"|"people"|"streaks"|"channels"|"search";

export default function Explore() {
  const me = UN();
  const [,navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("discover");
  const [search, setSearch] = useState("");
  const [trending, setTrending] = useState<any[]>([]);
  const [popular, setPopular] = useState<any[]>([]);
  const [suggested, setSuggested] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<{posts:any[];users:any[];channels:any[];groups:any[]}>({posts:[],users:[],channels:[],groups:[]});
  const [searching, setSearching] = useState(false);
  const [streaks, setStreaks] = useState<any[]>([]);
  const [reactLeaders, setReactLeaders] = useState<any[]>([]);
  const [activeTag, setActiveTag] = useState<string|null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const EXAM_SUBJECTS = ["Physics","Chemistry","Biology","Math","English","Bangla","ICT","BCS","Admission","General"];

  const loadData = useCallback(async()=>{
    const [trendR, sugR, chR, strR, reactR] = await Promise.all([
      fetch("/api/explore/trending").then(r=>r.json()).catch(()=>({trending:[],popular:[]})),
      fetch("/api/social/suggested",{headers:xhdr()}).then(r=>r.json()).catch(()=>[]),
      fetch("/api/channels").then(r=>r.json()).catch(()=>[]),
      fetch("/api/leaderboard/streaks",{headers:xhdr()}).then(r=>r.json()).catch(()=>[]),
      fetch("/api/community/reactions-leaderboard",{headers:xhdr()}).then(r=>r.json()).catch(()=>[]),
    ]);
    setTrending(Array.isArray(trendR.trending)?trendR.trending:[]);
    setPopular(Array.isArray(trendR.popular)?trendR.popular:[]);
    setSuggested(Array.isArray(sugR)?sugR:[]);
    setChannels(Array.isArray(chR)?chR:[]);
    setStreaks(Array.isArray(strR)?strR:[]);
    setReactLeaders(Array.isArray(reactR)?reactR:[]);
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
    setChannels(prev=>prev.map(c=>c.id===chId?{...c,subscribers:c.subscribers.includes(me)?c.subscribers.filter((s:string)=>s!==me):[...c.subscribers,me]}:c));
  }

  const TABS: {id:Tab;label:string;icon:string}[] = [
    {id:"discover",label:"Discover",icon:"🌟"},
    {id:"trending",label:"Trending",icon:"🔥"},
    {id:"topics",label:"Topics",icon:"📚"},
    {id:"people",label:"People",icon:"👥"},
    {id:"streaks",label:"Streaks",icon:"🏆"},
    {id:"channels",label:"Channels",icon:"📢"},
  ];

  const STREAK_MEDALS = ["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];

  return (
    <div style={{ minHeight:"100svh",background:"var(--bg)" }}>
      <Header/>
      {/* Search bar */}
      <div style={{ background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"12px 14px",position:"sticky",top:56,zIndex:50 }}>
        <div style={{ background:"var(--bg)",borderRadius:24,border:"1.5px solid var(--border)",display:"flex",alignItems:"center",padding:"10px 16px",gap:10 }}>
          <span style={{ color:"var(--sub)",fontSize:18 }}>🔍</span>
          <input value={search} onChange={e=>onSearchChange(e.target.value)}
            placeholder="Search people, posts, channels, topics…"
            style={{ flex:1,background:"none",border:"none",color:"var(--text)",fontSize:14,outline:"none",fontFamily:"inherit" }}/>
          {search&&<button onClick={()=>onSearchChange("")} style={{ background:"none",border:"none",color:"var(--sub)",fontSize:16,cursor:"pointer" }}>✕</button>}
        </div>
        {!search&&(
          <div style={{ display:"flex",gap:0,marginTop:10,overflowX:"auto",scrollbarWidth:"none" }}>
            {TABS.map((t,i)=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{ flexShrink:0,padding:"7px 12px",border:"none",borderBottom:tab===t.id?"2px solid var(--purple)":"2px solid transparent",
                  background:"transparent",color:tab===t.id?"var(--purple)":"var(--sub)",fontWeight:tab===t.id?800:600,fontSize:11,cursor:"pointer",whiteSpace:"nowrap" }}>
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
                    <div style={{ fontSize:13,fontWeight:800,color:"var(--sub)",marginBottom:10,textTransform:"uppercase" }}>People</div>
                    {searchResults.users.map((u:any)=>(
                      <div key={u.username} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"var(--surface)",borderRadius:14,marginBottom:8,border:"1px solid var(--border)" }}>
                        <Avatar u={u.username} size={44}/>
                        <div style={{ flex:1,cursor:"pointer" }} onClick={()=>navigate(`/social/${u.username}`)}>
                          <div style={{ fontSize:14,fontWeight:800,color:"var(--text)" }}>{u.displayName||u.username}</div>
                          <div style={{ fontSize:12,color:"var(--sub)" }}>@{u.username}</div>
                        </div>
                        <button onClick={()=>follow(u.username)} style={{ padding:"6px 14px",borderRadius:20,border:"1.5px solid var(--purple)",background:following.includes(u.username)?"var(--purple)":"transparent",color:following.includes(u.username)?"#fff":"var(--purple)",fontWeight:700,fontSize:12,cursor:"pointer" }}>
                          {following.includes(u.username)?"✓ Following":"Follow"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.channels.length>0&&(
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:13,fontWeight:800,color:"var(--sub)",marginBottom:10,textTransform:"uppercase" }}>Channels</div>
                    {searchResults.channels.map((c:any)=>(
                      <div key={c.id} onClick={()=>navigate("/channels")} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"var(--surface)",borderRadius:14,marginBottom:8,border:"1px solid var(--border)",cursor:"pointer" }}>
                        <div style={{ width:44,height:44,borderRadius:12,background:avatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:900,color:"#fff" }}>{c.name[0]?.toUpperCase()}</div>
                        <div style={{ flex:1 }}><div style={{ fontSize:14,fontWeight:800,color:"var(--text)" }}>📢 {c.name}</div><div style={{ fontSize:12,color:"var(--sub)" }}>{c.subscribers?.length||0} subscribers</div></div>
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.posts.length>0&&(
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:13,fontWeight:800,color:"var(--sub)",marginBottom:10,textTransform:"uppercase" }}>Posts</div>
                    {searchResults.posts.map((p:any)=>(
                      <div key={p.id} style={{ background:"var(--surface)",borderRadius:14,padding:"12px 14px",marginBottom:8,border:"1px solid var(--border)" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
                          <Avatar u={p.author} size={32}/><span style={{ fontSize:13,fontWeight:700,color:"var(--purple)" }}>{p.author}</span>
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

        {/* DISCOVER */}
        {tab==="discover"&&(
          <>
            {trending.length>0&&(
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:14,fontWeight:800,color:"var(--text)",marginBottom:10 }}>🔥 Trending Now</div>
                <div style={{ display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none",paddingBottom:4 }}>
                  {trending.slice(0,10).map(({tag,count}:any)=>(
                    <button key={tag} onClick={()=>navigate(`/hashtag/${tag.replace("#","")}`)}
                      style={{ padding:"6px 14px",borderRadius:20,border:"1.5px solid var(--border)",background:activeTag===tag?"var(--purple)":"var(--surface)",
                        color:activeTag===tag?"#fff":"var(--text)",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0 }}>
                      {tag} <span style={{ fontSize:11,opacity:0.7 }}>{count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Trending Exam Topics */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:14,fontWeight:800,color:"var(--text)",marginBottom:10 }}>📚 Trending Exam Topics</div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8 }}>
                {EXAM_SUBJECTS.map((subj,i)=>(
                  <div key={subj} onClick={()=>navigate(`/hashtag/${subj}`)}
                    style={{ background:"var(--surface)",borderRadius:14,padding:"12px 14px",border:"1px solid var(--border)",cursor:"pointer",display:"flex",alignItems:"center",gap:10 }}>
                    <div style={{ width:36,height:36,borderRadius:10,background:`rgba(124,58,237,${0.1+i*0.02})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>
                      {SUBJECT_ICONS[subj]||"📌"}
                    </div>
                    <div>
                      <div style={{ fontSize:13,fontWeight:800,color:"var(--text)" }}>{subj}</div>
                      <div style={{ fontSize:11,color:"var(--sub)" }}>#{subj.toLowerCase()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {popular.length>0&&(
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:14,fontWeight:800,color:"var(--text)",marginBottom:10 }}>⭐ Popular Posts</div>
                {popular.map((p:any)=>(
                  <div key={p.id} style={{ background:"var(--surface)",borderRadius:14,padding:"12px 14px",marginBottom:8,border:"1px solid var(--border)" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
                      <Avatar u={p.author} size={32}/><span style={{ fontSize:13,fontWeight:700,color:"var(--purple)",cursor:"pointer" }} onClick={()=>navigate(`/social/${p.author}`)}>{p.author}</span>
                      <span style={{ marginLeft:"auto",fontSize:12,color:"var(--sub)" }}>❤️ {p.reactions}</span>
                    </div>
                    <div style={{ fontSize:13,color:"var(--text)",lineHeight:1.5 }}>{p.text}</div>
                  </div>
                ))}
              </div>
            )}
            {suggested.length>0&&(
              <div style={{ marginBottom:20 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                  <div style={{ fontSize:14,fontWeight:800,color:"var(--text)" }}>👥 People You May Know</div>
                  <button onClick={()=>setTab("people")} style={{ background:"none",border:"none",color:"var(--purple)",fontSize:12,fontWeight:700,cursor:"pointer" }}>See all →</button>
                </div>
                {suggested.slice(0,5).map((u:any)=>(
                  <div key={u.username} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"var(--surface)",borderRadius:14,marginBottom:8,border:"1px solid var(--border)" }}>
                    <Avatar u={u.username} size={44}/>
                    <div style={{ flex:1,cursor:"pointer" }} onClick={()=>navigate(`/social/${u.username}`)}>
                      <div style={{ fontSize:14,fontWeight:800,color:"var(--text)" }}>{u.displayName||u.username}</div>
                      <div style={{ fontSize:12,color:"var(--sub)" }}>Red Rose 🥀 member</div>
                    </div>
                    <button onClick={()=>follow(u.username)} style={{ padding:"6px 14px",borderRadius:20,border:"1.5px solid var(--purple)",background:following.includes(u.username)?"var(--purple)":"transparent",color:following.includes(u.username)?"#fff":"var(--purple)",fontWeight:700,fontSize:12,cursor:"pointer" }}>
                      {following.includes(u.username)?"✓":"+ Follow"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* TRENDING HASHTAGS */}
        {tab==="trending"&&(
          <div>
            <div style={{ fontSize:14,fontWeight:800,color:"var(--text)",marginBottom:14 }}>🔥 Trending Hashtags</div>
            {trending.length===0&&<div style={{ textAlign:"center",padding:40,color:"var(--sub)" }}>No trending topics yet</div>}
            {trending.map(({tag,count}:any,i:number)=>(
              <div key={tag} onClick={()=>navigate(`/hashtag/${tag.replace("#","")}`)}
                style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"var(--surface)",borderRadius:14,marginBottom:8,border:"1px solid var(--border)",cursor:"pointer" }}>
                <div style={{ width:36,height:36,borderRadius:10,background:"rgba(108,127,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"var(--purple)",flexShrink:0 }}>#{i+1}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14,fontWeight:800,color:"var(--purple)" }}>{tag}</div>
                  <div style={{ fontSize:12,color:"var(--sub)" }}>{count} post{count!==1?"s":""}</div>
                </div>
                <span style={{ fontSize:20 }}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":"🔥"}</span>
              </div>
            ))}
          </div>
        )}

        {/* EXAM TOPICS */}
        {tab==="topics"&&(
          <div>
            <div style={{ fontSize:14,fontWeight:800,color:"var(--text)",marginBottom:14 }}>📚 Exam Topics</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
              {EXAM_SUBJECTS.map((subj,i)=>(
                <div key={subj} onClick={()=>navigate(`/hashtag/${subj}`)}
                  style={{ background:"var(--surface)",borderRadius:16,padding:"18px 14px",border:"1px solid var(--border)",cursor:"pointer",textAlign:"center" }}>
                  <div style={{ fontSize:32,marginBottom:8 }}>{SUBJECT_ICONS[subj]||"📌"}</div>
                  <div style={{ fontSize:14,fontWeight:800,color:"var(--text)",marginBottom:4 }}>{subj}</div>
                  <div style={{ fontSize:11,color:"var(--sub)" }}>Tap to explore #{subj.toLowerCase()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PEOPLE */}
        {tab==="people"&&(
          <div>
            <div style={{ fontSize:14,fontWeight:800,color:"var(--text)",marginBottom:14 }}>👥 Suggested People</div>
            {/* Reactions leaderboard */}
            {reactLeaders.length>0&&(
              <div style={{ background:"linear-gradient(135deg,rgba(124,58,237,0.06),rgba(219,39,119,0.06))",borderRadius:16,padding:"14px 16px",marginBottom:16,border:"1px solid rgba(124,58,237,0.12)" }}>
                <div style={{ fontSize:13,fontWeight:800,color:"var(--text)",marginBottom:10 }}>🏆 Most Liked This Week</div>
                {reactLeaders.slice(0,5).map(({username,score}:any,i:number)=>(
                  <div key={username} style={{ display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:i<4?"1px solid rgba(124,58,237,0.08)":"none" }}>
                    <span style={{ fontSize:16,width:24,textAlign:"center" }}>{["🥇","🥈","🥉","4️⃣","5️⃣"][i]}</span>
                    <Avatar u={username} size={32}/>
                    <div style={{ flex:1,cursor:"pointer" }} onClick={()=>navigate(`/social/${username}`)}>
                      <div style={{ fontSize:13,fontWeight:700,color:"var(--text)" }}>{username}</div>
                    </div>
                    <div style={{ fontSize:12,fontWeight:800,color:"var(--purple)" }}>❤️ {score}</div>
                  </div>
                ))}
              </div>
            )}
            {suggested.length===0&&<div style={{ textAlign:"center",padding:40,color:"var(--sub)" }}>No suggestions</div>}
            {suggested.map((u:any)=>(
              <div key={u.username} style={{ display:"flex",alignItems:"center",gap:12,padding:"14px 16px",background:"var(--surface)",borderRadius:16,marginBottom:10,border:"1px solid var(--border)" }}>
                <Avatar u={u.username} size={52}/>
                <div style={{ flex:1,cursor:"pointer" }} onClick={()=>navigate(`/social/${u.username}`)}>
                  <div style={{ fontSize:15,fontWeight:800,color:"var(--text)" }}>{u.displayName||u.username}</div>
                  <div style={{ fontSize:12,color:"var(--sub)",marginTop:2 }}>Red Rose 🥀 student</div>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                  <button onClick={()=>follow(u.username)} style={{ padding:"6px 16px",borderRadius:20,border:"1.5px solid var(--purple)",background:following.includes(u.username)?"var(--purple)":"transparent",color:following.includes(u.username)?"#fff":"var(--purple)",fontWeight:700,fontSize:12,cursor:"pointer" }}>
                    {following.includes(u.username)?"✓ Following":"+ Follow"}
                  </button>
                  <button onClick={async()=>{const r=await fetch("/api/dm/threads",{method:"POST",headers:xhdr(),body:JSON.stringify({other:u.username})});const d=await r.json();if(d.id)navigate("/messages");}} style={{ padding:"5px 14px",borderRadius:20,border:"1px solid var(--border)",background:"transparent",color:"var(--sub)",fontWeight:600,fontSize:11,cursor:"pointer" }}>
                    💬 Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STUDY STREAK LEADERBOARD */}
        {tab==="streaks"&&(
          <div>
            <div style={{ background:"linear-gradient(135deg,#f59e0b,#dc2626)",borderRadius:16,padding:"20px 18px",marginBottom:16,textAlign:"center" }}>
              <div style={{ fontSize:36,marginBottom:6 }}>🔥</div>
              <div style={{ fontSize:18,fontWeight:900,color:"#fff",fontFamily:"Lato,sans-serif" }}>Study Streak Leaderboard</div>
              <div style={{ fontSize:13,color:"rgba(255,255,255,0.85)",marginTop:4 }}>Post daily to build your streak!</div>
            </div>
            {streaks.length===0&&<div style={{ textAlign:"center",padding:40,color:"var(--sub)" }}>No streaks yet. Start posting daily!</div>}
            {streaks.map(({username,streak,totalPosts}:any,i:number)=>(
              <div key={username} style={{ display:"flex",alignItems:"center",gap:12,padding:"14px 16px",background:"var(--surface)",borderRadius:16,marginBottom:10,border:`1px solid ${i<3?"rgba(245,158,11,0.3)":"var(--border)"}`,cursor:"pointer" }} onClick={()=>navigate(`/social/${username}`)}>
                <span style={{ fontSize:24,width:32,textAlign:"center",flexShrink:0 }}>{STREAK_MEDALS[i]||"📌"}</span>
                <Avatar u={username} size={44}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14,fontWeight:800,color:"var(--text)" }}>{username}{username===me&&" (You)"}</div>
                  <div style={{ fontSize:11,color:"var(--sub)",marginTop:2 }}>{totalPosts} total posts</div>
                </div>
                <div style={{ textAlign:"center",flexShrink:0 }}>
                  <div style={{ fontSize:22,fontWeight:900,color:i<3?"#f59e0b":"var(--text)",fontFamily:"Lato,sans-serif",lineHeight:1 }}>{streak}</div>
                  <div style={{ fontSize:10,color:"var(--sub)" }}>day{streak!==1?"s":""}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CHANNELS */}
        {tab==="channels"&&(
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
              <div style={{ fontSize:14,fontWeight:800,color:"var(--text)" }}>📢 All Channels</div>
              <button onClick={()=>navigate("/channels")} style={{ background:"none",border:"none",color:"var(--purple)",fontSize:12,fontWeight:700,cursor:"pointer" }}>Open →</button>
            </div>
            {channels.length===0&&<div style={{ textAlign:"center",padding:40,color:"var(--sub)" }}>No channels yet</div>}
            {channels.map((c:any)=>(
              <div key={c.id} onClick={()=>navigate("/channels")} style={{ display:"flex",alignItems:"center",gap:12,padding:"14px 16px",background:"var(--surface)",borderRadius:16,marginBottom:10,border:"1px solid var(--border)",cursor:"pointer" }}>
                <div style={{ width:52,height:52,borderRadius:14,background:avatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:900,color:"#fff",flexShrink:0 }}>{c.name[0]?.toUpperCase()}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15,fontWeight:800,color:"var(--text)" }}>📢 {c.name}</div>
                  <div style={{ fontSize:12,color:"var(--sub)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.description}</div>
                  <div style={{ fontSize:11,color:"var(--sub)",marginTop:4 }}>👥 {c.subscribers?.length||0} · 📂 {c.category}</div>
                </div>
                <button onClick={e=>{e.stopPropagation();subscribe(c.id);}} style={{ padding:"6px 14px",borderRadius:20,border:"1.5px solid var(--purple)",background:c.subscribers?.includes(me)?"var(--purple)":"transparent",color:c.subscribers?.includes(me)?"#fff":"var(--purple)",fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0 }}>
                  {c.subscribers?.includes(me)?"✓":"Join"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dash-bottom-nav">
        <button className="dash-bottom-nav-item" onClick={()=>navigate("/")}><span style={{fontSize:22}}>🏠</span><span style={{fontSize:10}}>Home</span></button>
        <button className="dash-bottom-nav-item" onClick={()=>navigate("/community")}><span style={{fontSize:22}}>🌐</span><span style={{fontSize:10}}>Community</span></button>
        <button className="dash-bottom-nav-item" onClick={()=>navigate("/messages")}><span style={{fontSize:22}}>💬</span><span style={{fontSize:10}}>Messages</span></button>
        <button className="dash-bottom-nav-item" onClick={()=>navigate("/channels")}><span style={{fontSize:22}}>📢</span><span style={{fontSize:10}}>Channels</span></button>
        <button className="dash-bottom-nav-item" style={{ color:"var(--purple)" }}><span style={{fontSize:22}}>🔍</span><span style={{fontSize:10,fontWeight:800}}>Explore</span></button>
      </div>
    </div>
  );
}
