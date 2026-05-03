import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { USER_NAME_KEY } from "../App";
import Header from "../components/Header";

const ME = () => localStorage.getItem(USER_NAME_KEY) || "";
const api = (p: string, o: RequestInit = {}) =>
  fetch(p, { ...o, headers: { "Content-Type": "application/json", "x-username": ME(), ...(o.headers as any || {}) } });

export default function Friends() {
  const [, nav] = useLocation();
  const [tab, setTab] = useState<"friends"|"requests"|"suggestions"|"blocked"|"close">("friends");
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [sent, setSent] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [blocked, setBlocked] = useState<any[]>([]);
  const [closeFriends, setCloseFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [fl, rq, sn, sg, bl, cl] = await Promise.all([
      api("/api/social/friends/list").then(r => r.json()).catch(() => []),
      api("/api/social/friends/requests").then(r => r.json()).catch(() => []),
      api("/api/social/friends/sent").then(r => r.json()).catch(() => []),
      api("/api/social/friends/suggestions").then(r => r.json()).catch(() => []),
      api("/api/social/blocked").then(r => r.json()).catch(() => []),
      api("/api/social/close-friends").then(r => r.json()).catch(() => []),
    ]);
    setFriends(Array.isArray(fl) ? fl : []);
    setRequests(Array.isArray(rq) ? rq : []);
    setSent(Array.isArray(sn) ? sn : []);
    setSuggestions(Array.isArray(sg) ? sg : []);
    setBlocked(Array.isArray(bl) ? bl : []);
    setCloseFriends(Array.isArray(cl) ? cl : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const r = await api(`/api/explore/search?q=${encodeURIComponent(search)}`).then(x => x.json()).catch(() => ({}));
      setSearchResults(r.users || []);
      setSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  async function sendRequest(username: string) {
    await api(`/api/social/friends/request/${username}`, { method: "POST" });
    setMsg(`✅ Friend request sent to @${username}`);
    load();
  }

  async function acceptRequest(username: string) {
    await api(`/api/social/friends/accept/${username}`, { method: "POST" });
    setMsg(`✅ You are now friends with @${username}`);
    load();
  }

  async function declineRequest(username: string) {
    await api(`/api/social/friends/decline/${username}`, { method: "POST" });
    setMsg(`Request from @${username} declined`);
    load();
  }

  async function cancelSent(username: string) {
    await api(`/api/social/friends/cancel/${username}`, { method: "POST" });
    setMsg(`Request to @${username} cancelled`);
    load();
  }

  async function unfriend(username: string) {
    if (!confirm(`Unfriend @${username}?`)) return;
    await api(`/api/social/friends/remove/${username}`, { method: "POST" });
    setMsg(`Unfriended @${username}`);
    load();
  }

  async function unblock(username: string) {
    await api(`/api/social/block/${username}`, { method: "POST" });
    setMsg(`@${username} unblocked`);
    load();
  }

  async function toggleClose(username: string) {
    await api(`/api/social/close-friends/${username}`, { method: "POST" });
    load();
  }

  async function follow(username: string) {
    await api(`/api/social/follow/${username}`, { method: "POST" });
    setMsg(`✅ Following @${username}`);
    load();
  }

  function Avatar({ user }: { user: any }) {
    const u = typeof user === "string" ? user : user?.username || user;
    const name = typeof user === "object" ? (user?.displayName || user?.username || u) : u;
    const avatar = typeof user === "object" ? user?.avatar : undefined;
    return (
      <div style={{ width: 46, height: 46, borderRadius: "50%", background: avatar ? `url(${avatar}) center/cover` : "var(--purple)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18, flexShrink: 0, overflow: "hidden" }}>
        {!avatar && name?.[0]?.toUpperCase()}
      </div>
    );
  }

  const inpS: React.CSSProperties = { padding: "10px 14px", borderRadius: 20, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none" };

  const filtered = search.trim() ? searchResults : (tab === "friends" ? friends : tab === "blocked" ? blocked : tab === "suggestions" ? suggestions : []);

  return (
    <div style={{ minHeight: "100svh", background: "var(--bg)", fontFamily: "Roboto,'Noto Sans Bengali',sans-serif" }}>
      <Header title="Friends & Connections" />

      {/* Search bar */}
      <div style={{ padding: "12px 16px" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search people…" style={inpS} />
        {searching && <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 4 }}>Searching…</div>}
      </div>

      {msg && <div style={{ margin: "0 16px 10px", padding: "8px 12px", borderRadius: 9, background: msg.startsWith("✅") ? "#dcfce7" : "var(--bg)", color: msg.startsWith("✅") ? "#166534" : "var(--text)", fontSize: 12 }}>{msg}</div>}

      {/* Search results */}
      {search.trim() && searchResults.length > 0 && (
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sub)", marginBottom: 8 }}>SEARCH RESULTS</div>
          {searchResults.map((u: any) => (
            <div key={u.username} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <Avatar user={u} />
              <div style={{ flex: 1, cursor: "pointer" }} onClick={() => nav(`/social/${u.username}`)}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{u.displayName || u.username}</div>
                <div style={{ fontSize: 12, color: "var(--sub)" }}>@{u.username}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => sendRequest(u.username)} style={{ padding: "6px 12px", borderRadius: 20, border: "none", background: "var(--purple)", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>+ Add</button>
                <button onClick={() => follow(u.username)} style={{ padding: "6px 12px", borderRadius: 20, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Follow</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", overflowX: "auto", borderBottom: "1px solid var(--border)" }}>
        {([
          ["friends", `👥 Friends (${friends.length})`],
          ["requests", `🔔 Requests (${requests.length})`],
          ["suggestions", "💡 Suggestions"],
          ["close", "⭐ Close Friends"],
          ["blocked", "🚫 Blocked"],
        ] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flexShrink: 0, padding: "11px 14px", border: "none", background: "none", fontWeight: tab === id ? 700 : 500, color: tab === id ? "var(--purple)" : "var(--sub)", fontSize: 12, cursor: "pointer", borderBottom: tab === id ? "2px solid var(--purple)" : "2px solid transparent", whiteSpace: "nowrap" }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {loading && <div style={{ textAlign: "center", padding: 32, color: "var(--sub)" }}>Loading…</div>}

        {/* Friends list */}
        {!loading && !search.trim() && tab === "friends" && (
          <>
            {friends.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--sub)" }}><div style={{ fontSize: 36 }}>👥</div><p style={{ marginTop: 10 }}>No friends yet. Search for people to connect!</p></div>}
            {friends.map((u: any) => {
              const username = typeof u === "string" ? u : u.username;
              const isClose = closeFriends.includes(username);
              return (
                <div key={username} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <Avatar user={u} />
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => nav(`/social/${username}`)}>
                    <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                      {typeof u === "object" ? (u.displayName || username) : username}
                      {isClose && <span style={{ fontSize: 12 }}>⭐</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--sub)" }}>@{username}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => nav(`/messages?to=${username}`)} style={{ padding: "6px 12px", borderRadius: 20, border: "none", background: "var(--purple)", color: "#fff", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>💬</button>
                    <button onClick={() => toggleClose(username)} style={{ padding: "6px 10px", borderRadius: 20, border: `1.5px solid ${isClose ? "#d97706" : "var(--border)"}`, background: isClose ? "rgba(217,119,6,0.1)" : "var(--bg)", color: isClose ? "#d97706" : "var(--sub)", fontWeight: 600, fontSize: 11, cursor: "pointer" }} title={isClose ? "Remove from close friends" : "Add to close friends"}>{isClose ? "⭐" : "☆"}</button>
                    <button onClick={() => unfriend(username)} style={{ padding: "6px 10px", borderRadius: 20, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--sub)", fontSize: 11, cursor: "pointer" }}>✕</button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Friend requests */}
        {!loading && tab === "requests" && (
          <div>
            {requests.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sub)", marginBottom: 10, textTransform: "uppercase" }}>Incoming Requests ({requests.length})</div>
                {requests.map((u: any) => {
                  const username = typeof u === "string" ? u : u.username;
                  return (
                    <div key={username} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                      <Avatar user={u} />
                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => nav(`/social/${username}`)}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{typeof u === "object" ? (u.displayName || username) : username}</div>
                        <div style={{ fontSize: 12, color: "var(--sub)" }}>@{username} wants to be friends</div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => acceptRequest(username)} style={{ padding: "7px 12px", borderRadius: 20, border: "none", background: "var(--purple)", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>✅ Accept</button>
                        <button onClick={() => declineRequest(username)} style={{ padding: "7px 10px", borderRadius: 20, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--sub)", fontSize: 12, cursor: "pointer" }}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            {sent.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sub)", margin: "16px 0 10px", textTransform: "uppercase" }}>Sent Requests ({sent.length})</div>
                {sent.map((u: any) => {
                  const username = typeof u === "string" ? u : u.username;
                  return (
                    <div key={username} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                      <Avatar user={u} />
                      <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>@{username}</div><div style={{ fontSize: 12, color: "var(--sub)" }}>Request pending…</div></div>
                      <button onClick={() => cancelSent(username)} style={{ padding: "6px 12px", borderRadius: 20, border: "1.5px solid var(--border)", background: "var(--bg)", color: "#dc2626", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                    </div>
                  );
                })}
              </>
            )}
            {requests.length === 0 && sent.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--sub)" }}><div style={{ fontSize: 36 }}>🔔</div><p style={{ marginTop: 10 }}>No pending friend requests</p></div>}
          </div>
        )}

        {/* Suggestions */}
        {!loading && tab === "suggestions" && (
          <>
            {suggestions.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--sub)" }}><div style={{ fontSize: 36 }}>💡</div><p style={{ marginTop: 10 }}>No suggestions right now. Try following more people!</p></div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
              {suggestions.map((u: any) => {
                const username = typeof u === "string" ? u : u.username;
                return (
                  <div key={username} style={{ background: "var(--surface)", borderRadius: 14, padding: 16, textAlign: "center", boxShadow: "0 1px 5px rgba(0,0,0,0.06)" }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--purple)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 22, margin: "0 auto 10px", cursor: "pointer" }} onClick={() => nav(`/social/${username}`)}>{username?.[0]?.toUpperCase()}</div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 2 }}>@{username}</div>
                    {u.mutualFriends > 0 && <div style={{ fontSize: 11, color: "var(--sub)", marginBottom: 8 }}>{u.mutualFriends} mutual friend{u.mutualFriends > 1 ? "s" : ""}</div>}
                    <button onClick={() => sendRequest(username)} style={{ width: "100%", padding: "7px", borderRadius: 20, border: "none", background: "var(--purple)", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>+ Add Friend</button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Close friends */}
        {!loading && tab === "close" && (
          <>
            <div style={{ padding: "8px 0 16px", fontSize: 13, color: "var(--sub)" }}>⭐ Close friends see your exclusive stories and posts marked for close friends only.</div>
            {closeFriends.length === 0 && <div style={{ textAlign: "center", padding: "32px 0", color: "var(--sub)" }}><div style={{ fontSize: 36 }}>⭐</div><p style={{ marginTop: 10 }}>No close friends yet. Add from your friends list!</p></div>}
            {closeFriends.map((u: string) => (
              <div key={u} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#f59e0b,#dc2626)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18 }}>{u[0]?.toUpperCase()}</div>
                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => nav(`/social/${u}`)}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>@{u}</div>
                  <div style={{ fontSize: 11, color: "#d97706" }}>⭐ Close Friend</div>
                </div>
                <button onClick={() => toggleClose(u)} style={{ padding: "6px 12px", borderRadius: 20, border: "1.5px solid #d97706", background: "rgba(217,119,6,0.1)", color: "#d97706", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Remove</button>
              </div>
            ))}
          </>
        )}

        {/* Blocked */}
        {!loading && tab === "blocked" && (
          <>
            {blocked.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--sub)" }}><div style={{ fontSize: 36 }}>🚫</div><p style={{ marginTop: 10 }}>No blocked users</p></div>}
            {blocked.map((u: any) => {
              const username = typeof u === "string" ? u : u.username;
              return (
                <div key={username} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#dc2626", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18 }}>{username?.[0]?.toUpperCase()}</div>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>@{username}</div><div style={{ fontSize: 12, color: "var(--sub)" }}>Blocked — can't see your profile</div></div>
                  <button onClick={() => unblock(username)} style={{ padding: "7px 14px", borderRadius: 20, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--sub)", fontSize: 12, cursor: "pointer" }}>Unblock</button>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
