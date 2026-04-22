import { useState, useEffect, useCallback, useRef } from "react";
import MathText from "../components/MathText";

/* ── helpers ──────────────────────────────────────────────── */
const TOKEN = () => sessionStorage.getItem("rr_admin_token") || "";
const api = (path: string, opts: RequestInit = {}) =>
  fetch(path, { ...opts, headers: { "Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}`, ...(opts.headers as any||{}) } });

type Tab = "overview"|"users"|"ips"|"inbox"|"subjects"|"videos"|"quizzes"|"notifs"|"doubts"|"micro"|"market"|"menu"|"db";
const TABS: { id:Tab; icon:string; label:string }[] = [
  { id:"overview",  icon:"📊", label:"Overview"      },
  { id:"users",     icon:"👤", label:"Users"         },
  { id:"ips",       icon:"🌐", label:"IP Access"     },
  { id:"inbox",     icon:"📨", label:"Inbox"         },
  { id:"subjects",  icon:"📚", label:"Subjects"      },
  { id:"videos",    icon:"🎬", label:"Videos"        },
  { id:"quizzes",   icon:"📝", label:"Quizzes"       },
  { id:"notifs",    icon:"🔔", label:"Notify"        },
  { id:"menu",      icon:"⊞",  label:"Dashboard Menu"},
  { id:"doubts",    icon:"❓", label:"Doubts"        },
  { id:"micro",     icon:"⚡", label:"Micro Feed"    },
  { id:"market",    icon:"🏪", label:"Marketplace"   },
  { id:"db",        icon:"🗄️", label:"Database"      },
];

/* ── entry point ──────────────────────────────────────────── */
export default function Admin() {
  const [token, setToken] = useState(TOKEN);
  if (!token) return <LoginScreen onLogin={t => { sessionStorage.setItem("rr_admin_token",t); setToken(t); }} />;
  return <AdminPanel onLogout={() => { sessionStorage.removeItem("rr_admin_token"); setToken(""); }} />;
}

/* ══════════════════════════════════════════════════════════
   LOGIN SCREEN
══════════════════════════════════════════════════════════ */
function LoginScreen({ onLogin }: { onLogin:(t:string)=>void }) {
  const [u,setU]=useState(""); const [p,setP]=useState(""); const [err,setErr]=useState(""); const [loading,setLoad]=useState(false);
  async function submit(e:React.FormEvent){ e.preventDefault(); setLoad(true); setErr("");
    const r=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:u,password:p})});
    const d=await r.json(); setLoad(false);
    if(d.token) onLogin(d.token); else setErr(d.error||"Login failed");
  }
  return (
    <div style={{minHeight:"100svh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:"var(--surface)",borderRadius:20,padding:36,width:"100%",maxWidth:380,boxShadow:"0 8px 40px rgba(0,0,0,0.12)"}}>
        <div style={{textAlign:"center",marginBottom:28}}><div style={{fontSize:44}}>🥀</div>
          <h1 style={{fontSize:24,fontWeight:900,color:"var(--purple)",fontFamily:"Lato,sans-serif",marginTop:8}}>RedRose Admin</h1>
          <p style={{fontSize:13,color:"var(--sub)",marginTop:4}}>Super Admin Dashboard</p></div>
        <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:14}}>
          <input value={u} onChange={e=>setU(e.target.value)} placeholder="Username" style={inp} autoComplete="username"/>
          <input type="password" value={p} onChange={e=>setP(e.target.value)} placeholder="Password" style={inp} autoComplete="current-password"/>
          {err&&<div style={{background:"#fff0f0",border:"1px solid #fcc",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#c00"}}>{err}</div>}
          <button type="submit" disabled={loading} style={{...btnStyle("var(--purple)"),fontSize:16,padding:14}}>
            {loading?"Logging in...":"Login →"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN ADMIN PANEL
══════════════════════════════════════════════════════════ */
function AdminPanel({ onLogout }:{ onLogout:()=>void }) {
  const [tab,setTab]=useState<Tab>("overview");
  const [sideOpen,setSideOpen]=useState(false);
  return (
    <div style={{minHeight:"100svh",background:"var(--bg)",display:"flex",flexDirection:"column"}}>
      {/* Top bar */}
      <div style={{background:"var(--navy)",color:"#fff",padding:"0 16px",height:52,display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:200}}>
        <button onClick={()=>setSideOpen(o=>!o)} style={{background:"none",border:"none",color:"#fff",fontSize:20,cursor:"pointer",padding:4}}>☰</button>
        <span style={{fontSize:18}}>🥀</span>
        <span style={{fontWeight:800,fontSize:15,flex:1,fontFamily:"Lato,sans-serif"}}>RedRose Admin</span>
        <button onClick={onLogout} style={{background:"var(--orange)",border:"none",color:"#fff",padding:"5px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>Logout</button>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* Sidebar */}
        <nav style={{width:sideOpen?200:56,background:"var(--navy)",flexShrink:0,transition:"width 250ms",overflowX:"hidden",display:"flex",flexDirection:"column",paddingTop:8}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>{setTab(t.id);setSideOpen(false);}}
              style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:tab===t.id?"rgba(255,255,255,0.15)":"transparent",border:"none",color:"#fff",cursor:"pointer",textAlign:"left",whiteSpace:"nowrap",borderLeft:tab===t.id?"3px solid var(--orange)":"3px solid transparent",transition:"background 150ms"}}>
              <span style={{fontSize:18,flexShrink:0}}>{t.icon}</span>
              <span style={{fontSize:13,fontWeight:600,opacity:sideOpen?1:0,transition:"opacity 200ms"}}>{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Content */}
        <main style={{flex:1,overflowY:"auto",padding:"20px 16px 60px"}}>
          {tab==="overview"  && <OverviewTab />}
          {tab==="users"     && <UsersTab />}
          {tab==="ips"       && <IPsTab />}
          {tab==="inbox"     && <InboxTab />}
          {tab==="subjects"  && <SubjectsTab />}
          {tab==="videos"    && <VideosTab />}
          {tab==="quizzes"   && <QuizzesTab />}
          {tab==="notifs"    && <NotifsTab />}
          {tab==="doubts"    && <DoubtsTab />}
          {tab==="micro"     && <MicroFeedTab />}
          {tab==="market"    && <MarketplaceTab />}
          {tab==="menu"      && <MenuTab />}
          {tab==="db"        && <DatabaseTab />}
        </main>
      </div>
    </div>
  );
}

/* ══ OVERVIEW ══════════════════════════════════════════════ */
function OverviewTab() {
  const [stats,setStats]=useState<any>(null);
  useEffect(()=>{
    Promise.all([
      api("/api/admin/msgs").then(r=>r.json()),
      api("/api/admin/users").then(r=>r.json()),
      api("/api/admin/ips").then(r=>r.json()),
      api("/api/admin/videos").then(r=>r.json()),
      api("/api/admin/quizzes").then(r=>r.json()),
      fetch("/api/gamification/leaderboard").then(r=>r.json()),
    ]).then(([msgs,users,ips,vids,quizzes,board])=>{
      setStats({
        pending:Array.isArray(msgs)?msgs.filter((m:any)=>m.status==="pending").length:0,
        users:Array.isArray(users)?users.length:0,
        ips:Array.isArray(ips)?ips.length:0,
        videos:Array.isArray(vids)?vids.length:0,
        quizzes:Array.isArray(quizzes)?quizzes.length:0,
        published:Array.isArray(quizzes)?quizzes.filter((q:any)=>q.published).length:0,
        topStudents:Array.isArray(board)?board.slice(0,5):[],
      });
    });
  },[]);

  if(!stats) return <Loading />;
  const cards=[
    {label:"Pending Messages",value:stats.pending,icon:"📨",color:"var(--orange)"},
    {label:"Universal Users",value:stats.users,icon:"👤",color:"var(--purple)"},
    {label:"Approved IPs",value:stats.ips,icon:"🌐",color:"var(--navy)"},
    {label:"Videos",value:stats.videos,icon:"🎬",color:"#e53935"},
    {label:"Total Quizzes",value:stats.quizzes,icon:"📝",color:"var(--purple)"},
    {label:"Published Exams",value:stats.published,icon:"✅",color:"var(--green)"},
  ];
  return (
    <div>
      <SectionTitle>📊 Platform Overview</SectionTitle>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:28}}>
        {cards.map(c=>(
          <div key={c.label} style={{background:"var(--surface)",borderRadius:14,padding:16,boxShadow:"0 2px 8px rgba(0,0,0,0.07)",borderTop:`4px solid ${c.color}`}}>
            <div style={{fontSize:28}}>{c.icon}</div>
            <div style={{fontSize:28,fontWeight:900,color:c.color,fontFamily:"Lato,sans-serif",marginTop:6}}>{c.value}</div>
            <div style={{fontSize:12,color:"var(--sub)",marginTop:2}}>{c.label}</div>
          </div>
        ))}
      </div>
      <SectionTitle>🏆 Top Students (by XP)</SectionTitle>
      <Card>
        {stats.topStudents.length===0&&<p style={{color:"var(--sub)",fontSize:13}}>No exam data yet.</p>}
        {stats.topStudents.map((s:any,i:number)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
            <span style={{fontWeight:900,fontSize:18,color:"var(--purple)",width:28}}>#{s.rank}</span>
            <span style={{flex:1,fontWeight:600}}>{s.displayName}</span>
            <span style={{fontSize:12,background:"var(--purple)",color:"#fff",borderRadius:20,padding:"2px 10px",fontWeight:700}}>Lv{s.level}</span>
            <span style={{fontSize:13,fontWeight:700,color:"var(--gold)"}}>{s.xp} XP</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ══ USERS ══════════════════════════════════════════════════ */
function UsersTab() {
  const [users,setUsers]=useState<any[]>([]); const [form,setForm]=useState({username:"",password:"",note:""}); const [saving,setSaving]=useState(false); const [msg,setMsg]=useState("");
  const load=()=>api("/api/admin/users").then(r=>r.json()).then(d=>{if(Array.isArray(d))setUsers(d);});
  useEffect(()=>{load();},[]);
  async function create(){
    if(!form.username||!form.password){setMsg("Username and password required");return;}
    setSaving(true);
    const r=await api("/api/admin/users",{method:"POST",body:JSON.stringify(form)});
    const d=await r.json(); setSaving(false);
    if(d.error) setMsg(d.error); else {setMsg("✅ User created! They can login from ANY device/IP.");setForm({username:"",password:"",note:""});load();}
  }
  async function del(id:string){if(!confirm("Delete user?"))return; await api(`/api/admin/users/${id}`,{method:"DELETE"}); load();}
  return (
    <div>
      <SectionTitle>👤 Universal Users</SectionTitle>
      <InfoBox>Universal users can log in from <b>any IP address</b> — no IP restriction. Create accounts for your students here.</InfoBox>
      <Card title="➕ Create New Student Account">
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Field label="Username (student will use this to login)"><input value={form.username} onChange={e=>setForm({...form,username:e.target.value})} placeholder="e.g. student01" style={inp}/></Field>
          <Field label="Password"><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Set a password" style={inp}/></Field>
          <Field label="Note (optional)"><input value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="e.g. Batch 2025 - Dhaka" style={inp}/></Field>
          {msg&&<Feedback msg={msg}/>}
          <button onClick={create} disabled={saving} style={btnStyle("var(--purple)")}>{saving?"Creating...":"Create Universal Account +"}</button>
        </div>
      </Card>
      <SectionTitle style={{marginTop:24}}>All Users ({users.length})</SectionTitle>
      {users.length===0&&<Empty icon="👤" text="No universal users yet"/>}
      {users.map(u=>(
        <div key={u.id} style={{...listItem,display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:38,height:38,borderRadius:50,background:"var(--purple)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:16,flexShrink:0}}>{u.username[0]?.toUpperCase()}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,color:"var(--text)"}}>{u.username}</div>
            <div style={{fontSize:11,color:"var(--sub)"}}>{u.note||"No note"} · Created {new Date(u.createdAt).toLocaleDateString()}</div>
          </div>
          <button onClick={()=>del(u.id)} style={smBtn("var(--orange)")}>✕ Delete</button>
        </div>
      ))}
    </div>
  );
}

/* ══ IPs ════════════════════════════════════════════════════ */
function IPsTab() {
  const [ips,setIps]=useState<any[]>([]); const [newIp,setNewIp]=useState(""); const [msg,setMsg]=useState("");
  const load=()=>api("/api/admin/ips").then(r=>r.json()).then(d=>{if(Array.isArray(d))setIps(d);});
  useEffect(()=>{load();},[]);
  async function add(){if(!newIp.trim())return; await api("/api/admin/ips",{method:"POST",body:JSON.stringify({ip:newIp.trim()})}); setNewIp(""); setMsg("✅ IP approved!"); load();}
  async function del(ip:string){await api(`/api/admin/ips/${encodeURIComponent(ip)}`,{method:"DELETE"}); load();}
  return (
    <div>
      <SectionTitle>🌐 IP Access Control</SectionTitle>
      <InfoBox>Only approved IPs can access content. Add an IP to grant access without a login account.</InfoBox>
      <Card title="➕ Approve New IP">
        <div style={{display:"flex",gap:8}}>
          <input value={newIp} onChange={e=>setNewIp(e.target.value)} placeholder="e.g. 103.123.45.67" style={{...inp,flex:1}}/>
          <button onClick={add} style={btnStyle("var(--navy)")}>Add IP</button>
        </div>
        {msg&&<Feedback msg={msg} style={{marginTop:8}}/>}
      </Card>
      <SectionTitle style={{marginTop:24}}>Approved IPs ({ips.length})</SectionTitle>
      {ips.length===0&&<Empty icon="🌐" text="No approved IPs yet"/>}
      {ips.map(i=>(
        <div key={i.ip} style={{...listItem,display:"flex",alignItems:"center",gap:12}}>
          <code style={{flex:1,fontSize:14,fontWeight:700,color:"var(--purple)"}}>{i.ip}</code>
          <div style={{fontSize:11,color:"var(--sub)"}}>Since {new Date(i.approvedAt).toLocaleDateString()}</div>
          <button onClick={()=>del(i.ip)} style={smBtn("var(--orange)")}>✕ Remove</button>
        </div>
      ))}
    </div>
  );
}

/* ══ INBOX ══════════════════════════════════════════════════ */
function InboxTab() {
  const [msgs,setMsgs]=useState<any[]>([]);
  const load=()=>api("/api/admin/msgs").then(r=>r.json()).then(d=>{if(Array.isArray(d))setMsgs(d);});
  useEffect(()=>{load();},[]);
  async function approveIp(ip:string){await api("/api/admin/ips",{method:"POST",body:JSON.stringify({ip})}); alert(`✅ IP ${ip} approved!`);}
  async function dismiss(id:string){await api(`/api/admin/msgs/${id}`,{method:"PATCH"}); load();}
  async function del(id:string){await api(`/api/admin/msgs/${id}`,{method:"DELETE"}); load();}
  const pending=msgs.filter(m=>m.status==="pending");
  return (
    <div>
      <SectionTitle>📨 Student Inbox {pending.length>0&&<span style={{background:"var(--orange)",color:"#fff",borderRadius:20,padding:"2px 8px",fontSize:12,marginLeft:8}}>{pending.length} new</span>}</SectionTitle>
      {msgs.length===0&&<Empty icon="📭" text="Inbox is empty"/>}
      {msgs.map(m=>(
        <div key={m.id} style={{...listItem,opacity:m.status==="noted"?0.6:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <code style={{background:"var(--bg)",padding:"3px 10px",borderRadius:8,fontSize:12,fontWeight:700,color:"var(--purple)"}}>{m.ip}</code>
            {m.status==="pending"&&<span style={{fontSize:10,background:"var(--orange)",color:"#fff",borderRadius:6,padding:"1px 8px",fontWeight:700}}>NEW</span>}
            <span style={{fontSize:11,color:"var(--sub)",marginLeft:"auto"}}>{new Date(m.timestamp).toLocaleString()}</span>
          </div>
          <p style={{fontSize:14,color:"var(--text)",margin:"0 0 12px",lineHeight:1.6}}>{m.message}</p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button onClick={()=>approveIp(m.ip)} style={smBtn("var(--green)")}>✔ Approve This IP</button>
            <button onClick={()=>dismiss(m.id)} style={smBtn("#888")}>✓ Mark Read</button>
            <button onClick={()=>del(m.id)} style={smBtn("var(--orange)")}>✕ Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══ SUBJECTS & CHAPTERS ═══════════════════════════════════ */
function SubjectsTab() {
  const [subjects,setSubjects]=useState<any[]>([]);
  const [f,setF]=useState({name:"",course:"",color:"#7c3aed"});
  const [chapName,setChapName]=useState<Record<string,string>>({});
  const [msg,setMsg]=useState("");

  const load=()=>api("/api/admin/subjects").then(r=>r.json()).then(d=>{if(Array.isArray(d))setSubjects(d);});
  useEffect(()=>{load();},[]);

  async function addSubject(){
    if(!f.name) return;
    const r=await api("/api/admin/subjects",{method:"POST",body:JSON.stringify(f)});
    if(!r.ok){const d=await r.json();setMsg("❌ "+(d.error||"Failed"));return;}
    setF({name:"",course:"",color:"#7c3aed"}); setMsg("✅ Subject added"); load();
  }
  async function delSubject(id:string){
    if(!confirm("Delete subject? Videos will be unassigned.")) return;
    await api(`/api/admin/subjects/${id}`,{method:"DELETE"}); load();
  }
  async function renameSubject(s:any){
    const name=prompt("New name:",s.name); if(!name) return;
    await api(`/api/admin/subjects/${s.id}`,{method:"PUT",body:JSON.stringify({name})}); load();
  }
  async function addChapter(sid:string){
    const name=(chapName[sid]||"").trim(); if(!name) return;
    await api(`/api/admin/subjects/${sid}/chapters`,{method:"POST",body:JSON.stringify({name})});
    setChapName({...chapName,[sid]:""}); load();
  }
  async function delChapter(sid:string,cid:string){
    if(!confirm("Delete chapter? Videos will be unassigned.")) return;
    await api(`/api/admin/subjects/${sid}/chapters/${cid}`,{method:"DELETE"}); load();
  }
  async function renameChapter(sid:string,c:any){
    const name=prompt("New chapter name:",c.name); if(!name) return;
    await api(`/api/admin/subjects/${sid}/chapters/${c.id}`,{method:"PUT",body:JSON.stringify({name})}); load();
  }

  return (
    <div>
      <SectionTitle>📚 Subjects & Chapters</SectionTitle>
      <InfoBox>Create subjects (Physics, Math…) and chapters inside them. Videos can be assigned to a subject + chapter from the <b>Videos</b> tab.</InfoBox>

      <Card title="➕ Add Subject">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 80px auto",gap:8,alignItems:"end"}}>
          <Field label="Subject Name"><input value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Physics" style={inp}/></Field>
          <Field label="Course"><input value={f.course} onChange={e=>setF({...f,course:e.target.value})} placeholder="HSC Science" style={inp}/></Field>
          <Field label="Color"><input type="color" value={f.color} onChange={e=>setF({...f,color:e.target.value})} style={{...inp,padding:2,height:40}}/></Field>
          <button onClick={addSubject} disabled={!f.name} style={btnStyle("var(--purple)")}>Add</button>
        </div>
        {msg&&<Feedback msg={msg} style={{marginTop:8}}/>}
      </Card>

      <SectionTitle style={{marginTop:20}}>Subjects ({subjects.length})</SectionTitle>
      {subjects.length===0&&<Empty icon="📚" text="No subjects yet"/>}
      {subjects.map(s=>(
        <div key={s.id} style={{...listItem,marginBottom:12,borderLeft:`4px solid ${s.color||"#7c3aed"}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <div style={{width:36,height:36,borderRadius:9,background:s.color||"#7c3aed",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900}}>{s.name[0]?.toUpperCase()}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,color:"var(--text)"}}>{s.name}</div>
              <div style={{fontSize:11,color:"var(--sub)"}}>{s.course||"—"} · <code>{s.id}</code> · {s.chapters?.length||0} chapters</div>
            </div>
            <button onClick={()=>renameSubject(s)} style={smBtn("var(--navy)")}>✎</button>
            <button onClick={()=>delSubject(s.id)} style={smBtn("var(--orange)")}>✕</button>
          </div>

          <div style={{paddingLeft:46,display:"flex",flexDirection:"column",gap:4}}>
            {(s.chapters||[]).map((c:any)=>(
              <div key={c.id} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 8px",background:"var(--bg)",borderRadius:6}}>
                <span style={{fontSize:13,flex:1}}>📖 {c.name}</span>
                <code style={{fontSize:10,color:"var(--sub)"}}>{c.id}</code>
                <button onClick={()=>renameChapter(s.id,c)} style={{...smBtn("var(--navy)"),padding:"2px 8px",fontSize:10}}>✎</button>
                <button onClick={()=>delChapter(s.id,c.id)} style={{...smBtn("var(--orange)"),padding:"2px 8px",fontSize:10}}>✕</button>
              </div>
            ))}
            <div style={{display:"flex",gap:6,marginTop:4}}>
              <input value={chapName[s.id]||""} onChange={e=>setChapName({...chapName,[s.id]:e.target.value})}
                placeholder="+ Add chapter…" style={{...inp,padding:"6px 10px",fontSize:12,flex:1}}
                onKeyDown={e=>{if(e.key==="Enter")addChapter(s.id);}}/>
              <button onClick={()=>addChapter(s.id)} disabled={!(chapName[s.id]||"").trim()} style={{...smBtn("var(--green)"),padding:"6px 12px"}}>Add</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══ VIDEOS (with playlist import + transfer) ══════════════ */
function VideosTab() {
  const [vids,setVids]=useState<any[]>([]);
  const [subjects,setSubjects]=useState<any[]>([]);
  const [f,setF]=useState({videoId:"",title:"",subjectId:"",chapterId:"",desc:"",date:"",course:"",online:true});
  const [msg,setMsg]=useState("");
  const [filterSub,setFilterSub]=useState<string>("");
  const [filterChap,setFilterChap]=useState<string>("");
  const [selected,setSelected]=useState<Set<string>>(new Set());
  const [moveSub,setMoveSub]=useState<string>("");
  const [moveChap,setMoveChap]=useState<string>("");

  // Playlist import
  const [pl,setPl]=useState({playlist:"",subjectId:"",chapterId:"",course:"",online:true});
  const [plBusy,setPlBusy]=useState(false);
  const [plMsg,setPlMsg]=useState("");

  const loadVids=()=>api("/api/admin/videos").then(r=>r.json()).then(d=>{if(Array.isArray(d))setVids(d);});
  const loadSubs=()=>api("/api/admin/subjects").then(r=>r.json()).then(d=>{if(Array.isArray(d))setSubjects(d);});
  useEffect(()=>{loadVids();loadSubs();},[]);

  const subById=(id:string)=>subjects.find(s=>s.id===id);
  const chapsFor=(id:string)=>(subById(id)?.chapters||[]) as any[];
  const chapById=(sid:string,cid?:string)=>cid?chapsFor(sid).find(c=>c.id===cid):null;

  async function add(){
    if(!f.videoId||!f.title)return;
    await api("/api/admin/videos",{method:"POST",body:JSON.stringify(f)});
    setF({videoId:"",title:"",subjectId:"",chapterId:"",desc:"",date:"",course:"",online:true});
    setMsg("✅ Video added!"); loadVids();
  }
  async function del(id:string){if(!confirm("Delete video?"))return; await api(`/api/admin/videos/${id}`,{method:"DELETE"}); loadVids();}

  function toggleSel(id:string){
    setSelected(s=>{const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n;});
  }
  function selAll(list:any[]){
    setSelected(new Set(list.map(v=>v.id)));
  }
  async function transferSelected(){
    if(selected.size===0||!moveSub){setMsg("⚠️ Pick videos and a target subject");return;}
    const r=await api("/api/admin/videos/transfer",{method:"POST",body:JSON.stringify({
      videoIds:Array.from(selected),
      targetSubjectId:moveSub,
      targetChapterId:moveChap||undefined,
    })});
    const d=await r.json();
    if(!r.ok){setMsg("❌ "+(d.error||"Transfer failed"));return;}
    setMsg(`✅ Moved ${d.moved} video(s)`);
    setSelected(new Set()); setMoveSub(""); setMoveChap(""); loadVids();
  }

  async function importPlaylist(){
    if(!pl.playlist.trim()){setPlMsg("⚠️ Paste a playlist URL or ID");return;}
    setPlBusy(true); setPlMsg("");
    try {
      const r=await api("/api/admin/videos/import-playlist",{method:"POST",body:JSON.stringify(pl)});
      const d=await r.json();
      if(!r.ok) throw new Error(d.error||"Import failed");
      setPlMsg(`✅ Imported ${d.added} new video(s) (${d.skipped} duplicates skipped)`);
      setPl({...pl,playlist:""}); loadVids();
    } catch(e:any){ setPlMsg("❌ "+e.message); }
    finally{ setPlBusy(false); }
  }

  // Filter
  const filtered = vids.filter(v=>{
    if(filterSub && v.subjectId!==filterSub) return false;
    if(filterChap && v.chapterId!==filterChap) return false;
    return true;
  });

  return (
    <div>
      <SectionTitle>🎬 Video Library</SectionTitle>

      {/* ── YouTube Playlist Import ── */}
      <Card title="📥 Import YouTube Playlist (public or unlisted)">
        <InfoBox>Paste a playlist URL (e.g. <code>https://youtube.com/playlist?list=PLxxxx</code>) or just the <code>list</code> ID. <b>Unlisted playlists work</b> as long as you have the link. Private playlists are not supported.</InfoBox>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:10}}>
          <Field label="Playlist URL or ID">
            <input value={pl.playlist} onChange={e=>setPl({...pl,playlist:e.target.value})}
              placeholder="https://www.youtube.com/playlist?list=PL..." style={inp}/>
          </Field>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Field label="Assign to Subject">
              <select value={pl.subjectId} onChange={e=>setPl({...pl,subjectId:e.target.value,chapterId:""})} style={inp}>
                <option value="">— None —</option>
                {subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Chapter (optional)">
              <select value={pl.chapterId} onChange={e=>setPl({...pl,chapterId:e.target.value})} style={inp} disabled={!pl.subjectId}>
                <option value="">— None —</option>
                {chapsFor(pl.subjectId).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Course Label"><input value={pl.course} onChange={e=>setPl({...pl,course:e.target.value})} placeholder="HSC Science" style={inp}/></Field>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer",height:40,marginTop:18}}>
              <input type="checkbox" checked={pl.online} onChange={e=>setPl({...pl,online:e.target.checked})} style={{width:16,height:16}}/> Mark as Online class
            </label>
          </div>
          {plMsg&&<Feedback msg={plMsg}/>}
          <button onClick={importPlaylist} disabled={plBusy||!pl.playlist.trim()} style={btnStyle("var(--orange)")}>
            {plBusy?"⏳ Importing…":"📥 Import Playlist →"}
          </button>
        </div>
      </Card>

      {/* ── Single video ── */}
      <Card title="➕ Add Single Video">
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Field label="YouTube Video ID"><input value={f.videoId} onChange={e=>setF({...f,videoId:e.target.value})} placeholder="e.g. dQw4w9WgXcW" style={inp}/></Field>
          <Field label="Class Title"><input value={f.title} onChange={e=>setF({...f,title:e.target.value})} placeholder="পদার্থবিজ্ঞান - নিউটনের সূত্র" style={inp}/></Field>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="Subject">
              <select value={f.subjectId} onChange={e=>setF({...f,subjectId:e.target.value,chapterId:""})} style={inp}>
                <option value="">— None —</option>
                {subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Chapter">
              <select value={f.chapterId} onChange={e=>setF({...f,chapterId:e.target.value})} style={inp} disabled={!f.subjectId}>
                <option value="">— None —</option>
                {chapsFor(f.subjectId).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Course"><input value={f.course} onChange={e=>setF({...f,course:e.target.value})} placeholder="HSC Science" style={inp}/></Field>
            <Field label="Date & Time"><input value={f.date} onChange={e=>setF({...f,date:e.target.value})} placeholder="19 Nov, 2025 08:00 PM" style={inp}/></Field>
          </div>
          <Field label="Description"><textarea value={f.desc} onChange={e=>setF({...f,desc:e.target.value})} rows={3} placeholder="..." style={{...inp,resize:"vertical"}}/></Field>
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer"}}>
            <input type="checkbox" checked={f.online} onChange={e=>setF({...f,online:e.target.checked})} style={{width:16,height:16}}/> Online class badge
          </label>
          {msg&&<Feedback msg={msg}/>}
          <button onClick={add} disabled={!f.videoId||!f.title} style={btnStyle("var(--purple)")}>Add Video →</button>
        </div>
      </Card>

      {/* ── Filter + Transfer toolbar ── */}
      <Card title="🔍 Browse & Transfer">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <Field label="Filter by Subject">
            <select value={filterSub} onChange={e=>{setFilterSub(e.target.value);setFilterChap("");}} style={inp}>
              <option value="">All subjects</option>
              {subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Filter by Chapter">
            <select value={filterChap} onChange={e=>setFilterChap(e.target.value)} style={inp} disabled={!filterSub}>
              <option value="">All chapters</option>
              {chapsFor(filterSub).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        <InfoBox>
          ✔ Tick the videos you want to move, then pick a target subject (and optional chapter) and click <b>Transfer</b>.
        </InfoBox>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto auto",gap:8,marginTop:10,alignItems:"end"}}>
          <Field label="→ Move to Subject">
            <select value={moveSub} onChange={e=>{setMoveSub(e.target.value);setMoveChap("");}} style={inp}>
              <option value="">— Pick target —</option>
              {subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="→ Chapter (optional)">
            <select value={moveChap} onChange={e=>setMoveChap(e.target.value)} style={inp} disabled={!moveSub}>
              <option value="">— None —</option>
              {chapsFor(moveSub).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <button onClick={()=>selAll(filtered)} style={smBtn("var(--navy)")}>Select all ({filtered.length})</button>
          <button onClick={transferSelected} disabled={selected.size===0||!moveSub} style={btnStyle("var(--green)")}>
            ↪ Transfer {selected.size>0?`(${selected.size})`:""}
          </button>
        </div>
      </Card>

      <SectionTitle style={{marginTop:24}}>Videos ({filtered.length} of {vids.length})</SectionTitle>
      {filtered.length===0&&<Empty icon="🎬" text="No videos match these filters"/>}
      {filtered.map(v=>{
        const s=subById(v.subjectId); const c=chapById(v.subjectId,v.chapterId);
        const sel=selected.has(v.id);
        return (
          <div key={v.id} style={{...listItem,display:"flex",alignItems:"center",gap:10,border:sel?"2px solid var(--purple)":"none"}}>
            <input type="checkbox" checked={sel} onChange={()=>toggleSel(v.id)} style={{width:18,height:18,accentColor:"var(--purple)",cursor:"pointer"}}/>
            <img src={`https://i.ytimg.com/vi/${v.videoId}/default.jpg`} alt="" style={{width:64,height:48,objectFit:"cover",borderRadius:6,flexShrink:0,background:"#000"}} onError={e=>{(e.target as HTMLImageElement).style.visibility="hidden";}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.title}</div>
              <div style={{fontSize:11,color:"var(--purple)",fontWeight:700}}>
                {s?.name||v.subjectId||"No subject"} {c?` · ${c.name}`:""} {v.course?` · ${v.course}`:""}
              </div>
              <code style={{fontSize:10,color:"var(--sub)"}}>YT: {v.videoId}</code>
            </div>
            {v.online&&<span style={{fontSize:10,background:"var(--orange)",color:"#fff",borderRadius:6,padding:"2px 8px",fontWeight:700,flexShrink:0}}>Online</span>}
            <button onClick={()=>del(v.id)} style={smBtn("var(--orange)")}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

/* ══ QUIZZES ════════════════════════════════════════════════ */
function QuizzesTab() {
  const [quizzes,setQuizzes]=useState<any[]>([]);
  const [view,setView]=useState<"list"|"create"|"edit">("list");
  const [editQuiz,setEditQuiz]=useState<any>(null);
  const [aiLoading,setAiLoading]=useState(false);
  const [aiForm,setAiForm]=useState({topic:"",count:"5",level:"HSC",type:"Science"});
  const [msg,setMsg]=useState("");

  const load=()=>api("/api/admin/quizzes").then(r=>r.json()).then(d=>{if(Array.isArray(d))setQuizzes(d);});
  useEffect(()=>{load();},[]);

  async function togglePublish(q:any){
    await api(`/api/admin/quizzes/${q.id}/publish`,{method:"PATCH"}); load();
  }
  async function del(id:string){if(!confirm("Delete quiz?"))return; await api(`/api/admin/quizzes/${id}`,{method:"DELETE"}); load();}

  async function aiGenerate(){
    if(!aiForm.topic) return;
    setAiLoading(true); setMsg("");
    try {
      const r=await fetch("/api/ai/generate-questions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic:aiForm.topic,count:parseInt(aiForm.count),level:aiForm.level,type:aiForm.type})});
      const d=await r.json();
      if(d.questions) { setEditQuiz({title:aiForm.topic,desc:`${aiForm.level} ${aiForm.type}`,timeMinutes:parseInt(aiForm.count)*2,questions:d.questions.map((q:any,i:number)=>({...q,id:`q${i+1}`}))}); setView("create"); setMsg("✅ AI generated questions! Review and save."); }
      else setMsg("❌ AI failed: "+d.error);
    } catch(e:any){setMsg("❌ "+e.message);}
    finally{setAiLoading(false);}
  }

  if(view==="create"||view==="edit") return (
    <QuizBuilder
      initial={view==="edit"?editQuiz:null}
      aiPrefill={view==="create"?editQuiz:null}
      onSave={async(data)=>{
        const isEdit=view==="edit"&&editQuiz?.id;
        if(isEdit) await api(`/api/admin/quizzes/${editQuiz.id}`,{method:"PUT",body:JSON.stringify(data)});
        else await api("/api/admin/quizzes",{method:"POST",body:JSON.stringify(data)});
        setView("list"); setEditQuiz(null); load();
      }}
      onCancel={()=>{setView("list");setEditQuiz(null);}}
    />
  );

  return (
    <div>
      <SectionTitle>📝 Quizzes & Exams</SectionTitle>

      {/* AI Generator */}
      <Card title="🤖 AI Question Generator (Auto-create quiz with AI)">
        <InfoBox>Type a topic, click Generate — AI will write questions in Bangla/English with math support automatically!</InfoBox>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
          <Field label="Topic (Bangla/English)"><input value={aiForm.topic} onChange={e=>setAiForm({...aiForm,topic:e.target.value})} placeholder="নিউটনের গতিসূত্র / Newton's Laws" style={inp}/></Field>
          <Field label="No. of Questions"><input type="number" value={aiForm.count} onChange={e=>setAiForm({...aiForm,count:e.target.value})} min="3" max="20" style={inp}/></Field>
          <Field label="Level"><select value={aiForm.level} onChange={e=>setAiForm({...aiForm,level:e.target.value})} style={inp}><option>SSC</option><option>HSC</option><option>Admission</option><option>BCS</option></select></Field>
          <Field label="Subject Type"><select value={aiForm.type} onChange={e=>setAiForm({...aiForm,type:e.target.value})} style={inp}><option>Science</option><option>Arts</option><option>Commerce</option><option>General</option></select></Field>
        </div>
        {msg&&<Feedback msg={msg} style={{marginTop:8}}/>}
        <button onClick={aiGenerate} disabled={aiLoading||!aiForm.topic} style={{...btnStyle("var(--purple)"),marginTop:12}}>
          {aiLoading?"🤖 AI is writing questions...":"🤖 Generate with AI →"}
        </button>
      </Card>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin:"24px 0 12px"}}>
        <SectionTitle style={{margin:0}}>All Quizzes ({quizzes.length})</SectionTitle>
        <button onClick={()=>{setEditQuiz(null);setView("create");}} style={btnStyle("var(--green)")}>+ Create Manually</button>
      </div>
      {quizzes.length===0&&<Empty icon="📝" text="No quizzes yet. Create one or use AI generator!"/>}
      {quizzes.map(q=>(
        <div key={q.id} style={{...listItem,marginBottom:10}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,color:"var(--text)",fontFamily:"Lato,sans-serif",marginBottom:4}}>{q.title}</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:11,background:"var(--bg)",color:"var(--sub)",borderRadius:20,padding:"2px 10px"}}>{q.questions?.length||0} Qs</span>
                <span style={{fontSize:11,background:"var(--bg)",color:"var(--sub)",borderRadius:20,padding:"2px 10px"}}>{q.timeMinutes}min</span>
                <span style={{fontSize:11,background:q.published?"#d4edda":"#fff3e0",color:q.published?"#155724":"#856404",borderRadius:20,padding:"2px 10px",fontWeight:700}}>{q.published?"✅ Published":"⏸ Draft"}</span>
              </div>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <button onClick={()=>togglePublish(q)} style={smBtn(q.published?"#888":"var(--green)")}>{q.published?"Unpublish":"Publish"}</button>
              <button onClick={()=>{setEditQuiz(q);setView("edit");}} style={smBtn("var(--navy)")}>Edit</button>
              <button onClick={()=>del(q.id)} style={smBtn("var(--orange)")}>✕</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── QUIZ BUILDER ───────────────────────────────────────── */
function QuizBuilder({ initial, aiPrefill, onSave, onCancel }:{ initial:any; aiPrefill:any; onSave:(d:any)=>Promise<void>; onCancel:()=>void }) {
  const src = initial || aiPrefill || {};
  const [title,setTitle]=useState(src.title||"");
  const [desc,setDesc]=useState(src.desc||"");
  const [time,setTime]=useState(src.timeMinutes||30);
  const [negMark,setNegMark]=useState(src.negativeMarking||false);
  const [negRatio,setNegRatio]=useState(src.negativeRatio||0.25);
  const [questions,setQuestions]=useState<any[]>(src.questions||[]);
  const [saving,setSaving]=useState(false);
  const [activeQ,setActiveQ]=useState<number|null>(null);
  const [bulkText,setBulkText]=useState("");
  const [bulkMode,setBulkMode]=useState(false);
  const [importMsg,setImportMsg]=useState("");
  const [htmlMode,setHtmlMode]=useState(false);
  const [htmlBusy,setHtmlBusy]=useState(false);

  const emptyQ=()=>({id:`q${Date.now()}`,text:"",options:[{id:"A",text:""},{id:"B",text:""},{id:"C",text:""},{id:"D",text:""}],correct:"A",solution:""});

  function addQuestion(){ const q=emptyQ(); setQuestions(qs=>[...qs,q]); setActiveQ(questions.length); }
  function removeQuestion(i:number){ setQuestions(qs=>qs.filter((_,j)=>j!==i)); if(activeQ===i)setActiveQ(null); }
  function updateQ(i:number,field:string,val:string){ setQuestions(qs=>qs.map((q,j)=>j===i?{...q,[field]:val}:q)); }
  function updateOpt(qi:number,oi:number,val:string){ setQuestions(qs=>qs.map((q,j)=>j===qi?{...q,options:q.options.map((o:any,k:number)=>k===oi?{...o,text:val}:o)}:q)); }

  function parseBulk(){
    const lines=bulkText.trim().split(/\n\n+/);
    const parsed:any[]=[];
    for(const block of lines){
      const ls=block.split("\n").map(l=>l.trim()).filter(Boolean);
      if(ls.length<5) continue;
      const text=ls[0].replace(/^Q[\d.:)\s]+/i,"").trim();
      const opts:any[]=[]; let correct="A"; let solution="";
      for(const l of ls.slice(1)){
        const m=l.match(/^([ABCD])[.):\s](.+)/i);
        if(m) opts.push({id:m[1].toUpperCase(),text:m[2].trim()});
        const am=l.match(/^(?:Ans|Answer|Correct)[.:)\s]+([ABCD])/i);
        if(am) correct=am[1].toUpperCase();
        const sm=l.match(/^(?:Sol|Solution|Explanation)[.:)\s]+(.+)/i);
        if(sm) solution=sm[1].trim();
      }
      if(text&&opts.length===4) parsed.push({id:`q${Date.now()}_${parsed.length}`,text,options:opts,correct,solution});
    }
    if(parsed.length===0){setImportMsg("❌ No valid questions found. Check the format.");return;}
    setQuestions(qs=>[...qs,...parsed]); setBulkText(""); setBulkMode(false); setImportMsg(`✅ ${parsed.length} questions imported!`);
  }

  /* ── HTML upload (Utkorsho/Udvash exam HTML) ──
     Normalises Bangla (ক/খ/গ/ঘ) or English (A-D) option labels to A-D, picks
     correct answer from .fas.fa-check, embeds images via [img:URL] so they
     render in MathText, keeps math/chemistry. */
  function normaliseOptId(rawId: string, idx: number): string {
    const s = (rawId || "").trim().replace(/[.):।]/g, "").toUpperCase();
    if (/^[A-D]$/.test(s)) return s;
    const map: Record<string,string> = {
      "ক":"A","খ":"B","গ":"C","ঘ":"D",
      "১":"A","২":"B","৩":"C","৪":"D",
      "1":"A","2":"B","3":"C","4":"D",
      "I":"A","II":"B","III":"C","IV":"D",
    };
    return map[s] || ["A","B","C","D"][idx] || "A";
  }
  function cleanHtmlText(el: Element | null): string {
    if (!el) return "";
    const c = el.cloneNode(true) as Element;
    c.querySelectorAll("style,script").forEach(t => t.remove());
    c.querySelectorAll("br").forEach(b => b.replaceWith(document.createTextNode("\n")));
    c.querySelectorAll("img").forEach(img => {
      const src = img.getAttribute("src") || "";
      img.replaceWith(document.createTextNode(src ? ` [img:${src}] ` : ""));
    });
    return (c.textContent || "").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
  }
  async function importHtmlFile(file: File) {
    if (!file) return;
    setHtmlBusy(true); setImportMsg("");
    try {
      const content = await file.text();
      const doc = new DOMParser().parseFromString(content, "text/html");

      const titleEl =
        doc.querySelector(".TakeExamHeader h3:last-child") ||
        doc.querySelector(".TakeExamHeader h3") ||
        doc.querySelector("title");
      const fileTitle = titleEl?.textContent?.trim() || "";
      if (fileTitle && !title) setTitle(fileTitle);

      const blocks = doc.querySelectorAll(".questionBlock");
      const parsed: any[] = [];
      blocks.forEach((block, i) => {
        const qText = cleanHtmlText(block.querySelector(".questionText"));
        const optEls = block.querySelectorAll(".questionOption");
        const opts: any[] = [];
        let correct = "A";
        optEls.forEach((oe, oi) => {
          const rawId = oe.querySelector(".input-group-text")?.textContent?.trim() || "";
          const id = normaliseOptId(rawId, oi);
          const text = cleanHtmlText(oe.querySelector(".questionTable label") || oe);
          const isCorrect = !!oe.querySelector(".fas.fa-check, .fa-check, .correct");
          if (isCorrect) correct = id;
          if (text) opts.push({ id, text });
        });
        while (opts.length < 4) {
          const id = ["A","B","C","D"][opts.length];
          opts.push({ id, text: "" });
        }
        const sol = cleanHtmlText(block.querySelector(".solveText"));
        if (qText && opts.length >= 2) {
          parsed.push({
            id: `q${Date.now()}_${i}`,
            text: qText,
            options: opts.slice(0, 4),
            correct,
            solution: sol || "",
          });
        }
      });

      if (parsed.length === 0) {
        setImportMsg("❌ No questions found in this file. Make sure it's an Utkorsho/Udvash exam HTML.");
      } else {
        setQuestions(qs => [...qs, ...parsed]);
        setHtmlMode(false);
        setImportMsg(`✅ ${parsed.length} questions imported from "${file.name}"`);
      }
    } catch (err: any) {
      setImportMsg(`❌ Failed to parse: ${err?.message || "invalid HTML"}`);
    } finally {
      setHtmlBusy(false);
    }
  }

  async function save(){
    if(!title||questions.length===0) return;
    setSaving(true);
    await onSave({title,desc,timeMinutes:time,questions,negativeMarking:negMark,negativeRatio:negRatio});
    setSaving(false);
  }

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={onCancel} style={{background:"none",border:"1.5px solid var(--border)",borderRadius:8,padding:"6px 14px",cursor:"pointer",color:"var(--sub)",fontSize:13}}>← Back</button>
        <h2 style={{fontSize:18,fontWeight:800,color:"var(--purple)",fontFamily:"Lato,sans-serif",flex:1,margin:0}}>{initial?"Edit Quiz":"Create New Quiz"}</h2>
        <button onClick={save} disabled={saving||!title||questions.length===0} style={btnStyle("var(--green)")}>{saving?"Saving...":"💾 Save Quiz"}</button>
      </div>

      <Card title="📋 Quiz Details">
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Field label="Quiz Title (Bangla/English supported)"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="পদার্থবিজ্ঞান MCQ — অধ্যায় ১" style={inp}/></Field>
          <Field label="Description"><textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={2} placeholder="Covers Newton's laws, kinematics..." style={{...inp,resize:"vertical"}}/></Field>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="Time Limit (minutes)"><input type="number" value={time} onChange={e=>setTime(parseInt(e.target.value)||30)} min="5" max="180" style={inp}/></Field>
            <Field label="Negative Marking">
              <label style={{display:"flex",alignItems:"center",gap:8,height:40,cursor:"pointer"}}>
                <input type="checkbox" checked={negMark} onChange={e=>setNegMark(e.target.checked)} style={{width:16,height:16}}/> Enable
                {negMark&&<input type="number" value={negRatio} onChange={e=>setNegRatio(parseFloat(e.target.value))} step="0.25" min="0.25" max="1" style={{...inp,width:80,marginLeft:8}} title="Deduct ratio"/>}
              </label>
            </Field>
          </div>
        </div>
      </Card>

      {/* Questions */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin:"20px 0 12px"}}>
        <h3 style={{fontSize:15,fontWeight:700,color:"var(--text)",margin:0}}>Questions ({questions.length})</h3>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{setBulkMode(b=>!b);setHtmlMode(false);}} style={smBtn("var(--navy)")}>{bulkMode?"Hide":"📋 Bulk Import"}</button>
          <button onClick={()=>{setHtmlMode(h=>!h);setBulkMode(false);}} style={smBtn("var(--orange)")}>{htmlMode?"Hide":"📄 Upload HTML"}</button>
          <button onClick={addQuestion} style={smBtn("var(--green)")}>+ Add Question</button>
        </div>
      </div>

      {/* Bulk import panel */}
      {bulkMode&&(
        <Card title="📋 Bulk Import Questions">
          <InfoBox>Paste multiple questions below. Format each question as:
<br/><code style={{fontSize:11,display:"block",marginTop:6,background:"var(--bg)",padding:8,borderRadius:6,whiteSpace:"pre-line"}}>{`Q. What is Newton's first law?
A. F = ma
B. An object at rest stays at rest...
C. For every action...
D. Energy cannot be...
Ans: B
Sol: Newton's first law states...

Q. Next question here...
A. Option A...`}</code>
          </InfoBox>
          <textarea value={bulkText} onChange={e=>setBulkText(e.target.value)} rows={10} placeholder="Paste your questions here..." style={{...inp,resize:"vertical",marginTop:10,fontFamily:"monospace",fontSize:12}}/>
          {importMsg&&<Feedback msg={importMsg} style={{marginTop:8}}/>}
          <button onClick={parseBulk} disabled={!bulkText.trim()} style={{...btnStyle("var(--purple)"),marginTop:10}}>Import Questions →</button>
        </Card>
      )}

      {/* HTML upload panel */}
      {htmlMode&&(
        <Card title="📄 Upload Exam HTML File">
          <InfoBox>
            Upload an exported <b>.html</b> exam file (Utkorsho / Udvash / Utkorsho Online format).
            Bangla (ক/খ/গ/ঘ) and English (A/B/C/D) options are auto-mapped. Math, chemistry, and images are kept.
          </InfoBox>
          <label style={{display:"block",marginTop:12,padding:"24px 16px",border:"2px dashed var(--border)",borderRadius:10,textAlign:"center",cursor:htmlBusy?"wait":"pointer",background:"var(--bg)"}}>
            <div style={{fontSize:32,marginBottom:6}}>📂</div>
            <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{htmlBusy?"Parsing...":"Click to choose .html file"}</div>
            <div style={{fontSize:11,color:"var(--sub)",marginTop:4}}>Supports Bangla & English exam HTML</div>
            <input type="file" accept=".html,text/html" disabled={htmlBusy}
              onChange={e=>{const f=e.target.files?.[0]; if(f) importHtmlFile(f); e.currentTarget.value="";}}
              style={{display:"none"}}/>
          </label>
          {importMsg&&<Feedback msg={importMsg} style={{marginTop:8}}/>}
        </Card>
      )}

      {questions.length===0&&<Empty icon="📝" text="No questions yet. Add manually, paste in bulk, or upload an HTML file."/>}

      {questions.map((q,qi)=>(
        <div key={q.id} style={{...listItem,marginBottom:12,border:activeQ===qi?"2px solid var(--purple)":"2px solid var(--border)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <span style={{background:"var(--purple)",color:"#fff",borderRadius:50,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>Q{qi+1}</span>
            <div style={{flex:1,fontWeight:600,fontSize:13,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}><MathText text={q.text||"Question text..."}/></div>
            <button onClick={()=>setActiveQ(activeQ===qi?null:qi)} style={smBtn("var(--navy)")}>{activeQ===qi?"▲ Close":"▼ Edit"}</button>
            <button onClick={()=>removeQuestion(qi)} style={smBtn("var(--orange)")}>✕</button>
          </div>

          {/* Editor + always-on live preview side-by-side */}
          {activeQ===qi&&(
            <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:14}}>
              {/* LEFT: editor */}
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <Field label="Question Text (Bangla/English, $math$, \\ce{H2O})">
                  <textarea value={q.text} onChange={e=>updateQ(qi,"text",e.target.value)} rows={3} placeholder={`What is the value of $x$ if $2x + 5 = 15$?\nOR: হাইড্রোজেনের পারমাণবিক সংখ্যা কত?`} style={{...inp,resize:"vertical",fontFamily:"Roboto,'Noto Sans Bengali',monospace",fontSize:13}}/>
                  <div style={{fontSize:10,color:"var(--sub)",marginTop:4}}>💡 <code>{"$x^2$"}</code> · <code>{"$$\\frac{a}{b}$$"}</code> · <code>{"\\ce{H_2O}"}</code></div>
                </Field>
                {q.options.map((o:any,oi:number)=>(
                  <Field key={o.id} label={`Option ${o.id}`}>
                    <input value={o.text} onChange={e=>updateOpt(qi,oi,e.target.value)} placeholder={`Option ${o.id}`} style={inp}/>
                  </Field>
                ))}
                <Field label="Correct Answer">
                  <div style={{display:"flex",gap:6}}>
                    {["A","B","C","D"].map(id=>(
                      <label key={id} style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer",padding:"6px 14px",borderRadius:8,background:q.correct===id?"var(--green)":"var(--bg)",color:q.correct===id?"#fff":"var(--text)",fontWeight:700,fontSize:14,border:`2px solid ${q.correct===id?"var(--green)":"var(--border)"}`}}>
                        <input type="radio" name={`correct_${qi}`} value={id} checked={q.correct===id} onChange={()=>updateQ(qi,"correct",id)} style={{display:"none"}}/> {id}
                      </label>
                    ))}
                  </div>
                </Field>
                <Field label="Solution (optional)">
                  <textarea value={q.solution} onChange={e=>updateQ(qi,"solution",e.target.value)} rows={2} placeholder="Step-by-step solution... (math supported)" style={{...inp,resize:"vertical",fontSize:13}}/>
                </Field>
              </div>

              {/* RIGHT: live preview */}
              <div style={{
                background:"var(--bg)",borderRadius:10,padding:14,
                border:"1.5px dashed var(--border)",position:"sticky",top:0,
                alignSelf:"flex-start",maxHeight:"75vh",overflowY:"auto",
              }}>
                <div style={{fontSize:10,fontWeight:700,color:"var(--sub)",letterSpacing:1,marginBottom:8}}>👁 LIVE PREVIEW</div>
                <div style={{fontWeight:700,marginBottom:10,lineHeight:1.7,fontSize:14,color:"var(--text)"}}>
                  <MathText text={q.text||"(question text appears here)"}/>
                </div>
                {q.options.map((o:any)=>(
                  <div key={o.id} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:6,padding:"7px 10px",borderRadius:8,background:o.id===q.correct?"#d4edda":"var(--surface)",border:o.id===q.correct?"1.5px solid #28a745":"1.5px solid var(--border)"}}>
                    <span style={{fontWeight:700,color:o.id===q.correct?"#28a745":"var(--sub)",flexShrink:0}}>{o.id}.</span>
                    <div style={{flex:1,fontSize:13}}><MathText text={o.text||`(option ${o.id})`}/></div>
                    {o.id===q.correct && <span style={{color:"#28a745",fontSize:14}}>✓</span>}
                  </div>
                ))}
                {q.solution && (
                  <div style={{marginTop:10,padding:"10px 12px",background:"#fff9e6",borderRadius:8,fontSize:13,border:"1px solid #fde68a"}}>
                    <b style={{color:"#92400e"}}>💡 Solution:</b> <MathText text={q.solution}/>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      <button onClick={addQuestion} style={{...btnStyle("var(--purple)"),width:"100%",marginTop:8}}>+ Add Another Question</button>
      <button onClick={save} disabled={saving||!title||questions.length===0} style={{...btnStyle("var(--green)"),width:"100%",marginTop:10,fontSize:16}}>
        {saving?"Saving...":"💾 Save Quiz"}
      </button>
    </div>
  );
}

/* ══ NOTIFICATIONS ══════════════════════════════════════════ */
function NotifsTab() {
  const [notifs,setNotifs]=useState<any[]>([]);
  const [users,setUsers]=useState<any[]>([]);
  const [f,setF]=useState({title:"",body:""});
  const [mode,setMode]=useState<"all"|"specific">("all");
  const [picked,setPicked]=useState<Set<string>>(new Set());
  const [search,setSearch]=useState("");
  const [msg,setMsg]=useState("");
  const [sending,setSending]=useState(false);

  const load=()=>{
    api("/api/admin/notifications").then(r=>r.json()).then(d=>{if(Array.isArray(d))setNotifs(d);});
    api("/api/admin/users").then(r=>r.json()).then(d=>{if(Array.isArray(d))setUsers(d);});
  };
  useEffect(()=>{load();},[]);

  function toggleUser(u:string){
    setPicked(p=>{const n=new Set(p); if(n.has(u))n.delete(u); else n.add(u); return n;});
  }
  function selectAll(){ setPicked(new Set(filteredUsers.map(u=>u.username))); }
  function selectNone(){ setPicked(new Set()); }

  async function send(){
    if(!f.title||!f.body){setMsg("⚠️ Title and message required");return;}
    if(mode==="specific"&&picked.size===0){setMsg("⚠️ Pick at least one user, or switch to 'All Users'");return;}
    setSending(true);
    const body = {
      title: f.title,
      body: f.body,
      recipients: mode==="all" ? [] : Array.from(picked),
    };
    const r = await api("/api/admin/notifications",{method:"POST",body:JSON.stringify(body)});
    setSending(false);
    if(!r.ok){setMsg("❌ Send failed");return;}
    setF({title:"",body:""}); setPicked(new Set());
    setMsg(mode==="all"
      ? "✅ Broadcast sent to ALL users instantly!"
      : `✅ Sent to ${body.recipients.length} specific user(s)!`);
    load();
  }
  async function del(id:string){
    if(!confirm("Delete this notification?"))return;
    await api(`/api/admin/notifications/${id}`,{method:"DELETE"}); load();
  }

  const filteredUsers = users.filter(u =>
    !search.trim() || u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <SectionTitle>🔔 Send Notifications</SectionTitle>
      <InfoBox>
        Send to <b>everyone</b> or pick <b>specific members</b>. Users see them in their bell 🔔
        instantly (polled every ~25s). Read state is tracked per user.
      </InfoBox>

      <Card title="📢 Compose Notification">
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Field label="Title">
            <input value={f.title} onChange={e=>setF({...f,title:e.target.value})}
              placeholder="📅 Exam Tomorrow — Physics Chapter 3" style={inp}/>
          </Field>
          <Field label="Message Body (Bangla/English supported)">
            <textarea value={f.body} onChange={e=>setF({...f,body:e.target.value})}
              rows={3}
              placeholder="আগামীকাল পরীক্ষা আছে। সবাই প্রস্তুত থাকো!"
              style={{...inp,resize:"vertical",fontFamily:"Roboto,'Noto Sans Bengali',sans-serif"}}/>
          </Field>

          <Field label="Send To">
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button type="button" onClick={()=>setMode("all")}
                style={{...btnStyle(mode==="all"?"var(--purple)":"var(--border)"),
                        flex:1,minWidth:140,opacity:mode==="all"?1:0.7}}>
                🌍 All Users ({users.length})
              </button>
              <button type="button" onClick={()=>setMode("specific")}
                style={{...btnStyle(mode==="specific"?"var(--purple)":"var(--border)"),
                        flex:1,minWidth:140,opacity:mode==="specific"?1:0.7}}>
                👤 Specific Members
              </button>
            </div>
          </Field>

          {mode==="specific"&&(
            <div style={{border:"1.5px solid var(--border)",borderRadius:10,padding:10,background:"var(--bg)"}}>
              <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                <input value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="🔍 Search username..." style={{...inp,flex:1,minWidth:160}}/>
                <button type="button" onClick={selectAll} style={smBtn("var(--navy)")}>Select All</button>
                <button type="button" onClick={selectNone} style={smBtn("var(--orange)")}>Clear</button>
              </div>
              <div style={{fontSize:12,color:"var(--sub)",marginBottom:8,fontWeight:700}}>
                {picked.size} of {users.length} selected
              </div>
              {users.length===0 && (
                <div style={{padding:20,textAlign:"center",color:"var(--sub)",fontSize:13}}>
                  No registered users yet — create accounts in the Users tab first.
                </div>
              )}
              <div style={{maxHeight:240,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
                {filteredUsers.map(u=>{
                  const sel = picked.has(u.username);
                  return (
                    <label key={u.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",
                      borderRadius:8,background:sel?"rgba(124,58,237,0.12)":"var(--surface)",cursor:"pointer",
                      border:`1px solid ${sel?"var(--purple)":"var(--border)"}`}}>
                      <input type="checkbox" checked={sel} onChange={()=>toggleUser(u.username)}
                        style={{width:16,height:16,accentColor:"var(--purple)"}}/>
                      <div style={{width:28,height:28,borderRadius:50,background:"var(--purple)",color:"#fff",
                        display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:12}}>
                        {u.username[0]?.toUpperCase()}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{u.username}</div>
                        {u.note&&<div style={{fontSize:11,color:"var(--sub)"}}>{u.note}</div>}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {msg&&<Feedback msg={msg}/>}
          <button onClick={send} disabled={sending||!f.title||!f.body}
            style={btnStyle("var(--purple)")}>
            {sending?"Sending...":(mode==="all"?"📢 Broadcast to All →":`📨 Send to ${picked.size} Member(s) →`)}
          </button>
        </div>
      </Card>

      <SectionTitle style={{marginTop:24}}>📜 Sent History ({notifs.length})</SectionTitle>
      {notifs.length===0&&<Empty icon="🔔" text="No notifications sent yet"/>}
      {notifs.map(n=>{
        const isAll = !n.recipients || n.recipients.length===0;
        const totalRecipients = isAll ? users.length : n.recipients.length;
        const readCount = (n.readBy||[]).length;
        return (
          <div key={n.id} style={{...listItem,display:"flex",alignItems:"flex-start",gap:10}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                <div style={{fontWeight:700,color:"var(--text)"}}>{n.title}</div>
                {isAll
                  ? <span style={{fontSize:10,background:"#dcfce7",color:"#166534",padding:"2px 8px",borderRadius:99,fontWeight:700}}>🌍 BROADCAST</span>
                  : <span style={{fontSize:10,background:"#fef3c7",color:"#92400e",padding:"2px 8px",borderRadius:99,fontWeight:700}}>👤 {n.recipients.length} member(s)</span>}
                <span style={{fontSize:10,background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:99,fontWeight:700}}>
                  👁️ {readCount}/{totalRecipients} read
                </span>
              </div>
              <div style={{fontSize:13,color:"var(--sub)",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{n.body}</div>
              {!isAll && n.recipients.length>0 && (
                <div style={{fontSize:11,color:"var(--sub)",marginTop:6,fontStyle:"italic"}}>
                  → {n.recipients.slice(0,5).join(", ")}{n.recipients.length>5?` +${n.recipients.length-5} more`:""}
                </div>
              )}
              <div style={{fontSize:11,color:"var(--sub)",marginTop:6}}>{new Date(n.createdAt).toLocaleString()}</div>
            </div>
            <button onClick={()=>del(n.id)} style={smBtn("var(--orange)")}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

/* ══ DASHBOARD MENU MANAGER ════════════════════════════════ */
function MenuTab(){
  const [items,setItems]=useState<any[]>([]);
  const [msg,setMsg]=useState("");
  const [editing,setEditing]=useState<any|null>(null);
  const blank = { label:"", icon:"⭐", bg:"#ede9fe", chevron:"#7c3aed", path:"/", order:0, enabled:true };
  const [draft,setDraft]=useState<any>(blank);

  const load=()=>api("/api/admin/dashboard-menu").then(r=>r.json())
    .then(d=>{if(Array.isArray(d))setItems(d);});
  useEffect(()=>{load();},[]);

  function startNew(){ setEditing(null); setDraft({...blank, order: items.length+1}); }
  function startEdit(it:any){ setEditing(it); setDraft({...it}); }

  async function save(){
    if(!draft.label.trim()||!draft.icon.trim()){setMsg("⚠️ Label and icon required");return;}
    const r = editing
      ? await api(`/api/admin/dashboard-menu/${editing.id}`,{method:"PUT",body:JSON.stringify(draft)})
      : await api("/api/admin/dashboard-menu",{method:"POST",body:JSON.stringify(draft)});
    if(!r.ok){setMsg("❌ Save failed");return;}
    setMsg(editing?"✅ Updated!":"✅ Added to dashboard!");
    setEditing(null); setDraft({...blank, order: items.length+2});
    load();
  }
  async function del(id:string){
    if(!confirm("Remove this menu item from dashboard?"))return;
    await api(`/api/admin/dashboard-menu/${id}`,{method:"DELETE"}); load();
  }
  async function toggleEnabled(it:any){
    await api(`/api/admin/dashboard-menu/${it.id}`,{method:"PUT",body:JSON.stringify({enabled:!it.enabled})});
    load();
  }
  async function move(it:any, dir:-1|1){
    const sorted = [...items].sort((a,b)=>a.order-b.order);
    const idx = sorted.findIndex(x=>x.id===it.id);
    const newIdx = idx+dir;
    if(newIdx<0||newIdx>=sorted.length)return;
    const ids = sorted.map(x=>x.id);
    [ids[idx],ids[newIdx]] = [ids[newIdx],ids[idx]];
    await api("/api/admin/dashboard-menu/reorder",{method:"POST",body:JSON.stringify({ids})});
    load();
  }

  const PRESET_BG = ["#ede9fe","#fff3e0","#e3f2fd","#fef3c7","#fee2e2","#e8f5e9","#f3e5f5","#e0f7fa","#fce4ec","#dbeafe","#fed7aa"];
  const PRESET_CHEV = ["#7c3aed","#e65100","#2e7d32","#d97706","#dc2626","#e53935","#7b2fa5","#0891b2","#db2777","#1d4ed8"];
  const PRESET_PATH = ["/","/ai-tutor","/past-classes","/exams","/profile","/leaderboard"];

  return (
    <div>
      <SectionTitle>⊞ Dashboard Menu Manager</SectionTitle>
      <InfoBox>
        Add, edit, reorder, hide or delete the menu items shown on every student's dashboard.
        Changes appear instantly when they reload.
      </InfoBox>

      <Card title={editing?`✏️ Edit "${editing.label}"`:"➕ Add New Dashboard Item"}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",gap:10}}>
            <Field label="Icon (emoji)">
              <input value={draft.icon} onChange={e=>setDraft({...draft,icon:e.target.value})}
                placeholder="🤖" style={{...inp,fontSize:20,textAlign:"center",width:70}}/>
            </Field>
            <div style={{flex:1}}>
              <Field label="Label">
                <input value={draft.label} onChange={e=>setDraft({...draft,label:e.target.value})}
                  placeholder="e.g. AI Tutor" style={inp}/>
              </Field>
            </div>
          </div>

          <Field label="Navigation Path">
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
              <input value={draft.path} onChange={e=>setDraft({...draft,path:e.target.value})}
                placeholder="/ai-tutor" style={{...inp,flex:1,minWidth:160}}/>
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>
              {PRESET_PATH.map(p=>(
                <button key={p} type="button" onClick={()=>setDraft({...draft,path:p})}
                  style={{...smBtn(draft.path===p?"var(--purple)":"#888"),fontSize:11}}>{p}</button>
              ))}
            </div>
          </Field>

          <Field label="Background Color">
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="color" value={draft.bg} onChange={e=>setDraft({...draft,bg:e.target.value})}
                style={{width:40,height:32,border:"none",cursor:"pointer",borderRadius:6}}/>
              <input value={draft.bg} onChange={e=>setDraft({...draft,bg:e.target.value})}
                style={{...inp,flex:1,fontFamily:"monospace"}}/>
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>
              {PRESET_BG.map(c=>(
                <button key={c} type="button" onClick={()=>setDraft({...draft,bg:c})}
                  style={{width:26,height:26,background:c,border:draft.bg===c?"3px solid var(--purple)":"1.5px solid var(--border)",borderRadius:6,cursor:"pointer"}}/>
              ))}
            </div>
          </Field>

          <Field label="Accent (chevron) Color">
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="color" value={draft.chevron} onChange={e=>setDraft({...draft,chevron:e.target.value})}
                style={{width:40,height:32,border:"none",cursor:"pointer",borderRadius:6}}/>
              <input value={draft.chevron} onChange={e=>setDraft({...draft,chevron:e.target.value})}
                style={{...inp,flex:1,fontFamily:"monospace"}}/>
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>
              {PRESET_CHEV.map(c=>(
                <button key={c} type="button" onClick={()=>setDraft({...draft,chevron:c})}
                  style={{width:26,height:26,background:c,border:draft.chevron===c?"3px solid var(--purple)":"1.5px solid var(--border)",borderRadius:6,cursor:"pointer"}}/>
              ))}
            </div>
          </Field>

          {/* Live preview */}
          <Field label="Live Preview">
            <div className="dash-menu-item" style={{display:"flex",alignItems:"center",gap:12,padding:12,background:"var(--surface)",borderRadius:12,border:"1.5px solid var(--border)"}}>
              <div style={{width:46,height:46,borderRadius:10,background:draft.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:22}}>{draft.icon||"⭐"}</span>
              </div>
              <span style={{flex:1,fontWeight:600,color:"var(--text)"}}>{draft.label||"Label"}</span>
              <span style={{color:draft.chevron,fontSize:24,fontWeight:700}}>›</span>
            </div>
          </Field>

          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
            <input type="checkbox" checked={draft.enabled} onChange={e=>setDraft({...draft,enabled:e.target.checked})}
              style={{width:16,height:16,accentColor:"var(--purple)"}}/>
            <span style={{fontSize:13,color:"var(--text)"}}>Visible on dashboard</span>
          </label>

          {msg&&<Feedback msg={msg}/>}
          <div style={{display:"flex",gap:8}}>
            <button onClick={save} style={{...btnStyle("var(--purple)"),flex:1}}>
              {editing?"💾 Save Changes":"➕ Add to Dashboard"}
            </button>
            {editing&&(
              <button onClick={startNew} style={btnStyle("var(--orange)")}>Cancel</button>
            )}
          </div>
        </div>
      </Card>

      <SectionTitle style={{marginTop:24}}>Current Items ({items.length}) <span style={{fontSize:11,fontWeight:500,color:"var(--sub)"}}>· drag <span className="dd-handle" style={{padding:0}}>⋮⋮</span> to reorder</span></SectionTitle>
      {items.length===0&&<Empty icon="⊞" text="No menu items yet — add some above"/>}
      <DraggableList
        items={items.slice().sort((a,b)=>a.order-b.order)}
        onReorder={async(ids)=>{
          // optimistic
          const next=ids.map((id,i)=>{const it=items.find(x=>x.id===id)!; return {...it, order:i+1};});
          setItems(next);
          await api("/api/admin/dashboard-menu/reorder",{method:"POST",body:JSON.stringify({ids})});
          load();
        }}
        renderRow={(it,idx)=>(
          <>
            <span className="dd-handle" title="Drag to reorder">⋮⋮</span>
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              <button onClick={()=>move(it,-1)} disabled={idx===0} style={{...smBtn("#888"),padding:"2px 6px",fontSize:10,opacity:idx===0?0.3:1}}>▲</button>
              <button onClick={()=>move(it,1)} disabled={idx===items.length-1} style={{...smBtn("#888"),padding:"2px 6px",fontSize:10,opacity:idx===items.length-1?0.3:1}}>▼</button>
            </div>
            <div style={{width:42,height:42,borderRadius:10,background:it.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{fontSize:20}}>{it.icon}</span>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,color:"var(--text)"}}>{it.label} {!it.enabled&&<span style={{fontSize:10,color:"var(--orange)"}}>(hidden)</span>}</div>
              <div style={{fontSize:11,color:"var(--sub)",fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.path}</div>
            </div>
            <button onClick={()=>toggleEnabled(it)} style={smBtn(it.enabled?"#10b981":"#888")} title={it.enabled?"Hide":"Show"}>
              {it.enabled?"👁️":"🚫"}
            </button>
            <button onClick={()=>startEdit(it)} style={smBtn("var(--navy)")}>✎</button>
            <button onClick={()=>del(it.id)} style={smBtn("var(--orange)")}>✕</button>
          </>
        )}
      />
    </div>
  );
}

/* Generic HTML5 drag-and-drop list helper */
function DraggableList<T extends { id:string; enabled?:boolean }>({
  items, onReorder, renderRow,
}: { items:T[]; onReorder:(ids:string[])=>void; renderRow:(it:T,idx:number)=>React.ReactNode }) {
  const dragId = useRef<string|null>(null);
  const [overId,setOverId] = useState<string|null>(null);
  function onDragStart(e:React.DragEvent,id:string){
    dragId.current=id;
    e.dataTransfer.effectAllowed="move";
    try { e.dataTransfer.setData("text/plain", id); } catch {}
  }
  function onDragOver(e:React.DragEvent,id:string){
    e.preventDefault();
    if (overId!==id) setOverId(id);
  }
  function onDragLeave(){ setOverId(null); }
  function onDrop(e:React.DragEvent,targetId:string){
    e.preventDefault();
    setOverId(null);
    const src = dragId.current; dragId.current=null;
    if (!src || src===targetId) return;
    const ids = items.map(i=>i.id);
    const from = ids.indexOf(src), to = ids.indexOf(targetId);
    if (from<0||to<0) return;
    ids.splice(from,1);
    ids.splice(to,0,src);
    onReorder(ids);
  }
  return (
    <>
      {items.map((it,idx)=>(
        <div key={it.id} draggable
          onDragStart={e=>onDragStart(e,it.id)}
          onDragOver={e=>onDragOver(e,it.id)}
          onDragLeave={onDragLeave}
          onDrop={e=>onDrop(e,it.id)}
          className={`dd-row ${dragId.current===it.id?"dragging":""} ${overId===it.id?"over":""}`}
          style={{...listItem,display:"flex",alignItems:"center",gap:10,opacity:it.enabled===false?0.5:1}}>
          {renderRow(it,idx)}
        </div>
      ))}
    </>
  );
}

/* ══ DOUBTS MODERATION ══════════════════════════════════════ */
function DoubtsTab() {
  const [doubts,setDoubts]=useState<any[]>([]);
  useEffect(()=>{ fetch("/api/doubts").then(r=>r.json()).then(d=>{if(Array.isArray(d))setDoubts(d);}); },[]);
  return (
    <div>
      <SectionTitle>❓ Student Doubts & Q&A</SectionTitle>
      {doubts.length===0&&<Empty icon="❓" text="No doubts posted yet"/>}
      {doubts.map(d=>(
        <div key={d.id} style={{...listItem,marginBottom:10}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,color:"var(--text)",marginBottom:4}}>{d.title}</div>
              <div style={{fontSize:13,color:"var(--sub)",marginBottom:6}}>{d.text.substring(0,150)}{d.text.length>150?"...":""}</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:11,color:"var(--sub)"}}>{d.answers?.length||0} answers · {d.views} views</span>
                {d.resolved&&<span style={{fontSize:11,background:"#d4edda",color:"#155724",borderRadius:20,padding:"1px 8px",fontWeight:700}}>✅ Resolved</span>}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══ MICRO FEED ════════════════════════════════════════════ */
function MicroFeedTab() {
  const [feed,setFeed]=useState<any[]>([]); const [f,setF]=useState({videoId:"",title:"",subject:"",description:"",duration:"",tags:""}); const [msg,setMsg]=useState("");
  const load=()=>fetch("/api/microfeed").then(r=>r.json()).then(d=>{if(Array.isArray(d))setFeed(d);});
  useEffect(()=>{load();},[]);
  async function add(){if(!f.videoId||!f.title)return;await fetch("/api/microfeed",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...f,tags:f.tags.split(",").map(t=>t.trim()).filter(Boolean)})});setF({videoId:"",title:"",subject:"",description:"",duration:"",tags:""});setMsg("✅ Added!");load();}
  return (
    <div>
      <SectionTitle>⚡ Micro-Learning Feed</SectionTitle>
      <Card title="➕ Add Short Lesson">
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <Field label="YouTube ID"><input value={f.videoId} onChange={e=>setF({...f,videoId:e.target.value})} placeholder="Video ID" style={inp}/></Field>
          <Field label="Title"><input value={f.title} onChange={e=>setF({...f,title:e.target.value})} placeholder="60-second concept video title" style={inp}/></Field>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Field label="Subject"><input value={f.subject} onChange={e=>setF({...f,subject:e.target.value})} placeholder="Physics" style={inp}/></Field>
            <Field label="Duration"><input value={f.duration} onChange={e=>setF({...f,duration:e.target.value})} placeholder="0:45" style={inp}/></Field>
          </div>
          <Field label="Tags (comma separated)"><input value={f.tags} onChange={e=>setF({...f,tags:e.target.value})} placeholder="newton, force, motion" style={inp}/></Field>
          {msg&&<Feedback msg={msg}/>}
          <button onClick={add} disabled={!f.videoId||!f.title} style={btnStyle("var(--purple)")}>Add to Feed →</button>
        </div>
      </Card>
      <SectionTitle style={{marginTop:20}}>Feed ({feed.length} clips)</SectionTitle>
      {feed.map(v=>(
        <div key={v.id} style={{...listItem,display:"flex",gap:10,alignItems:"center"}}>
          <div style={{width:48,height:36,background:"#000",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:16,flexShrink:0}}>▶</div>
          <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{v.title}</div><div style={{fontSize:11,color:"var(--sub)"}}>{v.subject} · {v.duration} · {v.views} views</div></div>
        </div>
      ))}
    </div>
  );
}

/* ══ MARKETPLACE ════════════════════════════════════════════ */
function MarketplaceTab() {
  const [items,setItems]=useState<any[]>([]); const [f,setF]=useState({teacherName:"",title:"",desc:"",subject:"",price:"0"});
  const load=()=>fetch("/api/marketplace").then(r=>r.json()).then(d=>{if(Array.isArray(d))setItems(d);});
  useEffect(()=>{load();},[]);
  async function add(){if(!f.title||!f.teacherName)return;await fetch("/api/marketplace",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...f,price:parseFloat(f.price)||0})});setF({teacherName:"",title:"",desc:"",subject:"",price:"0"});load();}
  return (
    <div>
      <SectionTitle>🏪 Teacher Marketplace</SectionTitle>
      <Card title="➕ Add Course/Test Pack">
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <Field label="Teacher Name"><input value={f.teacherName} onChange={e=>setF({...f,teacherName:e.target.value})} placeholder="Teacher full name" style={inp}/></Field>
          <Field label="Course Title"><input value={f.title} onChange={e=>setF({...f,title:e.target.value})} placeholder="Complete Physics for HSC" style={inp}/></Field>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Field label="Subject"><input value={f.subject} onChange={e=>setF({...f,subject:e.target.value})} style={inp}/></Field>
            <Field label="Price (৳)"><input type="number" value={f.price} onChange={e=>setF({...f,price:e.target.value})} style={inp}/></Field>
          </div>
          <Field label="Description"><textarea value={f.desc} onChange={e=>setF({...f,desc:e.target.value})} rows={2} style={{...inp,resize:"vertical"}}/></Field>
          <button onClick={add} disabled={!f.title||!f.teacherName} style={btnStyle("var(--purple)")}>Add Course →</button>
        </div>
      </Card>
      <SectionTitle style={{marginTop:20}}>Courses ({items.length})</SectionTitle>
      {items.map(i=>(
        <div key={i.id} style={{...listItem,display:"flex",gap:10}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:700}}>{i.title}</div>
            <div style={{fontSize:12,color:"var(--sub)"}}>by {i.teacherName} · {i.subject}</div>
          </div>
          <div style={{fontWeight:900,color:"var(--purple)",fontSize:16}}>৳{i.price}</div>
        </div>
      ))}
    </div>
  );
}

/* ══ REUSABLE UI ════════════════════════════════════════════ */
/* ══ DATABASE EDITOR ════════════════════════════════════════ */
function DatabaseTab() {
  const [files,setFiles]=useState<{name:string;size:number;mtime:string}[]>([]);
  const [active,setActive]=useState<string|null>(null);
  const [content,setContent]=useState("");
  const [original,setOriginal]=useState("");
  const [msg,setMsg]=useState("");
  const [loading,setLoading]=useState(false);
  const [newName,setNewName]=useState("");

  const loadList=()=>api("/api/admin/db/files").then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setFiles(d); });
  useEffect(()=>{ loadList(); },[]);

  function open(name:string){
    setActive(name); setMsg(""); setLoading(true);
    api(`/api/admin/db/file/${encodeURIComponent(name)}`)
      .then(r=>r.text())
      .then(t=>{ setContent(t); setOriginal(t); })
      .catch(e=>setMsg("❌ "+e.message))
      .finally(()=>setLoading(false));
  }
  async function save(){
    if(!active) return;
    setLoading(true); setMsg("");
    try {
      const r=await api(`/api/admin/db/file/${encodeURIComponent(active)}`,{ method:"PUT", body:JSON.stringify({content}) });
      const d=await r.json();
      if(!r.ok) throw new Error(d.error||"Save failed");
      setOriginal(content); setMsg(`✅ Saved (${d.bytes} bytes). Backup created.`); loadList();
    } catch(e:any){ setMsg("❌ "+e.message); }
    finally { setLoading(false); }
  }
  function format(){
    try { setContent(JSON.stringify(JSON.parse(content),null,2)); setMsg("✅ Formatted"); }
    catch(e:any){ setMsg("❌ Invalid JSON: "+e.message); }
  }
  async function createFile(){
    const name=newName.trim();
    if(!/^[a-zA-Z0-9_\-]+$/.test(name)){ setMsg("❌ Name must be letters/digits/underscore/hyphen"); return; }
    const fname=name+".json";
    try {
      const r=await api(`/api/admin/db/file/${encodeURIComponent(fname)}`,{ method:"POST", body:JSON.stringify({content:"[]"}) });
      const d=await r.json();
      if(!r.ok) throw new Error(d.error||"Create failed");
      setNewName(""); setMsg("✅ Created "+fname); loadList(); open(fname);
    } catch(e:any){ setMsg("❌ "+e.message); }
  }
  async function deleteFile(name:string){
    if(!confirm(`Delete ${name}? (A backup will be kept.)`)) return;
    try {
      const r=await api(`/api/admin/db/file/${encodeURIComponent(name)}`,{ method:"DELETE" });
      if(!r.ok){ const d=await r.json(); throw new Error(d.error); }
      setMsg("✅ Deleted (backup kept)");
      if(active===name){ setActive(null); setContent(""); setOriginal(""); }
      loadList();
    } catch(e:any){ setMsg("❌ "+e.message); }
  }

  const dirty = content !== original;
  let parsed:any=null; let parseErr=""; try { parsed=JSON.parse(content); } catch(e:any){ parseErr=e.message; }

  return (
    <div>
      <SectionTitle>🗄️ Manual Database Editor</SectionTitle>
      <InfoBox>
        ⚠ Direct edits to JSON files. Backups are automatically saved to <code>data/.backups/</code> on every save and delete.
      </InfoBox>

      <div style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:14,marginTop:14}}>
        {/* File list */}
        <div style={{background:"var(--card)",borderRadius:10,padding:10,border:"1px solid var(--border)"}}>
          <div style={{fontSize:12,fontWeight:700,color:"var(--sub)",marginBottom:8}}>FILES ({files.length})</div>
          <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:380,overflowY:"auto"}}>
            {files.map(f=>(
              <div key={f.name} style={{display:"flex",alignItems:"center",gap:4}}>
                <button onClick={()=>open(f.name)} style={{
                  flex:1,textAlign:"left",padding:"7px 9px",borderRadius:7,border:"none",
                  background:active===f.name?"var(--purple)":"transparent",
                  color:active===f.name?"#fff":"var(--text)",cursor:"pointer",
                  fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                }} title={`${f.size} bytes`}>{f.name}</button>
                <button onClick={()=>deleteFile(f.name)} title="Delete" style={{
                  background:"transparent",border:"none",color:"var(--orange)",cursor:"pointer",fontSize:14,padding:"0 4px",
                }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{borderTop:"1px solid var(--border)",marginTop:10,paddingTop:10}}>
            <div style={{fontSize:11,color:"var(--sub)",marginBottom:4}}>NEW FILE</div>
            <div style={{display:"flex",gap:4}}>
              <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="filename" style={{...inp,padding:"6px 8px",fontSize:12}}/>
              <button onClick={createFile} disabled={!newName.trim()} style={{...smBtn("var(--green)"),padding:"6px 10px"}}>+</button>
            </div>
          </div>
        </div>

        {/* Editor */}
        <div style={{background:"var(--card)",borderRadius:10,padding:12,border:"1px solid var(--border)",minHeight:420}}>
          {!active ? (
            <div style={{textAlign:"center",color:"var(--sub)",padding:60}}>👈 Pick a file to edit</div>
          ) : (
            <>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                <code style={{fontSize:13,fontWeight:700,color:"var(--purple)"}}>{active}</code>
                {dirty && <span style={{fontSize:10,background:"var(--orange)",color:"#fff",padding:"2px 6px",borderRadius:6}}>UNSAVED</span>}
                {parseErr && <span style={{fontSize:10,background:"#dc2626",color:"#fff",padding:"2px 6px",borderRadius:6}}>JSON ERROR</span>}
                {!parseErr && parsed!==null && (
                  <span style={{fontSize:10,color:"var(--sub)"}}>
                    {Array.isArray(parsed) ? `array · ${parsed.length} items`
                     : typeof parsed==="object" ? `object · ${Object.keys(parsed).length} keys`
                     : typeof parsed}
                  </span>
                )}
                <div style={{flex:1}}/>
                <button onClick={format} disabled={loading} style={smBtn("var(--navy)")}>Format</button>
                <button onClick={()=>setContent(original)} disabled={!dirty||loading} style={smBtn("#888")}>Revert</button>
                <button onClick={save} disabled={!dirty||loading||!!parseErr} style={smBtn("var(--green)")}>{loading?"…":"💾 Save"}</button>
              </div>
              <textarea value={content} onChange={e=>setContent(e.target.value)} spellCheck={false} style={{
                width:"100%",minHeight:380,padding:10,borderRadius:8,
                border:`1px solid ${parseErr?"#dc2626":"var(--border)"}`,
                background:"var(--bg)",color:"var(--text)",
                fontFamily:"'SF Mono','Menlo','Consolas',monospace",fontSize:12,lineHeight:1.5,
                resize:"vertical",outline:"none",
              }}/>
              {parseErr && <div style={{fontSize:11,color:"#dc2626",marginTop:6}}>⚠ {parseErr}</div>}
            </>
          )}
          {msg && <Feedback msg={msg} style={{marginTop:10}}/>}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({children,style}:{children:React.ReactNode;style?:React.CSSProperties}){
  return <h2 style={{fontSize:16,fontWeight:800,color:"var(--purple)",fontFamily:"Lato,sans-serif",marginBottom:14,...style}}>{children}</h2>;
}
function Card({title,children}:{title?:string;children:React.ReactNode}){
  return <div style={{background:"var(--surface)",borderRadius:14,padding:18,boxShadow:"0 2px 10px rgba(0,0,0,0.07)",marginBottom:16}}>{title&&<div style={{fontSize:14,fontWeight:700,color:"var(--text)",marginBottom:14,paddingBottom:10,borderBottom:"1px solid var(--border)"}}>{title}</div>}{children}</div>;
}
function InfoBox({children}:{children:React.ReactNode}){
  return <div style={{background:"#e8f4fd",border:"1px solid #bee3f8",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#1a6397",marginBottom:14,lineHeight:1.6}}>{children}</div>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){
  return <div><div style={{fontSize:12,fontWeight:600,color:"var(--sub)",marginBottom:5}}>{label}</div>{children}</div>;
}
function Feedback({msg,style}:{msg:string;style?:React.CSSProperties}){
  const ok=msg.startsWith("✅");
  return <div style={{padding:"8px 12px",borderRadius:8,background:ok?"#d4edda":"#fff3cd",border:`1px solid ${ok?"#c3e6cb":"#ffc107"}`,fontSize:13,color:ok?"#155724":"#856404",...style}}>{msg}</div>;
}
function Empty({icon,text}:{icon:string;text:string}){
  return <div style={{textAlign:"center",padding:"36px 0",color:"var(--sub)"}}><div style={{fontSize:36}}>{icon}</div><p style={{marginTop:10,fontSize:14}}>{text}</p></div>;
}
function Loading(){return <div style={{textAlign:"center",padding:40}}><div style={{fontSize:36}}>⏳</div><p style={{color:"var(--sub)",marginTop:10}}>Loading...</p></div>;}

/* ── style atoms ─────────────────────────────────────────── */
const inp: React.CSSProperties = { padding:"10px 12px", borderRadius:9, border:"1.5px solid var(--border)", background:"var(--bg)", color:"var(--text)", fontSize:13, width:"100%", boxSizing:"border-box", outline:"none", fontFamily:"Roboto,'Noto Sans Bengali',sans-serif" };
const listItem: React.CSSProperties = { background:"var(--surface)", borderRadius:12, padding:14, boxShadow:"0 1px 5px rgba(0,0,0,0.06)", marginBottom:8 };
function btnStyle(bg:string): React.CSSProperties { return { padding:"10px 18px", borderRadius:10, border:"none", background:bg, color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"Roboto,sans-serif", transition:"opacity 150ms" }; }
function smBtn(bg:string): React.CSSProperties { return { padding:"5px 12px", borderRadius:7, border:"none", background:bg, color:"#fff", fontWeight:600, fontSize:12, cursor:"pointer", flexShrink:0 }; }
