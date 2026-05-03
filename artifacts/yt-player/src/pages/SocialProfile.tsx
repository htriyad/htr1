import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import Header from "../components/Header";
import { USER_NAME_KEY } from "../App";

const ME = () => localStorage.getItem(USER_NAME_KEY) || "";
const api = (p: string, o: RequestInit = {}) =>
  fetch(p, { ...o, headers: { "Content-Type": "application/json", "x-username": ME(), ...(o.headers as any || {}) } });

const THEMES = [
  { id: "rose",    label: "Rose",    grad: "linear-gradient(135deg,#e05c8a 0%,#7c3aed 100%)" },
  { id: "ocean",   label: "Ocean",   grad: "linear-gradient(135deg,#0891b2 0%,#1d4ed8 100%)" },
  { id: "sunset",  label: "Sunset",  grad: "linear-gradient(135deg,#f59e0b 0%,#dc2626 100%)" },
  { id: "forest",  label: "Forest",  grad: "linear-gradient(135deg,#16a34a 0%,#0891b2 100%)" },
  { id: "galaxy",  label: "Galaxy",  grad: "linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#db2777 100%)" },
];
const BADGES = [
  { key: "verified", icon: "✅", label: "Verified" },
  { key: "student",  icon: "📚", label: "Student" },
  { key: "teacher",  icon: "👨‍🏫", label: "Teacher" },
  { key: "creator",  icon: "🎨", label: "Creator" },
  { key: "legend",   icon: "🏆", label: "Legend" },
  { key: "helper",   icon: "🤝", label: "Helper" },
];
const PROFILE_FRAMES = [
  { id: "none",     label: "None",       grad: "none",                                                     preview: "#888" },
  { id: "rose",     label: "Rose",       grad: "linear-gradient(135deg,#e05c8a,#7c3aed)",                 preview: "#e05c8a" },
  { id: "flame",    label: "Flame",      grad: "linear-gradient(135deg,#f59e0b,#ef4444,#dc2626)",         preview: "#f59e0b" },
  { id: "ocean",    label: "Ocean",      grad: "linear-gradient(135deg,#0ea5e9,#1d4ed8,#0891b2)",         preview: "#0ea5e9" },
  { id: "galaxy",   label: "Galaxy",     grad: "linear-gradient(135deg,#1e1b4b,#7c3aed,#db2777,#f59e0b)", preview: "#7c3aed" },
  { id: "champion", label: "Champion",   grad: "linear-gradient(135deg,#f59e0b,#fbbf24,#f59e0b)",         preview: "#f59e0b" },
  { id: "forest",   label: "Forest",     grad: "linear-gradient(135deg,#16a34a,#10b981,#0891b2)",         preview: "#16a34a" },
];
const ACTIVITY_PRESETS = [
  { emoji:"📚", text:"Studying" },
  { emoji:"📝", text:"Taking an Exam" },
  { emoji:"🎯", text:"BCS Prep" },
  { emoji:"⚡", text:"Solving Physics" },
  { emoji:"🧪", text:"Chemistry Notes" },
  { emoji:"🔢", text:"Doing Math" },
  { emoji:"🎓", text:"Admission Prep" },
  { emoji:"💤", text:"Taking a Break" },
];
const XP_LEVELS = [
  { label:"Bronze",  icon:"🥉", min:0,    color:"#cd7f32" },
  { label:"Silver",  icon:"🥈", min:100,  color:"#c0c0c0" },
  { label:"Gold",    icon:"🥇", min:300,  color:"#ffd700" },
  { label:"Diamond", icon:"💎", min:700,  color:"#60d6f7" },
  { label:"Legend",  icon:"🏆", min:1500, color:"#a855f7" },
];

const inp: React.CSSProperties = { padding: "10px 12px", borderRadius: 9, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "Roboto,'Noto Sans Bengali',sans-serif" };

function getLevel(xp: number) {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].min) return XP_LEVELS[i];
  }
  return XP_LEVELS[0];
}

export default function SocialProfile() {
  const [, nav] = useLocation();
  const path = window.location.pathname;
  const urlUser = path.startsWith("/social/") ? path.split("/social/")[1] : ME();
  const username = urlUser || ME();
  const isMe = username === ME();

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [followers, setFollowers] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [visitors, setVisitors] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [activityStatus, setActivityStatus] = useState<any>(null);
  const [tab, setTab] = useState<"posts"|"media"|"liked"|"portfolio"|"about">("posts");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followerProfiles, setFollowerProfiles] = useState<any[]>([]);
  const [followingProfiles, setFollowingProfiles] = useState<any[]>([]);
  const [showActivityPicker, setShowActivityPicker] = useState(false);
  const [showFramePicker, setShowFramePicker] = useState(false);

  const [form, setForm] = useState({
    displayName: "", bio: "", website: "", location: "", theme: "rose",
    isPrivate: false, avatar: "", cover: "", badges: [] as string[], frame: "none"
  });

  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, fl, fw, vs, pp, hl, act] = await Promise.all([
      api(`/api/social/profile/${username}`).then(r => r.json()),
      api(`/api/social/followers/${username}`).then(r => r.json()),
      api(`/api/social/following/${username}`).then(r => r.json()),
      isMe ? api("/api/social/visitors").then(r => r.json()) : Promise.resolve([]),
      api(`/api/community/posts?author=${username}`).then(r => r.json()).catch(() => []),
      api(`/api/community/story-highlights`).then(r => r.json()).catch(() => []),
      api(`/api/user/activity/${username}`).then(r => r.json()).catch(() => null),
    ]);
    setProfile(p);
    setFollowers(Array.isArray(fl) ? fl : []);
    setFollowing(Array.isArray(fw) ? fw : []);
    setVisitors(Array.isArray(vs) ? vs : []);
    setPosts(Array.isArray(pp) ? pp : []);
    setHighlights(Array.isArray(hl) ? hl : []);
    setActivityStatus(act || null);
    setIsFollowing(p?.isFollowing || false);
    setIsBlocked(p?.isBlocked || false);
    if (p) setForm({ displayName: p.displayName || username, bio: p.bio || "", website: p.website || "", location: p.location || "", theme: p.theme || "rose", isPrivate: !!p.isPrivate, avatar: p.avatar || "", cover: p.cover || "", badges: p.badges || [], frame: p.frame || "none" });
    if (!isMe && ME()) api(`/api/social/visit/${username}`, { method: "POST" }).catch(() => {});
    setLoading(false);
  }, [username, isMe]);

  useEffect(() => { load(); }, [load]);

  function pickImage(ref: React.RefObject<HTMLInputElement>, field: "avatar" | "cover") {
    if (!ref.current) return;
    ref.current.onchange = (e: any) => {
      const file = e.target.files?.[0]; if (!file) return;
      if (file.size > 2_000_000) { setMsg("❌ Image too large (max 2MB)"); return; }
      const reader = new FileReader();
      reader.onload = () => setForm(f => ({ ...f, [field]: reader.result as string }));
      reader.readAsDataURL(file);
    };
    ref.current.click();
  }

  async function saveProfile() {
    const r = await api("/api/social/profile", { method: "PATCH", body: JSON.stringify(form) });
    const d = await r.json();
    if (d.error) setMsg("❌ " + d.error);
    else { setMsg("✅ Profile updated!"); setEditing(false); load(); }
  }

  async function toggleFollow() {
    const r = await api(`/api/social/follow/${username}`, { method: "POST" });
    const d = await r.json();
    setIsFollowing(d.following);
    load();
  }

  async function toggleBlock() {
    await api(`/api/social/block/${username}`, { method: "POST" });
    setIsBlocked(b => !b);
    load();
  }

  async function setActivity(emoji: string, text: string) {
    await api("/api/user/activity", { method: "POST", body: JSON.stringify({ emoji, text }) });
    setActivityStatus({ emoji, text, ts: Date.now() });
    setShowActivityPicker(false);
  }

  async function clearActivity() {
    await api("/api/user/activity", { method: "POST", body: JSON.stringify({ text: "" }) });
    setActivityStatus(null);
    setShowActivityPicker(false);
  }

  async function loadFollowerProfiles(type: "followers" | "following") {
    const list = type === "followers" ? followers : following;
    const profiles = await Promise.all(list.slice(0, 20).map(u => api(`/api/social/profile/${u}`).then(r => r.json()).catch(() => ({ username: u }))));
    if (type === "followers") { setFollowerProfiles(profiles); setShowFollowers(true); setShowFollowing(false); }
    else { setFollowingProfiles(profiles); setShowFollowing(true); setShowFollowers(false); }
  }

  const theme = THEMES.find(t => t.id === (profile?.theme || "rose")) || THEMES[0];
  const frame = PROFILE_FRAMES.find(f => f.id === (profile?.frame || "none")) || PROFILE_FRAMES[0];
  const likedPosts = posts.filter((p: any) => (p.likes || []).includes(ME()) || Object.values(p.reactions || {}).some((arr: any) => arr.includes(ME())));
  const mediaPosts = posts.filter((p: any) => p.imageData || p.image);

  // XP calculation
  const totalReactionsReceived = posts.reduce((sum: number, p: any) => sum + Object.values(p.reactions || {}).flat().length, 0);
  const xp = posts.length * 5 + followers.length * 10 + totalReactionsReceived * 2;
  const level = getLevel(xp);
  const nextLevel = XP_LEVELS.find(l => l.min > xp);
  const xpProgress = nextLevel ? Math.round(((xp - level.min) / (nextLevel.min - level.min)) * 100) : 100;

  if (loading) return <div style={{ minHeight: "100svh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 40 }}>🥀</div><p style={{ color: "var(--sub)", marginTop: 10 }}>Loading profile…</p></div></div>;

  return (
    <div style={{ minHeight: "100svh", background: "var(--bg)", fontFamily: "Roboto,'Noto Sans Bengali',sans-serif" }}>
      <Header title={`@${username}`} />
      <input ref={avatarRef} type="file" accept="image/*" style={{ display: "none" }} />
      <input ref={coverRef} type="file" accept="image/*" style={{ display: "none" }} />

      {/* Cover photo */}
      <div style={{ position: "relative", height: 220, background: form.cover ? `url(${form.cover}) center/cover` : theme.grad, cursor: editing ? "pointer" : "default", overflow: "hidden" }}
        onClick={() => editing && pickImage(coverRef, "cover")}>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(transparent, rgba(0,0,0,0.35))", pointerEvents: "none" }} />
        {editing && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)", gap: 8 }}>
          <span style={{ fontSize: 28 }}>📷</span><span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Change Cover</span>
        </div>}
      </div>

      {/* Profile section */}
      <div style={{ padding: "0 16px 0", position: "relative" }}>
        {/* Avatar with frame ring */}
        <div style={{ position: "relative", display: "inline-block", marginTop: -52 }}>
          <div style={{
            width: 104, height: 104, borderRadius: "50%", padding: 3,
            background: frame.id !== "none" ? frame.grad : "linear-gradient(135deg,#f79e1b 0%,#f77e27 20%,#d7237c 50%,#9c1aac 75%,#5f15b8 100%)",
            cursor: editing ? "pointer" : "default",
          }} onClick={() => editing && pickImage(avatarRef, "avatar")}>
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "var(--bg)", padding: 3, boxSizing: "border-box" }}>
              <div style={{
                width: "100%", height: "100%", borderRadius: "50%",
                background: form.avatar ? `url(${form.avatar}) center/cover` : theme.grad,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 36, fontWeight: 900, color: "#fff", overflow: "hidden", position: "relative",
              }}>
                {!form.avatar && (profile?.displayName || username)[0]?.toUpperCase()}
                {editing && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", borderRadius: "50%" }}><span style={{ fontSize: 22 }}>📷</span></div>}
              </div>
            </div>
          </div>
          <div style={{ position: "absolute", bottom: 5, right: 5, width: 18, height: 18, borderRadius: "50%", background: "#22c55e", border: "2px solid var(--bg)", animation: "onlinePulse 2.5s ease-in-out infinite" }} />
          {/* Level badge */}
          <div style={{ position: "absolute", top: -4, right: -4, background: "var(--bg)", borderRadius: 20, padding: "2px 6px", border: `2px solid ${level.color}`, fontSize: 12, fontWeight: 900 }} title={`${level.label} — ${xp} XP`}>
            {level.icon}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ float: "right", marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isMe ? (
            <>
              <button onClick={() => setEditing(e => !e)} style={{ padding: "8px 18px", borderRadius: 20, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {editing ? "✕ Cancel" : "✏️ Edit"}
              </button>
              <button onClick={() => setShowActivityPicker(a => !a)} style={{ padding: "8px 12px", borderRadius: 20, border: `1.5px solid ${activityStatus ? "var(--purple)" : "var(--border)"}`, background: activityStatus ? "rgba(124,58,237,0.1)" : "var(--surface)", color: activityStatus ? "var(--purple)" : "var(--sub)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                {activityStatus ? `${activityStatus.emoji} ${activityStatus.text}` : "＋ Activity"}
              </button>
            </>
          ) : (
            <>
              <button onClick={toggleFollow} style={{ padding: "9px 22px", borderRadius: 20, border: isFollowing ? "1.5px solid var(--border)" : "none", background: isFollowing ? "var(--surface)" : theme.grad, color: isFollowing ? "var(--text)" : "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" } as any}>
                {isFollowing ? "✓ Following" : "+ Follow"}
              </button>
              <button onClick={() => nav("/messages?to=" + username)} style={{ padding: "9px 16px", borderRadius: 20, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>💬</button>
              <button onClick={toggleBlock} style={{ padding: "8px 12px", borderRadius: 20, border: "1.5px solid var(--border)", background: "var(--surface)", color: isBlocked ? "#dc2626" : "var(--sub)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>{isBlocked ? "🚫" : "⋯"}</button>
            </>
          )}
        </div>

        {/* Activity Status picker */}
        {showActivityPicker && isMe && (
          <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setShowActivityPicker(false)}>
            <div style={{ background: "var(--surface)", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", maxWidth: 480, maxHeight: "60vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: "var(--border)", margin: "0 auto 16px" }} />
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Set Activity Status</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
                {ACTIVITY_PRESETS.map(a => (
                  <button key={a.text} onClick={() => setActivity(a.emoji, a.text)} style={{ padding: "12px 14px", borderRadius: 12, border: `2px solid ${activityStatus?.text === a.text ? "var(--purple)" : "var(--border)"}`, background: activityStatus?.text === a.text ? "rgba(124,58,237,0.1)" : "var(--bg)", color: "var(--text)", fontWeight: 600, fontSize: 13, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{a.emoji}</span>{a.text}
                  </button>
                ))}
              </div>
              {activityStatus && <button onClick={clearActivity} style={{ width: "100%", marginTop: 12, padding: 10, borderRadius: 12, border: "none", background: "#fee2e2", color: "#dc2626", fontWeight: 700, cursor: "pointer" }}>Clear Activity</button>}
            </div>
          </div>
        )}

        {/* Name + badges */}
        <div style={{ marginTop: 8, clear: "both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", fontFamily: "Lato,sans-serif" }}>{profile?.displayName || username}</span>
            {(profile?.badges || []).map((b: string) => {
              const badge = BADGES.find(x => x.key === b);
              return badge ? <span key={b} title={badge.label} style={{ fontSize: 16 }}>{badge.icon}</span> : null;
            })}
            {profile?.isPrivate && <span style={{ fontSize: 10, padding: "2px 7px", background: "rgba(0,0,0,0.12)", borderRadius: 99, color: "var(--sub)", fontWeight: 700 }}>🔒 Private</span>}
          </div>
          <div style={{ fontSize: 13, color: "var(--sub)", marginBottom: 2 }}>@{username}</div>
          {/* Activity status display */}
          {activityStatus && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 20, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", fontSize: 12, fontWeight: 600, color: "var(--purple)", marginBottom: 4 }}>
              <span>{activityStatus.emoji}</span><span>{activityStatus.text}</span>
            </div>
          )}
          {/* XP bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: level.color }}>{level.icon} {level.label}</span>
            <div style={{ flex: 1, height: 5, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
              <div style={{ width: `${xpProgress}%`, height: "100%", borderRadius: 99, background: `linear-gradient(90deg,${level.color},${nextLevel ? XP_LEVELS[XP_LEVELS.indexOf(level)+1]?.color || level.color : level.color})`, transition: "width 600ms ease" }} />
            </div>
            <span style={{ fontSize: 11, color: "var(--sub)" }}>{xp} XP</span>
          </div>
          {profile?.bio && <p style={{ fontSize: 13.5, color: "var(--text)", margin: "5px 0 6px", lineHeight: 1.6 }}>{profile.bio}</p>}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 2 }}>
            {profile?.location && <span style={{ fontSize: 12, color: "var(--sub)" }}>📍 {profile.location}</span>}
            {profile?.website && <a href={profile.website} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>🔗 {profile.website.replace(/^https?:\/\//, "").split("/")[0]}</a>}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", marginTop: 14, borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
          {[
            { label: "Posts",     value: posts.length,      action: undefined },
            { label: "Followers", value: followers.length,  action: () => loadFollowerProfiles("followers") },
            { label: "Following", value: following.length,  action: () => loadFollowerProfiles("following") },
            ...(isMe && visitors.length > 0 ? [{ label: "Visitors", value: visitors.length, action: undefined }] : []),
          ].map((s, i, arr) => (
            <div key={s.label} onClick={s.action} style={{ flex: 1, textAlign: "center", padding: "12px 4px", cursor: s.action ? "pointer" : "default", borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: s.label === "Visitors" ? "var(--purple)" : "var(--text)", fontFamily: "Lato,sans-serif", lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Story Highlights */}
        <div style={{ borderBottom: "1px solid var(--border)", padding: "14px 0 10px" }}>
          <div style={{ display: "flex", gap: 16, overflowX: "auto", scrollbarWidth: "none" }}>
            {isMe && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0, cursor: "pointer" }} onClick={() => nav("/stories")}>
                <div style={{ width: 58, height: 58, borderRadius: "50%", border: "1.5px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "var(--sub)" }}>+</div>
                <span style={{ fontSize: 10, color: "var(--sub)", whiteSpace: "nowrap" }}>New</span>
              </div>
            )}
            {highlights.length > 0 ? highlights.map((h: any) => (
              <div key={h.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0, cursor: "pointer" }} onClick={() => nav("/stories")}>
                <div style={{ width: 58, height: 58, borderRadius: "50%", background: theme.grad, border: "2px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, overflow: "hidden" }}>
                  {h.icon || "⭐"}
                </div>
                <span style={{ fontSize: 10, color: "var(--text)", whiteSpace: "nowrap", maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>{h.name}</span>
              </div>
            )) : (isMe ? null : (
              ["📚 Study", "💡 Tips", "🎯 Goals"].map((h, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0, cursor: "pointer" }}>
                  <div style={{ width: 58, height: 58, borderRadius: "50%", background: theme.grad, border: "2px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{h.split(" ")[0]}</div>
                  <span style={{ fontSize: 10, color: "var(--text)", whiteSpace: "nowrap" }}>{h.split(" ")[1]}</span>
                </div>
              ))
            ))}
          </div>
        </div>

        {/* Followers/Following modal */}
        {(showFollowers || showFollowing) && (
          <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => { setShowFollowers(false); setShowFollowing(false); }}>
            <div style={{ background: "var(--surface)", borderRadius: 18, width: "100%", maxWidth: 380, maxHeight: "70vh", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: "14px 16px", fontWeight: 700, fontSize: 15, borderBottom: "1px solid var(--border)" }}>{showFollowers ? "Followers" : "Following"}</div>
              <div style={{ overflowY: "auto", flex: 1 }}>
                {(showFollowers ? followerProfiles : followingProfiles).map((u: any, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border)", cursor: "pointer" }} onClick={() => { nav(`/social/${u.username || u}`); setShowFollowers(false); setShowFollowing(false); }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: u.avatar ? `url(${u.avatar}) center/cover` : "var(--purple)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, flexShrink: 0, overflow: "hidden" }}>{!u.avatar && (u.displayName || u.username || "?")[0]?.toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{u.displayName || u.username || u}</div>
                      <div style={{ fontSize: 11, color: "var(--sub)" }}>@{u.username || u}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Form */}
      {editing && isMe && (
        <div style={{ margin: "16px", background: "var(--surface)", borderRadius: 16, padding: 18, border: "1px solid var(--border)" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>✏️ Edit Profile</h3>
          {msg && <div style={{ padding: "8px 12px", borderRadius: 8, background: msg.startsWith("✅") ? "#dcfce7" : "#fee2e2", color: msg.startsWith("✅") ? "#166534" : "#991b1b", fontSize: 12, marginBottom: 10 }}>{msg}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--sub)", textTransform: "uppercase" }}>Display Name</label>
            <input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} style={inp} placeholder="Your name" />
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--sub)", textTransform: "uppercase" }}>Bio</label>
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} maxLength={200} style={{ ...inp, resize: "vertical" }} placeholder="Tell people about yourself…" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={{ fontSize: 11, fontWeight: 700, color: "var(--sub)", textTransform: "uppercase" }}>Location</label><input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} style={inp} placeholder="Dhaka, Bangladesh" /></div>
              <div><label style={{ fontSize: 11, fontWeight: 700, color: "var(--sub)", textTransform: "uppercase" }}>Website</label><input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} style={inp} placeholder="https://yoursite.com" /></div>
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--sub)", textTransform: "uppercase" }}>Profile Theme</label>
            <div style={{ display: "flex", gap: 8 }}>
              {THEMES.map(t => (<div key={t.id} onClick={() => setForm(f => ({ ...f, theme: t.id }))} style={{ width: 40, height: 40, borderRadius: 10, background: t.grad, cursor: "pointer", border: form.theme === t.id ? "3px solid var(--text)" : "3px solid transparent" }} title={t.label} />))}
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--sub)", textTransform: "uppercase" }}>Profile Frame</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PROFILE_FRAMES.map(f => (
                <div key={f.id} onClick={() => setForm(fm => ({ ...fm, frame: f.id }))} title={f.label}
                  style={{ width: 44, height: 44, borderRadius: "50%", padding: 3, background: f.id === "none" ? "var(--border)" : f.grad, cursor: "pointer", outline: form.frame === f.id ? `3px solid var(--purple)` : "none", outlineOffset: 2 }}>
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--sub)", fontWeight: 700 }}>
                    {f.id === "none" ? "✕" : ""}
                  </div>
                </div>
              ))}
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--sub)", textTransform: "uppercase" }}>Badges</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {BADGES.map(b => (
                <label key={b.key} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 20, border: `2px solid ${form.badges.includes(b.key) ? "var(--purple)" : "var(--border)"}`, background: form.badges.includes(b.key) ? "rgba(124,58,237,0.1)" : "var(--bg)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  <input type="checkbox" checked={form.badges.includes(b.key)} onChange={e => setForm(f => ({ ...f, badges: e.target.checked ? [...f.badges, b.key] : f.badges.filter(x => x !== b.key) }))} style={{ display: "none" }} />
                  {b.icon} {b.label}
                </label>
              ))}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "10px 12px", borderRadius: 10, background: "var(--bg)", border: "1px solid var(--border)" }}>
              <input type="checkbox" checked={form.isPrivate} onChange={e => setForm(f => ({ ...f, isPrivate: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "var(--purple)" }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>🔒 Private Account</span>
              <span style={{ fontSize: 11, color: "var(--sub)", marginLeft: "auto" }}>{form.isPrivate ? "Only followers see posts" : "Anyone can see"}</span>
            </label>
            <button onClick={saveProfile} style={{ padding: "12px", borderRadius: 10, border: "none", background: theme.grad, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>💾 Save Profile</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginTop: 4, overflowX: "auto", scrollbarWidth: "none" }}>
        {([["posts","📝 Posts"],["media","🖼️ Media"],["liked","❤️ Liked"],["portfolio","🏆 Portfolio"],["about","ℹ️ About"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flexShrink:0, flex: 1, padding: "12px 4px", border: "none", background: "none", fontWeight: tab === id ? 700 : 500, color: tab === id ? "var(--purple)" : "var(--sub)", fontSize: 11, cursor: "pointer", borderBottom: tab === id ? "2px solid var(--purple)" : "2px solid transparent", whiteSpace:"nowrap" }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: 16, paddingBottom: 80 }}>
        {tab === "posts" && (
          <>
            {posts.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--sub)" }}><div style={{ fontSize: 36 }}>📝</div><p>No posts yet</p></div>}
            {posts.map((p: any) => (
              <div key={p.id} style={{ background: "var(--surface)", borderRadius: 14, padding: 14, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <p style={{ fontSize: 14, color: "var(--text)", margin: "0 0 8px", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{p.text}</p>
                {(p.imageData || p.image) && <img src={p.imageData || p.image} alt="" style={{ width: "100%", borderRadius: 10, maxHeight: 260, objectFit: "cover" }} />}
                <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 12, color: "var(--sub)" }}>
                  <span>❤️ {(p.likes || []).length + Object.values(p.reactions || {}).flat().length}</span>
                  <span>💬 {(p.comments || []).length}</span>
                  <span style={{ marginLeft: "auto" }}>{new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </>
        )}
        {tab === "media" && (
          <>
            {mediaPosts.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--sub)" }}><div style={{ fontSize: 36 }}>🖼️</div><p>No media yet</p></div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
              {mediaPosts.map((p: any) => (
                <div key={p.id} onClick={() => nav(`/community#${p.id}`)} style={{ aspectRatio: "1", borderRadius: 8, cursor: "pointer", overflow: "hidden", background: "var(--surface)", position: "relative" }}>
                  {(p.imageData || p.image) ? <img src={p.imageData || p.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📝</div>}
                </div>
              ))}
            </div>
          </>
        )}
        {tab === "liked" && (
          <>
            {likedPosts.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--sub)" }}><div style={{ fontSize: 36 }}>❤️</div><p>No liked posts yet</p></div>}
            {likedPosts.map((p: any) => (
              <div key={p.id} style={{ background: "var(--surface)", borderRadius: 14, padding: 14, marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "var(--sub)", marginBottom: 6 }}>by @{p.author}</div>
                <p style={{ fontSize: 14, color: "var(--text)", margin: 0, lineHeight: 1.55 }}>{p.text?.slice(0, 120)}{p.text?.length > 120 ? "…" : ""}</p>
              </div>
            ))}
          </>
        )}
        {tab === "portfolio" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Level card */}
            <div style={{ background: `linear-gradient(135deg,${level.color}22,${level.color}11)`, borderRadius: 16, padding: "20px 18px", border: `1.5px solid ${level.color}44`, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 6 }}>{level.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: level.color, fontFamily: "Lato,sans-serif" }}>{level.label}</div>
              <div style={{ fontSize: 14, color: "var(--sub)", marginTop: 4 }}>{xp} XP total</div>
              <div style={{ margin: "10px auto", width: "80%", height: 8, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
                <div style={{ width: `${xpProgress}%`, height: "100%", background: level.color, borderRadius: 99 }} />
              </div>
              {nextLevel && <div style={{ fontSize: 12, color: "var(--sub)" }}>{nextLevel.min - xp} XP to {nextLevel.label} {nextLevel.icon}</div>}
            </div>
            {/* Stats cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { icon:"📝", label:"Total Posts",       value: posts.length },
                { icon:"👥", label:"Followers",         value: followers.length },
                { icon:"❤️", label:"Reactions Received", value: totalReactionsReceived },
                { icon:"💬", label:"Comments",          value: posts.reduce((s: number, p: any) => s + (p.comments||[]).length, 0) },
              ].map(stat => (
                <div key={stat.label} style={{ background: "var(--surface)", borderRadius: 14, padding: "16px 14px", border: "1px solid var(--border)", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{stat.icon}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "var(--text)", fontFamily: "Lato,sans-serif" }}>{stat.value}</div>
                  <div style={{ fontSize: 12, color: "var(--sub)", marginTop: 2 }}>{stat.label}</div>
                </div>
              ))}
            </div>
            {/* Badges display */}
            {(profile?.badges || []).length > 0 && (
              <div style={{ background: "var(--surface)", borderRadius: 14, padding: "14px 16px", border: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>🏅 Earned Badges</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {(profile?.badges || []).map((b: string) => {
                    const badge = BADGES.find(x => x.key === b);
                    return badge ? (
                      <div key={b} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,rgba(124,58,237,0.15),rgba(219,39,119,0.15))", border: "2px solid rgba(124,58,237,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{badge.icon}</div>
                        <span style={{ fontSize: 10, color: "var(--text)", fontWeight: 600 }}>{badge.label}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
            {/* Achievement cards */}
            <div style={{ background: "var(--surface)", borderRadius: 14, padding: "14px 16px", border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>🎯 Achievements</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { icon:"✍️", label:"First Post", done: posts.length >= 1, desc:"Posted your first update" },
                  { icon:"👥", label:"Social Butterfly", done: followers.length >= 5, desc:"Got 5 followers" },
                  { icon:"🔥", label:"Content Creator", done: posts.length >= 10, desc:"Published 10 posts" },
                  { icon:"💎", label:"Community Star", done: totalReactionsReceived >= 50, desc:"Received 50 reactions" },
                  { icon:"🏆", label:"Legend Status", done: xp >= 1500, desc:"Reached Legend level" },
                ].map(a => (
                  <div key={a.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: a.done ? "rgba(34,197,94,0.06)" : "var(--bg)", border: `1px solid ${a.done ? "rgba(34,197,94,0.2)" : "var(--border)"}` }}>
                    <span style={{ fontSize: 22, opacity: a.done ? 1 : 0.3 }}>{a.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: a.done ? "var(--text)" : "var(--sub)" }}>{a.label}</div>
                      <div style={{ fontSize: 11, color: "var(--sub)" }}>{a.desc}</div>
                    </div>
                    <span style={{ fontSize: 16 }}>{a.done ? "✅" : "🔒"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {tab === "about" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { icon: "📅", label: "Joined",         value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "Unknown" },
              { icon: "📍", label: "Location",       value: profile?.location || "Not set" },
              { icon: "🔗", label: "Website",        value: profile?.website || "Not set" },
              { icon: "🏆", label: "Level",          value: `${level.icon} ${level.label} (${xp} XP)` },
              { icon: "👁️", label: "Profile Views",  value: isMe ? `${visitors.length} visitors` : "Private" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", gap: 12, padding: "10px 14px", background: "var(--surface)", borderRadius: 12 }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <div><div style={{ fontSize: 11, color: "var(--sub)", fontWeight: 700, textTransform: "uppercase" }}>{item.label}</div><div style={{ fontSize: 13, color: "var(--text)", marginTop: 2 }}>{item.value}</div></div>
              </div>
            ))}
            {isMe && visitors.length > 0 && (
              <div style={{ background: "var(--surface)", borderRadius: 12, padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>👁️ Recent Visitors</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {visitors.slice(0, 10).map((v: string, i: number) => (
                    <div key={i} onClick={() => nav(`/social/${v}`)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "var(--bg)", borderRadius: 20, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--purple)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900 }}>{v[0]?.toUpperCase()}</div>
                      @{v}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
