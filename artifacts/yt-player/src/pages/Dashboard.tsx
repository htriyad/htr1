import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { X, Menu, Search } from "lucide-react";
import Header from "../components/Header";

const USER_TOKEN_KEY = "rr_user_token";
function authHdr(): HeadersInit {
  const t = localStorage.getItem(USER_TOKEN_KEY) || "";
  return t ? { Authorization: `Bearer ${t}` } : {};
}

interface MenuItem {
  id?: string; label: string; icon: string; bg: string; chevron: string; path: string;
}
interface LiveClass {
  id: string; title: string; subject: string; youtubeId: string;
  scheduledAt: string; durationMinutes: number; teacherName?: string;
}
interface Announcement {
  id: string; title: string; body: string;
  type: "info"|"warning"|"success"|"urgent"; pinned: boolean; createdAt: string;
}
interface DailyChallenge {
  id: string; text: string;
  options: { id: string; text: string }[];
  correct: string; solution?: string; quizTitle: string;
}
interface SearchResult {
  videos: { id:string; title:string; subjectId:string; videoId:string }[];
  sheets: { id:string; title:string; subject:string; exam:string }[];
  discussions: { id:string; title:string; body:string }[];
}
interface ExamDate { id:string; title:string; exam:string; date:string; color:string; }
interface Gamer    { xp:number; level:number; streak:number; totalExams:number; totalCorrect:number; totalAnswers:number; }

const SIDEBAR_ITEMS = [
  { label: "Dashboard",        icon: "⊞",  path: "/" },
  { label: "Course & Content", icon: "📚", path: "/courses" },
  { label: "Past Classes",     icon: "🎬", path: "/past-classes" },
  { label: "Live Class",       icon: "👨‍🏫", path: "/live-class" },
  { label: "Solve Sheet",      icon: "📋", path: "/solve-sheet" },
  { label: "Flashcards",       icon: "🃏", path: "/flashcards" },
  { label: "Study Timer",      icon: "⏱",  path: "/study-timer" },
  { label: "Study Analytics",  icon: "📊", path: "/analytics" },
  { label: "Study Planner",    icon: "📅", path: "/planner" },
  { label: "Notes",            icon: "📝", path: "/notes" },
  { label: "Formulas",         icon: "∑",  path: "/formulas" },
  { label: "Tools",            icon: "🔢", path: "/tools" },
  { label: "Past Papers",      icon: "📄", path: "/papers" },
  { label: "Live Exam",        icon: "📝", path: "/exams" },
  { label: "🧠 Smart Quiz",    icon: "🧠", path: "/smart-quiz" },
  { label: "🗺️ Study Roadmap", icon: "🗺️", path: "/roadmap" },
  { label: "🔐 Memory Vault",  icon: "🔐", path: "/vault" },
  { label: "🌀 Knowledge Fractal", icon: "🌀", path: "/fractal" },
  { label: "AI Tutor",         icon: "🤖", path: "/ai-tutor" },
  { label: "Q&A Service",      icon: "💬", path: "/ask" },
  { label: "Group Study Rooms",icon: "🏠", path: "/study-room" },
  { label: "Discussion Group", icon: "👥", path: "/discussion" },
  { label: "Leaderboard",      icon: "🥇", path: "/leaderboard" },
];

const ANNOUNCE_COLORS: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  info:    { bg:"#eff6ff", border:"#bfdbfe", icon:"ℹ️",  text:"#1e40af" },
  warning: { bg:"#fffbeb", border:"#fde68a", icon:"⚠️",  text:"#92400e" },
  success: { bg:"#f0fdf4", border:"#bbf7d0", icon:"✅",  text:"#166534" },
  urgent:  { bg:"#fef2f2", border:"#fecaca", icon:"🚨",  text:"#991b1b" },
};

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "LIVE NOW";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${String(sec).padStart(2,"0")}s`;
}

/* ══ Live Study Rooms Widget ══════════════════════════════ */
function LiveRoomsWidget() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [, navigate] = useLocation();
  useEffect(()=>{
    fetch("/api/study-rooms").then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setRooms(d.slice(0,6)); }).catch(()=>{});
    const t = setInterval(()=>{
      fetch("/api/study-rooms").then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setRooms(d.slice(0,6)); }).catch(()=>{});
    }, 10000);
    return () => clearInterval(t);
  },[]);
  if (rooms.length === 0) return null;
  const COLORS: Record<string,string> = {
    Physics:"#3b82f6",Chemistry:"#8b5cf6",Biology:"#10b981",Math:"#f59e0b",
    English:"#06b6d4",Bangla:"#ec4899",ICT:"#6366f1",General:"#64748b",
    History:"#a16207",Geography:"#0891b2","BCS Prep":"#dc2626","Admission":"#7c3aed",
  };
  function av(u:string){ const hues=[210,262,142,38,190,330,24,0,280,168]; return `hsl(${hues[u.charCodeAt(0)%hues.length]},65%,52%)`; }
  return (
    <div style={{padding:"12px 0 0 14px"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,paddingRight:14}}>
        <div style={{fontSize:10,fontWeight:800,color:"var(--sub)",letterSpacing:"0.1em",flex:1}}>🏠 LIVE STUDY ROOMS</div>
        <button onClick={()=>navigate("/study-room")} style={{background:"none",border:"none",color:"var(--purple)",fontSize:11,fontWeight:700,cursor:"pointer",padding:0}}>See all →</button>
      </div>
      <div style={{display:"flex",gap:10,overflowX:"auto",paddingRight:14,paddingBottom:4,scrollbarWidth:"none"}}>
        {rooms.map(room=>{
          const color = COLORS[room.subject]||"#64748b";
          const online = (room.onlineMembers||[]).length;
          return (
            <div key={room.id} onClick={()=>navigate(`/study-room/${room.id}`)}
              style={{flexShrink:0,width:160,background:"var(--surface)",borderRadius:14,padding:12,
                border:`1.5px solid ${color}40`,cursor:"pointer",boxShadow:`0 2px 10px ${color}12`,
                transition:"transform 120ms"}}
              className="sr-lobby-card-hover">
              {/* Header */}
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}>
                <div style={{width:32,height:32,borderRadius:9,background:`${color}20`,border:`1px solid ${color}44`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>📚</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,fontWeight:800,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{room.name}</div>
                  <div style={{fontSize:9,padding:"1px 6px",borderRadius:20,background:`${color}18`,color,fontWeight:700,display:"inline-block",marginTop:1}}>{room.subject}</div>
                </div>
              </div>
              {/* Online avatars */}
              <div style={{display:"flex",alignItems:"center",marginBottom:8}}>
                <div style={{display:"flex",flexDirection:"row"}}>
                  {room.members.slice(0,5).map((m:string,i:number)=>(
                    <div key={m} style={{marginLeft:i===0?0:-7,zIndex:10-i,width:22,height:22,borderRadius:6,
                      background:av(m),border:"2px solid var(--surface)",
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:"#fff"}}>
                      {m[0].toUpperCase()}
                    </div>
                  ))}
                </div>
                {room.members.length>5 && <span style={{fontSize:9,color:"var(--sub)",marginLeft:4}}>+{room.members.length-5}</span>}
              </div>
              {/* Footer */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:10,color:online>0?"#22c55e":"var(--sub)",fontWeight:700}}>
                  {online>0?`● ${online} online`:`${room.members.length} members`}
                </span>
                {room.timerState?.running && <span style={{fontSize:9,padding:"2px 6px",borderRadius:20,background:"rgba(108,127,255,0.15)",color:"var(--purple)",fontWeight:700}}>⏱</span>}
              </div>
            </div>
          );
        })}
        {/* Create room CTA */}
        <div onClick={()=>navigate("/study-room")}
          style={{flexShrink:0,width:120,background:"var(--surface)",borderRadius:14,padding:12,
            border:"1.5px dashed var(--border)",cursor:"pointer",display:"flex",flexDirection:"column",
            alignItems:"center",justifyContent:"center",gap:6,minHeight:100}}>
          <div style={{fontSize:26}}>＋</div>
          <div style={{fontSize:11,fontWeight:700,color:"var(--sub)",textAlign:"center",lineHeight:1.3}}>Create<br/>a Room</div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [, navigate]                      = useLocation();
  const [menu, setMenu]                   = useState<MenuItem[]>([]);
  const [liveClasses, setLiveClasses]     = useState<LiveClass[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds]   = useState<string[]>([]);
  const [challenge, setChallenge]         = useState<DailyChallenge|null>(null);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [picked, setPicked]               = useState<string|null>(null);
  const [searchQ, setSearchQ]             = useState("");
  const [searchRes, setSearchRes]         = useState<SearchResult|null>(null);
  const [searchOpen, setSearchOpen]       = useState(false);
  const searchRef                         = useRef<HTMLDivElement>(null);
  const searchTimer                       = useRef<ReturnType<typeof setTimeout>|null>(null);
  const now                               = useNow();
  const [examDates, setExamDates]         = useState<ExamDate[]>([]);
  const [gamer, setGamer]                 = useState<Gamer|null>(null);
  const [quote, setQuote]                 = useState<{text:string;author:string}|null>(null);
  const [goalTarget, setGoalTarget]       = useState<number>(()=>Number(localStorage.getItem("rr_daily_goal_q")||20));
  const [goalDone, setGoalDone]           = useState<number>(()=>Number(localStorage.getItem(`rr_goal_done_${new Date().toDateString()}`)||0));
  const [quoteVisible, setQuoteVisible]   = useState(true);
  const [editingGoal, setEditingGoal]     = useState(false);
  const [goalInput, setGoalInput]         = useState("");

  // Load stored challenge state
  useEffect(() => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem("rr_challenge_" + today);
    if (stored) { try { setPicked(JSON.parse(stored)); } catch {} }
  }, []);

  const load = useCallback(() => {
    const h = authHdr();
    fetch("/api/dashboard-menu", { headers: h })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (Array.isArray(d) && d.length) setMenu(d); })
      .catch(() => {});

    fetch("/api/live-classes", { headers: h })
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setLiveClasses(d); })
      .catch(() => {});

    fetch("/api/announcements", { headers: h })
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setAnnouncements(d); })
      .catch(() => {});

    fetch("/api/daily-challenge", { headers: h })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.id) setChallenge(d); })
      .catch(() => {});

    fetch("/api/exam-dates")
      .then(r=>r.json())
      .then(d=>{ if(Array.isArray(d)) setExamDates(d); })
      .catch(()=>{});

    const username = localStorage.getItem("rr_username")||"";
    if (username) {
      fetch("/api/gamification/me", { headers:{"x-username":username} })
        .then(r=>r.json())
        .then(d=>{ if(d&&(d.level||d.xp>=0)) setGamer(d); })
        .catch(()=>{});
    }

    fetch("/api/motivational-quote")
      .then(r=>r.json())
      .then(d=>{ if(d&&d.text) setQuote(d); })
      .catch(()=>{});
  }, []);

  useEffect(() => { load(); }, [load]);

  // Close search on outside click
  useEffect(() => {
    if (!searchOpen) return;
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchOpen]);

  // Debounced search
  function handleSearch(q: string) {
    setSearchQ(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.length < 2) { setSearchRes(null); return; }
    searchTimer.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { headers: authHdr() })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setSearchRes(d); })
        .catch(() => {});
    }, 300);
  }

  function pickAnswer(optId: string) {
    if (picked) return;
    setPicked(optId);
    const today = new Date().toDateString();
    try { localStorage.setItem("rr_challenge_" + today, JSON.stringify(optId)); } catch {}
  }

  // Find next upcoming / live class
  const nextClass = liveClasses
    .map(c => {
      const start = new Date(c.scheduledAt).getTime();
      const end   = start + c.durationMinutes * 60_000;
      const isLive = now >= start && now < end;
      const isUpcoming = now < start;
      return { ...c, start, end, isLive, isUpcoming };
    })
    .filter(c => c.isLive || c.isUpcoming)
    .sort((a,b) => a.start - b.start)[0];

  const visibleAnnouncements = announcements.filter(a => !dismissedIds.includes(a.id)).slice(0, 3);

  const displayMenu = menu.length > 0 ? menu : [
    { label:"AI Tutor",      icon:"🤖", bg:"#ede9fe", chevron:"#7c3aed", path:"/ai-tutor" },
    { label:"Past Classes",  icon:"🎬", bg:"#fff3e0", chevron:"#e65100", path:"/past-classes" },
    { label:"Live Class",    icon:"👨‍🏫", bg:"#e8f5e9", chevron:"#e53935", path:"/live-class" },
    { label:"Flashcards",    icon:"🃏", bg:"#ede9fe", chevron:"#7c3aed", path:"/flashcards" },
    { label:"Study Timer",   icon:"⏱",  bg:"#fef3c7", chevron:"#d97706", path:"/study-timer" },
    { label:"Live Exam",     icon:"📝", bg:"#e3f2fd", chevron:"#2e7d32", path:"/exams" },
    { label:"Practice Exam", icon:"💻", bg:"#fff3e0", chevron:"#2e7d32", path:"/exams" },
    { label:"Solve Sheet",   icon:"📋", bg:"#f3e5f5", chevron:"#7b2fa5", path:"/solve-sheet" },
    { label:"Community",     icon:"🌐", bg:"#ede9fe", chevron:"#7c3aed", path:"/community" },
    { label:"Messages",      icon:"💬", bg:"#e0f7fa", chevron:"#0ea5e9", path:"/messages" },
    { label:"Mod Panel",     icon:"🛡️", bg:"#f3e5f5", chevron:"#7c3aed", path:"/mod-login" },
    { label:"Q&A Service",   icon:"❓", bg:"#fef3c7", chevron:"#d97706", path:"/ask" },
    { label:"Discussion",    icon:"👥", bg:"#e8f5e9", chevron:"#2e7d32", path:"/discussion" },
    { label:"My Progress",   icon:"🏆", bg:"#fff3e0", chevron:"#d97706", path:"/profile" },
    { label:"Leaderboard",   icon:"🥇", bg:"#fee2e2", chevron:"#dc2626", path:"/leaderboard" },
  ];

  const totalSearchResults = searchRes
    ? searchRes.videos.length + searchRes.sheets.length + searchRes.discussions.length
    : 0;

  return (
    <div style={{ background:"var(--bg)", minHeight:"100svh" }}>
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar drawer */}
      {sidebarOpen && (
        <nav className="sidebar">
          <div className="sidebar-header">
            <button className="uu-header-icon-btn" onClick={() => setSidebarOpen(false)} aria-label="Close">
              <X size={22} />
            </button>
            <div className="uu-logo-text">
              <span style={{ color:"#4f8ef7", fontWeight:900 }}>HTR</span>
              <span style={{ color:"var(--text)", fontWeight:800 }}> Zone</span>
              <div className="uu-logo-sub" style={{ fontSize:9, letterSpacing:"0.04em" }}>EXAM PORTAL</div>
            </div>
            <div className="uu-avatar" style={{ marginLeft:"auto", background:"linear-gradient(135deg,#1d4ed8,#6c7fff)" }}>H</div>
          </div>
          {SIDEBAR_ITEMS.map((item) => (
            <button key={item.label} className="sidebar-item"
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}>
              <span style={{ fontSize:20 }}>{item.icon}</span>
              <span className="sidebar-item-label">{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      <div className="page">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* ── GLOBAL SEARCH BAR ─────────────────────── */}
        <div style={{ padding:"10px 14px 0" }} ref={searchRef}>
          <div className="dash-search-wrap">
            <Search size={16} className="dash-search-icon" color="#888" />
            <input
              className="dash-search-input"
              placeholder="Search videos, sheets, discussions..."
              value={searchQ}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => setSearchOpen(true)}
            />
            {searchQ && (
              <button className="dash-search-clear" onClick={() => { setSearchQ(""); setSearchRes(null); }}>✕</button>
            )}
          </div>

          {/* Search results dropdown */}
          {searchOpen && searchRes && totalSearchResults > 0 && (
            <div className="dash-search-results">
              {searchRes.videos.length > 0 && (
                <div className="dash-search-group">
                  <div className="dash-search-group-title">🎬 Videos</div>
                  {searchRes.videos.map(v => (
                    <button key={v.id} className="dash-search-item" onClick={() => { navigate(`/watch/${v.id}`); setSearchOpen(false); setSearchQ(""); }}>
                      <span className="dash-search-item-icon">🎬</span>
                      <span>{v.title}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchRes.sheets.length > 0 && (
                <div className="dash-search-group">
                  <div className="dash-search-group-title">📋 Solve Sheets</div>
                  {searchRes.sheets.map(s => (
                    <button key={s.id} className="dash-search-item" onClick={() => { navigate("/solve-sheet"); setSearchOpen(false); setSearchQ(""); }}>
                      <span className="dash-search-item-icon">📋</span>
                      <span>{s.title}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchRes.discussions.length > 0 && (
                <div className="dash-search-group">
                  <div className="dash-search-group-title">💬 Discussions</div>
                  {searchRes.discussions.map(d => (
                    <button key={d.id} className="dash-search-item" onClick={() => { navigate("/discussion"); setSearchOpen(false); setSearchQ(""); }}>
                      <span className="dash-search-item-icon">💬</span>
                      <span>{d.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {searchOpen && searchQ.length >= 2 && searchRes && totalSearchResults === 0 && (
            <div className="dash-search-results">
              <div style={{ padding:"20px", textAlign:"center", color:"var(--sub)", fontSize:13 }}>
                No results for "{searchQ}"
              </div>
            </div>
          )}
        </div>

        {/* ── QUICK STATS BAR ───────────────────────── */}
        {gamer !== null && (
          <div className="dash-stats-bar" onClick={()=>navigate("/analytics")} style={{cursor:"pointer"}}>
            <div className="dash-stat-chip" style={{borderColor:"#dc2626"}}>
              <span className="dash-stat-icon">{(gamer.streak||0)>=7?"🔥":"📅"}</span>
              <span className="dash-stat-val">{gamer.streak||0}</span>
              <span className="dash-stat-lbl">day streak</span>
            </div>
            <div className="dash-stat-chip" style={{borderColor:"#d97706"}}>
              <span className="dash-stat-icon">⚡</span>
              <span className="dash-stat-val">{gamer.xp||0}</span>
              <span className="dash-stat-lbl">XP</span>
            </div>
            <div className="dash-stat-chip" style={{borderColor:"var(--green)"}}>
              <span className="dash-stat-icon">🎯</span>
              <span className="dash-stat-val">{gamer.totalAnswers>0?Math.round((gamer.totalCorrect/gamer.totalAnswers)*100):0}%</span>
              <span className="dash-stat-lbl">accuracy</span>
            </div>
            <div className="dash-stat-chip" style={{borderColor:"var(--purple)"}}>
              <span className="dash-stat-icon">📊</span>
              <span className="dash-stat-val">Lv.{gamer.level||1}</span>
              <span className="dash-stat-lbl">level</span>
            </div>
            <div className="dash-stat-chip" style={{borderColor:"#2563eb"}}>
              <span className="dash-stat-icon">📝</span>
              <span className="dash-stat-val">{gamer.totalExams||0}</span>
              <span className="dash-stat-lbl">exams</span>
            </div>
          </div>
        )}

        {/* ── LIVE STUDY ROOMS ─────────────────────── */}
        <LiveRoomsWidget />

        {/* ── EXAM COUNTDOWN ROW ────────────────────── */}
        {examDates.filter(e=>new Date(e.date).getTime()>now).length > 0 && (
          <div style={{padding:"10px 0 0 14px"}}>
            <div style={{fontSize:10,fontWeight:800,color:"var(--sub)",letterSpacing:"0.1em",marginBottom:7}}>📅 UPCOMING EXAMS</div>
            <div style={{display:"flex",gap:8,overflowX:"auto",paddingRight:14,paddingBottom:4}}>
              {examDates
                .filter(e=>new Date(e.date).getTime()>now)
                .sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime())
                .slice(0,6)
                .map(e=>{
                  const ms=new Date(e.date).getTime()-now;
                  const days=Math.floor(ms/86400000);
                  const hrs=Math.floor((ms%86400000)/3600000);
                  const urgent=days<=7;
                  return (
                    <div key={e.id} onClick={()=>navigate("/planner")}
                      style={{flexShrink:0,background:"var(--surface)",borderRadius:12,padding:"10px 14px",border:`2px solid ${e.color||"#dc2626"}`,cursor:"pointer",textAlign:"center",minWidth:90,boxShadow:urgent?`0 2px 12px ${e.color||"#dc2626"}33`:"none"}}>
                      <div style={{fontSize:10,fontWeight:800,color:e.color||"#dc2626",letterSpacing:"0.07em",marginBottom:3}}>{e.exam}</div>
                      <div style={{fontSize:22,fontWeight:900,color:"var(--text)",fontFamily:"Lato,sans-serif",lineHeight:1}}>
                        {days>0?`${days}d`:`${hrs}h`}
                      </div>
                      <div style={{fontSize:9,color:"var(--sub)",marginTop:3,maxWidth:80,lineHeight:1.3}}>{e.title.slice(0,18)}</div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ── MOTIVATIONAL QUOTE ────────────────────── */}
        {quote && quoteVisible && (
          <div style={{margin:"10px 14px 0",padding:"10px 14px",borderRadius:12,background:"linear-gradient(135deg,rgba(108,127,255,0.08),rgba(79,98,232,0.06))",border:"1px solid rgba(108,127,255,0.18)",display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:18,flexShrink:0}}>💬</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:"var(--text)",lineHeight:1.5}}>{quote.text}</div>
              <div style={{fontSize:10,color:"var(--sub)",marginTop:2}}>— {quote.author}</div>
            </div>
            <button onClick={()=>setQuoteVisible(false)} style={{background:"none",border:"none",color:"var(--sub)",cursor:"pointer",fontSize:14,flexShrink:0,padding:0}}>✕</button>
          </div>
        )}

        {/* ── ANNOUNCEMENTS ─────────────────────────── */}
        {visibleAnnouncements.map(ann => {
          const c = ANNOUNCE_COLORS[ann.type] || ANNOUNCE_COLORS.info;
          return (
            <div key={ann.id} style={{ margin:"8px 14px 0", padding:"10px 14px", borderRadius:12, background:c.bg, border:`1.5px solid ${c.border}`, display:"flex", gap:10, alignItems:"flex-start" }}>
              <span style={{ fontSize:16, flexShrink:0 }}>{c.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:c.text, marginBottom:2 }}>{ann.title}</div>
                <div style={{ fontSize:12, color:c.text, opacity:0.85, lineHeight:1.5 }}>{ann.body}</div>
              </div>
              <button onClick={() => setDismissedIds(p => [...p, ann.id])}
                style={{ flexShrink:0, background:"none", border:"none", color:c.text, cursor:"pointer", fontSize:16, opacity:0.6, padding:0 }}>
                ✕
              </button>
            </div>
          );
        })}

        {/* ── LIVE CLASS WIDGET ─────────────────────── */}
        {nextClass && (
          <div style={{ margin:"12px 14px 0", borderRadius:16, overflow:"hidden", boxShadow:"0 4px 16px rgba(0,0,0,0.12)" }}>
            <div style={{ position:"relative" }}>
              <img src={`https://img.youtube.com/vi/${nextClass.youtubeId}/hqdefault.jpg`} alt={nextClass.title}
                style={{ width:"100%", aspectRatio:"16/6", objectFit:"cover", display:"block" }} />
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.75))" }} />
              <div style={{ position:"absolute", top:10, left:10 }}>
                {nextClass.isLive
                  ? <span className="live-badge-pulse">🔴 LIVE NOW</span>
                  : <span style={{ padding:"4px 10px", borderRadius:20, background:"rgba(0,0,0,0.6)", color:"#fff", fontSize:11, fontWeight:700 }}>📅 Upcoming</span>
                }
              </div>
              <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"8px 14px" }}>
                <div style={{ fontSize:14, fontWeight:800, color:"#fff", lineHeight:1.3 }}>{nextClass.title}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.8)" }}>{nextClass.subject} {nextClass.teacherName && `· ${nextClass.teacherName}`}</div>
              </div>
            </div>
            <div style={{ background: nextClass.isLive ? "#dc2626" : "var(--purple)", padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.8)" }}>{nextClass.isLive ? "Class is live!" : "Starting in"}</div>
                <div style={{ fontSize:20, fontWeight:900, color:"#fff", fontFamily:"monospace", lineHeight:1.2 }}>
                  {formatCountdown(nextClass.start - now)}
                </div>
              </div>
              <a href={`https://youtube.com/watch?v=${nextClass.youtubeId}`} target="_blank" rel="noopener noreferrer"
                style={{ padding:"9px 20px", borderRadius:12, background:"#fff", color: nextClass.isLive?"#dc2626":"var(--purple)", fontWeight:900, fontSize:13, textDecoration:"none", flexShrink:0 }}>
                {nextClass.isLive ? "Join Now ▶" : "View →"}
              </a>
            </div>
          </div>
        )}

        {/* ── DAILY MCQ CHALLENGE ───────────────────── */}
        {challenge && (
          <div className="dash-challenge-card">
            <div className="dash-challenge-header">
              <span className="dash-challenge-badge">⚡ Daily Challenge</span>
              <span className="dash-challenge-from">{challenge.quizTitle}</span>
            </div>
            <p className="dash-challenge-q">{challenge.text}</p>

            {!challengeOpen && !picked && (
              <button className="dash-challenge-open-btn" onClick={() => setChallengeOpen(true)}>
                Answer Today's Question →
              </button>
            )}

            {(challengeOpen || picked) && (
              <div className="dash-challenge-options">
                {challenge.options.map(opt => {
                  const isCorrect = opt.id === challenge.correct;
                  const isPicked  = opt.id === picked;
                  let style: React.CSSProperties = {};
                  if (picked) {
                    if (isCorrect)      style = { background:"#dcfce7", border:"2px solid #16a34a", color:"#166534" };
                    else if (isPicked)  style = { background:"#fee2e2", border:"2px solid #dc2626", color:"#991b1b" };
                    else                style = { opacity:0.5 };
                  }
                  return (
                    <button key={opt.id} className="dash-challenge-opt" style={style} onClick={() => pickAnswer(opt.id)} disabled={!!picked}>
                      {picked && isCorrect && <span>✅ </span>}
                      {picked && isPicked && !isCorrect && <span>❌ </span>}
                      {opt.text}
                    </button>
                  );
                })}
                {picked && challenge.solution && (
                  <div className="dash-challenge-solution">
                    <strong>💡 Solution:</strong> {challenge.solution}
                  </div>
                )}
                {picked && (
                  <div style={{ textAlign:"center", fontSize:13, color:"var(--sub)", marginTop:8 }}>
                    {picked === challenge.correct ? "🎉 Correct! Come back tomorrow for a new challenge." : "📖 Keep studying! Try again tomorrow."}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STUDY GOAL RING ───────────────────────── */}
        <div style={{margin:"12px 14px 0",background:"var(--surface)",borderRadius:14,padding:"14px 16px",border:"1px solid var(--border)",display:"flex",alignItems:"center",gap:14}}>
          {(() => {
            const pct = Math.min(1, goalTarget>0?goalDone/goalTarget:0);
            const r=28; const circ=2*Math.PI*r;
            const done = goalDone>=goalTarget && goalTarget>0;
            return (
              <>
                <div style={{position:"relative",width:70,height:70,flexShrink:0}}>
                  <svg width={70} height={70} viewBox="0 0 70 70">
                    <circle cx={35} cy={35} r={r} fill="none" stroke="rgba(108,127,255,0.15)" strokeWidth={7}/>
                    <circle cx={35} cy={35} r={r} fill="none" stroke={done?"var(--green)":"var(--purple)"} strokeWidth={7}
                      strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ*(1-pct)}
                      transform="rotate(-90 35 35)" style={{transition:"stroke-dashoffset 600ms ease"}}/>
                  </svg>
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:done?"var(--green)":"var(--purple)",fontFamily:"monospace"}}>
                    {Math.round(pct*100)}%
                  </div>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:"var(--text)",marginBottom:3}}>📋 Today's Study Goal</div>
                  {!editingGoal ? (
                    <>
                      <div style={{fontSize:14,fontWeight:900,color:"var(--text)",marginBottom:4}}>
                        {goalDone} <span style={{fontSize:11,color:"var(--sub)",fontWeight:400}}>/ {goalTarget} questions</span>
                      </div>
                      <div style={{fontSize:11,color:done?"var(--green)":"var(--sub)"}}>{done?"🎉 Goal completed!":"Keep going — answer more questions!"}</div>
                    </>
                  ) : (
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <input type="number" value={goalInput} onChange={e=>setGoalInput(e.target.value)} min={1} max={200}
                        style={{width:60,padding:"4px 8px",borderRadius:6,border:"1px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13}}/>
                      <button onClick={()=>{const v=Math.max(1,Number(goalInput)||20);setGoalTarget(v);localStorage.setItem("rr_daily_goal_q",String(v));setEditingGoal(false);}}
                        style={{padding:"4px 10px",borderRadius:6,background:"var(--purple)",color:"#fff",border:"none",fontSize:11,fontWeight:700,cursor:"pointer"}}>Save</button>
                      <button onClick={()=>setEditingGoal(false)} style={{padding:"4px 8px",borderRadius:6,background:"var(--border)",border:"none",color:"var(--sub)",fontSize:11,cursor:"pointer"}}>Cancel</button>
                    </div>
                  )}
                </div>
                {!editingGoal && (
                  <button onClick={()=>{setEditingGoal(true);setGoalInput(String(goalTarget));}}
                    style={{background:"none",border:"none",color:"var(--sub)",cursor:"pointer",fontSize:13,flexShrink:0}}>✏️</button>
                )}
              </>
            );
          })()}
        </div>

        {/* ── HERO BANNER ───────────────────────────── */}
        <div className="dash-banner" style={{ margin: nextClass || visibleAnnouncements.length > 0 || challenge ? "12px 14px 0" : "14px 14px 0" }}>
          <h3>Red Rose 🥀</h3>
          <p style={{ fontSize:12, opacity:0.85, marginBottom:12 }}>SSC · HSC · Admission · BCS</p>
          <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
            <a className="dash-download-btn" href="#" onClick={e=>{e.preventDefault();navigate("/flashcards");}}>🃏 Flashcards</a>
            <a className="dash-download-btn" href="#" onClick={e=>{e.preventDefault();navigate("/study-timer");}}>⏱ Timer</a>
            <a className="dash-download-btn" href="#" onClick={e=>{e.preventDefault();navigate("/analytics");}}>📊 Analytics</a>
            <a className="dash-download-btn" href="#" onClick={e=>{e.preventDefault();navigate("/tools");}}>🔢 Tools</a>
          </div>
        </div>

        {/* ── QUICK ACCESS STRIP ───────────────────── */}
        <div className="dash-quick-strip">
          {[
            { icon:"🧠", label:"Smart Quiz",  path:"/smart-quiz",  bg:"linear-gradient(135deg,#ede9fe,#fce7f3)", color:"#7c3aed" },
            { icon:"🗺️", label:"Roadmap",    path:"/roadmap",     bg:"linear-gradient(135deg,#dcfce7,#dbeafe)", color:"#16a34a" },
            { icon:"🔐", label:"Vault",      path:"/vault",       bg:"linear-gradient(135deg,#fef3c7,#fee2e2)", color:"#d97706" },
            { icon:"🌀", label:"Fractal",    path:"/fractal",     bg:"linear-gradient(135deg,#ede9fe,#e0f2fe)", color:"#4f46e5" },
            { icon:"🃏", label:"Flashcards", path:"/flashcards",  bg:"#ede9fe", color:"#7c3aed" },
            { icon:"⏱",  label:"Timer",      path:"/study-timer", bg:"#fef3c7", color:"#d97706" },
            { icon:"📊", label:"Analytics",  path:"/analytics",   bg:"#dbeafe", color:"#2563eb" },
            { icon:"📅", label:"Planner",    path:"/planner",     bg:"#dcfce7", color:"#16a34a" },
            { icon:"∑",  label:"Formulas",   path:"/formulas",    bg:"#fce7f3", color:"#db2777" },
            { icon:"🔢", label:"Tools",      path:"/tools",       bg:"#f3e5f5", color:"#7b2fa5" },
            { icon:"📄", label:"Papers",     path:"/papers",       bg:"#e0f7fa", color:"#0097a7" },
            { icon:"📝", label:"Notes",      path:"/notes",        bg:"#fff7ed", color:"#ea580c" },
            { icon:"⚡", label:"Battle Quiz",path:"/battle-quiz",   bg:"linear-gradient(135deg,#ede9fe,#fce7f3)", color:"#7c3aed" },
            { icon:"📖", label:"Vocabulary", path:"/vocab",         bg:"linear-gradient(135deg,#dbeafe,#ede9fe)", color:"#1d4ed8" },
            { icon:"🎯", label:"Focus Room", path:"/focus-room",    bg:"linear-gradient(135deg,#fef3c7,#ede9fe)", color:"#7c3aed" },
            { icon:"🏠", label:"Study Room", path:"/study-room",    bg:"linear-gradient(135deg,#dcfce7,#dbeafe)", color:"#16a34a" },
          ].map(q => (
            <button key={q.label} onClick={() => navigate(q.path)} className="dash-quick-item"
              style={{ background:q.bg }}>
              <span style={{ fontSize:22 }}>{q.icon}</span>
              <span style={{ fontSize:10, fontWeight:700, color:q.color, whiteSpace:"nowrap" }}>{q.label}</span>
            </button>
          ))}
        </div>

        {/* ── MENU ITEMS ───────────────────────────── */}
        <div className="dash-menu">
          {displayMenu.map((item) => (
            <button key={item.id || item.label} className="dash-menu-item"
              onClick={() => { if (item.path && item.path !== "/") navigate(item.path); }}>
              <div className="dash-menu-icon" style={{ background: item.bg }}>
                <span style={{ fontSize:20 }}>{item.icon}</span>
              </div>
              <span className="dash-menu-label">{item.label}</span>
              <span className="dash-chevron" style={{ color: item.chevron }}>›</span>
            </button>
          ))}
        </div>

        {/* Footer nav bar */}
        <div className="dash-bottom-nav">
          {[
            { icon:"🏠", label:"Home",      path:"/" },
            { icon:"🌐", label:"Community", path:"/community" },
            { icon:"💬", label:"Messages",  path:"/messages" },
            { icon:"❓", label:"Q&A",       path:"/ask" },
            { icon:"👤", label:"Profile",   path:"/profile" },
          ].map(item => (
            <button key={item.label} onClick={() => navigate(item.path)} className="dash-bottom-nav-item">
              <span style={{ fontSize:20 }}>{item.icon}</span>
              <span style={{ fontSize:10, fontWeight:600 }}>{item.label}</span>
            </button>
          ))}
        </div>

        <div style={{ height:72 }} />
      </div>
    </div>
  );
}
