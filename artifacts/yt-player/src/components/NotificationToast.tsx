import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useRealtime } from "../context/RealtimeContext";

interface Toast {
  id: string;
  type: string;
  fromUser?: string;
  body: string;
  navTo: string;
}

const ICONS: Record<string, string> = {
  like: "❤️", comment: "💬", follow: "👤", friend_req: "🤝",
  mention: "📌", new_message: "💬", new_group_msg: "👥",
  event: "📅", story_reply: "✨", group_invite: "👥",
  system: "🔔", badge: "🏆", exam_result: "📝",
};

function getNav(type: string, payload: any): string {
  if (type === "follow" || type === "friend_req") return `/social/${payload?.fromUser || ""}`;
  if (type === "like" || type === "comment" || type === "mention") return "/community";
  if (type === "new_message") return payload?.threadId ? `/messages/${payload.threadId}` : "/messages";
  if (type === "new_group_msg") return "/messages";
  if (type === "event" || type === "event_comment") return "/events";
  if (type === "story_reply") return "/stories";
  return "/notifications";
}

export default function NotificationToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [, nav] = useLocation();
  const { onEvent } = useRealtime();
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  function dismiss(id: string) {
    setToasts(ts => ts.filter(t => t.id !== id));
    if (timers.current.has(id)) { clearTimeout(timers.current.get(id)!); timers.current.delete(id); }
  }

  useEffect(() => {
    return onEvent("notification", (data: any) => {
      const p = data.payload || data;
      if (!p) return;
      const id = p.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const toast: Toast = {
        id,
        type: p.type || "system",
        fromUser: p.fromUser,
        body: p.body || p.title || "New notification",
        navTo: getNav(p.type, p),
      };
      setToasts(ts => [toast, ...ts].slice(0, 3));
      const t = setTimeout(() => dismiss(id), 4500);
      timers.current.set(id, t);
    });
  }, [onEvent]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  if (!toasts.length) return null;

  return (
    <div style={{
      position: "fixed", bottom: 76, left: 0, right: 0, zIndex: 9500,
      display: "flex", flexDirection: "column-reverse", gap: 8,
      padding: "0 14px", pointerEvents: "none",
    }}>
      {toasts.map((toast, i) => (
        <div key={toast.id}
          onClick={() => { nav(toast.navTo); dismiss(toast.id); }}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 14px",
            background: "var(--surface)",
            borderRadius: 18,
            boxShadow: "0 6px 28px rgba(0,0,0,0.35)",
            border: "1px solid var(--border)",
            cursor: "pointer", pointerEvents: "all",
            animation: "toastIn 0.4s cubic-bezier(0.34,1.56,0.64,1)",
            opacity: 1 - i * 0.12,
            transform: `scale(${1 - i * 0.03}) translateY(${i * -6}px)`,
            maxWidth: 440, marginLeft: "auto", marginRight: "auto",
            backdropFilter: "blur(12px)",
          }}>
          <div style={{
            width: 42, height: 42, borderRadius: "50%",
            background: "linear-gradient(135deg,rgba(108,127,255,0.2),rgba(167,139,250,0.25))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, flexShrink: 0,
            border: "1px solid rgba(108,127,255,0.3)",
          }}>
            {ICONS[toast.type] || "🔔"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {toast.fromUser && (
              <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--purple)", marginBottom: 2, letterSpacing: 0.2 }}>
                @{toast.fromUser}
              </div>
            )}
            <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {toast.body.slice(0, 90)}
            </div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); dismiss(toast.id); }}
            style={{ background: "none", border: "none", color: "var(--sub)", cursor: "pointer", fontSize: 15, padding: "2px 4px", flexShrink: 0, lineHeight: 1, borderRadius: 6 }}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
