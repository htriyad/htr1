import { useLocation } from "wouter";

const tabs = [
  { path: "/",            icon: "🏠", label: "Home" },
  { path: "/community",   icon: "💬", label: "Community" },
  { path: "/stories",     icon: "✨", label: "Stories" },
  { path: "/friends",     icon: "👥", label: "Friends" },
  { path: "/messages",    icon: "✉️",  label: "Messages" },
];

export default function BottomNav() {
  const [location, navigate] = useLocation();

  return (
    <nav style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      height: 60,
      background: "var(--surface)",
      borderTop: "1px solid var(--border)",
      display: "flex",
      alignItems: "stretch",
      zIndex: 900,
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {tabs.map(tab => {
        const active = tab.path === "/"
          ? location === "/"
          : location.startsWith(tab.path);
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "6px 0",
              color: active ? "var(--accent)" : "var(--sub)",
              transition: "color 150ms",
              position: "relative",
            }}
            aria-label={tab.label}
          >
            {active && (
              <span style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: 32,
                height: 3,
                borderRadius: "0 0 4px 4px",
                background: "var(--accent)",
              }} />
            )}
            <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: "0.01em" }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
