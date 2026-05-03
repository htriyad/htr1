import { useState, useEffect, useCallback } from "react";
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

export default function HashtagPage() {
  const [,nav] = useLocation();
  const tag = window.location.pathname.split("/hashtag/")[1] || "";
  const [posts, setPosts] = useState<any[]>([]);
  const [related, setRelated] = useState<string[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [sort, setSort] = useState<"latest"|"top">("latest");

  const load = useCallback(async () => {
    setLoading(true);
    const [sr, tr] = await Promise.all([
      fetch(`/api/explore/search?q=%23${encodeURIComponent(tag)}`).then(r=>r.json()).catch(()=>({posts:[]})),
      fetch("/api/explore/trending").then(r=>r.json()).catch(()=>({trending:[]})),
    ]);
    const tagPosts = (sr.posts || []).filter((p: any) =>
      p.text?.toLowerCase().includes(`#${tag.toLowerCase()}`)
    );
    setPosts(tagPosts);
    const trendTags = (tr.trending || []).map((t: any) => t.tag).filter((t: string) => t !== `#${tag}`);
    setRelated(trendTags.slice(0, 8));
    setTrending(tr.trending || []);
    setLoading(false);
  }, [tag]);

  useEffect(() => { load(); }, [load]);

  const sorted = sort === "top"
    ? [...posts].sort((a, b) => Object.values(b.reactions || {}).flat().length - Object.values(a.reactions || {}).flat().length)
    : posts;

  const tagCount = trending.find((t: any) => t.tag === `#${tag}`)?.count || posts.length;

  return (
    <div style={{ minHeight:"100svh", background:"var(--bg)", fontFamily:"Roboto,'Noto Sans Bengali',sans-serif" }}>
      <Header title={`#${tag}`} />

      {/* Hashtag hero */}
      <div style={{ background:"linear-gradient(135deg,var(--purple),#db2777)", padding:"24px 20px", textAlign:"center" }}>
        <div style={{ fontSize:36, marginBottom:4 }}>🏷️</div>
        <div style={{ fontSize:28, fontWeight:900, color:"#fff", fontFamily:"Lato,sans-serif" }}>#{tag}</div>
        <div style={{ fontSize:14, color:"rgba(255,255,255,0.8)", marginTop:4 }}>{tagCount} post{tagCount !== 1 ? "s" : ""}</div>
        <div style={{ display:"flex", gap:10, justifyContent:"center", marginTop:16 }}>
          <button onClick={() => setFollowing(f => !f)} style={{ padding:"9px 24px", borderRadius:20, border:"2px solid rgba(255,255,255,0.7)", background:following?"#fff":"transparent", color:following?"var(--purple)":"#fff", fontWeight:800, fontSize:13, cursor:"pointer" }}>
            {following ? "✓ Following" : "+ Follow #"+tag}
          </button>
          <button onClick={() => nav("/community")} style={{ padding:"9px 20px", borderRadius:20, border:"2px solid rgba(255,255,255,0.4)", background:"transparent", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            Post with #{tag}
          </button>
        </div>
      </div>

      {/* Related tags */}
      {related.length > 0 && (
        <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--border)" }}>
          <div style={{ fontSize:12, fontWeight:700, color:"var(--sub)", marginBottom:8, textTransform:"uppercase" }}>Related Tags</div>
          <div style={{ display:"flex", gap:8, overflowX:"auto", scrollbarWidth:"none" }}>
            {related.map(t => (
              <button key={t} onClick={() => nav(`/hashtag/${t.replace("#","")}`)}
                style={{ padding:"5px 12px", borderRadius:20, border:"1.5px solid var(--border)", background:"var(--surface)", color:"var(--purple)", fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sort + count */}
      <div style={{ display:"flex", alignItems:"center", padding:"10px 16px", borderBottom:"1px solid var(--border)", gap:8 }}>
        <div style={{ fontSize:13, color:"var(--sub)", flex:1 }}>{loading ? "Loading…" : `${posts.length} posts`}</div>
        {(["latest","top"] as const).map(s => (
          <button key={s} onClick={() => setSort(s)} style={{ padding:"5px 14px", borderRadius:20, border:`1.5px solid ${sort===s?"var(--purple)":"var(--border)"}`, background:sort===s?"rgba(124,58,237,0.1)":"transparent", color:sort===s?"var(--purple)":"var(--sub)", fontWeight:700, fontSize:12, cursor:"pointer" }}>
            {s === "latest" ? "🕐 Latest" : "🔥 Top"}
          </button>
        ))}
      </div>

      {/* Posts */}
      <div style={{ padding:"12px 16px 80px" }}>
        {loading && <div style={{ textAlign:"center", padding:48, color:"var(--sub)" }}>Loading posts…</div>}
        {!loading && sorted.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 20px", color:"var(--sub)" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🏷️</div>
            <div style={{ fontSize:17, fontWeight:800, color:"var(--text)" }}>No posts yet for #{tag}</div>
            <div style={{ fontSize:13, marginTop:8 }}>Be the first to post with this hashtag!</div>
            <button onClick={() => nav("/community")} style={{ marginTop:20, padding:"10px 24px", borderRadius:20, border:"none", background:"var(--purple)", color:"#fff", fontWeight:700, cursor:"pointer" }}>
              Create Post
            </button>
          </div>
        )}
        {sorted.map((p: any) => {
          const totalR = Object.values(p.reactions || {}).flat().length;
          return (
            <div key={p.id} style={{ background:"var(--surface)", borderRadius:16, padding:"14px 16px", marginBottom:12, border:"1px solid var(--border)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:40, height:40, borderRadius:"50%", background:avatarColor(p.author), color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:16, cursor:"pointer", flexShrink:0 }} onClick={() => nav(`/social/${p.author}`)}>
                  {p.author?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800, fontSize:14, color:"var(--text)", cursor:"pointer" }} onClick={() => nav(`/social/${p.author}`)}>{p.author}</div>
                  <div style={{ fontSize:11, color:"var(--sub)" }}>{timeAgo(p.createdAt)}</div>
                </div>
                {p.subject && <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:"rgba(124,58,237,0.12)", color:"var(--purple)", fontWeight:700 }}>{p.subject}</span>}
              </div>
              {p.text && (
                <div style={{ fontSize:14, color:"var(--text)", lineHeight:1.6, marginBottom:8, whiteSpace:"pre-wrap" }}>
                  {p.text.split(/(#[\w\u0980-\u09FF]+)/g).map((part: string, i: number) =>
                    part.startsWith("#")
                      ? <span key={i} style={{ color:"var(--purple)", fontWeight:700, cursor:"pointer" }} onClick={() => nav(`/hashtag/${part.slice(1)}`)}>{part}</span>
                      : <span key={i}>{part}</span>
                  )}
                </div>
              )}
              {p.imageData && <img src={p.imageData} alt="" style={{ width:"100%", borderRadius:12, maxHeight:300, objectFit:"cover", display:"block", marginBottom:8 }} />}
              <div style={{ display:"flex", gap:14, fontSize:13, color:"var(--sub)" }}>
                <span>❤️ {totalR}</span>
                <span>💬 {(p.comments||[]).length}</span>
                <span style={{ marginLeft:"auto", cursor:"pointer" }} onClick={() => nav("/community")}>View →</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dash-bottom-nav">
        <button className="dash-bottom-nav-item" onClick={()=>nav("/")}><span style={{fontSize:22}}>🏠</span><span style={{fontSize:10}}>Home</span></button>
        <button className="dash-bottom-nav-item" onClick={()=>nav("/community")}><span style={{fontSize:22}}>🌐</span><span style={{fontSize:10}}>Community</span></button>
        <button className="dash-bottom-nav-item" onClick={()=>nav("/explore")}><span style={{fontSize:22}}>🔍</span><span style={{fontSize:10}}>Explore</span></button>
        <button className="dash-bottom-nav-item" onClick={()=>nav("/messages")}><span style={{fontSize:22}}>💬</span><span style={{fontSize:10}}>Messages</span></button>
        <button className="dash-bottom-nav-item" onClick={()=>nav("/friends")}><span style={{fontSize:22}}>👥</span><span style={{fontSize:10}}>Friends</span></button>
      </div>
    </div>
  );
}
