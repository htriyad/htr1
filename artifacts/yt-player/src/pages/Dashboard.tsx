import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { X } from "lucide-react";
import Header from "../components/Header";

interface MenuItem {
  id?: string;
  label: string;
  icon: string;
  bg: string;
  chevron: string;
  path: string;
}

const FALLBACK_MENU: MenuItem[] = [
  { label: "Course & Content", icon: "📚", bg: "#e0e7ff", chevron: "#4338ca", path: "/courses" },
  { label: "AI Tutor",         icon: "🤖", bg: "#ede9fe", chevron: "#7c3aed", path: "/ai-tutor" },
  { label: "Past Classes",     icon: "🎬", bg: "#fff3e0", chevron: "#e65100", path: "/past-classes" },
  { label: "Live Exam",        icon: "📝", bg: "#e3f2fd", chevron: "#2e7d32", path: "/exams" },
  { label: "Practice Exam",    icon: "💻", bg: "#fff3e0", chevron: "#2e7d32", path: "/exams" },
  { label: "My Progress",      icon: "🏆", bg: "#fef3c7", chevron: "#d97706", path: "/profile" },
  { label: "Leaderboard",      icon: "🥇", bg: "#fee2e2", chevron: "#dc2626", path: "/leaderboard" },
];

const SIDEBAR_ITEMS = [
  { label: "Dashboard",        icon: "⊞",  path: "/" },
  { label: "Add Course",       icon: "➕",  path: "/" },
  { label: "Course & Content", icon: "📚", path: "/courses" },
  { label: "Master Class",     icon: "🖥️", path: "/" },
  { label: "Foundation Class", icon: "🔴", path: "/" },
  { label: "Past Classes",     icon: "👥", path: "/past-classes" },
  { label: "Past Exams",       icon: "📝", path: "/" },
  { label: "Practice Exam",   icon: "💻", path: "/" },
  { label: "Solve Sheet",     icon: "📋", path: "/" },
  { label: "Performance",     icon: "📊", path: "/" },
  { label: "Q&A Service",     icon: "💬", path: "/" },
  { label: "Due Payment",     icon: "💳", path: "/" },
  { label: "Discussion Group",icon: "👥", path: "/" },
  { label: "Community",       icon: "✳️", path: "/" },
];

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, navigate] = useLocation();
  const [menu, setMenu] = useState<MenuItem[]>(FALLBACK_MENU);

  useEffect(() => {
    const token = localStorage.getItem("rr_user_token") || "";
    fetch("/api/dashboard-menu", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (Array.isArray(d) && d.length) setMenu(d); })
      .catch(() => {});
  }, []);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100svh" }}>
      {/* Sidebar backdrop */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar drawer */}
      {sidebarOpen && (
        <nav className="sidebar">
          <div className="sidebar-header">
            <button
              className="uu-header-icon-btn"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close"
            >
              <X size={22} />
            </button>
            <div className="uu-logo-text">
              <span style={{ color: "#e53935" }}>Red</span>
              <span style={{ color: "#c0392b" }}>Rose</span>
              <span style={{ marginLeft: 2 }}>🥀</span>
              <div className="uu-logo-sub">Online Care</div>
            </div>
            <div className="uu-avatar" style={{ marginLeft: "auto" }}>R</div>
          </div>
          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.label}
              className="sidebar-item"
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span className="sidebar-item-label">{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      <div className="page">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Purple download banner */}
        <div className="dash-banner">
          <h3>Download App</h3>
          <a className="dash-download-btn" href="#" onClick={(e) => e.preventDefault()}>
            <span>Download Now</span>
            <span>🤖</span>
          </a>
        </div>

        {/* Menu items */}
        <div className="dash-menu">
          {menu.map((item) => (
            <button
              key={item.id || item.label}
              className="dash-menu-item"
              onClick={() => {
                if ((item as any).path) navigate((item as any).path);
                else if (item.label === "Past Classes") navigate("/past-classes");
              }}
            >
              <div className="dash-menu-icon" style={{ background: item.bg }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
              </div>
              <span className="dash-menu-label">{item.label}</span>
              <span className="dash-chevron" style={{ color: item.chevron }}>›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
