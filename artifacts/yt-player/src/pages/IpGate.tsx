import { useEffect, useState } from "react";

const USER_TOKEN_KEY = "rr_user_token";
const USER_NAME_KEY  = "rr_username";

interface Props { ip: string }

interface DeviceInfo {
  os: string;
  browser: string;
  deviceType: string;
  connectionType: string;
  isMobileData: boolean;
}

function detectDevice(): DeviceInfo {
  const ua = navigator.userAgent;
  let os = "Unknown OS";
  let browser = "Unknown Browser";
  let deviceType = "Desktop";
  let connectionType = "Unknown";
  let isMobileData = false;

  if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  if (/chrome\/[\d.]+/i.test(ua) && !/edg|opr/i.test(ua)) browser = "Chrome";
  else if (/firefox\/[\d.]+/i.test(ua)) browser = "Firefox";
  else if (/safari\/[\d.]+/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
  else if (/edg\/[\d.]+/i.test(ua)) browser = "Edge";
  else if (/opr\/[\d.]+/i.test(ua)) browser = "Opera";
  else if (/samsung/i.test(ua)) browser = "Samsung Browser";

  if (/mobile|android|iphone|ipad/i.test(ua)) deviceType = /ipad/i.test(ua) ? "Tablet" : "Mobile";

  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (conn) {
    const effType = conn.effectiveType || conn.type || "";
    if (["2g","3g","4g","5g"].some(t => effType.toLowerCase().includes(t))) {
      connectionType = effType.toUpperCase() + " Mobile Data";
      isMobileData = true;
    } else if (effType === "wifi" || effType === "ethernet") {
      connectionType = effType === "wifi" ? "WiFi" : "Ethernet";
    } else if (effType) {
      connectionType = effType;
    }
  }

  if (connectionType === "Unknown" && deviceType === "Mobile") {
    connectionType = "Mobile (WiFi or Data)";
  }

  return { os, browser, deviceType, connectionType, isMobileData };
}

export default function IpGate({ ip }: Props) {
  const [view, setView]       = useState<"gate"|"login">("gate");
  const [msg, setMsg]         = useState("");
  const [sent, setSent]       = useState(false);
  const [username, setUname]  = useState("");
  const [password, setPass]   = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loading, setLoad]    = useState(false);
  const [deviceInfo]          = useState<DeviceInfo>(() => detectDevice());

  async function sendMsg() {
    if (!msg.trim()) return;
    setLoad(true);
    try {
      await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, deviceInfo }),
      });
      setSent(true);
    } finally { setLoad(false); }
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoad(true); setLoginErr("");
    try {
      const r = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
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
    <div style={{ minHeight: "100svh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 52 }}>🥀</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--purple)", marginTop: 8, fontFamily: "Lato,sans-serif" }}>RedRose</h1>
        <p style={{ fontSize: 13, color: "var(--sub)", marginTop: 4 }}>Online Care</p>
      </div>

      <div style={{ background: "var(--surface)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 440, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
        {/* Tab toggle */}
        <div style={{ display: "flex", borderRadius: 12, overflow: "hidden", border: "1.5px solid var(--border)", marginBottom: 22 }}>
          {(["gate", "login"] as const).map(v => (
            <button key={v} onClick={() => { setView(v); setLoginErr(""); }}
              style={{ flex: 1, padding: "11px 0", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", background: view === v ? "var(--purple)" : "transparent", color: view === v ? "#fff" : "var(--sub)", fontFamily: "Roboto,sans-serif", transition: "background 200ms, color 200ms" }}>
              {v === "gate" ? "📨 Request Access" : "🔑 Student Login"}
            </button>
          ))}
        </div>

        {/* REQUEST ACCESS VIEW */}
        {view === "gate" && !sent && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🔒</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text)", fontFamily: "Lato,sans-serif" }}>Access Restricted</div>
                <div style={{ fontSize: 12, color: "var(--sub)" }}>Send a request to the admin for access</div>
              </div>
            </div>

            {/* IP + Device Card */}
            <div style={{ background: "var(--bg)", borderRadius: 12, padding: "12px 14px", marginBottom: 14, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sub)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Your Connection Info</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <InfoChip icon="🌐" label="IP" value={ip} />
                <InfoChip icon={deviceInfo.deviceType === "Mobile" ? "📱" : "💻"} label="Device" value={deviceInfo.deviceType} />
                <InfoChip icon="🖥️" label="OS" value={deviceInfo.os} />
                <InfoChip icon="🌍" label="Browser" value={deviceInfo.browser} />
                <div style={{ gridColumn: "1/-1" }}>
                  <InfoChip
                    icon={deviceInfo.isMobileData ? "📶" : "📡"}
                    label="Connection"
                    value={deviceInfo.connectionType}
                    highlight={deviceInfo.isMobileData}
                  />
                </div>
              </div>
              {deviceInfo.isMobileData && (
                <div style={{ marginTop: 10, padding: "8px 10px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fcd34d", fontSize: 12, color: "#92400e" }}>
                  <b>📶 Mobile Data detected</b> — Your IP changes frequently. The admin can create a personal login for you so you can always access without IP issues.
                </div>
              )}
            </div>

            <textarea value={msg} onChange={e => setMsg(e.target.value)}
              placeholder="Write your message to the admin... (e.g. Please grant me access, I am from batch 2025)"
              rows={4}
              style={{ width: "100%", padding: 12, borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 14, resize: "vertical", fontFamily: "Roboto,'Noto Sans Bengali',sans-serif", outline: "none", marginBottom: 14, boxSizing: "border-box" }} />
            <button onClick={sendMsg} disabled={loading || !msg.trim()}
              style={{ width: "100%", padding: 13, borderRadius: 12, border: "none", background: !msg.trim() || loading ? "var(--border)" : "var(--purple)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: !msg.trim() || loading ? "not-allowed" : "pointer", fontFamily: "Roboto,sans-serif", transition: "background 200ms" }}>
              {loading ? "Sending..." : "Send Request 📨"}
            </button>
          </>
        )}

        {view === "gate" && sent && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", marginBottom: 8, fontFamily: "Lato,sans-serif" }}>Request Sent!</h2>
            <p style={{ fontSize: 14, color: "var(--sub)", lineHeight: 1.7 }}>
              Your message has been delivered to the admin.<br />
              {deviceInfo.isMobileData
                ? "Since you are on mobile data, the admin may create a personal login account for you."
                : "Once your IP is approved, refresh this page."}
            </p>
            <button onClick={() => window.location.reload()}
              style={{ marginTop: 20, padding: "10px 24px", borderRadius: 10, border: "1.5px solid var(--purple)", background: "transparent", color: "var(--purple)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              Refresh Page
            </button>
          </div>
        )}

        {/* STUDENT LOGIN VIEW */}
        {view === "login" && (
          <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", marginBottom: 4, fontFamily: "Lato,sans-serif" }}>Student Login 🎓</h2>
              <p style={{ fontSize: 13, color: "var(--sub)" }}>Universal account — works on any device or network.</p>
              {deviceInfo.isMobileData && (
                <div style={{ marginTop: 8, padding: "8px 10px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #86efac", fontSize: 12, color: "#166534" }}>
                  📶 You're on mobile data — log in with your account to always have access regardless of your IP.
                </div>
              )}
            </div>
            <input value={username} onChange={e => setUname(e.target.value)} placeholder="Username" autoComplete="username" style={inp} />
            <input type="password" value={password} onChange={e => setPass(e.target.value)} placeholder="Password" autoComplete="current-password" style={inp} />
            {loginErr && <p style={{ color: "var(--orange)", fontSize: 13, margin: 0 }}>{loginErr}</p>}
            <button type="submit" disabled={loading || !username.trim() || !password.trim()}
              style={{ padding: 13, borderRadius: 12, border: "none", background: !username.trim() || !password.trim() || loading ? "var(--border)" : "var(--purple)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "Roboto,sans-serif" }}>
              {loading ? "Logging in..." : "Login →"}
            </button>
          </form>
        )}
      </div>

      <p style={{ marginTop: 20, fontSize: 12, color: "var(--sub)" }}>RedRose🥀 — Access by invitation only</p>
    </div>
  );
}

function InfoChip({ icon, label, value, highlight }: { icon: string; label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", background: highlight ? "#fef3c7" : "var(--surface)", borderRadius: 8, border: highlight ? "1px solid #fcd34d" : "1px solid transparent" }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 10, color: "var(--sub)", fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: highlight ? "#92400e" : "var(--text)" }}>{value}</div>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  padding: "11px 14px", borderRadius: 10, border: "1.5px solid var(--border)",
  background: "var(--bg)", color: "var(--text)", fontSize: 14,
  width: "100%", outline: "none", fontFamily: "Roboto,'Noto Sans Bengali',sans-serif",
  boxSizing: "border-box",
};
