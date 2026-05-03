import { useEffect, useState } from "react";
import Header from "../components/Header";

const USER_TOKEN_KEY = "rr_user_token";
function authHdr(): HeadersInit {
  const t = localStorage.getItem(USER_TOKEN_KEY) || "";
  return t ? { Authorization: `Bearer ${t}` } : {};
}

interface LiveClass {
  id: string; title: string; subject: string; teacherName: string;
  youtubeId: string; scheduledAt: string; durationMinutes: number;
  description?: string; createdAt: string;
}

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return now;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "NOW";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-BD", {
      weekday:"short", day:"2-digit", month:"short",
      hour:"2-digit", minute:"2-digit", hour12:true
    });
  } catch { return iso; }
}

function getStatus(c: LiveClass, now: number): "upcoming"|"live"|"ended" {
  const start = new Date(c.scheduledAt).getTime();
  const end   = start + c.durationMinutes * 60_000;
  if (now < start - 600_000) return "upcoming";
  if (now < end)             return "live";
  return "ended";
}

export default function LiveClasses() {
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<"all"|"upcoming"|"live"|"ended">("all");
  const now = useNow();

  useEffect(() => {
    fetch("/api/live-classes", { headers: authHdr() })
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setClasses(d); })
      .finally(() => setLoading(false));
  }, []);

  const classified = classes.map(c => ({ ...c, status: getStatus(c, now) }));
  const liveNow    = classified.filter(c => c.status === "live");
  const upcoming   = classified.filter(c => c.status === "upcoming").sort((a,b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const ended      = classified.filter(c => c.status === "ended").sort((a,b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const shown = filter === "all"     ? [...liveNow, ...upcoming, ...ended]
              : filter === "live"    ? liveNow
              : filter === "upcoming"? upcoming
              : ended;

  return (
    <div style={{ minHeight:"100svh", background:"var(--bg)" }}>
      <Header showBack backTo="/" />
      <div style={{ padding:"16px 14px", maxWidth:640, margin:"0 auto" }}>
        {/* Hero */}
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>👨‍🏫</div>
          <h1 style={{ fontSize:22, fontWeight:900, color:"var(--purple)", fontFamily:"Lato,sans-serif", margin:0 }}>Live Classes</h1>
          <p style={{ fontSize:13, color:"var(--sub)", marginTop:4 }}>Join live sessions & watch recorded classes</p>
        </div>

        {/* Live now banner */}
        {liveNow.length > 0 && (
          <div style={{ background:"linear-gradient(135deg,#dc2626,#b91c1c)", borderRadius:16, padding:"14px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:12, height:12, borderRadius:"50%", background:"#fff", animation:"pulse 1s infinite", flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:900, color:"#fff" }}>🔴 {liveNow.length} class{liveNow.length>1?"es":""} LIVE right now!</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.8)", marginTop:2 }}>{liveNow[0].title}</div>
            </div>
            <a href={`https://youtube.com/watch?v=${liveNow[0].youtubeId}`} target="_blank" rel="noopener noreferrer"
              style={{ padding:"8px 16px", borderRadius:10, background:"#fff", color:"#dc2626", fontWeight:800, fontSize:12, textDecoration:"none", flexShrink:0 }}>
              Join Now
            </a>
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display:"flex", gap:8, marginBottom:16, overflowX:"auto" }}>
          {([["all","All"],["live","🔴 Live"],["upcoming","📅 Upcoming"],["ended","🔁 Recorded"]] as const).map(([id,label]) => (
            <button key={id} onClick={() => setFilter(id)}
              style={{ flexShrink:0, padding:"7px 14px", borderRadius:20, border:"none", cursor:"pointer", fontSize:12, fontWeight:700,
                background: filter===id ? "var(--purple)" : "var(--surface)",
                color: filter===id ? "#fff" : "var(--text)" }}>
              {label}
            </button>
          ))}
        </div>

        {loading && <div style={{ textAlign:"center", padding:40, color:"var(--sub)" }}>Loading…</div>}

        {!loading && shown.length === 0 && (
          <div style={{ textAlign:"center", padding:48 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📺</div>
            <div style={{ color:"var(--sub)", fontSize:14 }}>No classes in this category yet.</div>
          </div>
        )}

        {shown.map(cls => {
          const start = new Date(cls.scheduledAt).getTime();
          const msLeft = start - now;
          const isLive = cls.status === "live";
          const isUpcoming = cls.status === "upcoming";
          const isEnded = cls.status === "ended";

          return (
            <div key={cls.id} style={{
              background:"var(--surface)", borderRadius:16, marginBottom:12, overflow:"hidden",
              boxShadow:"0 3px 12px rgba(0,0,0,0.08)",
              border: isLive ? "2px solid #dc2626" : "none",
            }}>
              {/* YouTube thumbnail */}
              <div style={{ position:"relative" }}>
                <img src={`https://img.youtube.com/vi/${cls.youtubeId}/hqdefault.jpg`}
                  alt={cls.title}
                  style={{ width:"100%", aspectRatio:"16/9", objectFit:"cover", display:"block" }} />
                {/* Status badge */}
                <div style={{ position:"absolute", top:10, left:10, padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:800,
                  background: isLive?"#dc2626": isUpcoming?"#d97706":"rgba(0,0,0,0.7)",
                  color:"#fff" }}>
                  {isLive ? "🔴 LIVE" : isUpcoming ? "📅 Upcoming" : "📼 Recorded"}
                </div>
                {/* Duration */}
                <div style={{ position:"absolute", bottom:10, right:10, background:"rgba(0,0,0,0.75)", color:"#fff", fontSize:11, padding:"2px 8px", borderRadius:8 }}>
                  {cls.durationMinutes} min
                </div>
              </div>

              <div style={{ padding:"12px 14px" }}>
                <div style={{ fontSize:15, fontWeight:800, color:"var(--text)", marginBottom:4, lineHeight:1.4 }}>{cls.title}</div>
                <div style={{ fontSize:12, color:"var(--sub)", marginBottom:8 }}>
                  {cls.subject && <span style={{ background:"var(--bg)", padding:"2px 8px", borderRadius:20, marginRight:6, fontWeight:600 }}>{cls.subject}</span>}
                  {cls.teacherName && <span>👨‍🏫 {cls.teacherName}</span>}
                </div>
                <div style={{ fontSize:12, color:"var(--sub)", marginBottom:10 }}>
                  🗓 {formatDate(cls.scheduledAt)}
                </div>
                {cls.description && (
                  <div style={{ fontSize:12, color:"var(--sub)", lineHeight:1.6, marginBottom:10 }}>{cls.description}</div>
                )}

                {/* Countdown / join */}
                {isUpcoming && (
                  <div style={{ background:"#fef3c7", borderRadius:10, padding:"8px 12px", display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                    <span style={{ fontSize:16 }}>⏰</span>
                    <div>
                      <div style={{ fontSize:11, color:"#92400e", fontWeight:600 }}>Starting in</div>
                      <div style={{ fontSize:18, fontWeight:900, color:"#92400e", fontFamily:"monospace" }}>
                        {formatCountdown(msLeft)}
                      </div>
                    </div>
                  </div>
                )}

                <a href={`https://youtube.com/watch?v=${cls.youtubeId}`} target="_blank" rel="noopener noreferrer"
                  style={{ display:"block", textAlign:"center", padding:"10px 0", borderRadius:12, fontWeight:800, fontSize:14, textDecoration:"none",
                    background: isLive?"#dc2626": isUpcoming?"var(--purple)":"var(--bg)",
                    color: isLive||isUpcoming?"#fff":"var(--sub)" }}>
                  {isLive ? "🔴 Join Live Now" : isUpcoming ? "🔔 Set Reminder" : "▶ Watch Recording"}
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
