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
  title: string;
  body: string;
  createdAt: string;
  read?: boolean;
  recipients?: string[];
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
    }, 18_000);
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
        <span style={{ color: "#4f8ef7", fontWeight: 900 }}>HTR</span>
        <span style={{ color: "var(--text)", fontWeight: 800 }}> Zone</span>
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
                  <button
                    onClick={markAllRead}
                    style={{
                      background: "none", border: "none", color: "var(--accent)",
                      fontWeight: 700, fontSize: 12, cursor: "pointer",
                    }}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--sub)" }}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ overflowY: "auto", flex: 1 }}>
                {notifs.length === 0 ? (
                  <div style={{ padding: 32, textAlign: "center", color: "var(--sub)" }}>
                    <div style={{ fontSize: 32, marginBottom: 6 }}>🔕</div>
                    <div style={{ fontSize: 13 }}>No notifications yet</div>
                  </div>
                ) : notifs.map(n => (
                  <button
                    key={n.id}
                    onClick={() => { if (!n.read) markRead(n.id); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "12px 14px",
                      background: n.read ? "transparent" : "rgba(79,142,247,0.08)",
                      border: "none", borderBottom: "1px solid var(--border)",
                      cursor: "pointer", color: "var(--text)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      {!n.read && (
                        <span style={{
                          width: 8, height: 8, borderRadius: 999,
                          background: "var(--accent)", flexShrink: 0,
                        }} />
                      )}
                      <span style={{ fontWeight: 700, fontSize: 13.5, flex: 1 }}>
                        {n.title}
                      </span>
                      {n.recipients && n.recipients.length > 0 && (
                        <span title="Sent specifically to you" style={{
                          fontSize: 10, background: "rgba(245,158,11,0.15)", color: "var(--gold)",
                          padding: "1px 6px", borderRadius: 99, fontWeight: 700,
                        }}>
                          📬 You
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--sub)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                      {n.body}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--sub)", marginTop: 6, opacity: 0.7 }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="uu-avatar" style={{ background: "linear-gradient(135deg, #1d4ed8, #6c7fff)" }}>
          {(localStorage.getItem("rr_username") || "H")[0].toUpperCase()}
        </div>
      </div>
    </header>
  );
}
