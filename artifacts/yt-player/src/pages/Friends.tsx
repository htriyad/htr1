import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { USER_NAME_KEY } from "../App";
import Header from "../components/Header";

const ME = () => localStorage.getItem(USER_NAME_KEY) || "";
const api = (p: string, o: RequestInit = {}) =>
  fetch(p, { ...o, headers: { "Content-Type": "application/json", "x-username": ME(), ...(o.headers as any || {}) } });

function avatarColor(u: string) {
  const p=["#7c3aed","#0ea5e9","#f59e0b","#ef4444","#10b981","#6366f1","#ec4899","#14b8a6"];
  let n=0; for(const c of u)n+=c.charCodeAt(0); return p[n%p.length];
}

function Avatar({ user, size=46, ring=false }: { user: any; size?: number; ring?: boolean }) {
  const u = typeof user === "string" ? user : user?.username || user;
  const name = typeof user === "object" ? (user?.displayName || user?.username || u) : u;
  const avatar = typeof user === "object" ? user?.avatar : undefined;
  const inner = (
    <div style={{ width: size, height: size, borderRadius: "50%", background: avatar ? `url(${avatar}) center/cover` : avatarColor(u), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: size*0.4, flexShrink: 0, overflow: "hidden" }}>
      {!avatar && name?.[0]?.toUpperCase()}
    </div>
  );
  if (!ring) return inner;
  return (
    <div style={{ width: size+6, height: size+6, borderRadius: "50%", padding: 3, background: "linear-gradient(135deg,#f79e1b,#d7237c,#5f15b8)", flexShrink:0 }}>
      <div style={{ width:"100%", height:"100%", borderRadius:"50%", background:"var(--bg)", padding:2, boxSizing:"border-box" }}>{inner}</div>
    </div>
  );
}

type Tab = "friends"|"requests"|"suggestions"|"buddy"|"nearby"|"close"|"blocked";

export default function Friends() {
  const [, nav] = useLocation();
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [sent, setSent] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [blocked, setBlocked] = useState<any[]>([]);
  const [closeFriends, setCloseFriends] = useState<string[]>([]);
  const [studyBuddies, setStudyBuddies] = useState<any[]>([]);
  const [nearYou, setNearYou] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [fl, rq, sn, sg, bl, cl, bd, ny] = await Promise.all([
      api("/api/social/friends/list").then(r => r.json()).catch(() => []),
      api("/api/social/friends/requests").then(r => r.json()).catch(() => []),
      api("/api/social/friends/sent").then(r => r.json()).catch(() => []),
      api("/api/social/friends/suggestions").then(r => r.json()).catch(() => []),
      api("/api/social/blocked").then(r => r.json()).catch(() => []),
      api("/api/social/close-friends").then(r => r.json()).catch(() => []),
      api("/api/social/study-buddies").then(r => r.json()).catch(() => []),
      api("/api/social/near-you").then(r => r.json()).catch(() => []),
    ]);
    setFriends(Array.isArray(fl) ? fl : []);
    setRequests(Array.isArray(rq) ? rq : []);
    setSent(Array.isArray(sn) ? sn : []);
    setSuggestions(Array.isArray(sg) ? sg : []);
    setBlocked(Array.isArray(bl) ? bl : []);
    setCloseFriends(Array.isArray(cl) ? cl : []);
    setStudyBuddies(Array.isArray(bd) ? bd : []);
    setNearYou(Array.isArray(ny) ? ny : []);
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

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  async function sendRequest(username: string) { await api(`/api/social/friends/request/${username}`, { method: "POST" }); flash(`✅ Friend request sent to @${username}`); load(); }
  async function acceptRequest(username: string) { await api(`/api/social/friends/accept/${username}`, { method: "POST" }); flash(`✅ Now friends with @${username}`); load(); }
  async function declineRequest(username: string) { await api(`/api/social/friends/decline/${username}`, { method: "POST" }); flash(`Request from @${username} declined`); load(); }
  async function cancelSent(username: string) { await api(`/api/social/friends/cancel/${username}`, { method: "POST" }); flash(`Request to @${username} cancelled`); load(); }
  async function unfriend(username: string) { if (!confirm(`Unfriend @${username}?`)) return; await api(`/api/social/friends/remove/${username}`, { method: "POST" }); flash(`Unfriended @${username}`); load(); }
  async function unblock(username: string) { await api(`/api/social/block/${username}`, { method: "POST" }); flash(`@${username} unblocked`); load(); }
  async function toggleClose(username: string) { await api(`/api/social/close-friends/${username}`, { method: "POST" }); load(); }
  async function follow(username: string) { await api(`/api/social/follow/${username}`, { method: "POST" }); flash(`✅ Following @${username}`); load(); }

  const inpS: React.CSSProperties = { padding: "10px 14px", borderRadius: 20, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none" };

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "friends",     label: "👥 Friends",    count: friends.length },
    { id: "requests",    label: "🔔 Requests",   count: requests.length },
    { id: "suggestions", label: "💡 Know",        count: undefined },
    { id: "buddy",       label: "📚 Buddy",       count: undefined },
    { id: "nearby",      label: "📍 Near You",    count: undefined },
    { id: "close",       label: "⭐ Close",       count: undefined },
    { id: "blocked",     label: "🚫 Blocked",     count: undefined },
  ];

  function SuggestionCard({ u, reason, actionLabel, onAction }: { u: any; reason?: string; actionLabel?: string; onAction?: () => void }) {
    const username = typeof u === "string" ? u : u.username;
    return (
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: "16px 14px", textAlign: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", border: "1px solid var(--border)", display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
        <div style={{ cursor: "pointer" }} onClick={() => nav(`/social/${username}`)}>
          <Avatar user={u} size={56} ring />
        </div>
        <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text)", cursor:"pointer" }} onClick={() => nav(`/social/${username}`)}>{typeof u === "object" ? (u.displayName || username) : username}</div>
        <div style={{ fontSize: 11, color: "var(--sub)" }}>@{username}</div>
        {reason && <div style={{ fontSize: 10, padding: "3px 8px", borderRadius: 20, background: "rgba(124,58,237,0.1)", color: "var(--purple)", fontWeight: 700 }}>{reason}</div>}
        {u.mutualFriends > 0 && <div style={{ fontSize: 11, color: "var(--sub)" }}>{u.mutualFriends} mutual</div>}
        <div style={{ display:"flex", gap:6, width:"100%" }}>
          <button onClick={onAction || (() => sendRequest(username))} style={{ flex:1, padding: "7px", borderRadius: 20, border: "none", background: "var(--purple)", color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>{actionLabel || "+ Add"}</button>
          <button onClick={() => follow(username)} style={{ padding: "7px 10px", borderRadius: 20, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--sub)", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Follow</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100svh", background: "var(--bg)", fontFamily: "Roboto,'Noto Sans Bengali',sans-serif" }}>
      <Header title="Friends & Connections" />

      {/* Search */}
      <div style={{ padding: "12px 16px" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search people…" style={inpS} />
        {searching && <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 4 }}>Searching…</div>}
      </div>

      {msg && <div style={{ margin: "0 16px 10px", padding: "8px 12px", borderRadius: 9, background: msg.startsWith("✅") ? "#dcfce7" : "rgba(124,58,237,0.08)", color: msg.startsWith("✅") ? "#166534" : "var(--text)", fontSize: 12 }}>{msg}</div>}

      {/* Search results */}
      {search.trim() && searchResults.length > 0 && (
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sub)", marginBottom: 8 }}>SEARCH RESULTS</div>
          {searchResults.map((u: any) => (
            <div key={u.username} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <Avatar user={u} size={44} ring />
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
      <div style={{ display: "flex", overflowX: "auto", borderBottom: "1px solid var(--border)", scrollbarWidth: "none" }}>
        {TABS.map(({ id, label, count }) => (
          <button key={id} onClick={() => setTab(id)} style={{ flexShrink: 0, padding: "11px 12px", border: "none", background: "none", fontWeight: tab === id ? 700 : 500, color: tab === id ? "var(--purple)" : "var(--sub)", fontSize: 11, cursor: "pointer", borderBottom: tab === id ? "2px solid var(--purple)" : "2px solid transparent", whiteSpace: "nowrap" }}>
            {label}{count !== undefined ? ` (${count})` : ""}
          </button>
        ))}
      </div>

      <div style={{ padding: 16, paddingBottom: 80 }}>
        {loading && <div style={{ textAlign: "center", padding: 32, color: "var(--sub)" }}>Loading…</div>}

        {/* Friends list */}
        {!loading && !search.trim() && tab === "friends" && (
          <>
            {friends.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--sub)" }}><div style={{ fontSize: 36 }}>👥</div><p>No friends yet. Search for people!</p></div>}
            {friends.map((u: any) => {
              const username = typeof u === "string" ? u : u.username;
              const isClose = closeFriends.includes(username);
              return (
                <div key={username} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <Avatar user={u} size={46} ring />
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => nav(`/social/${username}`)}>
                    <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                      {typeof u === "object" ? (u.displayName || username) : username}
                      {isClose && <span style={{ fontSize: 12 }}>⭐</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--sub)" }}>@{username}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => nav(`/messages?to=${username}`)} style={{ padding: "6px 12px", borderRadius: 20, border: "none", background: "var(--purple)", color: "#fff", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>💬</button>
                    <button onClick={() => toggleClose(username)} style={{ padding: "6px 10px", borderRadius: 20, border: `1.5px solid ${isClose ? "#d97706" : "var(--border)"}`, background: isClose ? "rgba(217,119,6,0.1)" : "var(--bg)", color: isClose ? "#d97706" : "var(--sub)", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>{isClose ? "⭐" : "☆"}</button>
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
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sub)", marginBottom: 10, textTransform: "uppercase" }}>Incoming ({requests.length})</div>
                {requests.map((u: any) => {
                  const username = typeof u === "string" ? u : u.username;
                  return (
                    <div key={username} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                      <Avatar user={u} size={46} ring />
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
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sub)", margin: "16px 0 10px", textTransform: "uppercase" }}>Sent ({sent.length})</div>
                {sent.map((u: any) => {
                  const username = typeof u === "string" ? u : u.username;
                  return (
                    <div key={username} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                      <Avatar user={u} size={46} />
                      <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>@{username}</div><div style={{ fontSize: 12, color: "var(--sub)" }}>Pending…</div></div>
                      <button onClick={() => cancelSent(username)} style={{ padding: "6px 12px", borderRadius: 20, border: "1.5px solid var(--border)", background: "var(--bg)", color: "#dc2626", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                    </div>
                  );
                })}
              </>
            )}
            {requests.length === 0 && sent.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--sub)" }}><div style={{ fontSize: 36 }}>🔔</div><p>No pending friend requests</p></div>}
          </div>
        )}

        {/* People You May Know */}
        {!loading && tab === "suggestions" && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sub)", marginBottom: 12, textTransform: "uppercase" }}>People You May Know</div>
            {suggestions.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--sub)" }}><div style={{ fontSize: 36 }}>💡</div><p>No suggestions right now.</p></div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
              {suggestions.map((u: any) => {
                const username = typeof u === "string" ? u : u.username;
                const reason = u.mutualFriends > 0 ? `${u.mutualFriends} mutual friend${u.mutualFriends>1?"s":""}` : "Red Rose member";
                return <SuggestionCard key={username} u={u} reason={reason} />;
              })}
            </div>
          </>
        )}

        {/* Study Buddy Matching */}
        {!loading && tab === "buddy" && (
          <>
            <div style={{ background:"linear-gradient(135deg,rgba(124,58,237,0.08),rgba(219,39,119,0.08))", borderRadius:14, padding:"14px 16px", marginBottom:16, border:"1px solid rgba(124,58,237,0.15)" }}>
              <div style={{ fontWeight:800, fontSize:14, marginBottom:4 }}>📚 Study Buddy Matching</div>
              <div style={{ fontSize:12, color:"var(--sub)", lineHeight:1.5 }}>Matched with students who post in the same subjects as you. Study together, ask questions, motivate each other!</div>
            </div>
            {studyBuddies.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--sub)" }}>
                <div style={{ fontSize: 36 }}>📚</div>
                <p>No study buddy matches yet. Post in Community with a subject tag first!</p>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
              {studyBuddies.map((u: any) => {
                const reason = u.commonSubjects?.length > 0 ? `📚 ${u.commonSubjects.slice(0,2).join(", ")}` : `${u.totalPosts} posts`;
                return (
                  <SuggestionCard key={u.username} u={u} reason={reason} actionLabel="📚 Connect" />
                );
              })}
            </div>
          </>
        )}

        {/* Near You */}
        {!loading && tab === "nearby" && (
          <>
            <div style={{ background:"linear-gradient(135deg,rgba(16,185,129,0.08),rgba(14,165,233,0.08))", borderRadius:14, padding:"14px 16px", marginBottom:16, border:"1px solid rgba(16,185,129,0.15)" }}>
              <div style={{ fontWeight:800, fontSize:14, marginBottom:4 }}>📍 Near You</div>
              <div style={{ fontSize:12, color:"var(--sub)", lineHeight:1.5 }}>Students from the same city/district as you. Set your location in your profile to see matches.</div>
            </div>
            {nearYou.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--sub)" }}>
                <div style={{ fontSize: 36 }}>📍</div>
                <p>No nearby students found. Add your location in your profile!</p>
                <button onClick={() => nav("/social")} style={{ marginTop:16, padding:"9px 20px", borderRadius:20, border:"none", background:"var(--purple)", color:"#fff", fontWeight:700, cursor:"pointer", fontSize:13 }}>Edit Profile</button>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
              {nearYou.map((u: any) => (
                <SuggestionCard key={u.username} u={u} reason={u.location ? `📍 ${u.location.split(",")[0]}` : "Nearby"} actionLabel="+ Add" />
              ))}
            </div>
          </>
        )}

        {/* Close friends */}
        {!loading && tab === "close" && (
          <>
            <div style={{ padding: "8px 0 16px", fontSize: 13, color: "var(--sub)" }}>⭐ Close friends see your exclusive stories.</div>
            {closeFriends.length === 0 && <div style={{ textAlign: "center", padding: "32px 0", color: "var(--sub)" }}><div style={{ fontSize: 36 }}>⭐</div><p>No close friends yet.</p></div>}
            {closeFriends.map((u: string) => (
              <div key={u} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ width:46, height:46, borderRadius:"50%", background:"linear-gradient(135deg,#f59e0b,#dc2626)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:18 }}>{u[0]?.toUpperCase()}</div>
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
            {blocked.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--sub)" }}><div style={{ fontSize: 36 }}>🚫</div><p>No blocked users</p></div>}
            {blocked.map((u: any) => {
              const username = typeof u === "string" ? u : u.username;
              return (
                <div key={username} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ width:46, height:46, borderRadius:"50%", background:"#dc2626", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:18 }}>{username?.[0]?.toUpperCase()}</div>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>@{username}</div><div style={{ fontSize: 12, color: "var(--sub)" }}>Blocked</div></div>
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
