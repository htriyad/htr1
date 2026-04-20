import { useState } from "react";

const USER_TOKEN_KEY = "rr_user_token";
const USER_NAME_KEY  = "rr_username";

interface Props { ip: string }

export default function IpGate({ ip }: Props) {
  const [view, setView]       = useState<"gate"|"login">("gate");
  const [msg, setMsg]         = useState("");
  const [sent, setSent]       = useState(false);
  const [username, setUname]  = useState("");
  const [password, setPass]   = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loading, setLoad]    = useState(false);

  async function sendMsg() {
    if (!msg.trim()) return;
    setLoad(true);
    try {
      await fetch("/api/message", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({message:msg}) });
      setSent(true);
    } finally { setLoad(false); }
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoad(true); setLoginErr("");
    try {
      const r = await fetch("/api/user/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({username:username.trim(),password}) });
      const d = await r.json();
      if (d.token) {
        localStorage.setItem(USER_TOKEN_KEY, d.token);
        localStorage.setItem(USER_NAME_KEY, d.username);
        window.location.reload();
      } else {
        setLoginErr(d.error || "Login failed");
      }
    } catch { setLoginErr("Connection error. Try again."); }
    finally { setLoad(false); }
  }

  return (
    <div style={{ minHeight:"100svh", background:"var(--bg)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px 16px" }}>
      {/* Logo */}
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <div style={{ fontSize:52 }}>🥀</div>
        <h1 style={{ fontSize:26, fontWeight:900, color:"var(--purple)", marginTop:8, fontFamily:"Lato,sans-serif" }}>RedRose</h1>
        <p style={{ fontSize:13, color:"var(--sub)", marginTop:4 }}>Online Care</p>
      </div>

      <div style={{ background:"var(--surface)", borderRadius:16, padding:24, width:"100%", maxWidth:420, boxShadow:"0 4px 24px rgba(0,0,0,0.10)" }}>

        {/* ── TAB TOGGLE ───────────────────── */}
        <div style={{ display:"flex", borderRadius:10, overflow:"hidden", border:"1.5px solid var(--border)", marginBottom:20 }}>
          {(["gate","login"] as const).map(v => (
            <button key={v} onClick={() => { setView(v); setLoginErr(""); }}
              style={{ flex:1, padding:"10px 0", border:"none", fontWeight:700, fontSize:13, cursor:"pointer", background: view===v ? "var(--purple)" : "transparent", color: view===v ? "#fff" : "var(--sub)", fontFamily:"Roboto,sans-serif" }}>
              {v==="gate" ? "📨 Request Access" : "🔑 Student Login"}
            </button>
          ))}
        </div>

        {/* ── REQUEST ACCESS ───────────────── */}
        {view === "gate" && !sent && (
          <>
            <h2 style={{ fontSize:17, fontWeight:700, color:"var(--text)", marginBottom:6, fontFamily:"Lato,sans-serif" }}>Access Restricted 🔒</h2>
            <p style={{ fontSize:13, color:"var(--sub)", marginBottom:16, lineHeight:1.6 }}>
              Send a message to the admin to request access. Your IP is included automatically.
            </p>
            <div style={{ background:"var(--bg)", borderRadius:8, padding:"8px 12px", marginBottom:14 }}>
              <span style={{ fontSize:11, color:"var(--sub)" }}>Your IP: </span>
              <code style={{ fontSize:12, fontWeight:700, color:"var(--purple)" }}>{ip}</code>
            </div>
            <textarea value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Write your message to the admin..." rows={4}
              style={{ width:"100%", padding:12, borderRadius:10, border:"1.5px solid var(--border)", background:"var(--bg)", color:"var(--text)", fontSize:14, resize:"vertical", fontFamily:"Roboto,'Noto Sans Bengali',sans-serif", outline:"none", marginBottom:14 }} />
            <button onClick={sendMsg} disabled={loading||!msg.trim()}
              style={{ width:"100%", padding:13, borderRadius:12, border:"none", background:!msg.trim()||loading?"var(--border)":"var(--purple)", color:"#fff", fontWeight:700, fontSize:15, cursor:!msg.trim()||loading?"not-allowed":"pointer", fontFamily:"Roboto,sans-serif" }}>
              {loading ? "Sending..." : "Send Request 📨"}
            </button>
          </>
        )}
        {view === "gate" && sent && (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
            <h2 style={{ fontSize:17, fontWeight:700, color:"var(--text)", marginBottom:8, fontFamily:"Lato,sans-serif" }}>Request Sent!</h2>
            <p style={{ fontSize:14, color:"var(--sub)", lineHeight:1.7 }}>Your message has been sent.<br/>Once approved, refresh this page.</p>
            <button onClick={() => window.location.reload()}
              style={{ marginTop:20, padding:"10px 24px", borderRadius:10, border:"1.5px solid var(--purple)", background:"transparent", color:"var(--purple)", fontWeight:700, fontSize:14, cursor:"pointer" }}>
              Refresh Page
            </button>
          </div>
        )}

        {/* ── STUDENT LOGIN ────────────────── */}
        {view === "login" && (
          <form onSubmit={login} style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <h2 style={{ fontSize:17, fontWeight:700, color:"var(--text)", marginBottom:4, fontFamily:"Lato,sans-serif" }}>Student Login 🎓</h2>
              <p style={{ fontSize:13, color:"var(--sub)" }}>Universal account — access from any device.</p>
            </div>
            <input value={username} onChange={e=>setUname(e.target.value)} placeholder="Username" autoComplete="username"
              style={inp} />
            <input type="password" value={password} onChange={e=>setPass(e.target.value)} placeholder="Password" autoComplete="current-password"
              style={inp} />
            {loginErr && <p style={{ color:"var(--orange)", fontSize:13, margin:0 }}>{loginErr}</p>}
            <button type="submit" disabled={loading||!username.trim()||!password.trim()}
              style={{ padding:13, borderRadius:12, border:"none", background:!username.trim()||!password.trim()||loading?"var(--border)":"var(--purple)", color:"#fff", fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:"Roboto,sans-serif" }}>
              {loading ? "Logging in..." : "Login →"}
            </button>
          </form>
        )}
      </div>

      <p style={{ marginTop:20, fontSize:12, color:"var(--sub)" }}>RedRose🥀 — Access by invitation only</p>
    </div>
  );
}

const inp: React.CSSProperties = {
  padding:"11px 14px", borderRadius:10, border:"1.5px solid var(--border)",
  background:"var(--bg)", color:"var(--text)", fontSize:14,
  width:"100%", outline:"none", fontFamily:"Roboto,'Noto Sans Bengali',sans-serif",
};
