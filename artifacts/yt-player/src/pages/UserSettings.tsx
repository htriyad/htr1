import { useState, useEffect, useCallback } from "react";
import { USER_NAME_KEY, USER_TOKEN_KEY } from "../App";
import { useLocation } from "wouter";
import Header from "../components/Header";

const ME = () => localStorage.getItem(USER_NAME_KEY) || "";
const api = (p: string, o: RequestInit = {}) =>
  fetch(p, { ...o, headers: { "Content-Type": "application/json", "x-username": ME(), ...(o.headers as any || {}) } });

const inp: React.CSSProperties = { padding: "10px 12px", borderRadius: 9, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "Roboto,sans-serif" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sub)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 16px 8px" }}>{title}</div>
      <div style={{ background: "var(--surface)", borderRadius: 14, overflow: "hidden", margin: "0 16px" }}>{children}</div>
    </div>
  );
}

function Row({ icon, label, sublabel, value, onClick, danger, toggle, onToggle, children }: { icon: string; label: string; sublabel?: string; value?: string; onClick?: () => void; danger?: boolean; toggle?: boolean; onToggle?: (v: boolean) => void; children?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: "1px solid var(--border)", cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: danger ? "#dc2626" : "var(--text)" }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 1 }}>{sublabel}</div>}
        {children}
      </div>
      {value && <span style={{ fontSize: 12, color: "var(--sub)", flexShrink: 0 }}>{value}</span>}
      {toggle !== undefined && onToggle && (
        <div onClick={e => { e.stopPropagation(); onToggle(!toggle); }} style={{ width: 44, height: 24, borderRadius: 99, background: toggle ? "var(--purple)" : "var(--border)", position: "relative", cursor: "pointer", transition: "background 200ms", flexShrink: 0 }}>
          <div style={{ position: "absolute", top: 3, left: toggle ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 200ms", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
        </div>
      )}
      {onClick && !toggle && !value && <span style={{ color: "var(--sub)", fontSize: 16 }}>›</span>}
    </div>
  );
}

export default function UserSettings() {
  const [, nav] = useLocation();
  const [settings, setSettings] = useState<any>({
    displayName: "", bio: "", email: "", birthday: "", isPrivate: false,
    postAudience: "public", storyAudience: "public", whoCanMessage: "everyone",
    showLastSeen: true, showReadReceipts: true, showTyping: true, showOnline: true,
    loginAlerts: true, twoFA: false, disappearMessages: "off",
    notifyLikes: true, notifyComments: true, notifyFollows: true, notifyMessages: true, notifyEvents: true,
    theme: "dark", fontSize: "medium", language: "bn",
  });
  const [sessions, setSessions] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [section, setSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [s, se] = await Promise.all([
      api("/api/user/settings").then(r => r.json()).catch(() => ({})),
      api("/api/admin/security/sessions").then(r => r.json()).catch(() => []),
    ]);
    if (s && !s.error) setSettings((prev: any) => ({ ...prev, ...s }));
    setSessions(Array.isArray(se) ? se.filter((x: any) => x.username === ME()) : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(patch: Partial<typeof settings>) {
    const merged = { ...settings, ...patch };
    setSettings(merged);
    await api("/api/user/settings", { method: "PATCH", body: JSON.stringify(merged) });
    setMsg("✅ Saved!");
    setTimeout(() => setMsg(""), 2000);
  }

  function toggle(key: string) { save({ [key]: !settings[key] }); }

  async function changePassword() {
    if (!pwForm.current || !pwForm.newPw) { setMsg("❌ Fill all fields"); return; }
    if (pwForm.newPw !== pwForm.confirm) { setMsg("❌ Passwords don't match"); return; }
    if (pwForm.newPw.length < 6) { setMsg("❌ Password too short (min 6)"); return; }
    const r = await api("/api/user/change-password", { method: "POST", body: JSON.stringify({ current: pwForm.current, newPassword: pwForm.newPw }) });
    const d = await r.json();
    if (d.error) setMsg("❌ " + d.error);
    else { setMsg("✅ Password changed!"); setPwForm({ current: "", newPw: "", confirm: "" }); setSection(null); }
  }

  function setTheme(t: string) {
    localStorage.setItem("rr_theme", t);
    document.documentElement.classList.remove("light-theme", "eye-theme");
    if (t === "light") document.documentElement.classList.add("light-theme");
    else if (t === "eye") document.documentElement.classList.add("eye-theme");
    save({ theme: t });
  }

  async function logout() {
    if (!confirm("Log out of your account?")) return;
    localStorage.removeItem(USER_NAME_KEY);
    localStorage.removeItem(USER_TOKEN_KEY);
    nav("/");
    window.location.reload();
  }

  async function exportData() {
    const r = await api("/api/user/export-data").then(x => x.json());
    const blob = new Blob([JSON.stringify(r, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${ME()}-data.json`; a.click();
  }

  if (loading) return <div style={{ minHeight: "100svh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: 36 }}>⚙️</div></div>;

  return (
    <div style={{ minHeight: "100svh", background: "var(--bg)", fontFamily: "Roboto,'Noto Sans Bengali',sans-serif", paddingBottom: 60 }}>
      <Header title="Settings" />

      {msg && <div style={{ margin: "10px 16px", padding: "8px 12px", borderRadius: 9, background: msg.startsWith("✅") ? "#dcfce7" : "#fee2e2", color: msg.startsWith("✅") ? "#166534" : "#991b1b", fontSize: 12 }}>{msg}</div>}

      {/* Account */}
      <Section title="👤 Account">
        <Row icon="✏️" label="Display Name" value={settings.displayName || ME()} onClick={() => setSection(section === "name" ? null : "name")} />
        {section === "name" && (
          <div style={{ padding: "10px 16px", background: "var(--bg)" }}>
            <input value={settings.displayName} onChange={e => setSettings((s: any) => ({ ...s, displayName: e.target.value }))} placeholder="Your display name" style={inp} />
            <button onClick={() => { save({ displayName: settings.displayName }); setSection(null); }} style={{ marginTop: 8, padding: "9px 18px", borderRadius: 10, border: "none", background: "var(--purple)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Save</button>
          </div>
        )}
        <Row icon="📝" label="Bio" value={settings.bio ? settings.bio.slice(0, 20) + "…" : "Not set"} onClick={() => setSection(section === "bio" ? null : "bio")} />
        {section === "bio" && (
          <div style={{ padding: "10px 16px", background: "var(--bg)" }}>
            <textarea value={settings.bio} onChange={e => setSettings((s: any) => ({ ...s, bio: e.target.value }))} rows={3} maxLength={200} style={{ ...inp, resize: "vertical" }} placeholder="Tell people about you…" />
            <button onClick={() => { save({ bio: settings.bio }); setSection(null); }} style={{ marginTop: 8, padding: "9px 18px", borderRadius: 10, border: "none", background: "var(--purple)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Save</button>
          </div>
        )}
        <Row icon="🎂" label="Birthday" value={settings.birthday || "Not set"} onClick={() => setSection(section === "bday" ? null : "bday")} />
        {section === "bday" && (
          <div style={{ padding: "10px 16px", background: "var(--bg)" }}>
            <input type="date" value={settings.birthday} onChange={e => setSettings((s: any) => ({ ...s, birthday: e.target.value }))} style={inp} />
            <button onClick={() => { save({ birthday: settings.birthday }); setSection(null); }} style={{ marginTop: 8, padding: "9px 18px", borderRadius: 10, border: "none", background: "var(--purple)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Save</button>
          </div>
        )}
        <Row icon="🔑" label="Change Password" onClick={() => setSection(section === "pw" ? null : "pw")} />
        {section === "pw" && (
          <div style={{ padding: "10px 16px", background: "var(--bg)", display: "flex", flexDirection: "column", gap: 8 }}>
            <input type="password" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} placeholder="Current password" style={inp} />
            <input type="password" value={pwForm.newPw} onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))} placeholder="New password" style={inp} />
            <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Confirm new password" style={inp} />
            <button onClick={changePassword} style={{ padding: "9px", borderRadius: 10, border: "none", background: "var(--purple)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Update Password</button>
          </div>
        )}
      </Section>

      {/* Privacy */}
      <Section title="🔒 Privacy">
        <Row icon="🌐" label="Private Account" sublabel="Only followers can see your posts" toggle={settings.isPrivate} onToggle={() => toggle("isPrivate")} />
        <Row icon="📝" label="Default Post Audience" value={settings.postAudience} onClick={() => setSection(section === "aud" ? null : "aud")} />
        {section === "aud" && (
          <div style={{ padding: "10px 16px", background: "var(--bg)" }}>
            {(["public","friends","close_friends","only_me"] as const).map(v => (
              <label key={v} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer" }}>
                <input type="radio" name="aud" checked={settings.postAudience === v} onChange={() => { save({ postAudience: v }); setSection(null); }} style={{ accentColor: "var(--purple)" }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{v === "public" ? "🌍 Public" : v === "friends" ? "👥 Friends" : v === "close_friends" ? "⭐ Close Friends" : "🔒 Only Me"}</span>
              </label>
            ))}
          </div>
        )}
        <Row icon="✨" label="Story Audience" value={settings.storyAudience} onClick={() => setSection(section === "staud" ? null : "staud")} />
        {section === "staud" && (
          <div style={{ padding: "10px 16px", background: "var(--bg)" }}>
            {(["public","friends","close_friends","only_me"] as const).map(v => (
              <label key={v} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer" }}>
                <input type="radio" name="staud" checked={settings.storyAudience === v} onChange={() => { save({ storyAudience: v }); setSection(null); }} style={{ accentColor: "var(--purple)" }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{v === "public" ? "🌍 Public" : v === "friends" ? "👥 Friends" : v === "close_friends" ? "⭐ Close Friends" : "🔒 Only Me"}</span>
              </label>
            ))}
          </div>
        )}
        <Row icon="💬" label="Who Can Message Me" value={settings.whoCanMessage} onClick={() => setSection(section === "msg" ? null : "msg")} />
        {section === "msg" && (
          <div style={{ padding: "10px 16px", background: "var(--bg)" }}>
            {(["everyone","friends","nobody"] as const).map(v => (
              <label key={v} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer" }}>
                <input type="radio" name="msg" checked={settings.whoCanMessage === v} onChange={() => { save({ whoCanMessage: v }); setSection(null); }} style={{ accentColor: "var(--purple)" }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{v === "everyone" ? "🌍 Everyone" : v === "friends" ? "👥 Friends Only" : "🚫 Nobody"}</span>
              </label>
            ))}
          </div>
        )}
        <Row icon="🕐" label="Show Last Seen" sublabel="Let others see when you were last active" toggle={settings.showLastSeen} onToggle={() => toggle("showLastSeen")} />
        <Row icon="✅" label="Read Receipts" sublabel="Show when you've read messages" toggle={settings.showReadReceipts} onToggle={() => toggle("showReadReceipts")} />
        <Row icon="⌨️" label="Typing Indicator" sublabel="Show when you're typing" toggle={settings.showTyping} onToggle={() => toggle("showTyping")} />
        <Row icon="🟢" label="Online Status" sublabel="Show when you're online" toggle={settings.showOnline} onToggle={() => toggle("showOnline")} />
      </Section>

      {/* Security */}
      <Section title="🔐 Security">
        <Row icon="🔔" label="Login Alerts" sublabel="Get notified of new logins" toggle={settings.loginAlerts} onToggle={() => toggle("loginAlerts")} />
        <Row icon="🛡️" label="Two-Factor Authentication" sublabel={settings.twoFA ? "✅ Enabled" : "Not enabled"} toggle={settings.twoFA} onToggle={() => { toggle("twoFA"); setMsg(settings.twoFA ? "2FA disabled" : "✅ 2FA enabled! Use your authenticator app."); }} />
        <Row icon="📱" label="Active Sessions" sublabel={`${sessions.length} device${sessions.length !== 1 ? "s" : ""} logged in`} onClick={() => setSection(section === "sess" ? null : "sess")} />
        {section === "sess" && (
          <div style={{ padding: "10px 16px", background: "var(--bg)" }}>
            {sessions.length === 0 && <p style={{ fontSize: 12, color: "var(--sub)" }}>No session data available</p>}
            {sessions.map((s: any, i: number) => (
              <div key={i} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
                <span style={{ fontSize: 20 }}>📱</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{s.device || "Unknown device"}</div>
                  <div style={{ fontSize: 11, color: "var(--sub)" }}>{s.ip} · {new Date(s.lastSeen).toLocaleString()}</div>
                </div>
                <span style={{ fontSize: 10, padding: "2px 8px", background: "#dcfce7", color: "#166534", borderRadius: 99, fontWeight: 700 }}>Active</span>
              </div>
            ))}
            <button onClick={logout} style={{ marginTop: 10, width: "100%", padding: "9px", borderRadius: 10, border: "1px solid #dc2626", background: "none", color: "#dc2626", fontWeight: 700, cursor: "pointer" }}>⏏ Logout All Devices</button>
          </div>
        )}
      </Section>

      {/* Chat */}
      <Section title="💬 Chat & Messages">
        <Row icon="⏱️" label="Disappearing Messages" value={settings.disappearMessages} onClick={() => setSection(section === "dm" ? null : "dm")} />
        {section === "dm" && (
          <div style={{ padding: "10px 16px", background: "var(--bg)" }}>
            {(["off","24h","7d","30d"] as const).map(v => (
              <label key={v} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer" }}>
                <input type="radio" name="dm" checked={settings.disappearMessages === v} onChange={() => { save({ disappearMessages: v }); setSection(null); }} style={{ accentColor: "var(--purple)" }} />
                <span style={{ fontSize: 13, color: "var(--text)" }}>{v === "off" ? "🚫 Off" : v === "24h" ? "🕐 24 hours" : v === "7d" ? "📅 7 days" : "📆 30 days"}</span>
              </label>
            ))}
          </div>
        )}
      </Section>

      {/* Notifications */}
      <Section title="🔔 Notifications">
        <Row icon="❤️" label="Likes & Reactions" toggle={settings.notifyLikes} onToggle={() => toggle("notifyLikes")} />
        <Row icon="💬" label="Comments & Replies" toggle={settings.notifyComments} onToggle={() => toggle("notifyComments")} />
        <Row icon="👤" label="New Followers" toggle={settings.notifyFollows} onToggle={() => toggle("notifyFollows")} />
        <Row icon="💌" label="Messages" toggle={settings.notifyMessages} onToggle={() => toggle("notifyMessages")} />
        <Row icon="📅" label="Events" toggle={settings.notifyEvents} onToggle={() => toggle("notifyEvents")} />
      </Section>

      {/* Appearance */}
      <Section title="🎨 Appearance">
        <Row icon="🌙" label="Theme" onClick={() => setSection(section === "theme" ? null : "theme")} value={settings.theme} />
        {section === "theme" && (
          <div style={{ padding: "12px 16px", background: "var(--bg)", display: "flex", gap: 10 }}>
            {[
              { id: "dark", label: "🌙 Dark", bg: "#0f1117", color: "#fff" },
              { id: "light", label: "☀️ Light", bg: "#f8fafc", color: "#1e293b" },
              { id: "eye", label: "👁️ Eye Care", bg: "#1a1f1a", color: "#d4edda" },
            ].map(t => (
              <div key={t.id} onClick={() => { setTheme(t.id); setSection(null); }} style={{ flex: 1, padding: "14px 8px", borderRadius: 12, background: t.bg, color: t.color, border: settings.theme === t.id ? "2px solid var(--purple)" : "2px solid transparent", textAlign: "center", cursor: "pointer", fontSize: 12, fontWeight: settings.theme === t.id ? 700 : 400 }}>{t.label}</div>
            ))}
          </div>
        )}
        <Row icon="🈶" label="Language" value={settings.language === "bn" ? "বাংলা" : "English"} onClick={() => setSection(section === "lang" ? null : "lang")} />
        {section === "lang" && (
          <div style={{ padding: "10px 16px", background: "var(--bg)" }}>
            {([["bn","বাংলা"],["en","English"]] as const).map(([id, label]) => (
              <label key={id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer" }}>
                <input type="radio" name="lang" checked={settings.language === id} onChange={() => { save({ language: id }); setSection(null); }} style={{ accentColor: "var(--purple)" }} />
                <span style={{ fontSize: 14, color: "var(--text)" }}>{label}</span>
              </label>
            ))}
          </div>
        )}
      </Section>

      {/* Data */}
      <Section title="📦 Data & Storage">
        <Row icon="📥" label="Download My Data" sublabel="Export all your posts, messages, and info" onClick={exportData} />
        <Row icon="🗑️" label="Clear Cache" sublabel="Free up local storage" onClick={() => { localStorage.removeItem("rr_cache"); setMsg("✅ Cache cleared!"); }} />
      </Section>

      {/* About */}
      <Section title="ℹ️ About">
        <Row icon="🥀" label="Red Rose" sublabel="Educational Portal for Bangladesh" value="v3.0" />
        <Row icon="📜" label="Terms of Service" onClick={() => alert("Terms: Use responsibly. No spam, no abuse. Admin decisions are final.")} />
        <Row icon="🔒" label="Privacy Policy" onClick={() => alert("We store your data securely. Chats are private. We don't sell your data.")} />
        <Row icon="💬" label="Contact Support" onClick={() => window.location.href = "/messages"} />
      </Section>

      {/* Logout */}
      <div style={{ padding: "0 16px 32px" }}>
        <button onClick={logout} style={{ width: "100%", padding: 14, borderRadius: 14, border: "1.5px solid #dc2626", background: "rgba(220,38,38,0.06)", color: "#dc2626", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>⏏ Log Out</button>
      </div>
    </div>
  );
}
