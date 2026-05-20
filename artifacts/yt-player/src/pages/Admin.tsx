import { useState, useEffect, useCallback, useRef } from "react";
import MathText from "../components/MathText";

/* ── helpers ──────────────────────────────────────────────── */
const TOKEN = () => sessionStorage.getItem("rr_admin_token") || "";
const api = (path: string, opts: RequestInit = {}) =>
  fetch(path, { ...opts, headers: { "Content-Type":"application/json", Authorization:`Bearer ${TOKEN()}`, ...(opts.headers as any||{}) } });

type Tab = "overview"|"users"|"ips"|"inbox"|"subjects"|"videos"|"quizzes"|"notifs"|"doubts"|"micro"|"market"|"menu"|"db"|"solve"|"live"|"announce"|"discuss"|"flashcards"|"exams"|"papers"|"formulas"|"vocab"|"quotes"|"settings"|"moderation"|"social"|"analytics"|"security"|"aimod"|"logs"|"roles";
const TABS: { id:Tab; icon:string; label:string; group?:string }[] = [
  { id:"overview",   icon:"📊", label:"Overview",       group:"core" },
  { id:"users",      icon:"👤", label:"Users",          group:"core" },
  { id:"ips",        icon:"🌐", label:"IP Access",      group:"core" },
  { id:"inbox",      icon:"📨", label:"Inbox",          group:"core" },
  { id:"moderation", icon:"🛡️", label:"Moderation",     group:"social" },
  { id:"social",     icon:"👥", label:"Groups/Channels",group:"social" },
  { id:"subjects",   icon:"📚", label:"Subjects",       group:"content" },
  { id:"videos",     icon:"🎬", label:"Videos",         group:"content" },
  { id:"quizzes",    icon:"📝", label:"Quizzes",        group:"content" },
  { id:"notifs",     icon:"🔔", label:"Notify",         group:"content" },
  { id:"solve",      icon:"📋", label:"Solve Sheet",    group:"content" },
  { id:"live",       icon:"👨‍🏫", label:"Live Class",     group:"content" },
  { id:"announce",   icon:"📢", label:"Announcements",  group:"content" },
  { id:"discuss",    icon:"💬", label:"Discussions",    group:"content" },
  { id:"flashcards", icon:"🃏", label:"Flashcards",     group:"content" },
  { id:"exams",      icon:"⏰", label:"Exam Dates",     group:"content" },
  { id:"papers",     icon:"📄", label:"Past Papers",    group:"content" },
  { id:"formulas",   icon:"∑",  label:"Formulas",       group:"content" },
  { id:"vocab",      icon:"📖", label:"Vocabulary",     group:"content" },
  { id:"menu",       icon:"⊞",  label:"Dashboard Menu", group:"content" },
  { id:"doubts",     icon:"❓", label:"Doubts",         group:"content" },
  { id:"micro",      icon:"⚡", label:"Micro Feed",     group:"content" },
  { id:"market",     icon:"🏪", label:"Marketplace",    group:"content" },
  { id:"quotes",     icon:"💬", label:"Quotes",         group:"content" },
  { id:"analytics",  icon:"📈", label:"Analytics",      group:"system" },
  { id:"security",   icon:"🔐", label:"Security",       group:"system" },
  { id:"aimod",      icon:"🤖", label:"AI Automation",  group:"system" },
  { id:"logs",       icon:"📋", label:"Activity Logs",  group:"system" },
  { id:"roles",      icon:"🎭", label:"Admin Roles",    group:"system" },
  { id:"settings",   icon:"⚙️", label:"Settings",       group:"system" },
  { id:"db",         icon:"🗄️", label:"Database",       group:"system" },
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
  const [showPass,setShowPass]=useState(false);
  async function submit(e:React.FormEvent){ e.preventDefault(); setLoad(true); setErr("");
    try {
      const r=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:u,password:p})});
      const text=await r.text();
      let d:any={};
      try { d=JSON.parse(text); } catch { setErr("Server error — could not reach API. Is the API server running?"); setLoad(false); return; }
      setLoad(false);
      if(d.token) onLogin(d.token); else setErr(d.error||"Login failed");
    } catch(err) {
      setLoad(false);
      setErr("Network error — could not connect to server");
    }
  }
  return (
    <div style={{minHeight:"100svh",background:"linear-gradient(135deg,#04091a 0%,#081428 55%,#0c1e40 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"Inter,'Roboto','Noto Sans Bengali',sans-serif"}}>
      {/* Animated bg dots */}
      <div style={{position:"fixed",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:0}}>
        {[...Array(6)].map((_,i)=>(
          <div key={i} style={{position:"absolute",borderRadius:"50%",background:"rgba(79,142,247,0.06)",width:i%2?300:200,height:i%2?300:200,top:`${[10,50,80,20,60,35][i]}%`,left:`${[5,75,30,85,15,55][i]}%`,filter:"blur(60px)"}}/>
        ))}
      </div>
      <div style={{width:"100%",maxWidth:400,position:"relative",zIndex:1}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:76,height:76,borderRadius:22,background:"linear-gradient(135deg,#1d4ed8,#6c7fff)",marginBottom:18,boxShadow:"0 0 50px rgba(108,127,255,0.45)"}}>
            <span style={{fontSize:34}}>🛡️</span>
          </div>
          <h1 style={{fontSize:28,fontWeight:900,color:"#fff",fontFamily:"Lato,sans-serif",letterSpacing:"-0.01em"}}>
            <span style={{color:"#4f8ef7"}}>HTR</span> Zone
          </h1>
          <p style={{fontSize:12,color:"rgba(255,255,255,0.35)",marginTop:6,letterSpacing:"0.12em",fontWeight:600}}>ADMIN CONTROL PANEL</p>
        </div>
        {/* Card */}
        <div style={{background:"rgba(255,255,255,0.035)",borderRadius:22,padding:"32px 28px",border:"1px solid rgba(79,142,247,0.2)",backdropFilter:"blur(16px)",boxShadow:"0 24px 80px rgba(0,0,0,0.5)"}}>
          <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:16}}>
            <div>
              <label style={{display:"block",fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.4)",letterSpacing:"0.1em",marginBottom:7,textTransform:"uppercase"}}>Username</label>
              <input value={u} onChange={e=>setU(e.target.value)} placeholder="htr" style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1.5px solid rgba(79,142,247,0.25)",borderRadius:12,padding:"13px 15px",color:"#fff",fontSize:15,outline:"none",transition:"border-color 200ms"}} onFocus={e=>(e.target.style.borderColor="rgba(79,142,247,0.6)")} onBlur={e=>(e.target.style.borderColor="rgba(79,142,247,0.25)")} autoComplete="username"/>
            </div>
            <div>
              <label style={{display:"block",fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.4)",letterSpacing:"0.1em",marginBottom:7,textTransform:"uppercase"}}>Password</label>
              <div style={{position:"relative"}}>
                <input type={showPass?"text":"password"} value={p} onChange={e=>setP(e.target.value)} placeholder="••••••••" style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1.5px solid rgba(79,142,247,0.25)",borderRadius:12,padding:"13px 44px 13px 15px",color:"#fff",fontSize:15,outline:"none"}} onFocus={e=>(e.target.style.borderColor="rgba(79,142,247,0.6)")} onBlur={e=>(e.target.style.borderColor="rgba(79,142,247,0.25)")} autoComplete="current-password"/>
                <button type="button" onClick={()=>setShowPass(s=>!s)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"rgba(255,255,255,0.35)",cursor:"pointer",fontSize:14,padding:4}}>{showPass?"🙈":"👁"}</button>
              </div>
            </div>
            {err&&<div style={{background:"rgba(248,113,113,0.12)",border:"1px solid rgba(248,113,113,0.35)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#f87171",display:"flex",gap:8,alignItems:"center"}}>⚠️ {err}</div>}
            <button type="submit" disabled={loading||!u||!p} style={{background:loading||!u||!p?"rgba(79,142,247,0.3)":"linear-gradient(135deg,#1d4ed8,#6c7fff)",color:"#fff",border:"none",borderRadius:13,padding:"15px",fontSize:16,fontWeight:800,cursor:(loading||!u||!p)?"not-allowed":"pointer",marginTop:4,boxShadow:loading||!u||!p?"none":"0 6px 24px rgba(108,127,255,0.45)",transition:"all 200ms",letterSpacing:"0.02em"}}>
              {loading?"🔐 Authenticating...":"Login to Admin Panel →"}
            </button>
          </form>
        </div>
        <p style={{textAlign:"center",fontSize:11,color:"rgba(255,255,255,0.15)",marginTop:22,letterSpacing:"0.03em"}}>Red Rose 🥀 · Secure Admin Portal · v2.0</p>
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
  const [cmdOpen,setCmdOpen]=useState(false);
  const [crisis,setCrisis]=useState(false);

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key==="k"){e.preventDefault();setCmdOpen(o=>!o);}};
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[]);

  const GROUP_LABELS:{[k:string]:string}={core:"⚡ Core",social:"👥 Social",content:"📚 Content",system:"🔧 System"};
  const groups=["core","social","content","system"];

  return (
    <div style={{minHeight:"100svh",background:"var(--bg)",display:"flex",flexDirection:"column"}}>
      {/* Top bar */}
      <div style={{background:"var(--navy)",color:"#fff",padding:"0 16px",height:52,display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,zIndex:200}}>
        <button onClick={()=>setSideOpen(o=>!o)} style={{background:"none",border:"none",color:"#fff",fontSize:20,cursor:"pointer",padding:4}}>☰</button>
        <span style={{fontWeight:900,fontSize:15,flex:1,fontFamily:"Lato,sans-serif"}}><span style={{color:"#4f8ef7"}}>HTR</span> Zone <span style={{fontSize:11,opacity:0.55,fontWeight:500}}>Admin</span></span>
        <button onClick={()=>setCmdOpen(true)} title="Command Bar (Ctrl+K)" style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.7)",padding:"4px 10px",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
          🔍 <span style={{opacity:0.6}}>Ctrl+K</span>
        </button>
        <button onClick={()=>{setCrisis(c=>!c);alert(crisis?"✅ Crisis mode OFF — platform restored":"🚨 CRISIS MODE ON — posting disabled, uploads blocked!");}}
          style={{background:crisis?"#dc2626":"rgba(220,38,38,0.2)",border:"1px solid #dc2626",color:crisis?"#fff":"#f87171",padding:"4px 11px",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:700}}>
          🚨 {crisis?"CRISIS ON":"Crisis"}
        </button>
        <button onClick={onLogout} style={{background:"var(--orange)",border:"none",color:"#fff",padding:"5px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>Logout</button>
      </div>

      {cmdOpen&&<CommandBar onClose={()=>setCmdOpen(false)} onNavigate={(t)=>{setTab(t as Tab);setCmdOpen(false);}}/>}

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* Sidebar */}
        <nav style={{width:sideOpen?210:56,background:"var(--navy)",flexShrink:0,transition:"width 250ms",overflowX:"hidden",display:"flex",flexDirection:"column",paddingTop:4,overflowY:"auto"}}>
          {groups.map(g=>(
            <div key={g}>
              {sideOpen&&<div style={{padding:"10px 16px 4px",fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.3)",letterSpacing:"0.08em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{GROUP_LABELS[g]}</div>}
              {TABS.filter(t=>t.group===g).map(t=>(
                <button key={t.id} onClick={()=>{setTab(t.id);setSideOpen(false);}}
                  style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",background:tab===t.id?"rgba(255,255,255,0.15)":"transparent",border:"none",color:"#fff",cursor:"pointer",textAlign:"left",whiteSpace:"nowrap",borderLeft:tab===t.id?"3px solid var(--orange)":"3px solid transparent",transition:"background 150ms",width:"100%"}}>
                  <span style={{fontSize:17,flexShrink:0,lineHeight:1}}>{t.icon}</span>
                  <span style={{fontSize:12,fontWeight:600,opacity:sideOpen?1:0,transition:"opacity 200ms"}}>{t.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Content */}
        <main style={{flex:1,overflowY:"auto",padding:"20px 16px 60px"}}>
          {tab==="overview"   && <OverviewTab />}
          {tab==="users"      && <UsersTab />}
          {tab==="ips"        && <IPsTab />}
          {tab==="inbox"      && <InboxTab />}
          {tab==="moderation" && <ModerationTab />}
          {tab==="social"     && <SocialAdminTab />}
          {tab==="subjects"   && <SubjectsTab />}
          {tab==="videos"     && <VideosTab />}
          {tab==="quizzes"    && <QuizzesTab />}
          {tab==="notifs"     && <NotifsTab />}
          {tab==="doubts"     && <DoubtsTab />}
          {tab==="micro"      && <MicroFeedTab />}
          {tab==="market"     && <MarketplaceTab />}
          {tab==="menu"       && <MenuTab />}
          {tab==="solve"      && <SolveSheetTab />}
          {tab==="live"       && <LiveClassTab />}
          {tab==="announce"   && <AnnouncementsTab />}
          {tab==="discuss"    && <DiscussionsTab />}
          {tab==="flashcards" && <FlashcardsTab />}
          {tab==="db"         && <DatabaseTab />}
          {tab==="exams"      && <ExamDatesTab />}
          {tab==="papers"     && <PapersTab />}
          {tab==="formulas"   && <FormulasTab />}
          {tab==="vocab"      && <VocabTab />}
          {tab==="quotes"     && <QuotesTab />}
          {tab==="analytics"  && <AnalyticsTab />}
          {tab==="security"   && <SecurityTab />}
          {tab==="aimod"      && <AiModTab />}
          {tab==="logs"       && <LogsTab />}
          {tab==="roles"      && <RolesTab />}
          {tab==="settings"   && <SettingsTab />}
        </main>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   COMMAND BAR  (Ctrl+K)
══════════════════════════════════════════════════════════ */
function CommandBar({onClose,onNavigate}:{onClose:()=>void;onNavigate:(tab:string)=>void}){
  const [q,setQ]=useState("");
  const inputRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{inputRef.current?.focus();},[]);

  const CMDS=[
    ...TABS.map(t=>({icon:t.icon,label:t.label,action:()=>onNavigate(t.id),tag:"tab"})),
    {icon:"🚫",label:"Ban user…",action:()=>{const u=prompt("Username to ban:");if(u)api(`/api/admin/users/${u}/ban`,{method:"PATCH"}).then(()=>alert("✅ Banned"));onClose();},tag:"action"},
    {icon:"📢",label:"Broadcast notification…",action:()=>onNavigate("notifs"),tag:"action"},
    {icon:"🗑️",label:"Go to Moderation queue",action:()=>onNavigate("moderation"),tag:"action"},
    {icon:"📈",label:"Open Analytics",action:()=>onNavigate("analytics"),tag:"action"},
    {icon:"🔐",label:"Security logs",action:()=>onNavigate("security"),tag:"action"},
    {icon:"🤖",label:"AI Auto-moderation",action:()=>onNavigate("aimod"),tag:"action"},
  ];
  const filtered=q.trim()?CMDS.filter(c=>c.label.toLowerCase().includes(q.toLowerCase())):CMDS.slice(0,10);

  return(
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:"15vh"}} onClick={onClose}>
      <div style={{width:"100%",maxWidth:560,background:"var(--surface)",borderRadius:16,boxShadow:"0 24px 80px rgba(0,0,0,0.5)",border:"1px solid rgba(79,142,247,0.3)",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",borderBottom:"1px solid var(--border)"}}>
          <span style={{fontSize:18}}>🔍</span>
          <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)} placeholder="Type a command or search tabs…"
            style={{flex:1,background:"none",border:"none",outline:"none",fontSize:15,color:"var(--text)",fontFamily:"Roboto,sans-serif"}}
            onKeyDown={e=>{if(e.key==="Escape")onClose();if(e.key==="Enter"&&filtered[0]){filtered[0].action();}}}/>
          <kbd style={{fontSize:11,padding:"2px 6px",background:"var(--bg)",borderRadius:5,border:"1px solid var(--border)",color:"var(--sub)"}}>ESC</kbd>
        </div>
        <div style={{maxHeight:360,overflowY:"auto"}}>
          {filtered.length===0&&<div style={{padding:"24px 16px",textAlign:"center",color:"var(--sub)",fontSize:13}}>No commands found</div>}
          {filtered.map((c,i)=>(
            <button key={i} onClick={()=>{c.action();}} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"11px 16px",background:"none",border:"none",cursor:"pointer",textAlign:"left",transition:"background 100ms"}}
              onMouseEnter={e=>(e.currentTarget.style.background="rgba(79,142,247,0.08)")}
              onMouseLeave={e=>(e.currentTarget.style.background="none")}>
              <span style={{fontSize:17,flexShrink:0}}>{c.icon}</span>
              <span style={{flex:1,fontSize:14,fontWeight:600,color:"var(--text)"}}>{c.label}</span>
              <span style={{fontSize:10,padding:"2px 7px",background:c.tag==="action"?"rgba(249,115,22,0.12)":"rgba(79,142,247,0.1)",color:c.tag==="action"?"var(--orange)":"var(--purple)",borderRadius:99,fontWeight:700}}>{c.tag}</span>
            </button>
          ))}
        </div>
        <div style={{padding:"8px 16px",borderTop:"1px solid var(--border)",fontSize:11,color:"var(--sub)",display:"flex",gap:16}}>
          <span>↑↓ navigate</span><span>↵ select</span><span>ESC close</span>
        </div>
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
  const [users,setUsers]=useState<any[]>([]);
  const [form,setForm]=useState({username:"",password:"",note:"",universalAccess:false});
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState("");
  const load=()=>api("/api/admin/users").then(r=>r.json()).then(d=>{if(Array.isArray(d))setUsers(d);});
  useEffect(()=>{load();},[]);
  async function create(){
    if(!form.username||!form.password){setMsg("Username and password required");return;}
    setSaving(true);
    const r=await api("/api/admin/users",{method:"POST",body:JSON.stringify(form)});
    const d=await r.json(); setSaving(false);
    if(d.error) setMsg(d.error);
    else {setMsg("✅ User created! They can login from any device/IP.");setForm({username:"",password:"",note:"",universalAccess:false});load();}
  }
  async function del(id:string){if(!confirm("Delete user? They will be logged out and lose access."))return; await api(`/api/admin/users/${id}`,{method:"DELETE"}); load();}
  async function toggleBan(id:string,banned:boolean){
    if(!confirm(banned?"Unban this user? They will regain access.":"BAN this user? They will be permanently blocked from accessing the platform."))return;
    const r=await api(`/api/admin/users/${id}/ban`,{method:"PATCH"});
    const d=await r.json();
    if(d.error) alert("❌ "+d.error); else load();
  }
  async function toggleUniversal(id:string,current:boolean){
    const r=await api(`/api/admin/users/${id}/universal-access`,{method:"PATCH"});
    const d=await r.json();
    if(d.error) alert("❌ "+d.error);
    else {alert(d.universalAccess?"✅ Universal Access granted — student can access ALL courses.":"✅ Universal Access revoked.");load();}
  }
  async function resetDevice(id:string){
    if(!confirm("Reset device lock? Student will be able to log in from a new device."))return;
    const r=await api(`/api/admin/users/${id}/reset-device`,{method:"PATCH"});
    const d=await r.json();
    if(d.error) alert("❌ "+d.error); else {alert("✅ Device lock reset.");load();}
  }
  return (
    <div>
      <SectionTitle>👤 Universal Users</SectionTitle>
      <InfoBox>Universal users log in from <b>any network</b>. One account = one device (first login locks the device). You can reset device locks below. Ban = permanent block. Delete = remove account (user can re-request).</InfoBox>
      <Card title="➕ Create New Student Account">
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Field label="Username"><input value={form.username} onChange={e=>setForm({...form,username:e.target.value})} placeholder="e.g. student01" style={inp}/></Field>
          <Field label="Password"><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Set a password" style={inp}/></Field>
          <Field label="Note (optional)"><input value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="e.g. Batch 2025 - Dhaka" style={inp}/></Field>
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer"}}>
            <input type="checkbox" checked={form.universalAccess} onChange={e=>setForm({...form,universalAccess:e.target.checked})} style={{width:16,height:16,accentColor:"var(--purple)"}}/>
            Grant Universal Access (access to ALL courses)
          </label>
          {msg&&<Feedback msg={msg}/>}
          <button onClick={create} disabled={saving} style={btnStyle("var(--purple)")}>{saving?"Creating...":"Create Account +"}</button>
        </div>
      </Card>
      <SectionTitle style={{marginTop:24}}>All Users ({users.length})</SectionTitle>
      {users.length===0&&<Empty icon="👤" text="No universal users yet"/>}
      {users.map(u=>(
        <div key={u.id} style={{...listItem,borderLeft:u.banned?"4px solid #dc2626":"4px solid transparent",opacity:u.banned?0.7:1}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
            <div style={{width:38,height:38,borderRadius:50,background:u.banned?"#dc2626":"var(--purple)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:16,flexShrink:0}}>{u.username[0]?.toUpperCase()}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                <span style={{fontWeight:700,color:"var(--text)"}}>{u.username}</span>
                {u.banned&&<span style={{fontSize:10,background:"#dc2626",color:"#fff",borderRadius:4,padding:"1px 6px",fontWeight:700}}>🚫 BANNED</span>}
                {u.universalAccess&&<span style={{fontSize:10,background:"#7c3aed",color:"#fff",borderRadius:4,padding:"1px 6px",fontWeight:700}}>🌐 UNIVERSAL</span>}
                {u.firstLoginDevice&&<span style={{fontSize:10,background:"#e0f2fe",color:"#0369a1",borderRadius:4,padding:"1px 6px",fontWeight:600}}>📱 Device Locked</span>}
              </div>
              <div style={{fontSize:11,color:"var(--sub)",marginTop:2}}>{u.note||"No note"} · Created {new Date(u.createdAt).toLocaleDateString()}{u.firstLoginAt?` · First login ${new Date(u.firstLoginAt).toLocaleDateString()}`:""}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <button onClick={()=>toggleBan(u.id,u.banned)} style={smBtn(u.banned?"var(--green)":"#dc2626")}>{u.banned?"✅ Unban":"🚫 Ban"}</button>
            <button onClick={()=>toggleUniversal(u.id,u.universalAccess)} style={smBtn(u.universalAccess?"#888":"#7c3aed")}>{u.universalAccess?"Revoke Universal":"🌐 Universal Access"}</button>
            {u.firstLoginDevice&&<button onClick={()=>resetDevice(u.id)} style={smBtn("var(--navy)")}>🔄 Reset Device</button>}
            <button onClick={()=>del(u.id)} style={smBtn("var(--orange)")}>✕ Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══ IPs ════════════════════════════════════════════════════ */
function IPsTab() {
  const [ips,setIps]=useState<any[]>([]); const [newIp,setNewIp]=useState(""); const [newName,setNewName]=useState(""); const [msg,setMsg]=useState("");
  const load=()=>api("/api/admin/ips").then(r=>r.json()).then(d=>{if(Array.isArray(d))setIps(d);});
  useEffect(()=>{load();},[]);
  async function add(){
    if(!newIp.trim())return;
    await api("/api/admin/ips",{method:"POST",body:JSON.stringify({ip:newIp.trim(),name:newName.trim()||undefined})});
    setNewIp(""); setNewName(""); setMsg("✅ IP approved!"); load();
  }
  async function del(ip:string){await api(`/api/admin/ips/${encodeURIComponent(ip)}`,{method:"DELETE"}); load();}
  async function toggleBan(ip:string){
    const r=await api(`/api/admin/ips/${encodeURIComponent(ip)}/ban`,{method:"PATCH"});
    const d=await r.json();
    if(d.error) alert("❌ "+d.error); else load();
  }
  return (
    <div>
      <SectionTitle>🌐 IP Access Control</SectionTitle>
      <InfoBox>Approved IPs can access content without a login. Names are synced from access requests. Banned IPs are permanently blocked.</InfoBox>
      <Card title="➕ Approve New IP">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,alignItems:"end"}}>
          <Field label="IP Address"><input value={newIp} onChange={e=>setNewIp(e.target.value)} placeholder="103.123.45.67" style={inp}/></Field>
          <Field label="Name (optional)"><input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Student name" style={inp}/></Field>
          <button onClick={add} style={{...btnStyle("var(--navy)"),alignSelf:"end"}}>Add IP</button>
        </div>
        {msg&&<Feedback msg={msg} style={{marginTop:8}}/>}
      </Card>
      <SectionTitle style={{marginTop:24}}>Approved IPs ({ips.length})</SectionTitle>
      {ips.length===0&&<Empty icon="🌐" text="No approved IPs yet"/>}
      {ips.map(i=>(
        <div key={i.ip} style={{...listItem,display:"flex",alignItems:"center",gap:10,borderLeft:i.banned?"4px solid #dc2626":"4px solid transparent",flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:140}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <code style={{fontSize:13,fontWeight:700,color:i.banned?"#dc2626":"var(--purple)"}}>{i.ip}</code>
              {i.banned&&<span style={{fontSize:10,background:"#dc2626",color:"#fff",borderRadius:4,padding:"1px 6px",fontWeight:700}}>🚫 BANNED</span>}
            </div>
            {i.name&&<div style={{fontSize:12,fontWeight:600,color:"var(--text)",marginTop:2}}>👤 {i.name}</div>}
            <div style={{fontSize:11,color:"var(--sub)"}}>Since {new Date(i.approvedAt).toLocaleDateString()}</div>
          </div>
          <button onClick={()=>toggleBan(i.ip)} style={smBtn(i.banned?"var(--green)":"#dc2626")}>{i.banned?"✅ Unban":"🚫 Ban IP"}</button>
          <button onClick={()=>del(i.ip)} style={smBtn("var(--orange)")}>✕ Remove</button>
        </div>
      ))}
    </div>
  );
}

/* ══ INBOX ══════════════════════════════════════════════════ */
function InboxTab() {
  const [msgs,setMsgs]=useState<any[]>([]);
  const [expandQuick,setExpandQuick]=useState<Record<string,boolean>>({});
  const [quickForm,setQuickForm]=useState<Record<string,{username:string;password:string;note:string}>>({});
  const [quickMsg,setQuickMsg]=useState<Record<string,string>>({});
  const [filter,setFilter]=useState<"all"|"access"|"content"|"security">("all");
  const load=()=>api("/api/admin/msgs").then(r=>r.json()).then(d=>{if(Array.isArray(d))setMsgs(d);});
  useEffect(()=>{load();},[]);

  async function approveIpFromMsg(id:string){
    const r=await api(`/api/admin/msgs/${id}/approve-ip`,{method:"POST"});
    const d=await r.json();
    if(d.error) alert("❌ "+d.error);
    else {alert(`✅ IP ${d.ip} approved${d.name?` for ${d.name}`:""}! Name synced.`); load();}
  }
  async function dismiss(id:string){await api(`/api/admin/msgs/${id}`,{method:"PATCH"}); load();}
  async function del(id:string){await api(`/api/admin/msgs/${id}`,{method:"DELETE"}); load();}
  async function createUserFromMsg(id:string){
    const f=quickForm[id]||{username:"",password:"",note:""};
    if(!f.username||!f.password){setQuickMsg({...quickMsg,[id]:"❌ Username and password required"});return;}
    const r=await api(`/api/admin/msgs/${id}/quick-user`,{method:"POST",body:JSON.stringify(f)});
    const d=await r.json();
    if(d.error) setQuickMsg({...quickMsg,[id]:"❌ "+d.error});
    else{setQuickMsg({...quickMsg,[id]:`✅ Account @${d.username} created! Message marked as noted.`});setExpandQuick({...expandQuick,[id]:false});load();}
  }
  const pending=msgs.filter(m=>m.status==="pending");
  const securityCount=msgs.filter(m=>m.type==="security-alert"&&m.status==="pending").length;
  const filtered=msgs.filter(m=>{
    if(filter==="access") return m.type==="access-request";
    if(filter==="content") return m.type==="content-request";
    if(filter==="security") return m.type==="security-alert";
    return true;
  });
  return (
    <div>
      <SectionTitle>📨 Inbox
        {pending.length>0&&<span style={{background:"var(--orange)",color:"#fff",borderRadius:20,padding:"2px 8px",fontSize:12,marginLeft:8}}>{pending.length} new</span>}
        {securityCount>0&&<span style={{background:"#dc2626",color:"#fff",borderRadius:20,padding:"2px 8px",fontSize:12,marginLeft:6}}>🚨 {securityCount} security</span>}
      </SectionTitle>
      <InfoBox>All student messages, access requests, content requests, and security alerts.</InfoBox>

      {/* Filter tabs */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {(["all","access","content","security"] as const).map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{
            padding:"5px 14px",borderRadius:20,border:"1.5px solid var(--border)",
            background:filter===f?(f==="security"?"#dc2626":"var(--purple)"):"transparent",
            color:filter===f?"#fff":"var(--sub)",fontWeight:600,fontSize:12,cursor:"pointer",
          }}>
            {f==="all"?"All":f==="access"?"📨 Access":f==="content"?"📚 Content":"🚨 Security"}
          </button>
        ))}
      </div>

      {filtered.length===0&&<Empty icon="📭" text="No messages in this category"/>}
      {filtered.map(m=>{
        const di=m.deviceInfo;
        const isMobile=di?.isMobileData;
        const isContent=m.type==="content-request";
        const isSecAlert=m.type==="security-alert";
        const qf=quickForm[m.id]||{username:"",password:"",note:""};
        const setQf=(v:any)=>setQuickForm({...quickForm,[m.id]:{...qf,...v}});
        return(
          <div key={m.id} style={{
            ...listItem,
            opacity:m.status==="noted"?0.65:1,
            borderLeft:isSecAlert?"4px solid #dc2626":isContent?"4px solid var(--purple)":isMobile?"4px solid var(--orange)":"4px solid transparent",
            background:isSecAlert?"#fff5f5":undefined,
          }}>
            {/* Header row */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
              <code style={{background:"var(--bg)",padding:"3px 10px",borderRadius:8,fontSize:12,fontWeight:700,color:isSecAlert?"#dc2626":"var(--purple)"}}>{m.ip}</code>
              {m.status==="pending"&&<span style={{fontSize:10,background:"var(--orange)",color:"#fff",borderRadius:6,padding:"1px 8px",fontWeight:700}}>NEW</span>}
              {isSecAlert&&<span style={{fontSize:10,background:"#dc2626",color:"#fff",borderRadius:6,padding:"1px 8px",fontWeight:700}}>🚨 SECURITY ALERT</span>}
              {isContent&&<span style={{fontSize:10,background:"var(--purple)",color:"#fff",borderRadius:6,padding:"1px 8px",fontWeight:700}}>📚 CONTENT REQUEST</span>}
              {isMobile&&<span style={{fontSize:10,background:"#f59e0b",color:"#fff",borderRadius:6,padding:"1px 8px",fontWeight:700}}>📶 MOBILE DATA</span>}
              <span style={{fontSize:11,color:"var(--sub)",marginLeft:"auto"}}>{new Date(m.timestamp).toLocaleString()}</span>
            </div>

            {/* Full name (if present) */}
            {m.fullName&&(
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,padding:"6px 10px",background:"#f0fdf4",borderRadius:8,border:"1px solid #86efac"}}>
                <span style={{fontSize:14}}>👤</span>
                <div>
                  <div style={{fontSize:10,color:"#166534",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>Full Name Provided</div>
                  <div style={{fontSize:14,fontWeight:800,color:"#14532d"}}>{m.fullName}</div>
                </div>
              </div>
            )}

            {/* Device info */}
            {di&&(
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                {di.deviceType&&<DeviceBadge icon={di.deviceType==="Mobile"?"📱":"💻"} text={di.deviceType}/>}
                {di.os&&<DeviceBadge icon="🖥️" text={di.os}/>}
                {di.browser&&<DeviceBadge icon="🌍" text={di.browser}/>}
                {di.connectionType&&<DeviceBadge icon={di.isMobileData?"📶":"📡"} text={di.connectionType} highlight={di.isMobileData}/>}
              </div>
            )}

            <p style={{fontSize:14,color:"var(--text)",margin:"0 0 12px",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{m.message}</p>

            {/* Actions */}
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {!isContent&&!isSecAlert&&(
                <button onClick={()=>approveIpFromMsg(m.id)} style={smBtn("var(--green)")}>✔ Approve IP + Sync Name</button>
              )}
              {!isSecAlert&&(
                <button onClick={()=>setExpandQuick({...expandQuick,[m.id]:!expandQuick[m.id]})} style={smBtn("#7c3aed")}>👤 Quick Create Account</button>
              )}
              <button onClick={()=>dismiss(m.id)} style={smBtn("#888")}>✓ Mark Read</button>
              <button onClick={()=>del(m.id)} style={smBtn("var(--orange)")}>✕ Delete</button>
            </div>

            {expandQuick[m.id]&&(
              <div style={{marginTop:14,padding:14,background:"var(--bg)",borderRadius:12,border:"1px solid var(--border)"}}>
                <div style={{fontSize:13,fontWeight:700,color:"var(--purple)",marginBottom:10}}>👤 Create Login Account{m.fullName?` for ${m.fullName}`:""}</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <input value={qf.username} onChange={e=>setQf({username:e.target.value})} placeholder="Username" style={inp}/>
                  <input type="password" value={qf.password} onChange={e=>setQf({password:e.target.value})} placeholder="Password" style={inp}/>
                  <input value={qf.note} onChange={e=>setQf({note:e.target.value})} placeholder={m.fullName?`Note (e.g. ${m.fullName})`:""} style={inp}/>
                  {quickMsg[m.id]&&<div style={{fontSize:12,color:quickMsg[m.id].startsWith("✅")?"var(--green)":"var(--orange)"}}>{quickMsg[m.id]}</div>}
                  <button onClick={()=>createUserFromMsg(m.id)} style={{...btnStyle("var(--purple)"),fontSize:13,padding:"9px 0"}}>✅ Create Account & Mark as Resolved</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DeviceBadge({icon,text,highlight}:{icon:string;text:string;highlight?:boolean}){
  return(
    <span style={{fontSize:11,display:"inline-flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:20,background:highlight?"#fef3c7":"var(--bg)",color:highlight?"#92400e":"var(--sub)",border:highlight?"1px solid #fcd34d":"1px solid var(--border)",fontWeight:600}}>
      {icon} {text}
    </span>
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

  // Playlist import (two-step: fetch → pick → bulk import)
  const [pl,setPl]=useState({playlist:"",subjectId:"",chapterId:"",course:"",online:true});
  const [plBusy,setPlBusy]=useState(false);
  const [plMsg,setPlMsg]=useState("");
  const [plResult,setPlResult]=useState<null|{title:string;total:number;videos:Array<{videoId:string;title:string;thumbnail:string;duration:string;exists:boolean}>}>(null);
  const [plPicked,setPlPicked]=useState<Set<string>>(new Set());
  const [plQuery,setPlQuery]=useState("");

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

  async function fetchPlaylist(){
    if(!pl.playlist.trim()){setPlMsg("⚠️ Paste a playlist URL or ID");return;}
    setPlBusy(true); setPlMsg(""); setPlResult(null); setPlPicked(new Set());
    try{
      const r=await api("/api/admin/playlist/fetch",{method:"POST",body:JSON.stringify({playlist:pl.playlist.trim()})});
      const d=await r.json();
      if(!r.ok) throw new Error(d.error||"Fetch failed");
      setPlResult(d);
      // Auto-tick all videos that aren't already in the library
      setPlPicked(new Set(d.videos.filter((v:any)=>!v.exists).map((v:any)=>v.videoId)));
      setPlMsg(`✅ Found ${d.total} video(s) in "${d.title}". Tick the ones you want and click Import.`);
    }catch(e:any){ setPlMsg("❌ "+e.message); }
    finally{ setPlBusy(false); }
  }
  async function importPicked(){
    if(!plResult || plPicked.size===0){setPlMsg("⚠️ Pick at least one video to import");return;}
    setPlBusy(true);
    try{
      const chosen = plResult.videos.filter(v=>plPicked.has(v.videoId));
      const r=await api("/api/admin/videos/bulk",{method:"POST",body:JSON.stringify({
        videos: chosen,
        subjectId: pl.subjectId, chapterId: pl.chapterId,
        course: pl.course, online: pl.online,
      })});
      const d=await r.json();
      if(!r.ok) throw new Error(d.error||"Import failed");
      setPlMsg(`✅ Imported ${d.added} video(s) · ${d.skipped} duplicates skipped`);
      // Mark imported as "exists" so they grey out
      setPlResult({
        ...plResult,
        videos: plResult.videos.map(v=>plPicked.has(v.videoId)?{...v,exists:true}:v),
      });
      setPlPicked(new Set());
      loadVids();
    }catch(e:any){ setPlMsg("❌ "+e.message); }
    finally{ setPlBusy(false); }
  }
  function togglePick(vid:string){
    setPlPicked(s=>{const n=new Set(s); n.has(vid)?n.delete(vid):n.add(vid); return n;});
  }
  function resetPlaylist(){
    setPlResult(null); setPlPicked(new Set()); setPlMsg(""); setPlQuery(""); setPl({...pl,playlist:""});
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

      {/* ── YouTube Playlist Import (no API key needed) ── */}
      <Card title="📥 Import YouTube Playlist">
        <InfoBox>Paste any <b>public or unlisted</b> playlist URL. We'll fetch the list, you tick the videos you want, then bulk-import them. <b>No API key required.</b></InfoBox>

        {/* Step 1 — paste URL */}
        <div style={{display:"flex",gap:8,marginTop:10,alignItems:"stretch"}}>
          <input value={pl.playlist} onChange={e=>setPl({...pl,playlist:e.target.value})}
            onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();fetchPlaylist();}}}
            placeholder="https://www.youtube.com/playlist?list=PL..." style={{...inp,flex:1}}/>
          <button onClick={fetchPlaylist} disabled={plBusy||!pl.playlist.trim()} style={btnStyle("var(--purple)")}>
            {plBusy && !plResult?"⏳ Fetching…":"🔍 Fetch"}
          </button>
          {plResult && (
            <button onClick={resetPlaylist} style={btnStyle("#888")} title="Clear">✕</button>
          )}
        </div>

        {plMsg&&<div style={{marginTop:10}}><Feedback msg={plMsg}/></div>}

        {/* Step 2 — preview + pick */}
        {plResult && (
          <>
            <div style={{marginTop:14,padding:"10px 12px",background:"linear-gradient(135deg,#7c3aed10,#2563eb10)",borderRadius:10,border:"1px solid var(--border)",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:200}}>
                <div style={{fontWeight:800,color:"var(--text)",fontSize:14}}>📋 {plResult.title}</div>
                <div style={{fontSize:11,color:"var(--sub)",marginTop:2}}>
                  {plResult.total} videos · {plPicked.size} selected · {plResult.videos.filter(v=>v.exists).length} already in library
                </div>
              </div>
              <button onClick={()=>{
                const avail=plResult.videos.filter(v=>!v.exists).map(v=>v.videoId);
                setPlPicked(plPicked.size===avail.length?new Set():new Set(avail));
              }} style={smBtn("var(--navy)")}>
                {plPicked.size===plResult.videos.filter(v=>!v.exists).length?"Deselect all":"Select all (new)"}
              </button>
              <button onClick={()=>setPlPicked(new Set(plResult.videos.map(v=>v.videoId)))} style={smBtn("#888")}>Pick everything</button>
            </div>

            {/* Assignment fields */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12}}>
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
              <Field label="Course Label">
                <input value={pl.course} onChange={e=>setPl({...pl,course:e.target.value})} placeholder="HSC Science" style={inp}/>
              </Field>
              <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer",alignSelf:"end",height:42}}>
                <input type="checkbox" checked={pl.online} onChange={e=>setPl({...pl,online:e.target.checked})} style={{width:16,height:16,accentColor:"var(--purple)"}}/> Mark as Online class
              </label>
            </div>

            {/* Search inside playlist */}
            <input value={plQuery} onChange={e=>setPlQuery(e.target.value)} placeholder="🔍 Filter videos by title…"
              style={{...inp,marginTop:12,fontSize:13}}/>

            {/* Video grid */}
            <div style={{marginTop:10,maxHeight:420,overflowY:"auto",border:"1px solid var(--border)",borderRadius:10,padding:6,background:"var(--bg)"}}>
              {plResult.videos
                .filter(v=>!plQuery.trim() || v.title.toLowerCase().includes(plQuery.toLowerCase()))
                .map(v=>{
                  const picked=plPicked.has(v.videoId);
                  return (
                    <label key={v.videoId} style={{
                      display:"flex",alignItems:"center",gap:10,padding:8,borderRadius:8,
                      cursor:v.exists?"default":"pointer",
                      background:picked?"rgba(124,58,237,0.08)":"transparent",
                      border:picked?"1.5px solid var(--purple)":"1.5px solid transparent",
                      opacity:v.exists?0.5:1,
                      marginBottom:4,
                    }}>
                      <input type="checkbox" checked={picked} disabled={v.exists}
                        onChange={()=>togglePick(v.videoId)}
                        style={{width:18,height:18,accentColor:"var(--purple)",cursor:v.exists?"not-allowed":"pointer",flexShrink:0}}/>
                      <div style={{position:"relative",flexShrink:0}}>
                        <img src={v.thumbnail||`https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`}
                          alt="" style={{width:96,height:54,objectFit:"cover",borderRadius:6,background:"#000",display:"block"}}
                          onError={e=>{(e.target as HTMLImageElement).style.visibility="hidden";}}/>
                        {v.duration && <span style={{position:"absolute",bottom:3,right:3,background:"rgba(0,0,0,0.85)",color:"#fff",fontSize:9,padding:"1px 4px",borderRadius:3,fontWeight:600}}>{v.duration}</span>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{v.title}</div>
                        <div style={{fontSize:10,color:"var(--sub)",marginTop:2,fontFamily:"monospace"}}>
                          {v.videoId} {v.exists && <span style={{color:"var(--orange)",fontWeight:700}}>· already imported</span>}
                        </div>
                      </div>
                    </label>
                  );
                })}
            </div>

            <button onClick={importPicked} disabled={plBusy||plPicked.size===0} style={{...btnStyle("var(--orange)"),marginTop:12,width:"100%"}}>
              {plBusy?"⏳ Importing…":`📥 Import ${plPicked.size} Selected Video${plPicked.size===1?"":"s"} →`}
            </button>
          </>
        )}
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

  const [imgPanel,setImgPanel]=useState<number|null>(null);
  const [imgUrl,setImgUrl]=useState("");
  const [imgSize,setImgSize]=useState("50");
  const qTextRefs=useRef<Record<number,HTMLTextAreaElement|null>>({});

  const emptyQ=()=>({id:`q${Date.now()}`,text:"",options:[{id:"A",text:""},{id:"B",text:""},{id:"C",text:""},{id:"D",text:""}],correct:"A",solution:""});

  function addQuestion(){ const q=emptyQ(); setQuestions(qs=>[...qs,q]); setActiveQ(questions.length); }
  function removeQuestion(i:number){ setQuestions(qs=>qs.filter((_,j)=>j!==i)); if(activeQ===i)setActiveQ(null); }
  function updateQ(i:number,field:string,val:string){ setQuestions(qs=>qs.map((q,j)=>j===i?{...q,[field]:val}:q)); }
  function updateOpt(qi:number,oi:number,val:string){ setQuestions(qs=>qs.map((q,j)=>j===qi?{...q,options:q.options.map((o:any,k:number)=>k===oi?{...o,text:val}:o)}:q)); }

  function insertAtCursor(qi:number, sym:string){
    const ta=qTextRefs.current[qi];
    if(ta){
      const start=ta.selectionStart??ta.value.length;
      const end=ta.selectionEnd??ta.value.length;
      const newVal=ta.value.slice(0,start)+sym+ta.value.slice(end);
      updateQ(qi,"text",newVal);
      setTimeout(()=>{ ta.focus(); ta.setSelectionRange(start+sym.length,start+sym.length); },10);
    } else {
      updateQ(qi,"text",(questions[qi]?.text||"")+sym);
    }
  }
  function insertImage(qi:number){
    if(!imgUrl.trim())return;
    insertAtCursor(qi,` [img:${imgUrl.trim()}:${imgSize}] `);
    setImgUrl(""); setImgPanel(null);
  }

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

  /* ── HTML parser helpers ── */
  function normaliseOptId(rawId: string, idx: number): string {
    const s = (rawId || "").trim().replace(/[.):।\s]/g, "").toUpperCase();
    if (/^[A-D]$/.test(s)) return s;
    const map: Record<string,string> = {
      "ক":"A","খ":"B","গ":"C","ঘ":"D",
      "১":"A","২":"B","৩":"C","৪":"D",
      "1":"A","2":"B","3":"C","4":"D",
      "I":"A","II":"B","III":"C","IV":"D",
      "(A)":"A","(B)":"B","(C)":"C","(D)":"D",
    };
    return map[s] || ["A","B","C","D"][idx] || "A";
  }
  function cleanEl(el: Element | null): string {
    if (!el) return "";
    const c = el.cloneNode(true) as Element;
    c.querySelectorAll("style,script,.option-label,.option-key,.serial,.q-serial").forEach(t => t.remove());
    c.querySelectorAll("br").forEach(b => b.replaceWith(document.createTextNode(" ")));
    c.querySelectorAll("img").forEach(img => {
      const src = img.getAttribute("src") || "";
      img.replaceWith(document.createTextNode(src ? ` [img:${src}] ` : ""));
    });
    return (c.textContent || "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  }
  function makeQ(i: number, text: string, opts: any[], correct: string, sol: string) {
    return { id:`q${Date.now()}_${i}`, text, options: opts.slice(0,4), correct, solution: sol };
  }

  /* Strategy 1 — Utkorsho / Utkorsho Online / classic Udvash clones
     Selectors: .questionBlock > .questionText  +  .questionOption(.input-group-text) */
  function parseStrategy1(doc: Document): any[] {
    const blocks = doc.querySelectorAll(".questionBlock");
    if (!blocks.length) return [];
    const out: any[] = [];
    blocks.forEach((block, i) => {
      const qText = cleanEl(block.querySelector(".questionText,.question-text,.q-text"));
      if (!qText) return;
      const optEls = block.querySelectorAll(".questionOption,.question-option");
      const opts: any[] = []; let correct = "A";
      optEls.forEach((oe, oi) => {
        const rawId = oe.querySelector(".input-group-text,.opt-label,.option-id")?.textContent?.trim() || "";
        const id = normaliseOptId(rawId, oi);
        const labelEl = oe.querySelector(".questionTable label,.opt-text,label") || oe;
        const text = cleanEl(labelEl);
        const isCorrect = !!(oe.querySelector(".fas.fa-check,.fa-check,.correct,.is-correct") ||
          oe.classList.contains("correct") || oe.getAttribute("data-correct")==="true");
        if (isCorrect) correct = id;
        if (text) opts.push({ id, text });
      });
      while (opts.length < 4) opts.push({ id:["A","B","C","D"][opts.length], text:"" });
      const sol = cleanEl(block.querySelector(".solveText,.solve-text,.explanation,.solution-text"));
      if (opts.length >= 2) out.push(makeQ(i, qText, opts, correct, sol));
    });
    return out;
  }

  /* Strategy 2 — Chorcha / modern portal pattern
     Selectors: .question-block / .qblock / .quiz-item / .mcq-item etc. */
  function parseStrategy2(doc: Document): any[] {
    const sel = [
      ".question-block",".qblock",".quiz-item",".mcq-item",".question-card",
      ".q-container",".question-wrapper",".exam-question",".q-item",
      "li.question","div.question:not(.question-text):not(.questionText)",
    ].join(",");
    const blocks = doc.querySelectorAll(sel);
    if (!blocks.length) return [];
    const out: any[] = [];
    blocks.forEach((block, i) => {
      const qTextEl = block.querySelector(
        ".question-text,.q-text,.qtext,.question-body,.q-body,.q-title,.question-title,p.question"
      ) || block.querySelector("p:first-child,h4,h5");
      const qText = cleanEl(qTextEl);
      if (!qText || qText.length < 5) return;
      const optEls = block.querySelectorAll(
        ".option,.choice,.answer-option,.q-option,.mcq-option,li.option,label.option,li.choice"
      );
      if (optEls.length < 2) return;
      const opts: any[] = []; let correct = "A";
      optEls.forEach((oe, oi) => {
        const id = ["A","B","C","D"][oi] || String.fromCharCode(65+oi);
        const isCorrect = !!(oe.classList.contains("correct") || oe.classList.contains("right") ||
          oe.classList.contains("answer") || oe.getAttribute("data-correct")==="true" ||
          oe.querySelector(".fa-check,.correct-mark,.right-answer"));
        if (isCorrect) correct = id;
        const labelEl = oe.querySelector("label,span.text,.text,.opt-text") || oe;
        const text = cleanEl(labelEl);
        if (text) opts.push({ id, text });
      });
      while (opts.length < 4) opts.push({ id:["A","B","C","D"][opts.length], text:"" });
      const sol = cleanEl(block.querySelector(".explanation,.solution,.answer-explanation,.rationale,.solve"));
      if (opts.length >= 2) out.push(makeQ(i, qText, opts, correct, sol));
    });
    return out;
  }

  /* Strategy 3 — Table-based or dl/dt/dd pattern */
  function parseStrategy3(doc: Document): any[] {
    const tables = doc.querySelectorAll("table");
    const out: any[] = [];
    tables.forEach(tbl => {
      const rows = tbl.querySelectorAll("tr");
      let qText = ""; const opts: any[] = []; let correct = "A"; let sol = "";
      rows.forEach(row => {
        const cells = row.querySelectorAll("td,th");
        if (cells.length === 0) return;
        const first = cleanEl(cells[0]);
        if (/^Q\.?\s*\d*\s*[.:)]?\s*/i.test(first) || cells.length === 1) {
          if (qText && opts.length >= 2) { out.push(makeQ(out.length, qText, opts, correct, sol)); opts.length=0; sol=""; }
          qText = first.replace(/^Q\.?\s*\d*\s*[.:)]?\s*/i,"").trim();
        } else if (cells.length >= 2 && /^[ABCD(]/.test(first)) {
          const id = normaliseOptId(first.slice(0,3), opts.length);
          const text = cleanEl(cells[1]);
          const isCorrect = !!(cells[2] && cleanEl(cells[2]).match(/✓|correct|yes/i));
          if (isCorrect) correct = id;
          if (text) opts.push({ id, text });
        }
      });
      if (qText && opts.length >= 2) out.push(makeQ(out.length, qText, opts, correct, sol));
    });
    return out;
  }

  /* Strategy 4 — Plain text fallback (Q1. / A. B. C. D. / Ans: pattern) */
  function parseTextFallback(text: string): any[] {
    const blocks = text.split(/\n{2,}/);
    const out: any[] = [];
    for (const block of blocks) {
      const ls = block.split("\n").map(l=>l.trim()).filter(Boolean);
      if (ls.length < 5) continue;
      const qMatch = ls[0].match(/^(?:Q\.?\s*\d+[.:)]?\s*|[\d]+[.)]\s*)(.+)/i);
      if (!qMatch) continue;
      const qText = qMatch[1].trim();
      const opts: any[] = []; let correct = "A"; let sol = "";
      for (const l of ls.slice(1)) {
        const om = l.match(/^([ABCD])[.):\s]+(.+)/i);
        if (om) opts.push({ id:om[1].toUpperCase(), text:om[2].trim() });
        const am = l.match(/^(?:Ans|Answer|উত্তর)[.:)\s]*([ABCD])/i);
        if (am) correct = am[1].toUpperCase();
        const sm = l.match(/^(?:Sol|Solution|ব্যাখ্যা|Explanation)[.:)\s]+(.+)/i);
        if (sm) sol = sm[1].trim();
      }
      if (qText && opts.length >= 2) out.push(makeQ(out.length, qText, opts, correct, sol));
    }
    return out;
  }

  async function importHtmlFile(file: File) {
    if (!file) return;
    setHtmlBusy(true); setImportMsg("");
    try {
      const content = await file.text();
      const doc = new DOMParser().parseFromString(content, "text/html");

      // Auto-detect title
      const titleEl =
        doc.querySelector(".TakeExamHeader h3:last-child") ||
        doc.querySelector(".TakeExamHeader h3") ||
        doc.querySelector(".exam-title,.quiz-title,h1.title") ||
        doc.querySelector("title");
      const fileTitle = titleEl?.textContent?.trim() || "";
      if (fileTitle && !title) setTitle(fileTitle.replace(/\s*-\s*HTR.*$/i,"").trim());

      // Try each strategy in order
      let parsed: any[] = parseStrategy1(doc);
      if (parsed.length === 0) parsed = parseStrategy2(doc);
      if (parsed.length === 0) parsed = parseStrategy3(doc);
      if (parsed.length === 0) parsed = parseTextFallback(doc.body?.textContent || "");

      if (parsed.length === 0) {
        setImportMsg("❌ No questions found. Tried 4 parsing strategies (Utkorsho, Chorcha, Table, Text). Try Bulk Text Import instead.");
      } else {
        setQuestions(qs => [...qs, ...parsed]);
        setHtmlMode(false);
        setImportMsg(`✅ ${parsed.length} questions imported from "${file.name}"`);
      }
    } catch (err: any) {
      setImportMsg(`❌ Parse error: ${err?.message || "invalid HTML"}`);
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
                <Field label="Question Text (Bangla/English, $math$, \ce{H2O})">
                  {/* ── Math symbol toolbar ── */}
                  <div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:6,padding:6,background:"var(--bg)",borderRadius:8,border:"1px solid var(--border)"}}>
                    {[
                      ["±","±"],["×","×"],["÷","÷"],["√","√"],["∞","∞"],
                      ["≤","≤"],["≥","≥"],["≠","≠"],["≈","≈"],["∝","∝"],
                      ["π","π"],["θ","θ"],["α","α"],["β","β"],["γ","γ"],
                      ["Δ","Δ"],["∑","∑"],["∫","∫"],["∂","∂"],["→","→"],
                    ].map(([sym])=>(
                      <button key={sym} type="button" onMouseDown={e=>{e.preventDefault();insertAtCursor(qi,sym);}}
                        style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:5,padding:"3px 7px",cursor:"pointer",fontSize:13,color:"var(--text)",fontFamily:"serif",lineHeight:1.3}}>
                        {sym}
                      </button>
                    ))}
                    <div style={{width:1,background:"var(--border)",margin:"0 2px"}}/>
                    {[
                      ["x²","^{2}"],["xₙ","_{n}"],["√x","\\sqrt{x}"],["a/b","\\frac{a}{b}"],["→","\\vec{v}"],["$","$...$"],
                      ["⌀","$$...$$"],
                    ].map(([label,sym])=>(
                      <button key={label} type="button" onMouseDown={e=>{e.preventDefault();insertAtCursor(qi,sym);}}
                        title={`Insert: ${sym}`}
                        style={{background:"rgba(108,127,255,0.12)",border:"1px solid rgba(108,127,255,0.25)",borderRadius:5,padding:"3px 7px",cursor:"pointer",fontSize:11,color:"var(--purple)",fontFamily:"monospace",fontWeight:700,lineHeight:1.3}}>
                        {label}
                      </button>
                    ))}
                    <div style={{width:1,background:"var(--border)",margin:"0 2px"}}/>
                    {[
                      ["H₂O","\\ce{H_2O}"],["CO₂","\\ce{CO_2}"],["⇌","\\ce{<=>}"],
                    ].map(([label,sym])=>(
                      <button key={label} type="button" onMouseDown={e=>{e.preventDefault();insertAtCursor(qi,sym);}}
                        title={`Chem: ${sym}`}
                        style={{background:"rgba(34,197,94,0.10)",border:"1px solid rgba(34,197,94,0.25)",borderRadius:5,padding:"3px 7px",cursor:"pointer",fontSize:11,color:"var(--green)",fontFamily:"monospace",fontWeight:700}}>
                        {label}
                      </button>
                    ))}
                    <button type="button" onMouseDown={e=>{e.preventDefault();setImgPanel(imgPanel===qi?null:qi);setImgUrl("");}}
                      style={{background:"rgba(249,115,22,0.10)",border:"1px solid rgba(249,115,22,0.3)",borderRadius:5,padding:"3px 8px",cursor:"pointer",fontSize:11,color:"var(--orange)",fontWeight:700,marginLeft:"auto"}}>
                      📷 Image
                    </button>
                  </div>
                  {/* Image insert panel */}
                  {imgPanel===qi&&(
                    <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:8,padding:10,marginBottom:8,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                      <input value={imgUrl} onChange={e=>setImgUrl(e.target.value)} placeholder="Image URL (https://...)" style={{...inp,flex:2,minWidth:160,fontSize:12}} autoFocus/>
                      <select value={imgSize} onChange={e=>setImgSize(e.target.value)} style={{...inp,width:90,fontSize:12}}>
                        <option value="25">25% small</option>
                        <option value="50">50% medium</option>
                        <option value="75">75% large</option>
                        <option value="100">100% full</option>
                      </select>
                      <button type="button" onClick={()=>insertImage(qi)} disabled={!imgUrl.trim()} style={{...smBtn("var(--orange)"),fontSize:12}}>Insert</button>
                      <button type="button" onClick={()=>setImgPanel(null)} style={{...smBtn("#888"),fontSize:12}}>✕</button>
                    </div>
                  )}
                  <textarea
                    ref={el=>{qTextRefs.current[qi]=el;}}
                    value={q.text} onChange={e=>updateQ(qi,"text",e.target.value)}
                    rows={3}
                    placeholder={`What is the value of $x$ if $2x + 5 = 15$?\nOR: হাইড্রোজেনের পারমাণবিক সংখ্যা কত?`}
                    style={{...inp,resize:"vertical",fontFamily:"Roboto,'Noto Sans Bengali',monospace",fontSize:13}}
                  />
                  <div style={{fontSize:10,color:"var(--sub)",marginTop:4}}>Inline: <code>{"$x^2$"}</code> · Block: <code>{"$$\\frac{a}{b}$$"}</code> · Chem: <code>{"\\ce{H_2O}"}</code> · Img: <code>{"[img:URL:50]"}</code></div>
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
/* ── Admin voice recorder hook ─────────────────────────── */
function useAdminVoice() {
  const [recording,setRecording]=useState(false);
  const [audioData,setAudioData]=useState<string|null>(null);
  const [secs,setSecs]=useState(0);
  const mrRef=useRef<MediaRecorder|null>(null);
  const chunksRef=useRef<BlobPart[]>([]);
  const timerRef=useRef<ReturnType<typeof setInterval>|null>(null);
  const start=useCallback(async()=>{
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mr=new MediaRecorder(stream);
      mrRef.current=mr; chunksRef.current=[];
      mr.ondataavailable=e=>{if(e.data.size)chunksRef.current.push(e.data);};
      mr.onstop=()=>{
        const blob=new Blob(chunksRef.current,{type:mr.mimeType||"audio/webm"});
        const reader=new FileReader();
        reader.onload=()=>setAudioData(reader.result as string);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t=>t.stop());
      };
      mr.start(); setRecording(true); setSecs(0);
      timerRef.current=setInterval(()=>setSecs(s=>s+1),1000);
    }catch{alert("Microphone access denied.");}
  },[]);
  const stop=useCallback(()=>{mrRef.current?.stop();setRecording(false);if(timerRef.current)clearInterval(timerRef.current);},[]);
  const clear=useCallback(()=>{setAudioData(null);setSecs(0);},[]);
  return{recording,audioData,secs,start,stop,clear};
}

function useAdminFilePicker(accept:string,maxBytes:number,label:string){
  const [data,setData]=useState<string|null>(null);
  const [name,setName]=useState("");
  const inputRef=useRef<HTMLInputElement>(null);
  function pick(){inputRef.current?.click();}
  function onFile(e:React.ChangeEvent<HTMLInputElement>){
    const f=e.target.files?.[0]; if(!f) return;
    if(f.size>maxBytes){alert(`${label} too large (max ${Math.round(maxBytes/1_000_000)}MB)`);return;}
    const reader=new FileReader();
    reader.onload=()=>{setData(reader.result as string);setName(f.name);};
    reader.readAsDataURL(f); e.target.value="";
  }
  const clear=()=>{setData(null);setName("");};
  const input=<input ref={inputRef} type="file" accept={accept} style={{display:"none"}} onChange={onFile}/>;
  return{data,name,pick,clear,input};
}
function openPdfAdmin(data:string,name:string){
  const arr=data.split(",");const mime=arr[0].match(/:(.*?);/)?.[1]||"application/pdf";
  const bytes=atob(arr[1]);const buf=new Uint8Array(bytes.length);
  for(let i=0;i<bytes.length;i++)buf[i]=bytes.charCodeAt(i);
  window.open(URL.createObjectURL(new Blob([buf],{type:mime})),"_blank");
}

function DoubtReplyPanel({d,token,onDone}:{d:any;token:string;onDone:()=>void}){
  const [text,setText]=useState("");
  const [saving,setSaving]=useState(false);
  const [aiLoading,setAiLoading]=useState(false);
  const [aiErr,setAiErr]=useState("");
  const [linkInput,setLinkInput]=useState("");
  const [links,setLinks]=useState<string[]>([]);
  const voice=useAdminVoice();
  const photo=useAdminFilePicker("image/*",5_000_000,"Image");
  const pdf=useAdminFilePicker("application/pdf",10_000_000,"PDF");

  async function submit(){
    if(!text.trim()&&!voice.audioData&&!photo.data&&!pdf.data&&!links.length)return;
    setSaving(true);
    await fetch(`/api/doubts/${d.id}/reply`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
      body:JSON.stringify({
        text:text||undefined,
        audioData:voice.audioData||undefined,
        imageData:photo.data||undefined,
        pdfData:pdf.data||undefined,
        pdfName:pdf.name||undefined,
        links:links.length?links:undefined
      })});
    setSaving(false); onDone();
  }
  async function aiSuggest(){
    setAiLoading(true); setAiErr("");
    try {
      const r=await fetch(`/api/doubts/${d.id}/ai-answer`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`}});
      const j=await r.json();
      if(j.answer) setText(j.answer); else setAiErr(j.error||"AI failed");
    } catch { setAiErr("Network error"); } finally { setAiLoading(false); }
  }
  function addLink(){
    const u=linkInput.trim(); if(!u) return;
    let url=u; try{if(!url.startsWith("http"))url="https://"+url; new URL(url);}catch{return;}
    setLinks(l=>[...l,url]); setLinkInput("");
  }

  return(
    <div style={{borderTop:"1px solid var(--border)",paddingTop:12,marginTop:8}}>
      {photo.input}{pdf.input}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <div style={{fontWeight:700,fontSize:12,color:"var(--purple)"}}>SEND REPLY</div>
        <button onClick={aiSuggest} disabled={aiLoading}
          style={{padding:"4px 12px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#7c3aed,#a855f7)",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
          {aiLoading?"⏳ Generating…":"🤖 AI Suggest"}
        </button>
      </div>
      {aiErr&&<div style={{fontSize:11,color:"#dc2626",marginBottom:6}}>{aiErr}</div>}

      {/* Text */}
      <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Type reply (Bangla or English)…" rows={3}
        style={{width:"100%",borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",padding:"8px 10px",fontSize:13,resize:"vertical",boxSizing:"border-box",fontFamily:"inherit",marginBottom:8}}/>

      {/* Attachment buttons */}
      <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:10}}>
        {/* Voice */}
        {!voice.audioData&&(
          !voice.recording?(
            <button type="button" onClick={voice.start} style={{padding:"6px 12px",borderRadius:8,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontWeight:700,fontSize:11,cursor:"pointer"}}>🎤 Voice</button>
          ):(
            <button type="button" onClick={voice.stop} style={{padding:"6px 12px",borderRadius:8,border:"none",background:"#dc2626",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer"}}>⏹ Stop ({voice.secs}s)</button>
          )
        )}
        {/* Photo */}
        {!photo.data&&<button type="button" onClick={photo.pick} style={{padding:"6px 12px",borderRadius:8,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontWeight:700,fontSize:11,cursor:"pointer"}}>📷 Photo</button>}
        {/* PDF */}
        {!pdf.data&&<button type="button" onClick={pdf.pick} style={{padding:"6px 12px",borderRadius:8,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontWeight:700,fontSize:11,cursor:"pointer"}}>📄 PDF</button>}
      </div>

      {/* Attachment previews */}
      {voice.audioData&&(
        <div style={{marginBottom:8,display:"flex",flexDirection:"column",gap:4}}>
          <audio src={voice.audioData} controls style={{width:"100%",height:34}}/>
          <button type="button" onClick={voice.clear} style={{alignSelf:"flex-start",padding:"3px 10px",borderRadius:6,border:"none",background:"#fee2e2",color:"#dc2626",fontSize:11,cursor:"pointer",fontWeight:700}}>✕ Remove Voice</button>
        </div>
      )}
      {photo.data&&(
        <div style={{position:"relative",display:"inline-block",marginBottom:8}}>
          <img src={photo.data} alt="reply" style={{maxWidth:200,maxHeight:150,borderRadius:10,border:"1.5px solid var(--border)",display:"block"}}/>
          <button type="button" onClick={photo.clear} style={{position:"absolute",top:3,right:3,width:20,height:20,borderRadius:"50%",border:"none",background:"#dc2626",color:"#fff",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900}}>✕</button>
        </div>
      )}
      {pdf.data&&(
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:10,background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",marginBottom:8}}>
          <span style={{fontSize:20}}>📄</span>
          <span style={{flex:1,fontSize:12,fontWeight:700,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pdf.name}</span>
          <button type="button" onClick={pdf.clear} style={{padding:"3px 8px",borderRadius:6,border:"none",background:"#fee2e2",color:"#dc2626",fontSize:11,cursor:"pointer",fontWeight:700}}>✕</button>
        </div>
      )}

      {/* Links */}
      <div style={{marginBottom:10}}>
        <div style={{display:"flex",gap:6,marginBottom:6}}>
          <input value={linkInput} onChange={e=>setLinkInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addLink();}}}
            placeholder="Add a link URL…"
            style={{flex:1,padding:"6px 10px",borderRadius:8,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:12,fontFamily:"inherit"}}/>
          <button type="button" onClick={addLink} style={{padding:"6px 12px",borderRadius:8,border:"none",background:"rgba(108,127,255,0.15)",color:"var(--purple)",fontWeight:700,fontSize:11,cursor:"pointer"}}>+Link</button>
        </div>
        {links.map((l,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
            <span style={{flex:1,fontSize:11,color:"#3b82f6",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>🔗 {l}</span>
            <button type="button" onClick={()=>setLinks(ls=>ls.filter((_,j)=>j!==i))} style={{padding:"2px 6px",borderRadius:5,border:"none",background:"#fee2e2",color:"#dc2626",fontSize:10,cursor:"pointer",fontWeight:700}}>✕</button>
          </div>
        ))}
      </div>

      <button onClick={submit} disabled={saving||(!text.trim()&&!voice.audioData&&!photo.data&&!pdf.data&&!links.length)}
        style={{padding:"8px 18px",borderRadius:10,border:"none",background:"var(--purple)",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>
        {saving?"Sending…":"📨 Send Reply"}
      </button>
    </div>
  );
}

function DoubtsTab() {
  const token=TOKEN();
  const [doubts,setDoubts]=useState<any[]>([]);
  const [filter,setFilter]=useState<"all"|"open"|"answered">("all");
  const [expanded,setExpanded]=useState<string|null>(null);
  const [replyId,setReplyId]=useState<string|null>(null);
  const load=useCallback(()=>{
    api("/api/doubts").then(r=>r.json()).then(d=>{if(Array.isArray(d))setDoubts(d);});
  },[]);
  useEffect(()=>{
    load();
    const t=setInterval(load,30_000);
    return ()=>clearInterval(t);
  },[load]);

  const shown=doubts.filter(d=>filter==="all"||d.status===filter);
  const open=doubts.filter(d=>d.status==="open").length;
  const answered=doubts.filter(d=>d.status==="answered").length;

  async function del(id:string){
    if(!confirm("Delete this doubt?"))return;
    await api(`/api/doubts/${id}`,{method:"DELETE"});
    load();
  }
  async function reopen(id:string){
    await api(`/api/doubts/${id}/reopen`,{method:"PATCH"});
    load();
  }

  return(
    <div>
      <SectionTitle>❓ Student Doubts & Q&A</SectionTitle>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
        {[["Total",doubts.length,"#7c3aed"],["Pending",open,"#d97706"],["Answered",answered,"#16a34a"]].map(([l,v,c])=>(
          <div key={String(l)} style={{background:"var(--surface)",borderRadius:12,padding:"10px 12px",textAlign:"center",border:"1.5px solid var(--border)"}}>
            <div style={{fontSize:22,fontWeight:900,color:String(c)}}>{v}</div>
            <div style={{fontSize:11,color:"var(--sub)"}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {(["all","open","answered"] as const).map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{padding:"6px 14px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,
              background:filter===f?"var(--purple)":"var(--bg)",
              color:filter===f?"#fff":"var(--sub)"}}>
            {f==="all"?"All":f==="open"?"⏳ Pending":"✅ Answered"}
          </button>
        ))}
      </div>

      {shown.length===0&&<Empty icon="❓" text="No doubts here yet"/>}

      {shown.map(d=>(
        <div key={d.id} style={{...listItem,marginBottom:10,padding:0,overflow:"hidden"}}>
          {/* Header row */}
          <button onClick={()=>{setExpanded(e=>e===d.id?null:d.id);setReplyId(null);}}
            style={{width:"100%",textAlign:"left",padding:"12px 14px",border:"none",background:"transparent",cursor:"pointer",display:"flex",gap:10,alignItems:"flex-start"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:4}}>
                <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,fontWeight:700,
                  background:d.status==="answered"?"#dcfce7":"#fef3c7",
                  color:d.status==="answered"?"#166534":"#92400e"}}>
                  {d.status==="answered"?"✅ Answered":"⏳ Pending"}
                </span>
                <span style={{fontSize:11,color:"var(--purple)",fontWeight:600}}>{d.fullName||d.username||"Student"}</span>
                <span style={{fontSize:11,color:"var(--sub)"}}>{d.ip}</span>
              </div>
              <div style={{fontSize:13,fontWeight:600,color:"var(--text)",lineHeight:1.5}}>
                {d.question?(d.question.length>100?d.question.slice(0,100)+"…":d.question):"Voice question"}
              </div>
              <div style={{display:"flex",gap:8,marginTop:4}}>
                {d.audioData&&<span style={{fontSize:11,color:"var(--sub)"}}>🎤 Audio</span>}
                {d.imageData&&<span style={{fontSize:11,color:"var(--sub)"}}>📷 Image</span>}
                <span style={{fontSize:11,color:"var(--sub)"}}>{new Date(d.timestamp).toLocaleString("en-BD",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
              </div>
            </div>
            <span style={{color:"var(--sub)",fontSize:14,flexShrink:0}}>{expanded===d.id?"▲":"▼"}</span>
          </button>

          {/* Expanded detail */}
          {expanded===d.id&&(
            <div style={{padding:"0 14px 14px"}}>
              {d.question&&(
                <div style={{background:"var(--bg)",borderRadius:10,padding:10,marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--sub)",marginBottom:4}}>QUESTION</div>
                  <div style={{fontSize:13,color:"var(--text)",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{d.question}</div>
                </div>
              )}
              {d.audioData&&(
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--sub)",marginBottom:4}}>🎤 VOICE QUESTION</div>
                  <audio src={d.audioData} controls style={{width:"100%",height:34}}/>
                </div>
              )}
              {d.imageData&&(
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--sub)",marginBottom:4}}>📷 ATTACHED IMAGE</div>
                  <img src={d.imageData} alt="student attachment" style={{maxWidth:"100%",borderRadius:10,border:"1.5px solid var(--border)"}}/>
                </div>
              )}
              {d.pdfData&&(
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--sub)",marginBottom:4}}>📄 PDF ATTACHMENT</div>
                  <button onClick={()=>openPdfAdmin(d.pdfData,d.pdfName||"document.pdf")}
                    style={{display:"inline-flex",alignItems:"center",gap:8,padding:"7px 14px",borderRadius:9,
                      background:"rgba(239,68,68,0.08)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.2)",fontWeight:700,fontSize:12,cursor:"pointer"}}>
                    📄 Open {d.pdfName||"PDF"}
                  </button>
                </div>
              )}
              {Array.isArray(d.links)&&d.links.length>0&&(
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--sub)",marginBottom:6}}>🔗 LINKS</div>
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    {(d.links as string[]).map((l:string,i:number)=>(
                      <a key={i} href={l} target="_blank" rel="noopener noreferrer"
                        style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 12px",borderRadius:20,
                          background:"rgba(37,99,235,0.08)",color:"#3b82f6",fontSize:12,fontWeight:700,textDecoration:"none",
                          border:"1px solid rgba(37,99,235,0.2)",maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        🔗 {l}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing reply */}
              {d.reply&&(
                <div style={{background:"rgba(34,197,94,0.06)",border:"1.5px solid rgba(34,197,94,0.25)",borderRadius:12,padding:12,marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#166534",marginBottom:6}}>👨‍🏫 YOUR REPLY · {new Date(d.reply.repliedAt).toLocaleString("en-BD",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
                  {d.reply.text&&<div style={{fontSize:13,color:"var(--text)",lineHeight:1.7,whiteSpace:"pre-wrap",marginBottom:6}}>{d.reply.text}</div>}
                  {d.reply.audioData&&<audio src={d.reply.audioData} controls style={{width:"100%",height:34,marginTop:4}}/>}
                  {d.reply.imageData&&<img src={d.reply.imageData} alt="reply" style={{maxWidth:"100%",borderRadius:8,border:"1.5px solid rgba(34,197,94,0.3)",marginTop:6}}/>}
                  {d.reply.pdfData&&(
                    <button onClick={()=>openPdfAdmin(d.reply.pdfData,d.reply.pdfName||"reply.pdf")}
                      style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:8,
                        background:"rgba(239,68,68,0.08)",color:"#ef4444",border:"1px solid rgba(239,68,68,0.2)",fontWeight:700,fontSize:11,cursor:"pointer",marginTop:6}}>
                      📄 {d.reply.pdfName||"PDF"}
                    </button>
                  )}
                  {Array.isArray(d.reply.links)&&d.reply.links.length>0&&(
                    <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:6}}>
                      {(d.reply.links as string[]).map((l:string,i:number)=>(
                        <a key={i} href={l} target="_blank" rel="noopener noreferrer"
                          style={{fontSize:11,color:"#3b82f6",fontWeight:700,textDecoration:"none"}}>🔗 {l}</a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
                <button onClick={()=>setReplyId(r=>r===d.id?null:d.id)}
                  style={{padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,
                    background:replyId===d.id?"#ede9fe":"var(--purple)",color:replyId===d.id?"var(--purple)":"#fff"}}>
                  {replyId===d.id?"✕ Cancel":"💬 "+(d.reply?"Edit Reply":"Reply")}
                </button>
                {d.status==="answered"&&(
                  <button onClick={()=>reopen(d.id)}
                    style={{padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,background:"#fef3c7",color:"#92400e"}}>
                    ↩ Reopen
                  </button>
                )}
                <button onClick={()=>del(d.id)}
                  style={{padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,background:"#fee2e2",color:"#dc2626"}}>
                  🗑 Delete
                </button>
              </div>

              {replyId===d.id&&(
                <DoubtReplyPanel d={d} token={token} onDone={()=>{setReplyId(null);setExpanded(null);load();}}/>
              )}
            </div>
          )}
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

/* ══════════════════════════════════════════════════════════
   SOLVE SHEET TAB
══════════════════════════════════════════════════════════ */
interface AdminSheet { id:string; title:string; subject:string; exam:string; year:string; imageUrls:string[]; pdfUrl?:string; createdAt:string; }
function SolveSheetTab() {
  const [sheets, setSheets] = useState<AdminSheet[]>([]);
  const [form, setForm] = useState({ title:"", subject:"", exam:"", year:"", imageUrls:"", pdfUrl:"" });
  const [editId, setEditId] = useState<string|null>(null);
  const [msg, setMsg] = useState("");
  const load = useCallback(() => api("/api/admin/solve-sheets").then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setSheets(d); }), []);
  useEffect(() => { load(); }, [load]);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setMsg("");
    const payload = { ...form, imageUrls: form.imageUrls.split("\n").map(u=>u.trim()).filter(Boolean) };
    const r = editId
      ? await api(`/api/admin/solve-sheets/${editId}`, { method:"PUT", body:JSON.stringify(payload) })
      : await api("/api/admin/solve-sheets", { method:"POST", body:JSON.stringify(payload) });
    const d = await r.json();
    if (!r.ok) { setMsg("❌ " + (d.error||"Failed")); return; }
    setMsg("✅ Saved!"); setForm({ title:"", subject:"", exam:"", year:"", imageUrls:"", pdfUrl:"" }); setEditId(null); load();
  }
  function startEdit(s: AdminSheet) {
    setEditId(s.id); setForm({ title:s.title, subject:s.subject, exam:s.exam, year:s.year, imageUrls:s.imageUrls.join("\n"), pdfUrl:s.pdfUrl||"" }); setMsg("");
  }
  return (
    <div>
      <SectionTitle>📋 Solve Sheet Library</SectionTitle>
      <Card title={editId?"Edit Solve Sheet":"Add Solve Sheet"}>
        <form onSubmit={save} style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Field label="TITLE *"><input style={inp} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Physics SSC 2024 Solve" required /></Field>
            <Field label="SUBJECT *"><input style={inp} value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="Physics, Math…" required /></Field>
            <Field label="EXAM TYPE"><input style={inp} value={form.exam} onChange={e=>setForm({...form,exam:e.target.value})} placeholder="SSC / HSC / Admission / BCS" /></Field>
            <Field label="YEAR"><input style={inp} value={form.year} onChange={e=>setForm({...form,year:e.target.value})} placeholder="2024" /></Field>
          </div>
          <Field label="IMAGE URLs (one per line)">
            <textarea style={{...inp,resize:"vertical",height:80}} value={form.imageUrls} onChange={e=>setForm({...form,imageUrls:e.target.value})} placeholder={"https://example.com/page1.jpg\nhttps://example.com/page2.jpg"} />
          </Field>
          <Field label="PDF URL (optional)"><input style={inp} value={form.pdfUrl} onChange={e=>setForm({...form,pdfUrl:e.target.value})} placeholder="https://drive.google.com/..." /></Field>
          <div style={{display:"flex",gap:8}}>
            <button type="submit" style={btnStyle("var(--purple)")}>{editId?"Update Sheet":"Add Sheet"}</button>
            {editId&&<button type="button" onClick={()=>{setEditId(null);setForm({title:"",subject:"",exam:"",year:"",imageUrls:"",pdfUrl:""});setMsg("");}} style={btnStyle("#6b7280")}>Cancel</button>}
          </div>
          {msg&&<Feedback msg={msg}/>}
        </form>
      </Card>
      <SectionTitle style={{marginTop:8}}>All Sheets ({sheets.length})</SectionTitle>
      {sheets.length===0&&<Empty icon="📋" text="No solve sheets yet"/>}
      {sheets.map(s=>(
        <div key={s.id} style={{...listItem,display:"flex",gap:12,alignItems:"flex-start"}}>
          {s.imageUrls[0]&&<img src={s.imageUrls[0]} alt={s.title} style={{width:50,height:60,objectFit:"cover",borderRadius:8,flexShrink:0}}/>}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:14,color:"var(--text)"}}>{s.title}</div>
            <div style={{fontSize:12,color:"var(--sub)",marginTop:2}}>{s.subject} · {s.exam} {s.year} · {s.imageUrls.length} image{s.imageUrls.length!==1?"s":""}{s.pdfUrl?" · PDF":""}</div>
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            <button onClick={()=>startEdit(s)} style={smBtn("var(--purple)")}>Edit</button>
            <button onClick={async()=>{if(!confirm("Delete?"))return;await api(`/api/admin/solve-sheets/${s.id}`,{method:"DELETE"});load();}} style={smBtn("#ef4444")}>Del</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   LIVE CLASS TAB
══════════════════════════════════════════════════════════ */
interface AdminLiveClass { id:string; title:string; subject:string; teacherName:string; youtubeId:string; scheduledAt:string; durationMinutes:number; description?:string; createdAt:string; }
function LiveClassTab() {
  const [classes, setClasses] = useState<AdminLiveClass[]>([]);
  const [form, setForm] = useState({ title:"", subject:"", teacherName:"", youtubeId:"", scheduledAt:"", durationMinutes:"60", description:"" });
  const [editId, setEditId] = useState<string|null>(null);
  const [msg, setMsg] = useState("");
  const load = useCallback(() => api("/api/admin/live-classes").then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setClasses(d); }), []);
  useEffect(() => { load(); }, [load]);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setMsg("");
    const payload = { ...form, durationMinutes: Number(form.durationMinutes)||60 };
    const r = editId
      ? await api(`/api/admin/live-classes/${editId}`, { method:"PUT", body:JSON.stringify(payload) })
      : await api("/api/admin/live-classes", { method:"POST", body:JSON.stringify(payload) });
    const d = await r.json();
    if (!r.ok) { setMsg("❌ " + (d.error||"Failed")); return; }
    setMsg("✅ Saved!"); setForm({ title:"", subject:"", teacherName:"", youtubeId:"", scheduledAt:"", durationMinutes:"60", description:"" }); setEditId(null); load();
  }
  function startEdit(c: AdminLiveClass) {
    setEditId(c.id);
    const local = new Date(c.scheduledAt);
    const pad = (n:number) => String(n).padStart(2,"0");
    const localStr = `${local.getFullYear()}-${pad(local.getMonth()+1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
    setForm({ title:c.title, subject:c.subject, teacherName:c.teacherName||"", youtubeId:c.youtubeId, scheduledAt:localStr, durationMinutes:String(c.durationMinutes), description:c.description||"" });
    setMsg("");
  }
  function classStatus(c: AdminLiveClass): { label:string; color:string } {
    const now = Date.now(); const start = new Date(c.scheduledAt).getTime(); const end = start + c.durationMinutes*60000;
    if (now < start) return { label:"Upcoming", color:"#d97706" };
    if (now < end)   return { label:"LIVE", color:"#dc2626" };
    return { label:"Ended", color:"#6b7280" };
  }
  return (
    <div>
      <SectionTitle>👨‍🏫 Live Class Scheduler</SectionTitle>
      <Card title={editId?"Edit Class":"Schedule Live Class"}>
        <form onSubmit={save} style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Field label="TITLE *"><input style={inp} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Physics Chapter 4 Live" required /></Field>
            <Field label="SUBJECT"><input style={inp} value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="Physics, Math…" /></Field>
            <Field label="TEACHER NAME"><input style={inp} value={form.teacherName} onChange={e=>setForm({...form,teacherName:e.target.value})} placeholder="Mr. Rahman" /></Field>
            <Field label="YOUTUBE VIDEO ID *"><input style={inp} value={form.youtubeId} onChange={e=>setForm({...form,youtubeId:e.target.value})} placeholder="dQw4w9WgXcQ" required /></Field>
            <Field label="SCHEDULED DATE & TIME *"><input type="datetime-local" style={inp} value={form.scheduledAt} onChange={e=>setForm({...form,scheduledAt:e.target.value})} required /></Field>
            <Field label="DURATION (minutes)"><input type="number" style={inp} value={form.durationMinutes} onChange={e=>setForm({...form,durationMinutes:e.target.value})} min={1} max={480} /></Field>
          </div>
          <Field label="DESCRIPTION (optional)">
            <textarea style={{...inp,resize:"vertical",height:60}} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="What will be covered in this class…" />
          </Field>
          <div style={{display:"flex",gap:8}}>
            <button type="submit" style={btnStyle("var(--purple)")}>{editId?"Update Class":"Schedule Class"}</button>
            {editId&&<button type="button" onClick={()=>{setEditId(null);setForm({title:"",subject:"",teacherName:"",youtubeId:"",scheduledAt:"",durationMinutes:"60",description:""});setMsg("");}} style={btnStyle("#6b7280")}>Cancel</button>}
          </div>
          {msg&&<Feedback msg={msg}/>}
        </form>
      </Card>
      <SectionTitle style={{marginTop:8}}>All Classes ({classes.length})</SectionTitle>
      {classes.length===0&&<Empty icon="👨‍🏫" text="No live classes scheduled yet"/>}
      {classes.map(c=>{
        const st=classStatus(c);
        return (
          <div key={c.id} style={{...listItem,display:"flex",gap:12,alignItems:"flex-start"}}>
            <img src={`https://img.youtube.com/vi/${c.youtubeId}/mqdefault.jpg`} alt={c.title}
              style={{width:72,height:48,objectFit:"cover",borderRadius:8,flexShrink:0}} />
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                <span style={{fontWeight:700,fontSize:14,color:"var(--text)"}}>{c.title}</span>
                <span style={{fontSize:10,padding:"1px 7px",borderRadius:20,background:st.color+"22",color:st.color,fontWeight:700}}>{st.label}</span>
              </div>
              <div style={{fontSize:12,color:"var(--sub)"}}>{c.subject} {c.teacherName&&`· ${c.teacherName}`} · {new Date(c.scheduledAt).toLocaleString("en-BD",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})} · {c.durationMinutes}min</div>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <button onClick={()=>startEdit(c)} style={smBtn("var(--purple)")}>Edit</button>
              <button onClick={async()=>{if(!confirm("Delete?"))return;await api(`/api/admin/live-classes/${c.id}`,{method:"DELETE"});load();}} style={smBtn("#ef4444")}>Del</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ANNOUNCEMENTS TAB
══════════════════════════════════════════════════════════ */
interface AdminAnnouncement { id:string; title:string; body:string; type:"info"|"warning"|"success"|"urgent"; pinned:boolean; createdAt:string; expiresAt?:string; }
const ANN_TYPE_COLORS: Record<string,string> = { info:"#3b82f6", warning:"#d97706", success:"#16a34a", urgent:"#dc2626" };
function AnnouncementsTab() {
  const [items, setItems] = useState<AdminAnnouncement[]>([]);
  const [form, setForm] = useState({ title:"", body:"", type:"info", pinned:false, expiresAt:"" });
  const [editId, setEditId] = useState<string|null>(null);
  const [msg, setMsg] = useState("");
  const load = useCallback(() => api("/api/admin/announcements").then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setItems(d); }), []);
  useEffect(() => { load(); }, [load]);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setMsg("");
    const payload = { ...form, expiresAt: form.expiresAt || undefined };
    const r = editId
      ? await api(`/api/admin/announcements/${editId}`, { method:"PUT", body:JSON.stringify(payload) })
      : await api("/api/admin/announcements", { method:"POST", body:JSON.stringify(payload) });
    const d = await r.json();
    if (!r.ok) { setMsg("❌ " + (d.error||"Failed")); return; }
    setMsg("✅ Published!"); setForm({ title:"", body:"", type:"info", pinned:false, expiresAt:"" }); setEditId(null); load();
  }
  function startEdit(a: AdminAnnouncement) {
    setEditId(a.id); setForm({ title:a.title, body:a.body, type:a.type, pinned:a.pinned, expiresAt:a.expiresAt||"" }); setMsg("");
  }
  return (
    <div>
      <SectionTitle>📢 Announcements</SectionTitle>
      <InfoBox>Announcements appear as coloured banners on the student dashboard. Use <b>urgent</b> for important notices, <b>warning</b> for reminders, <b>success</b> for positive news.</InfoBox>
      <Card title={editId?"Edit Announcement":"New Announcement"}>
        <form onSubmit={save} style={{display:"flex",flexDirection:"column",gap:10}}>
          <Field label="TITLE *"><input style={inp} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Exam schedule updated" required /></Field>
          <Field label="BODY *">
            <textarea style={{...inp,resize:"vertical",height:70}} value={form.body} onChange={e=>setForm({...form,body:e.target.value})} placeholder="Full announcement text…" required />
          </Field>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Field label="TYPE">
              <select style={inp} value={form.type} onChange={e=>setForm({...form,type:e.target.value as any})}>
                <option value="info">ℹ️ Info</option>
                <option value="warning">⚠️ Warning</option>
                <option value="success">✅ Success</option>
                <option value="urgent">🚨 Urgent</option>
              </select>
            </Field>
            <Field label="EXPIRES (optional)"><input type="datetime-local" style={inp} value={form.expiresAt} onChange={e=>setForm({...form,expiresAt:e.target.value})} /></Field>
          </div>
          <label style={{display:"flex",gap:8,alignItems:"center",cursor:"pointer",fontSize:13}}>
            <input type="checkbox" checked={form.pinned} onChange={e=>setForm({...form,pinned:e.target.checked})} />
            <span>📌 Pin to top</span>
          </label>
          <div style={{display:"flex",gap:8}}>
            <button type="submit" style={btnStyle("var(--purple)")}>{editId?"Update":"Publish"}</button>
            {editId&&<button type="button" onClick={()=>{setEditId(null);setForm({title:"",body:"",type:"info",pinned:false,expiresAt:""});setMsg("");}} style={btnStyle("#6b7280")}>Cancel</button>}
          </div>
          {msg&&<Feedback msg={msg}/>}
        </form>
      </Card>
      <SectionTitle style={{marginTop:8}}>Published ({items.length})</SectionTitle>
      {items.length===0&&<Empty icon="📢" text="No announcements yet"/>}
      {items.map(a=>{
        const col=ANN_TYPE_COLORS[a.type]||"#3b82f6";
        return (
          <div key={a.id} style={{...listItem,borderLeft:`4px solid ${col}`}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:6,marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:700,color:col,textTransform:"uppercase"}}>{a.type}</span>
                  {a.pinned&&<span style={{fontSize:11,color:"var(--sub)"}}>📌 Pinned</span>}
                  {a.expiresAt&&<span style={{fontSize:11,color:"var(--sub)"}}>Expires {new Date(a.expiresAt).toLocaleString("en-BD",{day:"2-digit",month:"short"})}</span>}
                </div>
                <div style={{fontWeight:700,fontSize:14,color:"var(--text)",marginBottom:4}}>{a.title}</div>
                <div style={{fontSize:13,color:"var(--sub)",lineHeight:1.5}}>{a.body}</div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <button onClick={()=>startEdit(a)} style={smBtn("var(--purple)")}>Edit</button>
                <button onClick={async()=>{if(!confirm("Delete?"))return;await api(`/api/admin/announcements/${a.id}`,{method:"DELETE"});load();}} style={smBtn("#ef4444")}>Del</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   DISCUSSIONS TAB
══════════════════════════════════════════════════════════ */
interface AdminDiscussionReply { id:string; body:string; author:string; createdAt:string; isTeacher?:boolean; }
interface AdminDiscussion { id:string; subject:string; title:string; body:string; author:string; createdAt:string; pinned?:boolean; replies:AdminDiscussionReply[]; upvotes:string[]; }
function DiscussionsTab() {
  const [posts, setPosts] = useState<AdminDiscussion[]>([]);
  const [expanded, setExpanded] = useState<string|null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyId, setReplyId] = useState<string|null>(null);
  const [msg, setMsg] = useState("");
  const load = useCallback(() => api("/api/admin/discussions").then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setPosts(d); }), []);
  useEffect(() => { load(); }, [load]);
  async function sendReply(postId: string) {
    if (!replyText.trim()) return;
    setMsg("");
    const r = await api(`/api/admin/discussions/${postId}/reply`, { method:"POST", body:JSON.stringify({ body:replyText }) });
    if (r.ok) { setReplyText(""); setReplyId(null); setMsg("✅ Reply sent!"); load(); }
    else { const d=await r.json().catch(()=>({})); setMsg("❌ "+(d.error||"Failed")); }
  }
  return (
    <div>
      <SectionTitle>💬 Discussions Board</SectionTitle>
      {msg&&<Feedback msg={msg} style={{marginBottom:12}}/>}
      {posts.length===0&&<Empty icon="💬" text="No discussions yet"/>}
      {posts.map(p=>(
        <div key={p.id} style={{...listItem}}>
          <button onClick={()=>setExpanded(e=>e===p.id?null:p.id)}
            style={{width:"100%",textAlign:"left",background:"none",border:"none",cursor:"pointer",padding:0}}>
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:6,marginBottom:4}}>
                  {p.pinned&&<span style={{fontSize:10,background:"#ede9fe",color:"var(--purple)",padding:"1px 7px",borderRadius:20,fontWeight:700}}>📌 Pinned</span>}
                  {p.subject&&<span style={{fontSize:10,background:"var(--bg)",color:"var(--sub)",padding:"1px 7px",borderRadius:20}}>{p.subject}</span>}
                </div>
                <div style={{fontWeight:700,fontSize:13,color:"var(--text)",marginBottom:2}}>{p.title}</div>
                <div style={{fontSize:11,color:"var(--sub)"}}>👤 {p.author} · 💬 {p.replies.length} · ❤️ {p.upvotes.length} · {new Date(p.createdAt).toLocaleString("en-BD",{day:"2-digit",month:"short"})}</div>
              </div>
              <span style={{color:"var(--sub)",fontSize:14}}>{expanded===p.id?"▲":"▼"}</span>
            </div>
          </button>
          {expanded===p.id&&(
            <div style={{paddingTop:12}}>
              <div style={{background:"var(--bg)",borderRadius:10,padding:10,marginBottom:10,fontSize:13,color:"var(--text)",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{p.body}</div>
              {p.replies.map(r=>(
                <div key={r.id} style={{background:r.isTeacher?"#f0fdf4":"var(--bg)",borderRadius:8,padding:"8px 10px",marginBottom:6,fontSize:12,color:"var(--text)"}}>
                  <span style={{fontWeight:700,color:r.isTeacher?"#166534":"var(--purple)"}}>{r.author}{r.isTeacher?" 👨‍🏫":""}: </span>{r.body}
                </div>
              ))}
              {replyId===p.id ? (
                <div style={{display:"flex",gap:8,marginTop:8}}>
                  <textarea value={replyText} onChange={e=>setReplyText(e.target.value)} placeholder="Teacher reply…" rows={2}
                    style={{...inp,flex:1,resize:"none"}} />
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    <button onClick={()=>sendReply(p.id)} style={smBtn("var(--green)")}>Send</button>
                    <button onClick={()=>{setReplyId(null);setReplyText("");}} style={smBtn("#6b7280")}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
                  <button onClick={()=>setReplyId(p.id)} style={smBtn("var(--green)")}>👨‍🏫 Reply as Teacher</button>
                  <button onClick={async()=>{await api(`/api/admin/discussions/${p.id}/pin`,{method:"PATCH"});load();}} style={smBtn("var(--purple)")}>{p.pinned?"Unpin":"📌 Pin"}</button>
                  <button onClick={async()=>{if(!confirm("Delete post?"))return;await api(`/api/admin/discussions/${p.id}`,{method:"DELETE"});load();}} style={smBtn("#ef4444")}>Delete</button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
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
  // Linkify any http/https URLs so users can click straight through
  const parts:(string|React.ReactElement)[]=[];
  const re=/(https?:\/\/[^\s)]+)/g;
  let last=0,m:RegExpExecArray|null,i=0;
  while((m=re.exec(msg))){
    if(m.index>last) parts.push(msg.slice(last,m.index));
    parts.push(<a key={i++} href={m[1]} target="_blank" rel="noopener noreferrer" style={{color:"inherit",textDecoration:"underline",fontWeight:700,wordBreak:"break-all"}}>{m[1]}</a>);
    last=m.index+m[1].length;
  }
  if(last<msg.length) parts.push(msg.slice(last));
  return <div style={{padding:"8px 12px",borderRadius:8,background:ok?"#d4edda":"#fff3cd",border:`1px solid ${ok?"#c3e6cb":"#ffc107"}`,fontSize:13,color:ok?"#155724":"#856404",whiteSpace:"pre-wrap",wordBreak:"break-word",...style}}>{parts.length?parts:msg}</div>;
}
/* ══════════════════════════════════════════════════════════
   FLASHCARDS TAB
══════════════════════════════════════════════════════════ */
interface AdminDeck { id:string; name:string; subject:string; description:string; cardCount:number; createdAt:string; }
interface AdminCard { id:string; deckId:string; front:string; back:string; hint?:string; order:number; }
function FlashcardsTab() {
  const [decks, setDecks]       = useState<AdminDeck[]>([]);
  const [selDeck, setSelDeck]   = useState<AdminDeck|null>(null);
  const [cards, setCards]       = useState<AdminCard[]>([]);
  const [deckForm, setDeckForm] = useState({ name:"", subject:"", description:"" });
  const [cardForm, setCardForm] = useState({ front:"", back:"", hint:"" });
  const [editDeckId, setEditDeckId] = useState<string|null>(null);
  const [editCardId, setEditCardId] = useState<string|null>(null);
  const [msg, setMsg]           = useState("");
  const [showDeckForm, setShowDeckForm] = useState(false);

  const loadDecks = useCallback(() =>
    api("/api/admin/flashcard-decks").then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setDecks(d); }), []);

  const loadCards = useCallback((deckId:string) =>
    api(`/api/admin/flashcard-decks/${deckId}/cards`).then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setCards(d); }), []);

  useEffect(() => { loadDecks(); }, [loadDecks]);
  useEffect(() => { if(selDeck) loadCards(selDeck.id); }, [selDeck, loadCards]);

  function flash(m:string) { setMsg(m); setTimeout(()=>setMsg(""),3000); }

  async function saveDeck(e:React.FormEvent) {
    e.preventDefault();
    const method = editDeckId?"PUT":"POST";
    const url    = editDeckId?`/api/admin/flashcard-decks/${editDeckId}`:"/api/admin/flashcard-decks";
    const r      = await api(url, {method, body:JSON.stringify(deckForm)});
    if(r.ok){ await loadDecks(); setDeckForm({name:"",subject:"",description:""}); setEditDeckId(null); setShowDeckForm(false); flash(editDeckId?"Deck updated!":"Deck created!"); }
    else { const d=await r.json(); flash("Error: "+(d.error||r.status)); }
  }

  async function deleteDeck(id:string) {
    if(!confirm("Delete this deck and all its cards?")) return;
    await api(`/api/admin/flashcard-decks/${id}`,{method:"DELETE"}); await loadDecks();
    if(selDeck?.id===id) { setSelDeck(null); setCards([]); }
    flash("Deck deleted.");
  }

  async function saveCard(e:React.FormEvent) {
    e.preventDefault();
    if(!selDeck) return;
    const method = editCardId?"PUT":"POST";
    const url    = editCardId?`/api/admin/flashcard-decks/${selDeck.id}/cards/${editCardId}`:`/api/admin/flashcard-decks/${selDeck.id}/cards`;
    const r      = await api(url, {method, body:JSON.stringify(cardForm)});
    if(r.ok){ await loadCards(selDeck.id); setCardForm({front:"",back:"",hint:""}); setEditCardId(null); flash(editCardId?"Card updated!":"Card added!"); }
    else { const d=await r.json(); flash("Error: "+(d.error||r.status)); }
  }

  async function deleteCard(cardId:string) {
    if(!selDeck) return;
    await api(`/api/admin/flashcard-decks/${selDeck.id}/cards/${cardId}`,{method:"DELETE"});
    await loadCards(selDeck.id); flash("Card deleted.");
  }

  return (
    <div>
      <h2 style={{marginBottom:18,fontFamily:"Lato,sans-serif",fontSize:20}}>🃏 Flashcard Decks</h2>
      {msg && <Feedback msg={msg} style={{marginBottom:12}} />}

      {/* Deck list */}
      {!selDeck && (
        <div>
          <div style={{display:"flex",gap:10,marginBottom:16}}>
            <button onClick={()=>{setShowDeckForm(f=>!f);setEditDeckId(null);setDeckForm({name:"",subject:"",description:""});}} style={btnStyle("#7c3aed")}>
              {showDeckForm?"Cancel":"+ New Deck"}
            </button>
          </div>

          {showDeckForm && (
            <form onSubmit={saveDeck} style={{background:"var(--surface)",borderRadius:14,padding:18,marginBottom:18,boxShadow:"0 2px 10px rgba(0,0,0,0.07)"}}>
              <h3 style={{marginBottom:14,fontSize:15}}>{editDeckId?"Edit Deck":"Create New Deck"}</h3>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <input style={inp} placeholder="Deck Name *" value={deckForm.name} onChange={e=>setDeckForm(f=>({...f,name:e.target.value}))} required />
                <input style={inp} placeholder="Subject (e.g. Physics, Math)" value={deckForm.subject} onChange={e=>setDeckForm(f=>({...f,subject:e.target.value}))} />
                <textarea style={{...inp,resize:"vertical",minHeight:60}} placeholder="Description" value={deckForm.description} onChange={e=>setDeckForm(f=>({...f,description:e.target.value}))} />
                <button type="submit" style={btnStyle("#7c3aed")}>{editDeckId?"Update Deck":"Create Deck"}</button>
              </div>
            </form>
          )}

          {decks.length===0 && <Empty icon="🃏" text="No flashcard decks yet. Create one above." />}
          {decks.map(d=>(
            <div key={d.id} style={{...listItem,display:"flex",alignItems:"center",gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15,color:"var(--purple)"}}>{d.name}</div>
                {d.subject && <div style={{fontSize:12,color:"var(--sub)",marginTop:2}}>📚 {d.subject}</div>}
                <div style={{fontSize:12,color:"var(--sub)",marginTop:2}}>{d.cardCount} cards · Created {new Date(d.createdAt).toLocaleDateString()}</div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button style={smBtn("#2563eb")} onClick={()=>{setSelDeck(d);}}>Manage Cards</button>
                <button style={smBtn("#6b7280")} onClick={()=>{setEditDeckId(d.id);setDeckForm({name:d.name,subject:d.subject,description:d.description});setShowDeckForm(true);}}>Edit</button>
                <button style={smBtn("#dc2626")} onClick={()=>deleteDeck(d.id)}>Del</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cards view */}
      {selDeck && (
        <div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
            <button onClick={()=>{setSelDeck(null);setCards([]);setEditCardId(null);}} style={btnStyle("#6b7280")}>← Back to Decks</button>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:17,color:"var(--purple)"}}>{selDeck.name}</div>
              <div style={{fontSize:12,color:"var(--sub)"}}>{cards.length} cards</div>
            </div>
          </div>

          {/* Card form */}
          <form onSubmit={saveCard} style={{background:"var(--surface)",borderRadius:14,padding:18,marginBottom:18,boxShadow:"0 2px 10px rgba(0,0,0,0.07)"}}>
            <h3 style={{marginBottom:14,fontSize:15}}>{editCardId?"Edit Card":"Add New Card"}</h3>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <textarea style={{...inp,resize:"vertical",minHeight:70}} placeholder="Front (Question) *" value={cardForm.front} onChange={e=>setCardForm(f=>({...f,front:e.target.value}))} required />
              <textarea style={{...inp,resize:"vertical",minHeight:70}} placeholder="Back (Answer) *" value={cardForm.back} onChange={e=>setCardForm(f=>({...f,back:e.target.value}))} required />
              <input style={inp} placeholder="Hint (optional)" value={cardForm.hint} onChange={e=>setCardForm(f=>({...f,hint:e.target.value}))} />
              <div style={{display:"flex",gap:8}}>
                <button type="submit" style={btnStyle("#7c3aed")}>{editCardId?"Update Card":"Add Card"}</button>
                {editCardId && <button type="button" style={btnStyle("#6b7280")} onClick={()=>{setEditCardId(null);setCardForm({front:"",back:"",hint:""});}}>Cancel</button>}
              </div>
            </div>
          </form>

          {/* Card list */}
          {cards.length===0 && <Empty icon="🃏" text="No cards in this deck yet." />}
          {cards.map((c,i)=>(
            <div key={c.id} style={{...listItem}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                <div style={{minWidth:28,height:28,borderRadius:8,background:"var(--purple)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,flexShrink:0}}>
                  {i+1}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{marginBottom:6}}>
                    <div style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",marginBottom:2}}>Front</div>
                    <div style={{fontSize:14,color:"var(--text)",lineHeight:1.5}}>{c.front}</div>
                  </div>
                  <div style={{padding:"8px 10px",background:"var(--bg)",borderRadius:8,borderLeft:"3px solid var(--green)"}}>
                    <div style={{fontSize:11,fontWeight:700,color:"var(--sub)",textTransform:"uppercase",marginBottom:2}}>Back</div>
                    <div style={{fontSize:14,color:"var(--text)",lineHeight:1.5}}>{c.back}</div>
                  </div>
                  {c.hint && <div style={{marginTop:6,fontSize:12,color:"var(--gold)"}}>💡 {c.hint}</div>}
                </div>
                <div style={{display:"flex",gap:4,flexShrink:0}}>
                  <button style={smBtn("#6b7280")} onClick={()=>{setEditCardId(c.id);setCardForm({front:c.front,back:c.back,hint:c.hint||""});}}>Edit</button>
                  <button style={smBtn("#dc2626")} onClick={()=>deleteCard(c.id)}>Del</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══ Exam Dates ═════════════════════════════════════════════ */
function ExamDatesTab(){
  const [list,setList]=useState<any[]>([]);
  const [form,setForm]=useState({title:"",exam:"SSC",date:"",color:"#dc2626"});
  const [msg,setMsg]=useState("");
  const load=useCallback(()=>api("/api/admin/exam-dates",{method:"GET"}).then(r=>r.json()).then(d=>{if(Array.isArray(d))setList(d);}),[]);
  useEffect(()=>{load();},[load]);
  async function add(){
    if(!form.title||!form.date){setMsg("❌ Title and date required");return;}
    const r=await api("/api/admin/exam-dates",{method:"POST",body:JSON.stringify(form)});
    const d=await r.json();
    if(d.error)setMsg("❌ "+d.error);
    else{setMsg("✅ Exam date added!");setForm({title:"",exam:"SSC",date:"",color:"#dc2626"});load();}
  }
  async function del(id:string){
    if(!confirm("Delete?"))return;
    await api(`/api/admin/exam-dates/${id}`,{method:"DELETE"});
    load();
  }
  const EXAMS=["SSC","HSC","Admission","BCS","JSC","Other"];
  return(
    <div>
      <SectionTitle>⏰ Exam Dates</SectionTitle>
      <InfoBox>Set upcoming exam dates. Students see countdowns on the Study Planner page.</InfoBox>
      <Card title="➕ Add Exam Date">
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <Field label="Title"><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. SSC 2026 Mathematics" style={inp}/></Field>
          <Field label="Exam Type"><select value={form.exam} onChange={e=>setForm({...form,exam:e.target.value})} style={inp}>{EXAMS.map(e=><option key={e}>{e}</option>)}</select></Field>
          <Field label="Date & Time"><input type="datetime-local" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inp}/></Field>
          <Field label="Color"><input type="color" value={form.color} onChange={e=>setForm({...form,color:e.target.value})} style={{...inp,width:60,padding:4,height:36}}/></Field>
          {msg&&<Feedback msg={msg}/>}
          <button onClick={add} style={btnStyle("var(--purple)")}>Add Exam Date</button>
        </div>
      </Card>
      {list.length===0&&<Empty icon="⏰" text="No exam dates set"/>}
      {list.map(e=>{
        const ms=new Date(e.date).getTime()-Date.now();
        const days=Math.max(0,Math.floor(ms/86400000));
        return(
          <div key={e.id} style={{...listItem,borderLeft:`4px solid ${e.color||"#dc2626"}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontWeight:700,color:"var(--text)"}}>{e.title}</div>
                <div style={{fontSize:12,color:"var(--sub)",marginTop:2}}>{e.exam} · {new Date(e.date).toLocaleString()}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:20,fontWeight:900,color:e.color||"#dc2626",fontFamily:"monospace"}}>{days}d</div>
                <button onClick={()=>del(e.id)} style={smBtn("#dc2626")}>Delete</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══ Past Papers ════════════════════════════════════════════ */
function PapersTab(){
  const [list,setList]=useState<any[]>([]);
  const [form,setForm]=useState({title:"",exam:"SSC",subject:"Mathematics",year:String(new Date().getFullYear()),pdfUrl:"",imageUrl:""});
  const [msg,setMsg]=useState("");
  const load=useCallback(()=>api("/api/admin/past-papers",{method:"GET"}).then(r=>r.json()).then(d=>{if(Array.isArray(d))setList(d);}),[]);
  useEffect(()=>{load();},[load]);
  async function add(){
    if(!form.title){setMsg("❌ Title required");return;}
    const imageUrls=form.imageUrl.trim()?form.imageUrl.split("\n").map(s=>s.trim()).filter(Boolean):[];
    const r=await api("/api/admin/past-papers",{method:"POST",body:JSON.stringify({...form,imageUrls,pdfUrl:form.pdfUrl.trim()||undefined})});
    const d=await r.json();
    if(d.error)setMsg("❌ "+d.error);
    else{setMsg("✅ Paper added!");setForm({title:"",exam:"SSC",subject:"Mathematics",year:String(new Date().getFullYear()),pdfUrl:"",imageUrl:""});load();}
  }
  async function del(id:string){
    if(!confirm("Delete?"))return;
    await api(`/api/admin/past-papers/${id}`,{method:"DELETE"});
    load();
  }
  const EXAMS=["SSC","HSC","Admission","BCS","JSC","Other"];
  const SUBJECTS=["Mathematics","Physics","Chemistry","Biology","English","Bangla","ICT","History","Geography","Economy","Other"];
  return(
    <div>
      <SectionTitle>📄 Past Papers</SectionTitle>
      <InfoBox>Add past exam papers. Students can view/download from the Past Papers page. Add image URLs (one per line) for scanned pages, or a PDF link.</InfoBox>
      <Card title="➕ Add Past Paper">
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <Field label="Title"><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. SSC 2024 Mathematics (Dhaka Board)" style={inp}/></Field>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            <Field label="Exam"><select value={form.exam} onChange={e=>setForm({...form,exam:e.target.value})} style={inp}>{EXAMS.map(e=><option key={e}>{e}</option>)}</select></Field>
            <Field label="Subject"><select value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} style={inp}>{SUBJECTS.map(s=><option key={s}>{s}</option>)}</select></Field>
            <Field label="Year"><input value={form.year} onChange={e=>setForm({...form,year:e.target.value})} placeholder="2024" style={inp}/></Field>
          </div>
          <Field label="PDF URL (optional)"><input value={form.pdfUrl} onChange={e=>setForm({...form,pdfUrl:e.target.value})} placeholder="https://..." style={inp}/></Field>
          <Field label="Image URLs (one per line — scanned pages)"><textarea value={form.imageUrl} onChange={e=>setForm({...form,imageUrl:e.target.value})} rows={3} placeholder={"https://image1.jpg\nhttps://image2.jpg"} style={{...inp,resize:"vertical"}}/></Field>
          {msg&&<Feedback msg={msg}/>}
          <button onClick={add} style={btnStyle("var(--purple)")}>Add Paper</button>
        </div>
      </Card>
      <SectionTitle style={{marginTop:24}}>All Papers ({list.length})</SectionTitle>
      {list.length===0&&<Empty icon="📄" text="No past papers yet"/>}
      {list.map(p=>(
        <div key={p.id} style={listItem}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,color:"var(--text)",marginBottom:4}}>{p.title}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {[p.exam,p.subject,p.year].map(t=><span key={t} style={{fontSize:11,padding:"2px 8px",background:"rgba(124,58,237,0.1)",color:"var(--purple)",borderRadius:20,fontWeight:700}}>{t}</span>)}
                {p.imageUrls?.length>0&&<span style={{fontSize:11,color:"var(--sub)"}}>{p.imageUrls.length} page{p.imageUrls.length!==1?"s":""}</span>}
                {p.pdfUrl&&<span style={{fontSize:11,color:"#16a34a",fontWeight:700}}>PDF ✓</span>}
              </div>
            </div>
            <button onClick={()=>del(p.id)} style={smBtn("#dc2626")}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══ Formulas ════════════════════════════════════════════════ */
function FormulasTab(){
  const [list,setList]=useState<any[]>([]);
  const [form,setForm]=useState({subject:"Physics",category:"Mechanics",title:"",latex:"",description:""});
  const [search,setSearch]=useState("");
  const [msg,setMsg]=useState("");
  const load=useCallback(()=>api("/api/admin/formulas",{method:"GET"}).then(r=>r.json()).then(d=>{if(Array.isArray(d))setList(d);}),[]);
  useEffect(()=>{load();},[load]);
  async function add(){
    if(!form.title||!form.latex){setMsg("❌ Title and formula required");return;}
    const r=await api("/api/admin/formulas",{method:"POST",body:JSON.stringify(form)});
    const d=await r.json();
    if(d.error)setMsg("❌ "+d.error);
    else{setMsg("✅ Formula added!");setForm({...form,title:"",latex:"",description:""});load();}
  }
  async function del(id:string){
    if(!confirm("Delete?"))return;
    await api(`/api/admin/formulas/${id}`,{method:"DELETE"});
    load();
  }
  const SUBJECTS=["Physics","Chemistry","Biology","Mathematics","ICT","Other"];
  const filtered=list.filter(f=>!search||f.title?.toLowerCase().includes(search.toLowerCase())||f.subject?.toLowerCase().includes(search.toLowerCase()));
  return(
    <div>
      <SectionTitle>∑ Formula Library</SectionTitle>
      <InfoBox>Add formulas with LaTeX notation. Use $...$ for inline and $$...$$ for block math. Students can search and bookmark formulas.</InfoBox>
      <Card title="➕ Add Formula">
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Field label="Subject"><select value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} style={inp}>{SUBJECTS.map(s=><option key={s}>{s}</option>)}</select></Field>
            <Field label="Category"><input value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="e.g. Mechanics" style={inp}/></Field>
          </div>
          <Field label="Formula Title"><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Newton's Second Law" style={inp}/></Field>
          <Field label="LaTeX / Formula"><input value={form.latex} onChange={e=>setForm({...form,latex:e.target.value})} placeholder="e.g. F = ma or $F = ma$" style={inp}/></Field>
          <Field label="Description (optional)"><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={2} placeholder="Short explanation..." style={{...inp,resize:"vertical"}}/></Field>
          {msg&&<Feedback msg={msg}/>}
          <button onClick={add} style={btnStyle("var(--purple)")}>Add Formula</button>
        </div>
      </Card>
      <div style={{margin:"16px 0 10px",display:"flex",gap:8,alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search formulas..." style={{...inp,flex:1}}/>
        <span style={{fontSize:12,color:"var(--sub)",flexShrink:0}}>{filtered.length} formulas</span>
      </div>
      {filtered.length===0&&<Empty icon="∑" text="No formulas yet"/>}
      {filtered.map(f=>(
        <div key={f.id} style={listItem}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,color:"var(--text)"}}>{f.title}</div>
              <div style={{fontFamily:"monospace",fontSize:13,color:"var(--purple)",margin:"4px 0",wordBreak:"break-all"}}>{f.latex}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>
                <span style={{fontSize:11,padding:"2px 8px",background:"rgba(124,58,237,0.1)",color:"var(--purple)",borderRadius:20,fontWeight:700}}>{f.subject}</span>
                {f.category&&<span style={{fontSize:11,color:"var(--sub)"}}>{f.category}</span>}
              </div>
              {f.description&&<div style={{fontSize:12,color:"var(--sub)",marginTop:4}}>{f.description}</div>}
            </div>
            <button onClick={()=>del(f.id)} style={smBtn("#dc2626")}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══ Vocabulary ══════════════════════════════════════════════ */
function VocabTab(){
  const [list,setList]=useState<any[]>([]);
  const [form,setForm]=useState({word:"",meaning:"",bangla:"",example:"",subject:"English",difficulty:"medium"});
  const [msg,setMsg]=useState("");
  const load=useCallback(()=>api("/api/admin/vocabulary",{method:"GET"}).then(r=>r.json()).then(d=>{if(Array.isArray(d))setList(d);}),[]);
  useEffect(()=>{load();},[load]);
  async function add(){
    if(!form.word||!form.meaning){setMsg("❌ Word and meaning required");return;}
    const r=await api("/api/admin/vocabulary",{method:"POST",body:JSON.stringify(form)});
    const d=await r.json();
    if(d.error)setMsg("❌ "+d.error);
    else{setMsg("✅ Word added!");setForm({...form,word:"",meaning:"",bangla:"",example:""});load();}
  }
  async function del(id:string){
    await api(`/api/admin/vocabulary/${id}`,{method:"DELETE"});
    load();
  }
  const SUBJECTS=["English","Science","History","Bangla","General"];
  const DIFFS=["easy","medium","hard"];
  return(
    <div>
      <SectionTitle>📖 Vocabulary Builder</SectionTitle>
      <InfoBox>Add English/subject vocabulary words. Students can practice and quiz themselves.</InfoBox>
      <Card title="➕ Add Word">
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Field label="Word"><input value={form.word} onChange={e=>setForm({...form,word:e.target.value})} placeholder="e.g. Photosynthesis" style={inp}/></Field>
            <Field label="Bangla"><input value={form.bangla} onChange={e=>setForm({...form,bangla:e.target.value})} placeholder="সালোকসংশ্লেষণ" style={inp}/></Field>
          </div>
          <Field label="Meaning"><textarea value={form.meaning} onChange={e=>setForm({...form,meaning:e.target.value})} rows={2} placeholder="Definition..." style={{...inp,resize:"vertical"}}/></Field>
          <Field label="Example Sentence"><input value={form.example} onChange={e=>setForm({...form,example:e.target.value})} placeholder="Plants use photosynthesis to..." style={inp}/></Field>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Field label="Subject"><select value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} style={inp}>{SUBJECTS.map(s=><option key={s}>{s}</option>)}</select></Field>
            <Field label="Difficulty"><select value={form.difficulty} onChange={e=>setForm({...form,difficulty:e.target.value})} style={inp}>{DIFFS.map(d=><option key={d}>{d}</option>)}</select></Field>
          </div>
          {msg&&<Feedback msg={msg}/>}
          <button onClick={add} style={btnStyle("var(--purple)")}>Add Word</button>
        </div>
      </Card>
      <SectionTitle style={{marginTop:24}}>All Words ({list.length})</SectionTitle>
      {list.length===0&&<Empty icon="📖" text="No vocabulary words yet"/>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {list.map(w=>(
          <div key={w.id} style={{...listItem,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                <span style={{fontWeight:800,color:"var(--purple)",fontSize:15}}>{w.word}</span>
                {w.bangla&&<span style={{fontSize:13,color:"var(--sub)"}}>({w.bangla})</span>}
                <span style={{fontSize:10,padding:"2px 8px",background:w.difficulty==="hard"?"#fee2e2":w.difficulty==="medium"?"#fef3c7":"#dcfce7",borderRadius:20,fontWeight:700,color:w.difficulty==="hard"?"#991b1b":w.difficulty==="medium"?"#92400e":"#166534"}}>{w.difficulty}</span>
              </div>
              <div style={{fontSize:12,color:"var(--text)",lineHeight:1.5}}>{w.meaning}</div>
              {w.example&&<div style={{fontSize:11,color:"var(--sub)",fontStyle:"italic",marginTop:4}}>"{w.example}"</div>}
            </div>
            <button onClick={()=>del(w.id)} style={smBtn("#dc2626")}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══ Platform Settings ══════════════════════════════════════ */
function SettingsTab(){
  const [settings,setSettings]=useState<any>({siteName:"Red Rose 🥀",tagline:"SSC · HSC · Admission · BCS",primaryColor:"#e05c8a",enableLeaderboard:true,enableDiscussions:true,maintenanceMode:false});
  const [msg,setMsg]=useState("");
  const load=useCallback(()=>api("/api/admin/platform-settings",{method:"GET"}).then(r=>r.json()).then(d=>{if(d&&!d.error)setSettings(d);}),[]);
  useEffect(()=>{load();},[load]);
  async function save(){
    const r=await api("/api/admin/platform-settings",{method:"PUT",body:JSON.stringify(settings)});
    const d=await r.json();
    if(d.error)setMsg("❌ "+d.error); else setMsg("✅ Settings saved!");
  }
  return(
    <div>
      <SectionTitle>⚙️ Platform Settings</SectionTitle>
      <InfoBox>Configure site-wide settings for HTR Zone exam portal.</InfoBox>
      <Card title="General">
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Field label="Site Name"><input value={settings.siteName} onChange={e=>setSettings({...settings,siteName:e.target.value})} style={inp}/></Field>
          <Field label="Tagline"><input value={settings.tagline} onChange={e=>setSettings({...settings,tagline:e.target.value})} style={inp}/></Field>
          <Field label="Primary Color"><div style={{display:"flex",gap:10,alignItems:"center"}}><input type="color" value={settings.primaryColor} onChange={e=>setSettings({...settings,primaryColor:e.target.value})} style={{width:50,height:36,padding:2,border:"1px solid var(--border)",borderRadius:8,cursor:"pointer"}}/><span style={{fontSize:13,color:"var(--sub)"}}>{settings.primaryColor}</span></div></Field>
        </div>
      </Card>
      <div style={{marginTop:16}}><Card title="Feature Toggles">
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {[
            {key:"enableLeaderboard",label:"🏆 Leaderboard"},
            {key:"enableDiscussions",label:"💬 Discussions"},
            {key:"maintenanceMode",label:"🔧 Maintenance Mode (blocks all students)"},
          ].map(({key,label})=>(
            <label key={key} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"10px 12px",borderRadius:10,background:"var(--bg)",border:"1px solid var(--border)"}}>
              <input type="checkbox" checked={!!settings[key]} onChange={e=>setSettings({...settings,[key]:e.target.checked})} style={{width:18,height:18,accentColor:"var(--purple)"}}/>
              <span style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{label}</span>
              <span style={{marginLeft:"auto",fontSize:11,color:settings[key]?"#16a34a":"#dc2626",fontWeight:700}}>{settings[key]?"ON":"OFF"}</span>
            </label>
          ))}
        </div>
      </Card></div>
      {msg&&<div style={{margin:"12px 0"}}><Feedback msg={msg}/></div>}
      <button onClick={save} style={{...btnStyle("var(--purple)"),marginTop:12}}>💾 Save Settings</button>
    </div>
  );
}

/* ══ Motivational Quotes ════════════════════════════════════ */
function QuotesTab(){
  const [list,setList]=useState<any[]>([]);
  const [form,setForm]=useState({text:"",author:"Red Rose 🥀",lang:"bn"});
  const [msg,setMsg]=useState("");
  const load=useCallback(()=>api("/api/admin/quotes",{method:"GET"}).then(r=>r.json()).then(d=>{if(Array.isArray(d))setList(d);}),[]);
  useEffect(()=>{load();},[load]);
  async function add(){
    if(!form.text.trim()){setMsg("❌ Quote text required");return;}
    const r=await api("/api/admin/quotes",{method:"POST",body:JSON.stringify(form)});
    const d=await r.json();
    if(d.error)setMsg("❌ "+d.error);
    else{setMsg("✅ Quote added!");setForm({...form,text:"",author:"Red Rose 🥀"});load();}
  }
  async function del(id:string){
    if(!confirm("Delete this quote?"))return;
    await api(`/api/admin/quotes/${id}`,{method:"DELETE"});
    load();
  }
  return(
    <div>
      <SectionTitle>💬 Motivational Quotes</SectionTitle>
      <InfoBox>Manage quotes shown on the student dashboard. Quotes rotate every 4 hours. Add both Bangla and English quotes for variety.</InfoBox>
      <Card title="➕ Add Quote">
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <Field label="Quote Text"><textarea value={form.text} onChange={e=>setForm({...form,text:e.target.value})} rows={3} placeholder="e.g. সফলতার চাবিকাঠি হলো অধ্যবসায়।" style={{...inp,resize:"vertical"}}/></Field>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Field label="Author"><input value={form.author} onChange={e=>setForm({...form,author:e.target.value})} placeholder="e.g. Nelson Mandela" style={inp}/></Field>
            <Field label="Language"><select value={form.lang} onChange={e=>setForm({...form,lang:e.target.value})} style={inp}><option value="bn">Bangla</option><option value="en">English</option></select></Field>
          </div>
          {msg&&<Feedback msg={msg}/>}
          <button onClick={add} style={btnStyle("var(--purple)")}>Add Quote</button>
        </div>
      </Card>
      <SectionTitle style={{marginTop:24}}>All Quotes ({list.length})</SectionTitle>
      {list.length===0&&<Empty icon="💬" text="No quotes yet"/>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {list.map(q=>(
          <div key={q.id} style={{...listItem,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,color:"var(--text)",lineHeight:1.6,marginBottom:4,fontStyle:q.lang==="bn"?"normal":"italic"}}>{q.text}</div>
              <div style={{fontSize:12,color:"var(--sub)"}}>— {q.author} · <span style={{padding:"1px 6px",borderRadius:10,background:"var(--bg)",fontSize:10,fontWeight:700}}>{q.lang==="bn"?"বাংলা":"English"}</span></div>
            </div>
            <button onClick={()=>del(q.id)} style={smBtn("#dc2626")}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MODERATION TAB
══════════════════════════════════════════════════════════ */
function ModerationTab(){
  const [reports,setReports]=useState<any[]>([]);
  const [strikes,setStrikes]=useState<any[]>([]);
  const [activeView,setActiveView]=useState<"reports"|"strikes">("reports");
  const [loading,setLoading]=useState(true);
  const [msg,setMsg]=useState("");

  const load=useCallback(async()=>{
    setLoading(true);
    const [r,s]=await Promise.all([
      api("/api/admin/moderation/reports").then(r=>r.json()),
      api("/api/admin/moderation/strikes").then(r=>r.json()),
    ]);
    if(Array.isArray(r))setReports(r);
    if(Array.isArray(s))setStrikes(s);
    setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  async function takeAction(reportId:string,action:"delete"|"warn"|"ban"|"dismiss"){
    const r=await api(`/api/admin/moderation/reports/${reportId}/action`,{method:"POST",body:JSON.stringify({action})});
    const d=await r.json();
    if(d.error)setMsg("❌ "+d.error);
    else{setMsg(`✅ Action '${action}' taken`);load();}
  }
  async function addStrike(username:string,reason:string){
    const r=await api("/api/admin/moderation/strikes",{method:"POST",body:JSON.stringify({username,reason})});
    const d=await r.json();
    if(d.error)setMsg("❌ "+d.error);
    else{setMsg("✅ Strike added!");load();}
  }
  async function removeStrike(id:string){
    await api(`/api/admin/moderation/strikes/${id}`,{method:"DELETE"});
    setMsg("✅ Strike removed");load();
  }

  const pending=reports.filter(r=>r.status==="pending");
  const resolved=reports.filter(r=>r.status!=="pending");

  return(
    <div>
      <SectionTitle>🛡️ Content Moderation</SectionTitle>
      <InfoBox>Review reported content, issue strikes, and take action. 3 strikes = automatic ban recommendation. Reports come from community posts, messages, and channels.</InfoBox>

      {msg&&<div style={{margin:"0 0 12px"}}><Feedback msg={msg}/></div>}

      {/* Stats bar */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginBottom:20}}>
        {[
          {label:"Pending Reports",value:pending.length,color:"#dc2626",icon:"🚨"},
          {label:"Resolved",value:resolved.length,color:"#16a34a",icon:"✅"},
          {label:"Total Strikes",value:strikes.length,color:"#d97706",icon:"⚡"},
          {label:"Users Warned",value:[...new Set(strikes.map((s:any)=>s.username))].length,color:"#7c3aed",icon:"👤"},
        ].map(c=>(
          <div key={c.label} style={{background:"var(--surface)",borderRadius:12,padding:14,borderTop:`4px solid ${c.color}`}}>
            <div style={{fontSize:24}}>{c.icon}</div>
            <div style={{fontSize:26,fontWeight:900,color:c.color,fontFamily:"Lato,sans-serif"}}>{c.value}</div>
            <div style={{fontSize:11,color:"var(--sub)"}}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <button onClick={()=>setActiveView("reports")} style={btnStyle(activeView==="reports"?"#dc2626":"var(--border)")}>🚨 Reports ({pending.length} pending)</button>
        <button onClick={()=>setActiveView("strikes")} style={btnStyle(activeView==="strikes"?"#d97706":"var(--border)")}>⚡ Strike System ({strikes.length})</button>
      </div>

      {loading&&<Loading/>}

      {!loading&&activeView==="reports"&&(
        <div>
          {pending.length===0&&resolved.length===0&&<Empty icon="🛡️" text="No reports yet — platform is clean!"/>}
          {pending.length>0&&<>
            <h3 style={{fontSize:14,fontWeight:700,color:"#dc2626",marginBottom:10}}>🚨 Pending ({pending.length})</h3>
            {pending.map(r=>(
              <div key={r.id} style={{...listItem,borderLeft:"4px solid #dc2626"}}>
                <div style={{display:"flex",gap:10,marginBottom:10}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:4}}>
                      <span style={{fontWeight:700,color:"var(--text)"}}>{r.type||"post"} report</span>
                      <span style={{fontSize:10,padding:"2px 8px",background:"#fee2e2",color:"#991b1b",borderRadius:99,fontWeight:700}}>{r.reason||"Inappropriate"}</span>
                    </div>
                    <div style={{fontSize:13,color:"var(--sub)",marginBottom:4}}><b>Reported:</b> {r.contentPreview||r.targetId}</div>
                    <div style={{fontSize:11,color:"var(--sub)"}}>By: <b>{r.reporter}</b> · Target: <b>{r.targetUser||"unknown"}</b> · {new Date(r.ts).toLocaleString()}</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <button onClick={()=>takeAction(r.id,"delete")} style={smBtn("#dc2626")}>🗑️ Delete Content</button>
                  <button onClick={()=>{const reason=prompt("Warn reason:");if(reason){addStrike(r.targetUser,reason);takeAction(r.id,"warn");}}} style={smBtn("#d97706")}>⚡ Warn+Strike</button>
                  <button onClick={()=>takeAction(r.id,"ban")} style={smBtn("#7c3aed")}>🚫 Ban User</button>
                  <button onClick={()=>takeAction(r.id,"dismiss")} style={smBtn("#6b7280")}>✓ Dismiss</button>
                </div>
              </div>
            ))}
          </>}
          {resolved.length>0&&<>
            <h3 style={{fontSize:14,fontWeight:700,color:"var(--sub)",marginBottom:10,marginTop:20}}>✅ Resolved ({resolved.length})</h3>
            {resolved.slice(0,10).map(r=>(
              <div key={r.id} style={{...listItem,opacity:0.65}}>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontSize:11,padding:"2px 8px",background:"#dcfce7",color:"#166534",borderRadius:99,fontWeight:700}}>{r.status}</span>
                  <span style={{flex:1,fontSize:12,color:"var(--sub)"}}>{r.contentPreview||r.targetId}</span>
                  <span style={{fontSize:11,color:"var(--sub)"}}>{new Date(r.ts).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </>}
        </div>
      )}

      {!loading&&activeView==="strikes"&&(
        <div>
          <Card title="⚡ Issue a Strike">
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <input id="strike-user" placeholder="Username" style={{...inp,flex:1,minWidth:120}}/>
              <input id="strike-reason" placeholder="Reason" style={{...inp,flex:2,minWidth:160}}/>
              <button onClick={()=>{
                const u=(document.getElementById("strike-user") as HTMLInputElement)?.value;
                const r=(document.getElementById("strike-reason") as HTMLInputElement)?.value;
                if(u&&r)addStrike(u,r);
              }} style={smBtn("var(--orange)")}>Add Strike</button>
            </div>
          </Card>
          {strikes.length===0&&<Empty icon="⚡" text="No strikes issued yet"/>}
          {Object.entries(strikes.reduce((acc:any,s:any)=>{acc[s.username]=(acc[s.username]||[]);acc[s.username].push(s);return acc;},{})).map(([user,userStrikes]:any)=>(
            <div key={user} style={{...listItem,borderLeft:`4px solid ${userStrikes.length>=3?"#dc2626":userStrikes.length>=2?"#d97706":"#16a34a"}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <div style={{width:34,height:34,borderRadius:50,background:userStrikes.length>=3?"#dc2626":"#d97706",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:14}}>{user[0]?.toUpperCase()}</div>
                <div style={{flex:1}}>
                  <span style={{fontWeight:700}}>{user}</span>
                  <span style={{marginLeft:8,fontSize:10,padding:"2px 8px",background:userStrikes.length>=3?"#fee2e2":"#fef3c7",color:userStrikes.length>=3?"#991b1b":"#92400e",borderRadius:99,fontWeight:700}}>
                    {userStrikes.length} strike{userStrikes.length!==1?"s":""}  {userStrikes.length>=3?"— BAN RECOMMENDED":""}
                  </span>
                </div>
              </div>
              {userStrikes.map((s:any)=>(
                <div key={s.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",background:"var(--bg)",borderRadius:8,marginBottom:4}}>
                  <span style={{flex:1,fontSize:12,color:"var(--text)"}}>{s.reason}</span>
                  <span style={{fontSize:11,color:"var(--sub)"}}>{new Date(s.ts).toLocaleDateString()}</span>
                  <button onClick={()=>removeStrike(s.id)} style={smBtn("#dc2626")}>✕</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SOCIAL ADMIN TAB  (Groups / Channels)
══════════════════════════════════════════════════════════ */
function SocialAdminTab(){
  const [groups,setGroups]=useState<any[]>([]);
  const [channels,setChannels]=useState<any[]>([]);
  const [view,setView]=useState<"groups"|"channels">("groups");
  const [loading,setLoading]=useState(true);
  const [msg,setMsg]=useState("");

  const load=useCallback(async()=>{
    setLoading(true);
    const [g,c]=await Promise.all([
      api("/api/admin/social/groups").then(r=>r.json()),
      api("/api/admin/social/channels").then(r=>r.json()),
    ]);
    if(Array.isArray(g))setGroups(g);
    if(Array.isArray(c))setChannels(c);
    setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  async function freezeGroup(id:string,frozen:boolean){
    await api(`/api/admin/social/groups/${id}/freeze`,{method:"PATCH",body:JSON.stringify({frozen:!frozen})});
    setMsg(!frozen?"🧊 Group frozen — no new posts":"✅ Group unfrozen");load();
  }
  async function deleteGroup(id:string){
    if(!confirm("Delete this group? This cannot be undone."))return;
    await api(`/api/admin/social/groups/${id}`,{method:"DELETE"});
    setMsg("🗑️ Group deleted");load();
  }
  async function deleteChannel(id:string){
    if(!confirm("Delete this channel?"))return;
    await api(`/api/admin/social/channels/${id}`,{method:"DELETE"});
    setMsg("🗑️ Channel deleted");load();
  }

  return(
    <div>
      <SectionTitle>👥 Groups & Channels Control</SectionTitle>
      <InfoBox>Manage all community groups and channels. Freeze groups to stop new posts without deleting them. View member counts and subscriber data.</InfoBox>
      {msg&&<div style={{margin:"0 0 12px"}}><Feedback msg={msg}/></div>}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <button onClick={()=>setView("groups")} style={btnStyle(view==="groups"?"var(--purple)":"var(--border)")}>💬 Groups ({groups.length})</button>
        <button onClick={()=>setView("channels")} style={btnStyle(view==="channels"?"var(--navy)":"var(--border)")}>📡 Channels ({channels.length})</button>
      </div>
      {loading&&<Loading/>}
      {!loading&&view==="groups"&&(
        <>
          {groups.length===0&&<Empty icon="💬" text="No groups created yet"/>}
          {groups.map(g=>(
            <div key={g.id} style={{...listItem,borderLeft:g.frozen?"4px solid #60a5fa":"4px solid var(--purple)"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                <div style={{width:40,height:40,borderRadius:10,background:g.frozen?"#dbeafe":"var(--purple)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{g.icon||"💬"}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                    <span style={{fontWeight:700,color:"var(--text)"}}>{g.name}</span>
                    {g.frozen&&<span style={{fontSize:10,padding:"2px 8px",background:"#dbeafe",color:"#1e40af",borderRadius:99,fontWeight:700}}>🧊 FROZEN</span>}
                    {g.type&&<span style={{fontSize:10,padding:"2px 8px",background:"rgba(124,58,237,0.1)",color:"var(--purple)",borderRadius:99,fontWeight:700}}>{g.type}</span>}
                  </div>
                  <div style={{fontSize:12,color:"var(--sub)",marginTop:2}}>{g.description||"No description"}</div>
                  <div style={{fontSize:11,color:"var(--sub)",marginTop:4}}>👑 {g.creator} · 👥 {(g.members||[]).length} members · Created {new Date(g.createdAt).toLocaleDateString()}</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
                  <button onClick={()=>freezeGroup(g.id,g.frozen)} style={smBtn(g.frozen?"#16a34a":"#2563eb")}>{g.frozen?"▶️ Unfreeze":"🧊 Freeze"}</button>
                  <button onClick={()=>deleteGroup(g.id)} style={smBtn("#dc2626")}>🗑️ Delete</button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
      {!loading&&view==="channels"&&(
        <>
          {channels.length===0&&<Empty icon="📡" text="No channels created yet"/>}
          {channels.map(c=>(
            <div key={c.id} style={{...listItem,borderLeft:"4px solid var(--navy)"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                <div style={{width:40,height:40,borderRadius:10,background:"var(--navy)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>📡</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,color:"var(--text)"}}>{c.name}</div>
                  <div style={{fontSize:12,color:"var(--sub)",marginTop:2}}>{c.description||"No description"}</div>
                  <div style={{fontSize:11,color:"var(--sub)",marginTop:4}}>👑 {c.owner} · 👥 {(c.subscribers||[]).length} subscribers · {c.isPublic?"🌐 Public":"🔒 Private"}</div>
                </div>
                <button onClick={()=>deleteChannel(c.id)} style={smBtn("#dc2626")}>🗑️ Delete</button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ANALYTICS TAB
══════════════════════════════════════════════════════════ */
function AnalyticsTab(){
  const [stats,setStats]=useState<any>(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    api("/api/admin/analytics/stats").then(r=>r.json()).then(d=>{setStats(d);setLoading(false);});
  },[]);

  function MiniBar({value,max,color}:{value:number;max:number;color:string}){
    return(
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{flex:1,height:10,background:"var(--bg)",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${max>0?Math.round(value/max*100):0}%`,background:color,borderRadius:99,transition:"width 600ms"}}/>
        </div>
        <span style={{fontSize:12,fontWeight:700,color,minWidth:28,textAlign:"right"}}>{value}</span>
      </div>
    );
  }

  function BarChart({data,color,label}:{data:{name:string;value:number}[];color:string;label:string}){
    const max=Math.max(...data.map(d=>d.value),1);
    return(
      <div>
        <div style={{fontSize:12,fontWeight:700,color:"var(--sub)",marginBottom:8}}>{label}</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {data.map(d=>(
            <div key={d.name} style={{display:"grid",gridTemplateColumns:"80px 1fr",gap:8,alignItems:"center"}}>
              <div style={{fontSize:11,color:"var(--text)",textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</div>
              <MiniBar value={d.value} max={max} color={color}/>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if(loading)return <Loading/>;
  if(!stats)return <Empty icon="📈" text="No analytics data yet"/>;

  return(
    <div>
      <SectionTitle>📈 Analytics Dashboard</SectionTitle>
      <InfoBox>Platform usage statistics. Data is calculated in real-time from stored data files.</InfoBox>

      {/* KPI cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:12,marginBottom:24}}>
        {[
          {label:"Total Users",value:stats.totalUsers,icon:"👤",color:"var(--purple)"},
          {label:"Total Posts",value:stats.totalPosts,icon:"📝",color:"var(--navy)"},
          {label:"Total Messages",value:stats.totalMessages,icon:"💬",color:"#16a34a"},
          {label:"Active Groups",value:stats.activeGroups,icon:"👥",color:"#d97706"},
          {label:"Channels",value:stats.totalChannels,icon:"📡",color:"#0891b2"},
          {label:"Total Videos",value:stats.totalVideos,icon:"🎬",color:"#dc2626"},
          {label:"Total Quizzes",value:stats.totalQuizzes,icon:"📝",color:"var(--orange)"},
          {label:"Community Posts",value:stats.communityPosts,icon:"🌍",color:"#7c3aed"},
        ].map(c=>(
          <div key={c.label} style={{background:"var(--surface)",borderRadius:12,padding:14,borderTop:`4px solid ${c.color}`}}>
            <div style={{fontSize:22}}>{c.icon}</div>
            <div style={{fontSize:24,fontWeight:900,color:c.color,fontFamily:"Lato,sans-serif",marginTop:4}}>{c.value??0}</div>
            <div style={{fontSize:11,color:"var(--sub)",marginTop:2}}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
        <Card title="📚 Content by Subject">
          {stats.subjectBreakdown&&stats.subjectBreakdown.length>0
            ?<BarChart data={stats.subjectBreakdown} color="var(--purple)" label="Videos per subject"/>
            :<p style={{fontSize:13,color:"var(--sub)"}}>No subject data</p>}
        </Card>
        <Card title="🎯 Course Distribution">
          {stats.courseBreakdown&&stats.courseBreakdown.length>0
            ?<BarChart data={stats.courseBreakdown} color="var(--navy)" label="Videos per course"/>
            :<p style={{fontSize:13,color:"var(--sub)"}}>No course data</p>}
        </Card>
        <Card title="📊 Quiz Performance">
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:"var(--bg)",borderRadius:8}}>
              <span style={{fontSize:13,color:"var(--sub)"}}>Published Quizzes</span>
              <span style={{fontWeight:700,color:"var(--green)"}}>{stats.publishedQuizzes??0}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:"var(--bg)",borderRadius:8}}>
              <span style={{fontSize:13,color:"var(--sub)"}}>Avg Questions/Quiz</span>
              <span style={{fontWeight:700,color:"var(--purple)"}}>{stats.avgQuestionsPerQuiz??0}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:"var(--bg)",borderRadius:8}}>
              <span style={{fontSize:13,color:"var(--sub)"}}>Total Questions</span>
              <span style={{fontWeight:700,color:"var(--orange)"}}>{stats.totalQuestions??0}</span>
            </div>
          </div>
        </Card>
        <Card title="🏆 Top XP Students">
          {stats.topStudents?.map((s:any,i:number)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"1px solid var(--border)"}}>
              <span style={{fontWeight:900,color:"var(--purple)",width:24,fontSize:14}}>#{i+1}</span>
              <span style={{flex:1,fontSize:13,fontWeight:600}}>{s.displayName||s.username}</span>
              <span style={{fontSize:12,background:"#fef3c7",color:"#92400e",borderRadius:99,padding:"2px 8px",fontWeight:700}}>{s.xp??0} XP</span>
            </div>
          ))}
          {(!stats.topStudents||stats.topStudents.length===0)&&<p style={{fontSize:13,color:"var(--sub)"}}>No XP data yet</p>}
        </Card>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SECURITY TAB
══════════════════════════════════════════════════════════ */
function SecurityTab(){
  const [logs,setLogs]=useState<any[]>([]);
  const [suspicious,setSuspicious]=useState<any[]>([]);
  const [sessions,setSessions]=useState<any[]>([]);
  const [view,setView]=useState<"logs"|"suspicious"|"sessions">("logs");
  const [loading,setLoading]=useState(true);
  const [msg,setMsg]=useState("");

  const load=useCallback(async()=>{
    setLoading(true);
    const [l,s,se]=await Promise.all([
      api("/api/admin/security/logs").then(r=>r.json()),
      api("/api/admin/security/suspicious").then(r=>r.json()),
      api("/api/admin/security/sessions").then(r=>r.json()),
    ]);
    if(Array.isArray(l))setLogs(l);
    if(Array.isArray(s))setSuspicious(s);
    if(Array.isArray(se))setSessions(se);
    setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  async function forceLogout(username:string){
    await api(`/api/admin/security/sessions/${username}/logout`,{method:"DELETE"});
    setMsg(`✅ ${username} force logged out`);load();
  }

  return(
    <div>
      <SectionTitle>🔐 Security Panel</SectionTitle>
      <InfoBox>Monitor login activity, detect suspicious behavior, and manage active sessions. Force logout any user instantly.</InfoBox>
      {msg&&<div style={{margin:"0 0 12px"}}><Feedback msg={msg}/></div>}

      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        <button onClick={()=>setView("logs")} style={btnStyle(view==="logs"?"var(--navy)":"var(--border)")}>🔑 Login Logs ({logs.length})</button>
        <button onClick={()=>setView("suspicious")} style={btnStyle(view==="suspicious"?"#dc2626":"var(--border)")}>🚨 Suspicious ({suspicious.length})</button>
        <button onClick={()=>setView("sessions")} style={btnStyle(view==="sessions"?"#16a34a":"var(--border)")}>👤 Sessions ({sessions.length})</button>
      </div>

      {loading&&<Loading/>}

      {!loading&&view==="logs"&&(
        <>
          {logs.length===0&&<Empty icon="🔑" text="No login activity recorded yet"/>}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {logs.slice(0,50).map((l:any,i:number)=>(
              <div key={i} style={{...listItem,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,borderLeft:`4px solid ${l.success?"#16a34a":"#dc2626"}`}}>
                <span style={{fontSize:18}}>{l.success?"✅":"❌"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13}}>{l.username} <span style={{fontSize:11,color:"var(--sub)",fontWeight:400}}>from {l.ip||"unknown IP"}</span></div>
                  <div style={{fontSize:11,color:"var(--sub)"}}>{l.device||"Unknown device"} · {new Date(l.ts).toLocaleString()}</div>
                </div>
                <span style={{fontSize:11,padding:"2px 8px",background:l.success?"#dcfce7":"#fee2e2",color:l.success?"#166534":"#991b1b",borderRadius:99,fontWeight:700}}>{l.success?"LOGIN":"FAILED"}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading&&view==="suspicious"&&(
        <>
          {suspicious.length===0&&<Empty icon="🛡️" text="No suspicious activity detected — all clear!"/>}
          {suspicious.map((u:any,i:number)=>(
            <div key={i} style={{...listItem,borderLeft:"4px solid #dc2626"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
                    <span style={{fontWeight:700}}>{u.username}</span>
                    <span style={{fontSize:10,padding:"2px 8px",background:"#fee2e2",color:"#991b1b",borderRadius:99,fontWeight:700}}>Risk: {u.riskLevel||"medium"}</span>
                  </div>
                  <div style={{fontSize:12,color:"var(--text)",marginBottom:4}}>{u.reason}</div>
                  <div style={{fontSize:11,color:"var(--sub)"}}>Detected: {new Date(u.ts).toLocaleString()}</div>
                </div>
                <div style={{display:"flex",gap:4,flexDirection:"column"}}>
                  <button onClick={()=>forceLogout(u.username)} style={smBtn("#d97706")}>Force Logout</button>
                  <button onClick={async()=>{await api(`/api/admin/users/${u.username}/ban`,{method:"PATCH"});setMsg("🚫 User banned");load();}} style={smBtn("#dc2626")}>🚫 Ban</button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {!loading&&view==="sessions"&&(
        <>
          {sessions.length===0&&<Empty icon="👤" text="No active sessions tracked"/>}
          {sessions.map((s:any,i:number)=>(
            <div key={i} style={{...listItem,display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:36,height:36,borderRadius:50,background:"var(--purple)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:15}}>{s.username?.[0]?.toUpperCase()||"?"}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13}}>{s.username}</div>
                <div style={{fontSize:11,color:"var(--sub)"}}>{s.ip||"Unknown IP"} · Last seen {new Date(s.lastSeen||s.loginAt).toLocaleString()}</div>
              </div>
              <button onClick={()=>forceLogout(s.username)} style={smBtn("#dc2626")}>⏏ Logout</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   AI AUTOMATION TAB
══════════════════════════════════════════════════════════ */
function AiModTab(){
  const [rules,setRules]=useState<any[]>([]);
  const [scanResult,setScanResult]=useState<any>(null);
  const [scanning,setScanning]=useState(false);
  const [msg,setMsg]=useState("");
  const [form,setForm]=useState({trigger:"",condition:"",action:"warn",threshold:5});

  const load=useCallback(()=>api("/api/admin/aimod/rules").then(r=>r.json()).then(d=>{if(Array.isArray(d))setRules(d);}),[]);
  useEffect(()=>{load();},[load]);

  async function addRule(){
    if(!form.trigger||!form.condition){setMsg("❌ Trigger and condition required");return;}
    await api("/api/admin/aimod/rules",{method:"POST",body:JSON.stringify(form)});
    setMsg("✅ Auto-mod rule added!");setForm({trigger:"",condition:"",action:"warn",threshold:5});load();
  }
  async function deleteRule(id:string){
    await api(`/api/admin/aimod/rules/${id}`,{method:"DELETE"});
    setMsg("Rule removed");load();
  }
  async function runScan(){
    setScanning(true);setScanResult(null);
    const r=await api("/api/admin/aimod/scan",{method:"POST"});
    const d=await r.json();
    setScanResult(d);setScanning(false);
  }

  const TRIGGERS=["spam_messages","link_flood","rapid_posts","hate_keywords","new_user_flood","mass_reactions"];
  const ACTIONS=["warn","mute","ban","delete_content","shadow_ban"];

  return(
    <div>
      <SectionTitle>🤖 AI Auto-Moderation</SectionTitle>
      <InfoBox>Set automatic moderation rules that run in the background. The AI scanner checks for spam bots, suspicious activity, and policy violations.</InfoBox>
      {msg&&<div style={{margin:"0 0 12px"}}><Feedback msg={msg}/></div>}

      {/* Run scan */}
      <Card title="🔍 AI Safety Scan">
        <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
          <div style={{flex:1}}>
            <p style={{fontSize:13,color:"var(--sub)",margin:"0 0 10px"}}>Scan all users for suspicious behavior patterns: spam, multi-accounts, rapid posting, link floods, bot-like activity.</p>
            {scanResult&&(
              <div style={{background:"var(--bg)",borderRadius:10,padding:12}}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:8,color:"var(--text)"}}>Scan Results</div>
                <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:8}}>
                  <span style={{fontSize:12,color:"#dc2626"}}>🚨 Suspicious: <b>{scanResult.suspicious||0}</b></span>
                  <span style={{fontSize:12,color:"#d97706"}}>⚡ Warnings: <b>{scanResult.warned||0}</b></span>
                  <span style={{fontSize:12,color:"#16a34a"}}>✅ Clean: <b>{scanResult.clean||0}</b></span>
                </div>
                {scanResult.flagged?.map((f:any,i:number)=>(
                  <div key={i} style={{padding:"6px 8px",background:"rgba(220,38,38,0.08)",borderRadius:8,marginBottom:4,fontSize:12}}>
                    <b>{f.username}</b> — {f.reason} <span style={{color:"#dc2626"}}>(Risk: {f.risk})</span>
                  </div>
                ))}
                {(!scanResult.flagged||scanResult.flagged.length===0)&&<p style={{fontSize:12,color:"#16a34a"}}>✅ No suspicious users found</p>}
              </div>
            )}
          </div>
          <button onClick={runScan} disabled={scanning} style={{...btnStyle("#7c3aed"),minWidth:120,flexShrink:0}}>
            {scanning?"🔄 Scanning...":"🤖 Run Scan"}
          </button>
        </div>
      </Card>

      <div style={{marginTop:20}}>
        <Card title="⚙️ Add Auto-Mod Rule">
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Field label="Trigger Event">
                <select value={form.trigger} onChange={e=>setForm({...form,trigger:e.target.value})} style={inp}>
                  <option value="">Select trigger…</option>
                  {TRIGGERS.map(t=><option key={t} value={t}>{t.replace(/_/g," ")}</option>)}
                </select>
              </Field>
              <Field label="Auto Action">
                <select value={form.action} onChange={e=>setForm({...form,action:e.target.value})} style={inp}>
                  {ACTIONS.map(a=><option key={a} value={a}>{a.replace(/_/g," ")}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Condition / Pattern (e.g. 'sends 50+ messages in 1 minute')">
              <input value={form.condition} onChange={e=>setForm({...form,condition:e.target.value})} placeholder="e.g. user sends >50 messages per minute" style={inp}/>
            </Field>
            <Field label="Threshold (count)">
              <input type="number" value={form.threshold} onChange={e=>setForm({...form,threshold:parseInt(e.target.value)||5})} min={1} style={{...inp,width:120}}/>
            </Field>
            <button onClick={addRule} style={btnStyle("#7c3aed")}>+ Add Rule</button>
          </div>
        </Card>
      </div>

      <SectionTitle style={{marginTop:20}}>Active Rules ({rules.length})</SectionTitle>
      {rules.length===0&&<Empty icon="🤖" text="No auto-mod rules yet. Add rules above to automate moderation."/>}
      {rules.map(r=>(
        <div key={r.id} style={{...listItem,display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:4}}>
              <span style={{fontSize:11,padding:"2px 8px",background:"rgba(124,58,237,0.12)",color:"var(--purple)",borderRadius:99,fontWeight:700}}>{r.trigger?.replace(/_/g," ")}</span>
              <span style={{fontSize:11,padding:"2px 8px",background:"rgba(220,38,38,0.1)",color:"#dc2626",borderRadius:99,fontWeight:700}}>→ {r.action?.replace(/_/g," ")}</span>
            </div>
            <div style={{fontSize:12,color:"var(--text)"}}>{r.condition}</div>
            <div style={{fontSize:11,color:"var(--sub)",marginTop:2}}>Threshold: {r.threshold} · Added {new Date(r.createdAt).toLocaleDateString()}</div>
          </div>
          <button onClick={()=>deleteRule(r.id)} style={smBtn("#dc2626")}>✕</button>
        </div>
      ))}

      {/* Preset rules */}
      <SectionTitle style={{marginTop:20}}>💡 Quick Preset Rules</SectionTitle>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
        {[
          {trigger:"spam_messages",condition:"User sends >50 messages per minute",action:"mute",threshold:50},
          {trigger:"link_flood",condition:"User posts >5 links in 30 seconds",action:"warn",threshold:5},
          {trigger:"rapid_posts",condition:"User creates >10 posts in 10 minutes",action:"shadow_ban",threshold:10},
          {trigger:"new_user_flood",condition:"New account <24h sending bulk messages",action:"ban",threshold:20},
        ].map((preset,i)=>(
          <div key={i} style={{background:"var(--bg)",borderRadius:10,padding:12,border:"1.5px dashed var(--border)"}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--purple)",marginBottom:4}}>{preset.trigger.replace(/_/g," ")}</div>
            <div style={{fontSize:11,color:"var(--text)",marginBottom:6}}>{preset.condition}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:10,color:"#dc2626",fontWeight:700}}>→ {preset.action.replace(/_/g," ")}</span>
              <button onClick={()=>{api("/api/admin/aimod/rules",{method:"POST",body:JSON.stringify(preset)}).then(()=>{setMsg("✅ Preset rule added!");load();});}} style={smBtn("#7c3aed")}>+ Add</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   LOGS TAB
══════════════════════════════════════════════════════════ */
function LogsTab(){
  const [logs,setLogs]=useState<any[]>([]);
  const [filter,setFilter]=useState<"all"|"admin"|"user"|"error">("all");
  const [search,setSearch]=useState("");
  const [loading,setLoading]=useState(true);
  const [msg,setMsg]=useState("");

  const load=useCallback(()=>{
    setLoading(true);
    api("/api/admin/logs").then(r=>r.json()).then(d=>{if(Array.isArray(d))setLogs(d);setLoading(false);});
  },[]);
  useEffect(()=>{load();},[load]);

  async function clearLogs(){
    if(!confirm("Clear all activity logs? This cannot be undone."))return;
    await api("/api/admin/logs",{method:"DELETE"});
    setMsg("✅ Logs cleared");load();
  }

  const filtered=logs.filter(l=>{
    if(filter!=="all"&&l.type!==filter)return false;
    if(search&&!JSON.stringify(l).toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });

  const TYPE_COLORS:Record<string,string>={admin:"#4f8ef7",user:"#16a34a",error:"#dc2626",system:"#d97706"};
  const TYPE_ICONS:Record<string,string>={admin:"🛡️",user:"👤",error:"❌",system:"⚙️"};

  return(
    <div>
      <SectionTitle>📋 Activity Logs</SectionTitle>
      <InfoBox>Full audit trail of all admin actions, user activities, and system events. Use this to debug issues and track who did what.</InfoBox>
      {msg&&<div style={{margin:"0 0 12px"}}><Feedback msg={msg}/></div>}

      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14,alignItems:"center"}}>
        {(["all","admin","user","error"] as const).map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={smBtn(filter===f?"var(--purple)":"#888")}>{f.toUpperCase()}</button>
        ))}
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search logs…" style={{...inp,flex:1,minWidth:160,maxWidth:300}}/>
        <button onClick={clearLogs} style={smBtn("#dc2626")}>🗑️ Clear All</button>
        <button onClick={load} style={smBtn("var(--navy)")}>🔄 Refresh</button>
      </div>

      <div style={{fontSize:12,color:"var(--sub)",marginBottom:10}}>{filtered.length} entries</div>

      {loading&&<Loading/>}
      {!loading&&filtered.length===0&&<Empty icon="📋" text="No logs matching filter"/>}
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        {filtered.slice(0,100).map((l:any,i:number)=>(
          <div key={i} style={{background:"var(--surface)",borderRadius:8,padding:"8px 12px",display:"flex",gap:10,alignItems:"flex-start",borderLeft:`3px solid ${TYPE_COLORS[l.type]||"var(--border)"}`}}>
            <span style={{fontSize:14,flexShrink:0,marginTop:1}}>{TYPE_ICONS[l.type]||"📝"}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,color:"var(--text)",lineHeight:1.4}}><b>{l.actor||"system"}</b> · {l.action}</div>
              {l.details&&<div style={{fontSize:11,color:"var(--sub)",marginTop:2,wordBreak:"break-word"}}>{typeof l.details==="string"?l.details:JSON.stringify(l.details)}</div>}
            </div>
            <div style={{fontSize:10,color:"var(--sub)",flexShrink:0,textAlign:"right",whiteSpace:"nowrap"}}>
              <div style={{marginBottom:2,padding:"1px 6px",background:TYPE_COLORS[l.type]||"var(--border)",color:"#fff",borderRadius:99,fontWeight:700,fontSize:9}}>{l.type||"log"}</div>
              {new Date(l.ts).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ROLES TAB
══════════════════════════════════════════════════════════ */
function RolesTab(){
  const [roles,setRoles]=useState<any[]>([]);
  const [msg,setMsg]=useState("");
  const [form,setForm]=useState({name:"",description:"",permissions:{canBan:false,canDelete:false,canViewChats:false,canBroadcast:false,canManageContent:false,canViewAnalytics:false,isFullAdmin:false}});
  const [editing,setEditing]=useState<string|null>(null);

  const load=useCallback(()=>api("/api/admin/roles").then(r=>r.json()).then(d=>{if(Array.isArray(d))setRoles(d);}),[]);
  useEffect(()=>{load();},[load]);

  async function saveRole(){
    if(!form.name.trim()){setMsg("❌ Role name required");return;}
    const isEdit=editing!==null;
    const r=isEdit
      ?await api(`/api/admin/roles/${editing}`,{method:"PUT",body:JSON.stringify(form)})
      :await api("/api/admin/roles",{method:"POST",body:JSON.stringify(form)});
    const d=await r.json();
    if(d.error)setMsg("❌ "+d.error);
    else{setMsg(isEdit?"✅ Role updated!":"✅ Role created!");setEditing(null);setForm({name:"",description:"",permissions:{canBan:false,canDelete:false,canViewChats:false,canBroadcast:false,canManageContent:false,canViewAnalytics:false,isFullAdmin:false}});load();}
  }
  async function deleteRole(id:string){
    if(!confirm("Delete this role?"))return;
    await api(`/api/admin/roles/${id}`,{method:"DELETE"});
    setMsg("✅ Role deleted");load();
  }

  const PERMS=[
    {key:"isFullAdmin",label:"Full Admin Access",icon:"👑",color:"#dc2626"},
    {key:"canBan",label:"Can Ban/Mute Users",icon:"🚫",color:"#d97706"},
    {key:"canDelete",label:"Can Delete Content",icon:"🗑️",color:"#7c3aed"},
    {key:"canViewChats",label:"Can View Reported Chats",icon:"💬",color:"#0891b2"},
    {key:"canBroadcast",label:"Can Send Broadcasts",icon:"📢",color:"#16a34a"},
    {key:"canManageContent",label:"Can Manage Content",icon:"📚",color:"var(--orange)"},
    {key:"canViewAnalytics",label:"Can View Analytics",icon:"📈",color:"var(--purple)"},
  ];

  const PRESETS=[
    {name:"Super Admin",description:"Full platform control",permissions:{canBan:true,canDelete:true,canViewChats:true,canBroadcast:true,canManageContent:true,canViewAnalytics:true,isFullAdmin:true}},
    {name:"Moderator",description:"Content moderation only",permissions:{canBan:true,canDelete:true,canViewChats:true,canBroadcast:false,canManageContent:false,canViewAnalytics:false,isFullAdmin:false}},
    {name:"Content Manager",description:"Manage educational content",permissions:{canBan:false,canDelete:false,canViewChats:false,canBroadcast:false,canManageContent:true,canViewAnalytics:true,isFullAdmin:false}},
    {name:"Support Staff",description:"Help users, no ban power",permissions:{canBan:false,canDelete:false,canViewChats:true,canBroadcast:true,canManageContent:false,canViewAnalytics:false,isFullAdmin:false}},
  ];

  return(
    <div>
      <SectionTitle>🎭 Admin Roles & Permissions</SectionTitle>
      <InfoBox>Create granular roles for your admin team. Each role has specific permissions — Super Admin has full access, while Moderators and Support only have what they need.</InfoBox>
      {msg&&<div style={{margin:"0 0 12px"}}><Feedback msg={msg}/></div>}

      {/* Quick presets */}
      <SectionTitle>⚡ Quick Presets</SectionTitle>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10,marginBottom:20}}>
        {PRESETS.map((p,i)=>(
          <div key={i} style={{background:"var(--bg)",borderRadius:10,padding:12,border:"1.5px dashed var(--border)",cursor:"pointer"}}
            onClick={()=>setForm({...form,name:p.name,description:p.description,permissions:p.permissions})}>
            <div style={{fontWeight:700,fontSize:14,color:"var(--purple)",marginBottom:4}}>{p.name}</div>
            <div style={{fontSize:12,color:"var(--sub)",marginBottom:8}}>{p.description}</div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {Object.entries(p.permissions).filter(([,v])=>v).map(([k])=>(
                <span key={k} style={{fontSize:9,padding:"1px 5px",background:"rgba(124,58,237,0.1)",color:"var(--purple)",borderRadius:99,fontWeight:700}}>{k.replace("can","").toLowerCase()}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Card title={editing?"✏️ Edit Role":"➕ Create Role"}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Field label="Role Name"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Moderator" style={inp}/></Field>
            <Field label="Description"><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="e.g. Content moderation" style={inp}/></Field>
          </div>
          <Field label="Permissions">
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:6}}>
              {PERMS.map(p=>(
                <label key={p.key} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,background:"var(--bg)",border:`1.5px solid ${form.permissions[p.key as keyof typeof form.permissions]?p.color:"var(--border)"}`,cursor:"pointer",transition:"border-color 150ms"}}>
                  <input type="checkbox" checked={!!form.permissions[p.key as keyof typeof form.permissions]}
                    onChange={e=>setForm({...form,permissions:{...form.permissions,[p.key]:e.target.checked}})}
                    style={{width:15,height:15,accentColor:p.color}}/>
                  <span style={{fontSize:14}}>{p.icon}</span>
                  <span style={{fontSize:11,fontWeight:600,color:"var(--text)"}}>{p.label}</span>
                </label>
              ))}
            </div>
          </Field>
          <div style={{display:"flex",gap:8}}>
            <button onClick={saveRole} style={{...btnStyle("var(--purple)"),flex:1}}>{editing?"💾 Update Role":"➕ Create Role"}</button>
            {editing&&<button onClick={()=>{setEditing(null);setForm({name:"",description:"",permissions:{canBan:false,canDelete:false,canViewChats:false,canBroadcast:false,canManageContent:false,canViewAnalytics:false,isFullAdmin:false}});}} style={btnStyle("var(--orange)")}>Cancel</button>}
          </div>
        </div>
      </Card>

      <SectionTitle style={{marginTop:20}}>All Roles ({roles.length})</SectionTitle>
      {roles.length===0&&<Empty icon="🎭" text="No custom roles yet. Create one above or use a preset."/>}
      {roles.map(r=>(
        <div key={r.id} style={{...listItem,borderLeft:r.permissions?.isFullAdmin?"4px solid #dc2626":"4px solid var(--purple)"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4}}>
                <span style={{fontWeight:700,fontSize:15,color:"var(--text)"}}>{r.name}</span>
                {r.permissions?.isFullAdmin&&<span style={{fontSize:10,padding:"2px 8px",background:"#fee2e2",color:"#991b1b",borderRadius:99,fontWeight:700}}>👑 FULL ADMIN</span>}
              </div>
              {r.description&&<div style={{fontSize:12,color:"var(--sub)",marginBottom:6}}>{r.description}</div>}
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {Object.entries(r.permissions||{}).filter(([,v])=>v).map(([k])=>(
                  <span key={k} style={{fontSize:10,padding:"2px 8px",background:"rgba(124,58,237,0.1)",color:"var(--purple)",borderRadius:99,fontWeight:700}}>{k.replace("can","✓ ").toLowerCase()}</span>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:4,flexShrink:0}}>
              <button onClick={()=>{setEditing(r.id);setForm({name:r.name,description:r.description||"",permissions:r.permissions||{}});}} style={smBtn("var(--navy)")}>✎ Edit</button>
              <button onClick={()=>deleteRole(r.id)} style={smBtn("#dc2626")}>✕</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
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
