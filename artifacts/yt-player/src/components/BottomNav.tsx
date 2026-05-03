import { useLocation } from "wouter";
import { Home, MessageSquare, Sparkles, Calendar, Users, Bell } from "lucide-react";
import { useRealtime } from "../context/RealtimeContext";

const tabs = [
  { path: "/",             Icon: Home,         label: "Home",          exact: true },
  { path: "/community",    Icon: MessageSquare, label: "Community",    exact: false },
  { path: "/stories",      Icon: Sparkles,      label: "Stories",      exact: false },
  { path: "/events",       Icon: Calendar,      label: "Events",       exact: false },
  { path: "/friends",      Icon: Users,         label: "Friends",      exact: false },
  { path: "/notifications",Icon: Bell,          label: "Alerts",       exact: false, badge: true },
];

export default function BottomNav() {
  const [location, navigate] = useLocation();
  const { unreadNotifs } = useRealtime();

  return (
    <nav style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      height: 58,
      background: "var(--surface)",
      borderTop: "1px solid var(--border)",
      display: "flex",
      alignItems: "stretch",
      zIndex: 900,
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {tabs.map(({ path, Icon, label, exact, badge }) => {
        const active = exact ? location === path : location.startsWith(path);
        const badgeCount = badge ? unreadNotifs : 0;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "5px 0 4px",
              color: active ? "var(--accent)" : "var(--sub)",
              transition: "color 150ms",
              position: "relative",
              minWidth: 0,
            }}
            aria-label={label}
          >
            {active && (
              <span style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: 28,
                height: 2.5,
                borderRadius: "0 0 4px 4px",
                background: "var(--accent)",
              }} />
            )}

            <span style={{ position: "relative", display: "inline-flex" }}>
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              {badgeCount > 0 && (
                <span style={{
                  position: "absolute",
                  top: -5,
                  right: -7,
                  minWidth: 14,
                  height: 14,
                  padding: "0 3px",
                  borderRadius: 99,
                  background: "#e05c8a",
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1.5px solid var(--surface)",
                  lineHeight: 1,
                }}>
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
            </span>

            <span style={{
              fontSize: 9.5,
              fontWeight: active ? 700 : 500,
              letterSpacing: "0.01em",
              whiteSpace: "nowrap",
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
