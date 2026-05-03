import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface RealtimeState {
  unreadNotifs: number;
  unreadMessages: number;
  connected: boolean;
  decrementNotifs: (by?: number) => void;
  decrementMessages: (by?: number) => void;
  clearNotifs: () => void;
  clearMessages: () => void;
  onEvent: (type: string, handler: (payload: any) => void) => () => void;
}

const Ctx = createContext<RealtimeState>({
  unreadNotifs: 0,
  unreadMessages: 0,
  connected: false,
  decrementNotifs: () => {},
  decrementMessages: () => {},
  clearNotifs: () => {},
  clearMessages: () => {},
  onEvent: () => () => {},
});

export const useRealtime = () => useContext(Ctx);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const handlers = useRef<Map<string, Set<(p: any) => void>>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  const onEvent = useCallback((type: string, handler: (payload: any) => void) => {
    if (!handlers.current.has(type)) handlers.current.set(type, new Set());
    handlers.current.get(type)!.add(handler);
    return () => handlers.current.get(type)?.delete(handler);
  }, []);

  const dispatch = useCallback((event: any) => {
    const { type, ...rest } = event;
    handlers.current.get(type)?.forEach(h => h(rest));
    handlers.current.get("*")?.forEach(h => h(event));
    if (type === "notification") {
      setUnreadNotifs(n => n + 1);
      if ("vibrate" in navigator) navigator.vibrate(80);
    }
    if (type === "new_message" || type === "new_group_msg") {
      setUnreadMessages(n => n + 1);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("rr_user_token") || "";
    const username = localStorage.getItem("rr_username") || "";
    if (!username) return;
    fetch("/api/notifications", {
      headers: { Authorization: `Bearer ${token}`, "x-username": username },
    })
      .then(r => r.json())
      .then((d: any[]) => {
        if (Array.isArray(d)) setUnreadNotifs(d.filter(n => !n.read).length);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const username = localStorage.getItem("rr_username") || "";
    const token = localStorage.getItem("rr_user_token") || "";
    if (!username) return;

    let cancelled = false;
    let retries = 0;

    async function connect() {
      if (cancelled) return;
      abortRef.current = new AbortController();
      try {
        const resp = await fetch("/api/sse", {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-username": username,
            Accept: "text/event-stream",
          },
          signal: abortRef.current.signal,
        });
        if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);
        setConnected(true);
        retries = 0;
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop() ?? "";
          for (const part of parts) {
            if (part.startsWith("data: ")) {
              try { dispatch(JSON.parse(part.slice(6))); } catch {}
            }
          }
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
      }
      setConnected(false);
      if (!cancelled) {
        retries = Math.min(retries + 1, 6);
        setTimeout(connect, Math.pow(2, retries) * 1000);
      }
    }

    connect();
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [dispatch]);

  return (
    <Ctx.Provider value={{
      unreadNotifs,
      unreadMessages,
      connected,
      decrementNotifs: (by = 1) => setUnreadNotifs(n => Math.max(0, n - by)),
      decrementMessages: (by = 1) => setUnreadMessages(n => Math.max(0, n - by)),
      clearNotifs: () => setUnreadNotifs(0),
      clearMessages: () => setUnreadMessages(0),
      onEvent,
    }}>
      {children}
    </Ctx.Provider>
  );
}
