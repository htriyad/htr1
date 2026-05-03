import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { X, Menu } from "lucide-react";
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

const SIDEBAR_ITEMS = [
  { label: "Dashboard",        icon: "⊞",  path: "/" },
  { label: "Course & Content", icon: "📚", path: "/courses" },
  { label: "Past Classes",     icon: "🎬", path: "/past-classes" },
  { label: "Live Class",       icon: "👨‍🏫", path: "/live-class" },
  { label: "Solve Sheet",      icon: "📋", path: "/solve-sheet" },
  { label: "Live Exam",        icon: "📝", path: "/exams" },
  { label: "Practice Exam",    icon: "💻", path: "/exams" },
  { label: "AI Tutor",         icon: "🤖", path: "/ai-tutor" },
  { label: "Q&A Service",      icon: "💬", path: "/ask" },
  { label: "Discussion Group", icon: "👥", path: "/discussion" },
  { label: "My Progress",      icon: "📊", path: "/profile" },
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

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen]         = useState(false);
  const [, navigate]                          = useLocation();
  const [menu, setMenu]                       = useState<MenuItem[]>([]);
  const [liveClasses, setLiveClasses]         = useState<LiveClass[]>([]);
  const [announcements, setAnnouncements]     = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds]       = useState<string[]>([]);
  const now = useNow();

  const load = useCallback(() => {
    const h = authHdr();
    fetch("/api/dashboard-menu", { headers: h })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (Array.isArray(d) && d.length) setMenu(d.filter((x:MenuItem)=>x.path && x.path !== "/"||true)); })
      .catch(() => {});

    fetch("/api/live-classes", { headers: h })
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setLiveClasses(d); })
      .catch(() => {});

    fetch("/api/announcements", { headers: h })
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setAnnouncements(d); })
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

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
    { label:"AI Tutor", icon:"🤖", bg:"#ede9fe", chevron:"#7c3aed", path:"/ai-tutor" },
    { label:"Past Classes", icon:"🎬", bg:"#fff3e0", chevron:"#e65100", path:"/past-classes" },
    { label:"Live Class", icon:"👨‍🏫", bg:"#e8f5e9", chevron:"#e53935", path:"/live-class" },
    { label:"Live Exam", icon:"📝", bg:"#e3f2fd", chevron:"#2e7d32", path:"/exams" },
    { label:"Practice Exam", icon:"💻", bg:"#fff3e0", chevron:"#2e7d32", path:"/exams" },
    { label:"Solve Sheet", icon:"📋", bg:"#f3e5f5", chevron:"#7b2fa5", path:"/solve-sheet" },
    { label:"Q&A Service", icon:"💬", bg:"#e0f7fa", chevron:"#2e7d32", path:"/ask" },
    { label:"Discussion", icon:"👥", bg:"#e8f5e9", chevron:"#2e7d32", path:"/discussion" },
    { label:"My Progress", icon:"🏆", bg:"#fef3c7", chevron:"#d97706", path:"/profile" },
    { label:"Leaderboard", icon:"🥇", bg:"#fee2e2", chevron:"#dc2626", path:"/leaderboard" },
  ];

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
              <span style={{ color:"#e53935" }}>Red</span>
              <span style={{ color:"#c0392b" }}>Rose</span>
              <span style={{ marginLeft:2 }}>🥀</span>
              <div className="uu-logo-sub">Online Care</div>
            </div>
            <div className="uu-avatar" style={{ marginLeft:"auto" }}>R</div>
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

        {/* Announcements */}
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

        {/* Live class widget */}
        {nextClass && (
          <div style={{ margin:"12px 14px 0", borderRadius:16, overflow:"hidden", boxShadow:"0 4px 16px rgba(0,0,0,0.12)" }}>
            {/* Thumbnail */}
            <div style={{ position:"relative" }}>
              <img src={`https://img.youtube.com/vi/${nextClass.youtubeId}/hqdefault.jpg`} alt={nextClass.title}
                style={{ width:"100%", aspectRatio:"16/6", objectFit:"cover", display:"block" }} />
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.75))" }} />
              <div style={{ position:"absolute", top:10, left:10, display:"flex", gap:6 }}>
                {nextClass.isLive
                  ? <span style={{ padding:"4px 10px", borderRadius:20, background:"#dc2626", color:"#fff", fontSize:11, fontWeight:800 }}>🔴 LIVE NOW</span>
                  : <span style={{ padding:"4px 10px", borderRadius:20, background:"rgba(0,0,0,0.6)", color:"#fff", fontSize:11, fontWeight:700 }}>📅 Upcoming</span>
                }
              </div>
              <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"8px 14px" }}>
                <div style={{ fontSize:14, fontWeight:800, color:"#fff", lineHeight:1.3 }}>{nextClass.title}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.8)" }}>{nextClass.subject} {nextClass.teacherName && `· ${nextClass.teacherName}`}</div>
              </div>
            </div>
            {/* Countdown / join row */}
            <div style={{ background: nextClass.isLive ? "#dc2626" : "var(--purple)", padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.8)" }}>
                  {nextClass.isLive ? "Class is live!" : "Starting in"}
                </div>
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

        {/* Purple download banner */}
        <div className="dash-banner" style={{ margin: nextClass || visibleAnnouncements.length > 0 ? "12px 14px 0" : undefined }}>
          <h3>Download App</h3>
          <a className="dash-download-btn" href="#" onClick={(e) => e.preventDefault()}>
            <span>Download Now</span>
            <span>🤖</span>
          </a>
        </div>

        {/* Quick access strips */}
        <div style={{ display:"flex", gap:8, margin:"14px 14px 0", overflowX:"auto", paddingBottom:4 }}>
          {[
            { icon:"📋", label:"Solve Sheets", path:"/solve-sheet", bg:"#f3e5f5", color:"#7b2fa5" },
            { icon:"👨‍🏫", label:"Live Class",  path:"/live-class",  bg:"#e8f5e9", color:"#2e7d32" },
            { icon:"💬", label:"Q&A",          path:"/ask",          bg:"#e0f7fa", color:"#0097a7" },
            { icon:"👥", label:"Discuss",      path:"/discussion",   bg:"#ede9fe", color:"#7c3aed" },
          ].map(q => (
            <button key={q.label} onClick={() => navigate(q.path)}
              style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"10px 14px", borderRadius:14, background:q.bg, border:"none", cursor:"pointer" }}>
              <span style={{ fontSize:22 }}>{q.icon}</span>
              <span style={{ fontSize:11, fontWeight:700, color:q.color, whiteSpace:"nowrap" }}>{q.label}</span>
            </button>
          ))}
        </div>

        {/* Menu items */}
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
        <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"var(--surface)", borderTop:"1px solid var(--border)", display:"flex", justifyContent:"space-around", padding:"8px 0 max(8px, env(safe-area-inset-bottom))", zIndex:100, boxShadow:"0 -2px 12px rgba(0,0,0,0.08)" }}>
          {[
            { icon:"🏠", label:"Home",    path:"/" },
            { icon:"📋", label:"Sheets",  path:"/solve-sheet" },
            { icon:"👨‍🏫", label:"Live",    path:"/live-class" },
            { icon:"💬", label:"Q&A",     path:"/ask" },
            { icon:"👤", label:"Profile", path:"/profile" },
          ].map(item => (
            <button key={item.label} onClick={() => navigate(item.path)}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2, background:"none", border:"none", cursor:"pointer", padding:"4px 8px" }}>
              <span style={{ fontSize:20 }}>{item.icon}</span>
              <span style={{ fontSize:10, color:"var(--sub)", fontWeight:600 }}>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Bottom padding for nav bar */}
        <div style={{ height:72 }} />
      </div>
    </div>
  );
}
