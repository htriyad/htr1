import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { getModToken, getModRole, getModUsername, modHeaders } from "./ModLogin";

const MOD_TOKEN_KEY = "rr_mod_token";
const MOD_ROLE_KEY  = "rr_mod_role";
const MOD_NAME_KEY  = "rr_mod_username";

/* ── ROLE DEFINITIONS ────────────────────────────────────── */
export const ROLE_DEFS: Record<string, {icon:string;label:string;color:string;bg:string}> = {
  owner:       { icon:"👑", label:"Owner",       color:"#FFD700", bg:"rgba(255,215,0,0.18)"   },
  admin:       { icon:"🛡️", label:"Admin",       color:"#DC2626", bg:"rgba(220,38,38,0.13)"   },
  moderator:   { icon:"⚔️", label:"Mod",         color:"#7C3AED", bg:"rgba(124,58,237,0.13)"  },
  teacher:     { icon:"🎓", label:"Teacher",     color:"#0EA5E9", bg:"rgba(14,165,233,0.13)"  },
  scholar:     { icon:"📚", label:"Scholar",     color:"#10B981", bg:"rgba(16,185,129,0.13)"  },
  champion:    { icon:"🏆", label:"Champion",    color:"#F59E0B", bg:"rgba(245,158,11,0.13)"  },
  elite:       { icon:"💎", label:"Elite",       color:"#6366F1", bg:"rgba(99,102,241,0.13)"  },
  contributor: { icon:"🌟", label:"Helper",      color:"#EC4899", bg:"rgba(236,72,153,0.13)"  },
  verified:    { icon:"✅", label:"Verified",    color:"#3B82F6", bg:"rgba(59,130,246,0.13)"  },
  active:      { icon:"🔥", label:"Active",      color:"#EF4444", bg:"rgba(239,68,68,0.13)"   },
  veteran:     { icon:"🎖️", label:"Veteran",     color:"#8B5CF6", bg:"rgba(139,92,246,0.13)"  },
  newcomer:    { icon:"🆕", label:"Newcomer",    color:"#64748B", bg:"rgba(100,116,139,0.13)" },
};

export function RoleBadge({ role, small=false }: { role:string; small?:boolean }) {
  const def = ROLE_DEFS[role];
  if (!def) return null;
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",gap:3,padding:small?"1px 5px":"2px 8px",
      borderRadius:20,background:def.bg,border:`1px solid ${def.color}30`,
      fontSize:small?9:10.5,fontWeight:800,color:def.color,whiteSpace:"nowrap",flexShrink:0,
    }}>
      {def.icon} {def.label}
    </span>
  );
}

function avatarColor(u: string) {
  const p=["#7c3aed","#0ea5e9","#f59e0b","#ef4444","#10b981","#6366f1","#ec4899","#14b8a6"];
  let n=0; for(const c of u) n+=c.charCodeAt(0); return p[n%p.length];
}
function Avatar({ u, size=36 }: { u:string; size?:number }) {
  return <div style={{ width:size,height:size,borderRadius:size/2.5,background:avatarColor(u),display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.44,fontWeight:900,color:"#fff",flexShrink:0 }}>{u[0]?.toUpperCase()}</div>;
}
function timeAgo(ts:string){
  const d=(Date.now()-new Date(ts).getTime())/1000;
  if(d<60) return "Just now"; if(d<3600) return `${Math.floor(d/60)}m ago`;
  if(d<86400) return `${Math.floor(d/3600)}h ago`; return `${Math.floor(d/86400)}d ago`;
}

interface Post { id:string; author:string; text:string; subject?:string; createdAt:string; reactions:Record<string,string[]>; comments:any[]; }
interface ModUser { username:string; role:string; warned:boolean; banned:boolean; }
interface Report { id:string; postId:string; reporter:string; reason:string; createdAt:string; resolved:boolean; }
interface ModAccount { id:string; username:string; role:string; createdAt:string; }

const TABS = ["📊 Overview","📌 Posts","👥 Users","⚠️ Reports","📢 Announce","🛡️ Mods"] as const;
type Tab = typeof TABS[number];

export default function ModPanel() {
  const [,navigate] = useLocation();
  const token = getModToken();
  const role  = getModRole();
  const me    = getModUsername();

  const [tab,     setTab]     = useState<Tab>("📊 Overview");
  const [posts,   setPosts]   = useState<Post[]>([]);
  const [users,   setUsers]   = useState<ModUser[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [mods,    setMods]    = useState<ModAccount[]>([]);
  const [roles,   setRoles]   = useState<Record<string,string>>({});
  const [pins,    setPins]    = useState<string[]>([]);
  const [ann,     setAnn]     = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState("");
  const [newAnn,  setNewAnn]  = useState("");

  // New mod form
  const [newModUser, setNewModUser] = useState("");
  const [newModPass, setNewModPass] = useState("");
  const [newModRole, setNewModRole] = useState("moderator");

  const isAdmin = role === "admin" || me === "htr";

  // Redirect if not logged in
  useEffect(() => { if (!token) navigate("/mod-login"); }, [token]);

  const loadAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [pR,uR,rR,roR,piR] = await Promise.all([
        fetch("/api/community/feed?page=0",       { headers: modHeaders() }),
        fetch("/api/mod/users",                    { headers: modHeaders() }),
        fetch("/api/mod/reports",                  { headers: modHeaders() }),
        fetch("/api/community/roles"),
        fetch("/api/community/pins"),
      ]);
      if(pR.ok)  setPosts(await pR.json());
      if(uR.ok)  setUsers(await uR.json());
      if(rR.ok)  setReports(await rR.json());
      if(roR.ok) setRoles(await roR.json());
      if(piR.ok) { const d=await piR.json(); setPins(d.pins||[]); setAnn(d.announces||[]); }
      if(isAdmin){
        const mR=await fetch("/api/admin/mods",{ headers:{ Authorization:`Bearer ${token}`,"Content-Type":"application/json" } });
        if(mR.ok) setMods(await mR.json());
      }
    } finally { setLoading(false); }
  }, [token, isAdmin]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function pinPost(id: string) {
    await fetch(`/api/community/posts/${id}/pin`,{ method:"POST",headers:modHeaders() });
    loadAll();
  }
  async function announcePost(id: string) {
    await fetch(`/api/community/posts/${id}/announce`,{ method:"POST",headers:modHeaders() });
    loadAll();
  }
  async function deletePost(id: string) {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/community/posts/${id}`,{ method:"DELETE",headers:{...modHeaders(),"x-username":me} });
    setPosts(prev => prev.filter(p=>p.id!==id));
  }
  async function assignRole(username:string, newRole:string) {
    await fetch("/api/community/roles/assign",{ method:"POST",headers:modHeaders(),body:JSON.stringify({username,role:newRole}) });
    setRoles(prev => ({ ...prev, [username]: newRole }));
  }
  async function warnUser(username:string) {
    await fetch(`/api/mod/users/${username}/warn`,{ method:"POST",headers:modHeaders(),body:"{}" });
    setMsg(`⚠️ Warning sent to ${username}`); setTimeout(()=>setMsg(""),3000);
    loadAll();
  }
  async function banUser(username:string) {
    if (!confirm(`Ban ${username} from the community?`)) return;
    await fetch(`/api/mod/users/${username}/ban`,{ method:"POST",headers:modHeaders(),body:"{}" });
    setMsg(`🚫 ${username} banned`); setTimeout(()=>setMsg(""),3000);
    loadAll();
  }
  async function unbanUser(username:string) {
    await fetch(`/api/mod/users/${username}/unban`,{ method:"POST",headers:modHeaders(),body:"{}" });
    loadAll();
  }
  async function resolveReport(id:string) {
    await fetch(`/api/mod/reports/${id}/resolve`,{ method:"PATCH",headers:modHeaders(),body:"{}" });
    setReports(prev => prev.map(r=>r.id===id?{...r,resolved:true}:r));
  }
  async function postAnnouncement() {
    if (!newAnn.trim()) return;
    await fetch("/api/mod/announce",{ method:"POST",headers:modHeaders(),body:JSON.stringify({text:newAnn}) });
    setNewAnn(""); setMsg("📢 Announcement posted!"); setTimeout(()=>setMsg(""),3000); loadAll();
  }
  async function addMod() {
    if (!newModUser.trim() || !newModPass.trim()) return;
    const r=await fetch("/api/admin/mods",{ method:"POST",headers:{ Authorization:`Bearer ${token}`,"Content-Type":"application/json" },body:JSON.stringify({username:newModUser.trim(),password:newModPass,role:newModRole}) });
    if(r.ok){ setNewModUser(""); setNewModPass(""); setMsg("✅ Moderator added"); setTimeout(()=>setMsg(""),3000); loadAll(); }
    else { const d=await r.json(); setMsg("❌ "+d.error); setTimeout(()=>setMsg(""),3000); }
  }
  async function removeMod(id:string) {
    if (!confirm("Remove this moderator?")) return;
    await fetch(`/api/admin/mods/${id}`,{ method:"DELETE",headers:{ Authorization:`Bearer ${token}`,"Content-Type":"application/json" } });
    loadAll();
  }
  function logout() {
    fetch("/api/mod/logout",{ method:"POST",headers:modHeaders() }).catch(()=>{});
    sessionStorage.removeItem(MOD_TOKEN_KEY); sessionStorage.removeItem(MOD_ROLE_KEY); sessionStorage.removeItem(MOD_NAME_KEY);
    navigate("/community");
  }

  const unresolvedReports = reports.filter(r=>!r.resolved).length;
  const totalReactions = posts.reduce((s,p)=>s+Object.values(p.reactions).reduce((ss,arr)=>ss+arr.length,0),0);

  return (
    <div style={{ minHeight:"100svh",background:"var(--bg)",paddingBottom:32 }}>
      {/* Top bar */}
      <div style={{ background:"linear-gradient(135deg,#1e0a3c,#3b0764)",borderBottom:"1px solid #4c1d95",padding:"0 16px",display:"flex",alignItems:"center",gap:12,height:56,position:"sticky",top:0,zIndex:200 }}>
        <div style={{ fontSize:22 }}>🛡️</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14,fontWeight:900,color:"#fff",letterSpacing:"-0.3px" }}>Mod Panel</div>
          <div style={{ fontSize:10,color:"rgba(255,255,255,0.5)" }}>Red Rose 🥀 Community</div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <RoleBadge role={isAdmin?"admin":role}/>
          <span style={{ fontSize:12,color:"rgba(255,255,255,0.7)",fontWeight:700 }}>{me}</span>
          <button onClick={() => navigate("/community")}
            style={{ padding:"5px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.2)",background:"transparent",color:"rgba(255,255,255,0.7)",fontSize:11,cursor:"pointer" }}>
            ← Community
          </button>
          <button onClick={logout}
            style={{ padding:"5px 10px",borderRadius:8,border:"none",background:"#ef4444",color:"#fff",fontSize:11,cursor:"pointer",fontWeight:700 }}>
            Logout
          </button>
        </div>
      </div>

      {/* Toast */}
      {msg && (
        <div style={{ position:"fixed",top:64,left:"50%",transform:"translateX(-50%)",zIndex:9999,
          background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:"10px 20px",
          fontSize:13,fontWeight:700,color:"var(--text)",boxShadow:"0 8px 24px rgba(0,0,0,0.2)",whiteSpace:"nowrap" }}>
          {msg}
        </div>
      )}

      <div style={{ maxWidth:900,margin:"0 auto",padding:"0 12px" }}>
        {/* Tabs */}
        <div style={{ display:"flex",gap:4,overflowX:"auto",padding:"12px 0 8px",scrollbarWidth:"none" }}>
          {TABS.map(t => {
            const active = t === tab;
            const hasBadge = t==="⚠️ Reports" && unresolvedReports>0;
            return (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding:"8px 14px",borderRadius:12,border:"none",whiteSpace:"nowrap",flexShrink:0,cursor:"pointer",fontSize:12,fontWeight:active?800:600,position:"relative",
                  background:active?"var(--purple)":"var(--surface)",color:active?"#fff":"var(--sub)",transition:"all 200ms" }}>
                {t}
                {hasBadge && <span style={{ position:"absolute",top:4,right:4,width:8,height:8,borderRadius:"50%",background:"#ef4444" }}/>}
              </button>
            );
          })}
        </div>

        {loading && <div style={{ textAlign:"center",padding:32,color:"var(--sub)",fontSize:14 }}>Loading…</div>}

        {/* ── OVERVIEW ─────────────────────────────────────── */}
        {tab==="📊 Overview" && (
          <div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:20 }}>
              {[
                { label:"Total Posts",   value:posts.length,           icon:"📝", color:"#7c3aed" },
                { label:"Community Users",value:users.length,          icon:"👥", color:"#0ea5e9" },
                { label:"Total Reactions",value:totalReactions,        icon:"❤️", color:"#ec4899" },
                { label:"Pending Reports",value:unresolvedReports,     icon:"⚠️", color:"#ef4444" },
                { label:"Pinned Posts",  value:pins.length,            icon:"📌", color:"#f59e0b" },
                { label:"Moderators",    value:mods.length,            icon:"🛡️", color:"#10b981" },
              ].map(s => (
                <div key={s.label} style={{ background:"var(--surface)",borderRadius:16,padding:"16px",border:"1px solid var(--border)" }}>
                  <div style={{ fontSize:26,marginBottom:6 }}>{s.icon}</div>
                  <div style={{ fontSize:24,fontWeight:900,color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:11,color:"var(--sub)",marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Role legend */}
            <div style={{ background:"var(--surface)",borderRadius:16,padding:16,border:"1px solid var(--border)",marginBottom:16 }}>
              <div style={{ fontSize:13,fontWeight:800,color:"var(--text)",marginBottom:12 }}>🎖️ All Roles & Badges</div>
              <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                {Object.entries(ROLE_DEFS).map(([key,def]) => (
                  <div key={key} style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:20,background:def.bg,border:`1px solid ${def.color}40` }}>
                    <span style={{ fontSize:16 }}>{def.icon}</span>
                    <div>
                      <div style={{ fontSize:11,fontWeight:800,color:def.color }}>{def.label}</div>
                      <div style={{ fontSize:9,color:"var(--sub)",fontWeight:600 }}>{key}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent posts preview */}
            <div style={{ background:"var(--surface)",borderRadius:16,padding:16,border:"1px solid var(--border)" }}>
              <div style={{ fontSize:13,fontWeight:800,color:"var(--text)",marginBottom:12 }}>🕐 Recent Posts</div>
              {posts.slice(0,5).map(p => (
                <div key={p.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid var(--border)" }}>
                  <Avatar u={p.author} size={32}/>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                      <span style={{ fontSize:12,fontWeight:700,color:"var(--text)" }}>{p.author}</span>
                      {roles[p.author] && <RoleBadge role={roles[p.author]} small/>}
                    </div>
                    <div style={{ fontSize:12,color:"var(--sub)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{p.text.slice(0,60)}</div>
                  </div>
                  <span style={{ fontSize:10,color:"var(--sub)",flexShrink:0 }}>{timeAgo(p.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── POSTS ─────────────────────────────────────────── */}
        {tab==="📌 Posts" && (
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            {posts.map(p => {
              const isPinned = pins.includes(p.id);
              const isAnn    = ann.includes(p.id);
              return (
                <div key={p.id} style={{ background:"var(--surface)",borderRadius:16,padding:14,border:`1px solid ${isPinned?"var(--purple)":"var(--border)"}`,position:"relative" }}>
                  {isPinned && <span style={{ position:"absolute",top:10,right:10,fontSize:16 }}>📌</span>}
                  {isAnn    && <span style={{ position:"absolute",top:10,right:32,fontSize:16 }}>📢</span>}
                  <div style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
                    <Avatar u={p.author} size={36}/>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
                        <span style={{ fontSize:13,fontWeight:800,color:"var(--text)" }}>{p.author}</span>
                        {roles[p.author] && <RoleBadge role={roles[p.author]} small/>}
                        {p.subject && <span style={{ fontSize:9,padding:"1px 6px",borderRadius:10,background:"rgba(108,127,255,0.12)",color:"var(--purple)",fontWeight:700 }}>{p.subject}</span>}
                        <span style={{ fontSize:10,color:"var(--sub)",marginLeft:"auto" }}>{timeAgo(p.createdAt)}</span>
                      </div>
                      <div style={{ fontSize:12,color:"var(--text)",marginTop:4,lineHeight:1.5,overflow:"hidden",maxHeight:48,textOverflow:"ellipsis" }}>{p.text}</div>
                      <div style={{ display:"flex",gap:12,marginTop:8,fontSize:11,color:"var(--sub)" }}>
                        <span>❤️ {Object.values(p.reactions).reduce((s,a)=>s+a.length,0)}</span>
                        <span>💬 {p.comments.length}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display:"flex",gap:8,marginTop:10,paddingTop:10,borderTop:"1px solid var(--border)",flexWrap:"wrap" }}>
                    <button onClick={() => pinPost(p.id)}
                      style={{ padding:"5px 12px",borderRadius:8,border:`1px solid ${isPinned?"var(--purple)":"var(--border)"}`,background:isPinned?"rgba(108,127,255,0.1)":"transparent",color:isPinned?"var(--purple)":"var(--sub)",fontSize:11,cursor:"pointer",fontWeight:700 }}>
                      📌 {isPinned?"Unpin":"Pin"}
                    </button>
                    <button onClick={() => announcePost(p.id)}
                      style={{ padding:"5px 12px",borderRadius:8,border:`1px solid ${isAnn?"#f59e0b":"var(--border)"}`,background:isAnn?"rgba(245,158,11,0.1)":"transparent",color:isAnn?"#f59e0b":"var(--sub)",fontSize:11,cursor:"pointer",fontWeight:700 }}>
                      📢 {isAnn?"Unannounce":"Announce"}
                    </button>
                    <button onClick={() => deletePost(p.id)}
                      style={{ padding:"5px 12px",borderRadius:8,border:"1px solid #fee2e2",background:"transparent",color:"#dc2626",fontSize:11,cursor:"pointer",fontWeight:700 }}>
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── USERS ─────────────────────────────────────────── */}
        {tab==="👥 Users" && (
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {users.map(u => (
              <div key={u.username} style={{ background:"var(--surface)",borderRadius:14,padding:"12px 14px",border:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12 }}>
                <Avatar u={u.username} size={40}/>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
                    <span style={{ fontSize:13,fontWeight:800,color:"var(--text)" }}>{u.username}</span>
                    {roles[u.username] && <RoleBadge role={roles[u.username]} small/>}
                    {u.warned && <span style={{ fontSize:10,padding:"1px 6px",borderRadius:10,background:"rgba(245,158,11,0.15)",color:"#f59e0b",fontWeight:700 }}>⚠️ Warned</span>}
                    {u.banned && <span style={{ fontSize:10,padding:"1px 6px",borderRadius:10,background:"rgba(220,38,38,0.15)",color:"#dc2626",fontWeight:700 }}>🚫 Banned</span>}
                  </div>
                  {/* Role picker */}
                  <select
                    value={roles[u.username]||""}
                    onChange={e => assignRole(u.username, e.target.value)}
                    style={{ marginTop:6,padding:"4px 8px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:11,cursor:"pointer" }}>
                    <option value="">— No role —</option>
                    {isAdmin && <option value="owner">👑 Owner</option>}
                    {isAdmin && <option value="admin">🛡️ Admin</option>}
                    <option value="moderator">⚔️ Moderator</option>
                    <option value="teacher">🎓 Teacher</option>
                    <option value="scholar">📚 Scholar</option>
                    <option value="champion">🏆 Champion</option>
                    <option value="elite">💎 Elite</option>
                    <option value="contributor">🌟 Helper</option>
                    <option value="verified">✅ Verified</option>
                    <option value="active">🔥 Active</option>
                    <option value="veteran">🎖️ Veteran</option>
                    <option value="newcomer">🆕 Newcomer</option>
                  </select>
                </div>
                <div style={{ display:"flex",gap:6,flexShrink:0 }}>
                  {!u.banned ? (
                    <>
                      <button onClick={() => warnUser(u.username)}
                        style={{ padding:"5px 10px",borderRadius:8,border:"1px solid #fbbf24",background:"rgba(251,191,36,0.1)",color:"#d97706",fontSize:11,cursor:"pointer",fontWeight:700 }}>
                        ⚠️ Warn
                      </button>
                      <button onClick={() => banUser(u.username)}
                        style={{ padding:"5px 10px",borderRadius:8,border:"1px solid #fca5a5",background:"rgba(220,38,38,0.08)",color:"#dc2626",fontSize:11,cursor:"pointer",fontWeight:700 }}>
                        🚫 Ban
                      </button>
                    </>
                  ) : (
                    <button onClick={() => unbanUser(u.username)}
                      style={{ padding:"5px 10px",borderRadius:8,border:"1px solid #86efac",background:"rgba(34,197,94,0.08)",color:"#16a34a",fontSize:11,cursor:"pointer",fontWeight:700 }}>
                      ✅ Unban
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── REPORTS ───────────────────────────────────────── */}
        {tab==="⚠️ Reports" && (
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            {reports.length===0 && (
              <div style={{ textAlign:"center",padding:48,color:"var(--sub)" }}>
                <div style={{ fontSize:40,marginBottom:8 }}>✅</div>
                <div style={{ fontSize:14,fontWeight:700 }}>No reports yet</div>
              </div>
            )}
            {reports.map(r => {
              const post = posts.find(p=>p.id===r.postId);
              return (
                <div key={r.id} style={{ background:"var(--surface)",borderRadius:14,padding:14,border:`1px solid ${r.resolved?"var(--border)":"#fca5a5"}`,opacity:r.resolved?0.6:1 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                    <span style={{ fontSize:18 }}>{r.resolved?"✅":"⚠️"}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12,fontWeight:800,color:"var(--text)" }}>Reported by {r.reporter}</div>
                      <div style={{ fontSize:11,color:"var(--sub)" }}>{timeAgo(r.createdAt)}</div>
                    </div>
                    {!r.resolved && (
                      <button onClick={() => resolveReport(r.id)}
                        style={{ padding:"5px 10px",borderRadius:8,border:"none",background:"#dcfce7",color:"#16a34a",fontSize:11,cursor:"pointer",fontWeight:700 }}>
                        ✓ Resolve
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize:12,color:"#dc2626",fontWeight:700,marginBottom:6 }}>Reason: {r.reason}</div>
                  {post && (
                    <div style={{ background:"var(--bg)",borderRadius:10,padding:"8px 12px",fontSize:12,color:"var(--sub)",border:"1px solid var(--border)" }}>
                      <span style={{ fontWeight:700,color:"var(--text)" }}>{post.author}: </span>
                      {post.text.slice(0,100)}{post.text.length>100?"…":""}
                    </div>
                  )}
                  {!r.resolved && post && (
                    <div style={{ display:"flex",gap:8,marginTop:8 }}>
                      <button onClick={() => deletePost(r.postId)}
                        style={{ padding:"4px 10px",borderRadius:8,border:"none",background:"#fee2e2",color:"#dc2626",fontSize:11,cursor:"pointer",fontWeight:700 }}>
                        🗑️ Delete Post
                      </button>
                      <button onClick={() => warnUser(post.author)}
                        style={{ padding:"4px 10px",borderRadius:8,border:"none",background:"rgba(251,191,36,0.12)",color:"#d97706",fontSize:11,cursor:"pointer",fontWeight:700 }}>
                        ⚠️ Warn Author
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── ANNOUNCE ──────────────────────────────────────── */}
        {tab==="📢 Announce" && (
          <div>
            <div style={{ background:"var(--surface)",borderRadius:16,padding:20,border:"1px solid var(--border)",marginBottom:16 }}>
              <div style={{ fontSize:15,fontWeight:800,color:"var(--text)",marginBottom:12 }}>📢 Post Community Announcement</div>
              <div style={{ fontSize:12,color:"var(--sub)",marginBottom:14,padding:"8px 12px",background:"rgba(245,158,11,0.08)",borderRadius:10,border:"1px solid rgba(245,158,11,0.2)" }}>
                Announcements are pinned at the top of the feed and all members are notified.
              </div>
              <textarea
                value={newAnn}
                onChange={e => setNewAnn(e.target.value)}
                placeholder="Write your announcement…"
                rows={5}
                style={{ width:"100%",borderRadius:12,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",padding:"12px 14px",fontSize:14,resize:"none",boxSizing:"border-box",fontFamily:"inherit",lineHeight:1.6 }}/>
              <button onClick={postAnnouncement} disabled={!newAnn.trim()}
                style={{ marginTop:12,padding:"12px 24px",borderRadius:12,border:"none",background:"var(--purple)",color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer",width:"100%" }}>
                📢 Post Announcement to Community
              </button>
            </div>

            {/* Previous announcements */}
            <div style={{ fontSize:13,fontWeight:800,color:"var(--text)",marginBottom:10 }}>Previous Announcements</div>
            {posts.filter(p=>ann.includes(p.id)).map(p => (
              <div key={p.id} style={{ background:"var(--surface)",borderRadius:14,padding:14,border:"1px solid rgba(245,158,11,0.3)",marginBottom:10 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
                  <span style={{ fontSize:18 }}>📢</span>
                  <span style={{ fontSize:12,fontWeight:800,color:"var(--text)" }}>{p.author}</span>
                  <span style={{ fontSize:11,color:"var(--sub)",marginLeft:"auto" }}>{timeAgo(p.createdAt)}</span>
                </div>
                <div style={{ fontSize:13,color:"var(--text)",lineHeight:1.6,whiteSpace:"pre-wrap" }}>{p.text}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── MODS (admin only) ─────────────────────────────── */}
        {tab==="🛡️ Mods" && (
          <div>
            {!isAdmin ? (
              <div style={{ textAlign:"center",padding:48,color:"var(--sub)" }}>
                <div style={{ fontSize:40,marginBottom:8 }}>🔒</div>
                <div style={{ fontSize:14,fontWeight:700 }}>Only admins can manage moderators</div>
              </div>
            ) : (
              <>
                {/* Add mod form */}
                <div style={{ background:"var(--surface)",borderRadius:16,padding:20,border:"1px solid var(--border)",marginBottom:16 }}>
                  <div style={{ fontSize:14,fontWeight:800,color:"var(--text)",marginBottom:14 }}>➕ Add New Moderator</div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10 }}>
                    <input value={newModUser} onChange={e=>setNewModUser(e.target.value)} placeholder="Username"
                      style={{ padding:"10px 14px",borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13,fontFamily:"inherit" }}/>
                    <input type="password" value={newModPass} onChange={e=>setNewModPass(e.target.value)} placeholder="Password"
                      style={{ padding:"10px 14px",borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13,fontFamily:"inherit" }}/>
                  </div>
                  <select value={newModRole} onChange={e=>setNewModRole(e.target.value)}
                    style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13,marginBottom:12,cursor:"pointer" }}>
                    <option value="moderator">⚔️ Moderator</option>
                    <option value="teacher">🎓 Teacher</option>
                    <option value="admin">🛡️ Admin</option>
                  </select>
                  <button onClick={addMod} disabled={!newModUser.trim()||!newModPass.trim()}
                    style={{ width:"100%",padding:"11px",borderRadius:12,border:"none",background:"var(--purple)",color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer" }}>
                    ➕ Add Moderator
                  </button>
                </div>

                {/* Mod list */}
                <div style={{ fontSize:13,fontWeight:800,color:"var(--text)",marginBottom:10 }}>Active Moderators ({mods.length})</div>
                {mods.map(mod => (
                  <div key={mod.id} style={{ background:"var(--surface)",borderRadius:14,padding:"12px 14px",border:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12,marginBottom:8 }}>
                    <Avatar u={mod.username} size={40}/>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        <span style={{ fontSize:13,fontWeight:800,color:"var(--text)" }}>{mod.username}</span>
                        <RoleBadge role={mod.role} small/>
                      </div>
                      <div style={{ fontSize:11,color:"var(--sub)",marginTop:2 }}>Joined {timeAgo(mod.createdAt)}</div>
                    </div>
                    <button onClick={() => removeMod(mod.id)}
                      style={{ padding:"5px 10px",borderRadius:8,border:"1px solid #fca5a5",background:"transparent",color:"#dc2626",fontSize:11,cursor:"pointer",fontWeight:700 }}>
                      🗑️ Remove
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
