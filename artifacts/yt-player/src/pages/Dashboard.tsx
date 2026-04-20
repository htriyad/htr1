import { useState } from "react";
import { useLocation } from "wouter";
import Header from "../components/Header";

const MENU = [
  { label: "Live Class",       icon: "👨‍🏫", bg: "#e8f5e9", chevron: "#e53935" },
  { label: "Live Exam",        icon: "📝", bg: "#e3f2fd", chevron: "#2e7d32" },
  { label: "Practice Exam",   icon: "💻", bg: "#fff3e0", chevron: "#2e7d32" },
  { label: "Solve Sheet",     icon: "📋", bg: "#f3e5f5", chevron: "#7b2fa5" },
  { label: "Q&A Service",     icon: "💬", bg: "#e0f7fa", chevron: "#2e7d32" },
  { label: "Course & Content",icon: "📚", bg: "#fce4ec", chevron: "#e65100" },
  { label: "Discussion Group",icon: "👥", bg: "#e8f5e9", chevron: "#2e7d32" },
];

const SIDEBAR_ITEMS = [
  { label: "Dashboard",        icon: "⊞",  path: "/" },
  { label: "Add Course",       icon: "➕",  path: "/" },
  { label: "Course & Content", icon: "📚", path: "/" },
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
              <span style={{ color: "#c0392b" }}>উদ্ভাস</span>
              <span>-উন্মেষ</span>
              <div className="uu-logo-sub">Online Care</div>
            </div>
            <div className="uu-avatar" style={{ marginLeft: "auto" }}>U</div>
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
          {MENU.map((item) => (
            <button
              key={item.label}
              className="dash-menu-item"
              onClick={() => {
                if (item.label === "Past Classes") navigate("/past-classes");
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
