import { useState } from "react";
import { useLocation } from "wouter";

const MOD_TOKEN_KEY = "rr_mod_token";
const MOD_ROLE_KEY  = "rr_mod_role";
const MOD_NAME_KEY  = "rr_mod_username";

export function getModToken()    { return sessionStorage.getItem(MOD_TOKEN_KEY) || ""; }
export function getModRole()     { return sessionStorage.getItem(MOD_ROLE_KEY)  || ""; }
export function getModUsername() { return sessionStorage.getItem(MOD_NAME_KEY)  || ""; }
export function modHeaders() {
  const t = getModToken();
  return t ? { "Content-Type":"application/json","x-mod-token":t } : { "Content-Type":"application/json" };
}

export default function ModLogin() {
  const [,navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!username.trim() || !password) return;
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/mod/login", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Login failed"); return; }
      sessionStorage.setItem(MOD_TOKEN_KEY, d.token);
      sessionStorage.setItem(MOD_ROLE_KEY,  d.role);
      sessionStorage.setItem(MOD_NAME_KEY,  d.username);
      navigate("/mod");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:"100svh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
      <div style={{ width:"100%",maxWidth:400 }}>
        {/* Header */}
        <div style={{ textAlign:"center",marginBottom:32 }}>
          <div style={{ fontSize:52,marginBottom:10 }}>🛡️</div>
          <h1 style={{ fontSize:26,fontWeight:900,color:"var(--text)",margin:0,letterSpacing:"-0.5px" }}>
            Moderator Login
          </h1>
          <p style={{ color:"var(--sub)",fontSize:14,marginTop:8,margin:"8px 0 0" }}>
            HTR Zone Community Control Panel
          </p>
        </div>

        {/* Card */}
        <div style={{ background:"var(--surface)",borderRadius:20,padding:28,border:"1.5px solid var(--border)",boxShadow:"0 8px 40px rgba(0,0,0,0.15)" }}>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12,fontWeight:700,color:"var(--sub)",letterSpacing:"0.05em",display:"block",marginBottom:6 }}>MODERATOR ID</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your mod username"
              onKeyDown={e => e.key==="Enter" && login()}
              style={{ width:"100%",padding:"12px 16px",borderRadius:12,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:15,fontFamily:"inherit",boxSizing:"border-box",outline:"none" }}
            />
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:12,fontWeight:700,color:"var(--sub)",letterSpacing:"0.05em",display:"block",marginBottom:6 }}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              onKeyDown={e => e.key==="Enter" && login()}
              style={{ width:"100%",padding:"12px 16px",borderRadius:12,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:15,fontFamily:"inherit",boxSizing:"border-box",outline:"none" }}
            />
          </div>

          {error && (
            <div style={{ padding:"10px 14px",borderRadius:10,background:"#fee2e2",color:"#dc2626",fontSize:13,fontWeight:700,marginBottom:16 }}>
              ⚠ {error}
            </div>
          )}

          <button onClick={login} disabled={loading || !username.trim() || !password}
            style={{ width:"100%",padding:"14px",borderRadius:14,border:"none",
              background:loading?"#a78bfa":"var(--purple)",color:"#fff",fontSize:16,fontWeight:800,cursor:"pointer",letterSpacing:"0.02em" }}>
            {loading ? "Logging in…" : "🛡️ Enter Mod Panel"}
          </button>
        </div>

        <button onClick={() => navigate("/community")}
          style={{ display:"block",margin:"20px auto 0",background:"none",border:"none",color:"var(--sub)",fontSize:13,cursor:"pointer" }}>
          ← Back to Community
        </button>
      </div>
    </div>
  );
}
