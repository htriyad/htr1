import { useState, useEffect, useCallback } from "react";
import { USER_NAME_KEY } from "../App";
import Header from "../components/Header";

const ME = () => localStorage.getItem(USER_NAME_KEY) || "";
const api = (p: string, o: RequestInit = {}) =>
  fetch(p, { ...o, headers: { "Content-Type": "application/json", "x-username": ME(), ...(o.headers as any || {}) } });

const inp: React.CSSProperties = { padding: "10px 12px", borderRadius: 9, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "Roboto,sans-serif" };

export default function Events() {
  const [events, setEvents] = useState<any[]>([]);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [tab, setTab] = useState<"upcoming"|"mine"|"past"|"birthdays">("upcoming");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [comment, setComment] = useState("");
  const [form, setForm] = useState({ title: "", description: "", date: "", endDate: "", location: "", isOnline: false, coverUrl: "", category: "Education" });

  const CATS = ["Education","Study Group","Exam","Workshop","Social","Sports","Other"];

  const load = useCallback(async () => {
    setLoading(true);
    const [ev, bd] = await Promise.all([
      api("/api/events").then(r => r.json()).catch(() => []),
      api("/api/social/birthdays").then(r => r.json()).catch(() => []),
    ]);
    setEvents(Array.isArray(ev) ? ev : []);
    setBirthdays(Array.isArray(bd) ? bd : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createEvent() {
    if (!form.title.trim() || !form.date) { setMsg("❌ Title and date required"); return; }
    const r = await api("/api/events", { method: "POST", body: JSON.stringify(form) });
    const d = await r.json();
    if (d.error) { setMsg("❌ " + d.error); return; }
    setMsg("✅ Event created!");
    setCreating(false);
    setForm({ title: "", description: "", date: "", endDate: "", location: "", isOnline: false, coverUrl: "", category: "Education" });
    load();
  }

  async function rsvp(eventId: string, status: "going"|"interested"|"not_going") {
    await api(`/api/events/${eventId}/rsvp`, { method: "POST", body: JSON.stringify({ status }) });
    load();
    if (viewing?.id === eventId) setViewing((v: any) => ({ ...v, _reload: Date.now() }));
  }

  async function addComment(eventId: string) {
    if (!comment.trim()) return;
    await api(`/api/events/${eventId}/comments`, { method: "POST", body: JSON.stringify({ text: comment }) });
    setComment("");
    load();
    const r = await api(`/api/events/${eventId}`).then(x => x.json());
    setViewing(r);
  }

  async function deleteEvent(id: string) {
    if (!confirm("Delete this event?")) return;
    await api(`/api/events/${id}`, { method: "DELETE" });
    load(); setViewing(null);
  }

  const now = Date.now();
  const upcoming = events.filter(e => new Date(e.date).getTime() > now).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const mine = events.filter(e => e.creator === ME());
  const past = events.filter(e => new Date(e.date).getTime() <= now).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  function myRsvp(event: any) {
    const r = (event.rsvps || []).find((r: any) => r.username === ME());
    return r?.status || null;
  }

  function EventCard({ event }: { event: any }) {
    const status = myRsvp(event);
    const going = (event.rsvps || []).filter((r: any) => r.status === "going").length;
    const interested = (event.rsvps || []).filter((r: any) => r.status === "interested").length;
    const daysLeft = Math.ceil((new Date(event.date).getTime() - now) / 86400000);
    return (
      <div style={{ background: "var(--surface)", borderRadius: 16, overflow: "hidden", marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", cursor: "pointer" }} onClick={() => api(`/api/events/${event.id}`).then(r => r.json()).then(setViewing)}>
        {event.coverUrl && <div style={{ height: 140, background: `url(${event.coverUrl}) center/cover` }} />}
        {!event.coverUrl && <div style={{ height: 80, background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>📅</div>}
        <div style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{ fontSize: 10, padding: "2px 8px", background: "rgba(124,58,237,0.1)", color: "var(--purple)", borderRadius: 99, fontWeight: 700 }}>{event.category}</span>
            {event.isOnline && <span style={{ fontSize: 10, padding: "2px 8px", background: "rgba(22,163,74,0.1)", color: "#16a34a", borderRadius: 99, fontWeight: 700 }}>🖥️ Online</span>}
            {daysLeft > 0 && daysLeft <= 7 && <span style={{ fontSize: 10, padding: "2px 8px", background: "rgba(220,38,38,0.1)", color: "#dc2626", borderRadius: 99, fontWeight: 700 }}>🔥 {daysLeft}d left</span>}
          </div>
          <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{event.title}</h3>
          <div style={{ fontSize: 12, color: "var(--sub)", marginBottom: 6 }}>
            📅 {new Date(event.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            {event.location && <> · 📍 {event.location}</>}
          </div>
          <div style={{ fontSize: 11, color: "var(--sub)", marginBottom: 10 }}>By @{event.creator} · ✅ {going} going · ⭐ {interested} interested · 💬 {(event.comments || []).length}</div>
          <div style={{ display: "flex", gap: 6 }}>
            {(["going","interested","not_going"] as const).map(s => (
              <button key={s} onClick={e => { e.stopPropagation(); rsvp(event.id, s); }} style={{ flex: 1, padding: "7px 4px", borderRadius: 8, border: `2px solid ${status === s ? "#1d4ed8" : "var(--border)"}`, background: status === s ? "rgba(29,78,216,0.12)" : "var(--bg)", color: status === s ? "#1d4ed8" : "var(--sub)", fontWeight: status === s ? 700 : 500, fontSize: 11, cursor: "pointer" }}>
                {s === "going" ? "✅ Going" : s === "interested" ? "⭐ Interested" : "❌ No"}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100svh", background: "var(--bg)", fontFamily: "Roboto,'Noto Sans Bengali',sans-serif" }}>
      <Header title="Events" />

      {/* Create button */}
      <div style={{ padding: "12px 16px 0" }}>
        <button onClick={() => setCreating(true)} style={{ width: "100%", padding: 12, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>+ Create Event</button>
      </div>

      {/* Create form */}
      {creating && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 520, background: "var(--surface)", borderRadius: "20px 20px 0 0", padding: 20, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontWeight: 700 }}>📅 Create Event</h3>
              <button onClick={() => setCreating(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            {msg && <div style={{ padding: "8px 12px", borderRadius: 8, background: msg.startsWith("✅") ? "#dcfce7" : "#fee2e2", color: msg.startsWith("✅") ? "#166534" : "#991b1b", fontSize: 12, marginBottom: 10 }}>{msg}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title *" style={inp} />
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Description…" style={{ ...inp, resize: "vertical" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><label style={{ fontSize: 10, fontWeight: 700, color: "var(--sub)", textTransform: "uppercase" }}>Start Date/Time *</label><input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inp} /></div>
                <div><label style={{ fontSize: 10, fontWeight: 700, color: "var(--sub)", textTransform: "uppercase" }}>End Date/Time</label><input type="datetime-local" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} style={inp} /></div>
              </div>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Location (or leave blank for online)" style={inp} />
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inp}>{CATS.map(c => <option key={c}>{c}</option>)}</select>
              <input value={form.coverUrl} onChange={e => setForm(f => ({ ...f, coverUrl: e.target.value }))} placeholder="Cover image URL (optional)" style={inp} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={form.isOnline} onChange={e => setForm(f => ({ ...f, isOnline: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "var(--purple)" }} />
                🖥️ Online Event
              </label>
              <button onClick={createEvent} style={{ padding: 13, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Create Event 🎉</button>
            </div>
          </div>
        </div>
      )}

      {/* Event detail modal */}
      {viewing && (
        <div style={{ position: "fixed", inset: 0, zIndex: 998, background: "rgba(0,0,0,0.6)", overflow: "auto", padding: 16 }} onClick={() => setViewing(null)}>
          <div style={{ background: "var(--surface)", borderRadius: 18, maxWidth: 540, margin: "0 auto", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            {viewing.coverUrl ? <div style={{ height: 180, background: `url(${viewing.coverUrl}) center/cover` }} /> : <div style={{ height: 100, background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 50 }}>📅</div>}
            <div style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{viewing.title}</h2>
                <button onClick={() => setViewing(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--sub)" }}>✕</button>
              </div>
              <div style={{ fontSize: 13, color: "var(--sub)", marginBottom: 10 }}>
                📅 {new Date(viewing.date).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                {viewing.endDate && ` — ${new Date(viewing.endDate).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
              </div>
              {viewing.location && <div style={{ fontSize: 13, color: "var(--sub)", marginBottom: 8 }}>📍 {viewing.location}</div>}
              {viewing.description && <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, marginBottom: 12 }}>{viewing.description}</p>}
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {(["going","interested","not_going"] as const).map(s => (
                  <button key={s} onClick={() => rsvp(viewing.id, s)} style={{ flex: 1, padding: "9px", borderRadius: 10, border: `2px solid ${myRsvp(viewing) === s ? "#1d4ed8" : "var(--border)"}`, background: myRsvp(viewing) === s ? "rgba(29,78,216,0.12)" : "var(--bg)", color: myRsvp(viewing) === s ? "#1d4ed8" : "var(--sub)", fontWeight: myRsvp(viewing) === s ? 700 : 500, fontSize: 12, cursor: "pointer" }}>
                    {s === "going" ? "✅ Going" : s === "interested" ? "⭐ Interested" : "❌ Not Going"}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 12, color: "var(--sub)", marginBottom: 14 }}>
                ✅ {(viewing.rsvps||[]).filter((r:any)=>r.status==="going").length} going · ⭐ {(viewing.rsvps||[]).filter((r:any)=>r.status==="interested").length} interested
              </div>
              {/* Comments */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>💬 Discussion ({(viewing.comments||[]).length})</div>
                {(viewing.comments||[]).map((c:any,i:number) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--purple)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, flexShrink: 0 }}>{c.author?.[0]?.toUpperCase()}</div>
                    <div style={{ flex: 1, background: "var(--bg)", borderRadius: 12, padding: "7px 10px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--purple)" }}>@{c.author}</div>
                      <div style={{ fontSize: 13, color: "var(--text)", marginTop: 2 }}>{c.text}</div>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment…" style={{ ...inp, flex: 1 }} onKeyDown={e => e.key === "Enter" && addComment(viewing.id)} />
                  <button onClick={() => addComment(viewing.id)} style={{ padding: "0 14px", borderRadius: 9, border: "none", background: "var(--purple)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Send</button>
                </div>
              </div>
              {viewing.creator === ME() && <button onClick={() => deleteEvent(viewing.id)} style={{ marginTop: 12, width: "100%", padding: "9px", borderRadius: 10, border: "1px solid #dc2626", background: "none", color: "#dc2626", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>🗑️ Delete Event</button>}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginTop: 12 }}>
        {([["upcoming","📅 Upcoming"],["mine","👤 My Events"],["past","🕐 Past"],["birthdays","🎂 Birthdays"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: "11px 4px", border: "none", background: "none", fontWeight: tab === id ? 700 : 500, color: tab === id ? "#1d4ed8" : "var(--sub)", fontSize: 11, cursor: "pointer", borderBottom: tab === id ? "2px solid #1d4ed8" : "2px solid transparent" }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {loading && <div style={{ textAlign: "center", padding: 40, color: "var(--sub)" }}>Loading…</div>}
        {!loading && tab === "upcoming" && (
          <>
            {upcoming.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--sub)" }}><div style={{ fontSize: 36 }}>📅</div><p style={{ marginTop: 10 }}>No upcoming events. Create one!</p></div>}
            {upcoming.map(e => <EventCard key={e.id} event={e} />)}
          </>
        )}
        {!loading && tab === "mine" && (
          <>
            {mine.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--sub)" }}><div style={{ fontSize: 36 }}>👤</div><p style={{ marginTop: 10 }}>You haven't created any events yet</p></div>}
            {mine.map(e => <EventCard key={e.id} event={e} />)}
          </>
        )}
        {!loading && tab === "past" && (
          <>
            {past.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--sub)" }}><div style={{ fontSize: 36 }}>🕐</div><p style={{ marginTop: 10 }}>No past events</p></div>}
            {past.map(e => <EventCard key={e.id} event={e} />)}
          </>
        )}
        {!loading && tab === "birthdays" && (
          <>
            {birthdays.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--sub)" }}><div style={{ fontSize: 36 }}>🎂</div><p style={{ marginTop: 10 }}>No birthday reminders yet. Users can add their birthday in Settings.</p></div>}
            {birthdays.map((b: any, i: number) => (
              <div key={i} style={{ background: "var(--surface)", borderRadius: 14, padding: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#f59e0b,#dc2626)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🎂</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "var(--text)" }}>{b.displayName || b.username}</div>
                  <div style={{ fontSize: 12, color: "var(--sub)" }}>Birthday: {new Date(b.birthday + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</div>
                </div>
                <button onClick={() => window.location.href = "/messages?to=" + b.username} style={{ padding: "7px 14px", borderRadius: 20, border: "none", background: "linear-gradient(135deg,#f59e0b,#dc2626)", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>🎉 Wish</button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
