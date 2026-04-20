import { useState } from "react";
import { useLocation } from "wouter";
import { Menu, X, Bell, ArrowLeft } from "lucide-react";

interface HeaderProps {
  showBack?: boolean;
  backTo?: string;
  title?: string;
  onMenuClick?: () => void;
}

export default function Header({ showBack, backTo = "/", title, onMenuClick }: HeaderProps) {
  const [, navigate] = useLocation();

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

      <div className="uu-logo-text" style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
        <span style={{ color: "#c0392b" }}>উদ্ভাস</span>
        <span>-উন্মেষ</span>
        <div className="uu-logo-sub">Online Care</div>
      </div>

      <div className="uu-header-right">
        <button className="uu-bell" aria-label="Notifications">
          <Bell size={22} color="#555" />
          <span className="uu-bell-badge">7</span>
        </button>
        <div className="uu-avatar">U</div>
      </div>
    </header>
  );
}
