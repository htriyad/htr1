import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Menu, X, Bell, ArrowLeft, Sun, Moon } from "lucide-react";

interface HeaderProps {
  showBack?: boolean;
  backTo?: string;
  onBack?: () => void;
  onMenuClick?: () => void;
  title?: string;
}

interface Notif {
  id: string;
  title?: string;
  body?: string;
  createdAt?: string;
  ts?: string;
  read?: boolean;
  recipients?: string[];
  toUser?: string;
  type?: string;
  fromUser?: string;
}

const NOTIF_ICON: Record<string, string> = {
  like: "❤️", comment: "💬", follow: "👤", friend_req: "🤝",
  mention: "🔔", event: "📅", event_comment: "📅", story_react: "✨",
  story_reply: "✨", message: "💌", group_msg: "👥", group_invite: "👥",
  system: "📢", birthday: "🎂", poll: "📊",
};

function notifIcon(n: Notif): string {
  if (n.type && NOTIF_ICON[n.type]) return NOTIF_ICON[n.type];
  const t = (n.title || "").toLowerCase();
  if (t.includes("follow")) return "👤";
  if (t.includes("comment")) return "💬";
  if (t.includes("reacted") || t.includes("like")) return "❤️";
  if (t.includes("message")) return "💌";
  if (t.includes("friend")) return "🤝";
  if (t.includes("event")) return "📅";
  if (t.includes("story")) return "✨";
  if (t.includes("mention")) return "🔔";
  if (t.includes("announcement") || t.includes("welcome")) return "📢";
  return "🔔";
}

function timeAgoShort(ts?: string): string {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function toggleTheme() {
  const el = document.documentElement;
  el.classList.remove("eye-theme");
  const isLight = el.classList.toggle("light-theme");
  localStorage.setItem("rr_theme", isLight ? "light" : "dark");
}

function authHeaders(): HeadersInit {
  const t = localStorage.getItem("rr_user_token") || "";
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function Header({ showBack, backTo = "/", onBack, onMenuClick, title }: HeaderProps) {
  void title;
  const [, navigate] = useLocation();
  const isLight = document.documentElement.classList.contains("light-theme");
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const popRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/notifications", { headers: authHeaders() });
      if (!r.ok) return;
      const d = await r.json();
      if (Array.isArray(d)) setNotifs(d);
    } catch {}
  }

  const prevUnread = useRef(0);
  useEffect(() => {
    load();
    const t = setInterval(async () => {
      try {
        const r = await fetch("/api/notifications", { headers: authHeaders() });
        if (!r.ok) return;
        const d = await r.json();
        if (!Array.isArray(d)) return;
        setNotifs(d);
        const newUnread = d.filter((n: Notif) => !n.read).length;
        if (newUnread > prevUnread.current && prevUnread.current >= 0) {
          if ("vibrate" in navigator) navigator.vibrate(80);
        }
        prevUnread.current = newUnread;
      } catch {}
    }, 5_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unread = notifs.filter(n => !n.read).length;

  async function markRead(id: string) {
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });
    } catch {}
  }
  async function markAllRead() {
    setNotifs(ns => ns.map(n => ({ ...n, read: true })));
    try {
      await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });
    } catch {}
  }

  return (
    <header className="uu-header">
      {showBack ? (
        <button className="uu-header-icon-btn" onClick={() => onBack ? onBack() : navigate(backTo)} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
      ) : (
        <button className="uu-header-icon-btn" onClick={onMenuClick} aria-label="Menu">
          <Menu size={22} />
        </button>
      )}

      <div
        className="uu-logo-text"
        style={{ cursor: "pointer" }}
        onClick={() => navigate("/")}
      >
        <span style={{ color: "#e05c8a", fontWeight: 900 }}>Red Rose</span>
        <span style={{ color: "var(--text)", fontWeight: 800 }}> 🥀</span>
        <div className="uu-logo-sub" style={{ color: "var(--sub)", fontSize: 9, letterSpacing: "0.04em" }}>EXAM PORTAL</div>
      </div>

      <div className="uu-header-right">
        <button
          className="uu-header-icon-btn"
          onClick={toggleTheme}
          title={isLight ? "Switch to dark theme" : "Switch to light theme"}
          aria-label="Toggle theme"
        >
          {isLight ? <Moon size={20} color="var(--sub)" /> : <Sun size={20} color="#f59e0b" />}
        </button>

        <div ref={popRef} style={{ position: "relative" }}>
          <button
            className="uu-bell"
            aria-label="Notifications"
            onClick={() => setOpen(o => !o)}
          >
            <Bell size={22} color="var(--sub)" />
            {unread > 0 && (
              <span className="uu-bell-badge">{unread > 99 ? "99+" : unread}</span>
            )}
          </button>

          {open && (
            <div
              role="menu"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: "min(360px, calc(100vw - 24px))",
                maxHeight: "min(70vh, 480px)",
                background: "var(--surface)",
                color: "var(--text)",
                borderRadius: 14,
                boxShadow: "0 12px 40px rgba(0,0,0,0.40)",
                zIndex: 1500,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{
                display: "flex", alignItems: "center", padding: "12px 14px",
                borderBottom: "1px solid var(--border)", gap: 8,
              }}>
                <Bell size={16} color="var(--accent)" />
                <span style={{ fontWeight: 800, fontSize: 14, flex: 1, color: "var(--text)" }}>Notifications</span>
                {unread > 0 && (
                  <button onClick={markAllRead} style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                    All read
                  </button>
                )}
                <button onClick={() => { setOpen(false); navigate("/notifications"); }} style={{ background: "none", border: "none", color: "var(--sub)", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>
                  See all
                </button>
                <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--sub)" }} aria-label="Close">
                  <X size={16} />
                </button>
              </div>

              <div style={{ overflowY: "auto", flex: 1 }}>
                {notifs.length === 0 ? (
                  <div style={{ padding: 32, textAlign: "center", color: "var(--sub)" }}>
                    <div style={{ fontSize: 32, marginBottom: 6 }}>🔕</div>
                    <div style={{ fontSize: 13 }}>No notifications yet</div>
                  </div>
                ) : notifs.map(n => {
                  const icon = notifIcon(n);
                  const ts = n.ts || n.createdAt;
                  const mainText = n.body || n.title || "";
                  return (
                    <button
                      key={n.id}
                      onClick={() => { if (!n.read) markRead(n.id); }}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 10,
                        width: "100%", textAlign: "left",
                        padding: "11px 14px",
                        background: n.read ? "transparent" : "rgba(124,58,237,0.07)",
                        border: "none", borderBottom: "1px solid var(--border)",
                        cursor: "pointer", color: "var(--text)",
                      }}
                    >
                      {/* Icon circle */}
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                        background: n.read ? "var(--surface)" : "rgba(124,58,237,0.15)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, position: "relative",
                      }}>
                        {icon}
                        {!n.read && <span style={{ position: "absolute", top: 0, right: 0, width: 8, height: 8, borderRadius: "50%", background: "#7c3aed", border: "2px solid var(--surface)" }} />}
                      </div>
                      {/* Text */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, color: "var(--text)", lineHeight: 1.45, fontWeight: n.read ? 400 : 600 }}>
                          {mainText.slice(0, 100)}
                        </div>
                        {ts && (
                          <div style={{ fontSize: 10.5, color: "var(--sub)", marginTop: 3 }}>
                            {timeAgoShort(ts)}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate(`/social/${localStorage.getItem("rr_username") || ""}`)}
          className="uu-avatar"
          style={{ background: "linear-gradient(135deg, #e05c8a, #7c3aed)", border: "none", cursor: "pointer" }}
          title="My Profile"
        >
          {(localStorage.getItem("rr_username") || "H")[0].toUpperCase()}
        </button>
      </div>
    </header>
  );
}
