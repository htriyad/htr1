import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Menu, X, Bell, ArrowLeft, Sun, Moon } from "lucide-react";

interface HeaderProps {
  showBack?: boolean;
  backTo?: string;
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
  const isEye = el.classList.toggle("eye-theme");
  localStorage.setItem("rr_theme", isEye ? "eye" : "default");
}

function authHeaders(): HeadersInit {
  const t = localStorage.getItem("rr_user_token") || "";
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function Header({ showBack, backTo = "/", onMenuClick, title }: HeaderProps) {
  void title;
  const [, navigate] = useLocation();
  const isEye = document.documentElement.classList.contains("eye-theme");
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

  useEffect(() => {
    load();
    const t = setInterval(load, 25_000); // poll every 25s
    return () => clearInterval(t);
  }, []);

  // close on outside click
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
        <button className="uu-header-icon-btn" onClick={() => navigate(backTo)} aria-label="Back">
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
        <span style={{ color: "#e53935" }}>Red</span>
        <span style={{ color: "#c0392b" }}>Rose</span>
        <span style={{ marginLeft: 2 }}>🥀</span>
        <div className="uu-logo-sub">Online Care</div>
      </div>

      <div className="uu-header-right">
        <button
          className="uu-header-icon-btn"
          onClick={toggleTheme}
          title={isEye ? "Switch to default theme" : "Eye-protection theme"}
          aria-label="Toggle eye-protection theme"
        >
          {isEye ? <Sun size={20} color="#89a84a" /> : <Moon size={20} color="#555" />}
        </button>

        <div ref={popRef} style={{ position: "relative" }}>
          <button
            className="uu-bell"
            aria-label="Notifications"
            onClick={() => setOpen(o => !o)}
          >
            <Bell size={22} color="#555" />
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
                background: "var(--surface, #fff)",
                color: "var(--text, #222)",
                borderRadius: 14,
                boxShadow: "0 12px 40px rgba(0,0,0,0.20)",
                zIndex: 1500,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <div style={{
                display: "flex", alignItems: "center", padding: "12px 14px",
                borderBottom: "1px solid rgba(0,0,0,0.08)", gap: 8,
              }}>
                <Bell size={16} />
                <span style={{ fontWeight: 800, fontSize: 14, flex: 1 }}>Notifications</span>
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{
                      background: "none", border: "none", color: "#7c3aed",
                      fontWeight: 700, fontSize: 12, cursor: "pointer",
                    }}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ overflowY: "auto", flex: 1 }}>
                {notifs.length === 0 ? (
                  <div style={{ padding: 32, textAlign: "center", color: "var(--sub, #888)" }}>
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
                      background: n.read ? "transparent" : "rgba(124,58,237,0.06)",
                      border: "none", borderBottom: "1px solid rgba(0,0,0,0.05)",
                      cursor: "pointer", color: "inherit",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      {!n.read && (
                        <span style={{
                          width: 8, height: 8, borderRadius: 999,
                          background: "#7c3aed", flexShrink: 0,
                        }} />
                      )}
                      <span style={{ fontWeight: 700, fontSize: 13.5, flex: 1 }}>
                        {n.title}
                      </span>
                      {n.recipients && n.recipients.length > 0 && (
                        <span title="Sent specifically to you" style={{
                          fontSize: 10, background: "#fef3c7", color: "#92400e",
                          padding: "1px 6px", borderRadius: 99, fontWeight: 700,
                        }}>
                          📬 You
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--sub, #666)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                      {n.body}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--sub, #999)", marginTop: 6 }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="uu-avatar">R</div>
      </div>
    </header>
  );
}
