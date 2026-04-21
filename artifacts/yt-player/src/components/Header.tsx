import { useLocation } from "wouter";
import { Menu, X, Bell, ArrowLeft, Sun, Moon } from "lucide-react";

interface HeaderProps {
  showBack?: boolean;
  backTo?: string;
  onMenuClick?: () => void;
  title?: string;
}

function toggleTheme() {
  const el = document.documentElement;
  const isEye = el.classList.toggle("eye-theme");
  localStorage.setItem("rr_theme", isEye ? "eye" : "default");
}

export default function Header({ showBack, backTo = "/", onMenuClick, title }: HeaderProps) {
  void title; /* reserved for future use; consumed to satisfy callers */
  const [, navigate] = useLocation();
  const isEye = document.documentElement.classList.contains("eye-theme");

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

      {/* RedRose Logo */}
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
        {/* Eye-protection toggle */}
        <button
          className="uu-header-icon-btn"
          onClick={toggleTheme}
          title={isEye ? "Switch to default theme" : "Eye-protection theme"}
          aria-label="Toggle eye-protection theme"
        >
          {isEye ? <Sun size={20} color="#89a84a" /> : <Moon size={20} color="#555" />}
        </button>

        <button className="uu-bell" aria-label="Notifications">
          <Bell size={22} color="#555" />
          <span className="uu-bell-badge">7</span>
        </button>
        <div className="uu-avatar">R</div>
      </div>
    </header>
  );
}
