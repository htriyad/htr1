import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { USER_NAME_KEY } from "../App";
import Header from "../components/Header";

const ME = () => localStorage.getItem(USER_NAME_KEY) || "";
const TOKEN = () => localStorage.getItem("rr_user_token") || "";
const api = (p: string, o: RequestInit = {}) =>
  fetch(p, { ...o, headers: { "Content-Type": "application/json", "x-username": ME(), ...(TOKEN() ? { Authorization: `Bearer ${TOKEN()}` } : {}), ...(o.headers as any || {}) } });

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  like:         { icon: "❤️",  color: "#dc2626", label: "Likes" },
  comment:      { icon: "💬",  color: "#1d4ed8", label: "Comments" },
  follow:       { icon: "👤",  color: "#7c3aed", label: "Follows" },
  friend_req:   { icon: "🤝",  color: "#d97706", label: "Friend Requests" },
  mention:      { icon: "@",   color: "#0891b2", label: "Mentions" },
  event:        { icon: "📅",  color: "#16a34a", label: "Events" },
  story_reply:  { icon: "✨",  color: "#e05c8a", label: "Stories" },
  message:      { icon: "💌",  color: "#7c3aed", label: "Messages" },
  group_invite: { icon: "👥",  color: "#1d4ed8", label: "Groups" },
  system:       { icon: "🔔",  color: "var(--sub)", label: "System" },
  birthday:     { icon: "🎂",  color: "#f59e0b", label: "Birthdays" },
  poll:         { icon: "📊",  color: "#16a34a", label: "Polls" },
};

export default function Notifications() {
  const [, nav] = useLocation();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api("/api/notifications").then(x => x.json()).catch(() => []);
    const list = Array.isArray(r) ? r : [];
    setNotifs(list);
    setUnreadCount(list.filter((n: any) => !n.read).length);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markRead(id: string) {
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
    await api(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => {});
    await api(`/api/notifications/${id}/read`, { method: "PATCH" }).catch(() => {});
  }

  async function markAllRead() {
    setNotifs(ns => ns.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    await api("/api/notifications/read-all", { method: "POST" }).catch(() => {});
    await api("/api/notifications/read-all", { method: "PATCH" }).catch(() => {});
  }

  async function deleteNotif(id: string) {
    setNotifs(ns => ns.filter(n => n.id !== id));
    await api(`/api/notifications/${id}`, { method: "DELETE" }).catch(() => {});
  }

  async function clearAll() {
    if (!confirm("Clear all notifications?")) return;
    setNotifs([]);
    setUnreadCount(0);
    await api("/api/notifications/clear", { method: "DELETE" }).catch(() => {});
  }

  async function acceptFriend(fromUser: string, notifId: string) {
    await api(`/api/social/friends/accept/${fromUser}`, { method: "POST" });
    await markRead(notifId);
    load();
  }

  async function declineFriend(fromUser: string, notifId: string) {
    await api(`/api/social/friends/decline/${fromUser}`, { method: "POST" });
    await markRead(notifId);
    load();
  }

  function getAction(n: any) {
    switch (n.type) {
      case "follow": return () => nav(`/social/${n.fromUser}`);
      case "like": case "comment": case "mention": return () => nav("/community");
      case "message": return () => nav("/messages");
      case "event": return () => nav("/events");
      case "story_reply": return () => nav("/stories");
      case "group_invite": return () => nav("/messages");
      case "friend_req": return () => nav(`/social/${n.fromUser}`);
      default: return null;
    }
  }

  const filtered = filter === "all" ? notifs : notifs.filter(n => n.type === filter || (filter === "social" && ["follow","friend_req","like","comment","mention"].includes(n.type)));

  // Group by day
  const grouped: Record<string, any[]> = {};
  filtered.forEach(n => {
    const ts = n.ts || n.createdAt || new Date().toISOString();
    const day = new Date(ts).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const key = isToday(ts) ? "Today" : isYesterday(ts) ? "Yesterday" : day;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(n);
  });

  function isToday(ts: string) { const d = new Date(ts); const t = new Date(); return d.toDateString() === t.toDateString(); }
  function isYesterday(ts: string) { const d = new Date(ts); const y = new Date(); y.setDate(y.getDate()-1); return d.toDateString() === y.toDateString(); }

  const FILTER_TABS = [
    { id: "all", label: `All (${notifs.length})` },
    { id: "social", label: "Social" },
    { id: "message", label: "Messages" },
    { id: "event", label: "Events" },
    { id: "system", label: "System" },
  ];

  return (
    <div style={{ minHeight: "100svh", background: "var(--bg)", fontFamily: "Roboto,'Noto Sans Bengali',sans-serif" }}>
      <Header title={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ""}`} />

      {/* Action bar */}
      <div style={{ display: "flex", gap: 8, padding: "10px 16px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
        <div style={{ flex: 1, fontSize: 13, color: "var(--sub)" }}>
          {unreadCount > 0 ? <span style={{ color: "var(--purple)", fontWeight: 700 }}>{unreadCount} unread</span> : "All caught up!"}
        </div>
        {unreadCount > 0 && <button onClick={markAllRead} style={{ padding: "6px 12px", borderRadius: 20, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--purple)", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>✓ Mark all read</button>}
        <button onClick={clearAll} style={{ padding: "6px 12px", borderRadius: 20, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--sub)", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>🗑️ Clear</button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", overflowX: "auto", borderBottom: "1px solid var(--border)" }}>
        {FILTER_TABS.map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)} style={{ flexShrink: 0, padding: "10px 14px", border: "none", background: "none", fontWeight: filter === t.id ? 700 : 500, color: filter === t.id ? "var(--purple)" : "var(--sub)", fontSize: 12, cursor: "pointer", borderBottom: filter === t.id ? "2px solid var(--purple)" : "2px solid transparent", whiteSpace: "nowrap" }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: "8px 0" }}>
        {loading && <div style={{ textAlign: "center", padding: 40, color: "var(--sub)" }}>Loading…</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--sub)" }}>
            <div style={{ fontSize: 48 }}>🔔</div>
            <p style={{ marginTop: 12, fontSize: 14 }}>No notifications yet</p>
            <p style={{ fontSize: 12 }}>When people interact with your posts, you'll see it here</p>
          </div>
        )}

        {!loading && Object.entries(grouped).map(([day, items]) => (
          <div key={day}>
            <div style={{ padding: "8px 16px 4px", fontSize: 11, fontWeight: 700, color: "var(--sub)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{day}</div>
            {items.map(n => {
              const meta = TYPE_META[n.type] || TYPE_META.system;
              const action = getAction(n);
              return (
                <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", background: n.read ? "transparent" : "rgba(124,58,237,0.05)", borderBottom: "1px solid var(--border)", transition: "background 200ms", cursor: action ? "pointer" : "default" }}
                  onClick={() => { if (action) { action(); markRead(n.id); } else markRead(n.id); }}>
                  {/* Avatar / icon */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: n.fromUser ? "var(--purple)" : "var(--surface)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: n.fromUser ? 18 : 20 }}>
                      {n.fromUser ? n.fromUser[0]?.toUpperCase() : meta.icon}
                    </div>
                    {n.fromUser && <div style={{ position: "absolute", bottom: -2, right: -2, width: 20, height: 20, borderRadius: "50%", background: meta.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, border: "2px solid var(--bg)" }}>{meta.icon}</div>}
                    {!n.read && <div style={{ position: "absolute", top: 0, right: 0, width: 8, height: 8, borderRadius: "50%", background: "var(--purple)", border: "2px solid var(--bg)" }} />}
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.45 }}>
                      {n.fromUser && <b>@{n.fromUser} </b>}
                      {n.body || n.text || n.title}
                    </div>
                    {n.contentPreview && <div style={{ fontSize: 12, color: "var(--sub)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>"{n.contentPreview}"</div>}
                    <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 4 }}>{timeAgo(n.ts || n.createdAt || "")}</div>
                    {/* Friend request actions */}
                    {n.type === "friend_req" && !n.read && (
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        <button onClick={e => { e.stopPropagation(); acceptFriend(n.fromUser, n.id); }} style={{ padding: "6px 14px", borderRadius: 20, border: "none", background: "var(--purple)", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>✅ Accept</button>
                        <button onClick={e => { e.stopPropagation(); declineFriend(n.fromUser, n.id); }} style={{ padding: "6px 12px", borderRadius: 20, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--sub)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Decline</button>
                      </div>
                    )}
                  </div>
                  {/* Thumbnail or delete */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                    {n.thumbnail && <img src={n.thumbnail} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} />}
                    <button onClick={e => { e.stopPropagation(); deleteNotif(n.id); }} style={{ background: "none", border: "none", color: "var(--sub)", cursor: "pointer", fontSize: 13, padding: 2, opacity: 0.6 }}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
