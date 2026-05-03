import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import Header from "../components/Header";

const UN = () => localStorage.getItem("rr_username") || "guest";
const xhdr = () => ({ "Content-Type": "application/json", "x-username": UN() });

interface Room {
  id: string; name: string; subject: string; host: string;
  members: string[]; maxMembers: number; isPrivate: boolean;
  onlineMembers: string[];
  timerState: { running: boolean; endAt: number | null; mode: string; duration: number };
  lastActivity: string;
}
interface Msg { id: string; username: string; text: string; type: "chat" | "system"; ts: string; }

const SUBJECTS = ["General","Physics","Chemistry","Biology","Math","English","Bangla","ICT","History","Geography","BCS Prep","Admission"];
const TIMER_MODES = [
  { id:"focus", label:"Focus",  mins:25, emoji:"🎯" },
  { id:"short", label:"Break",  mins:5,  emoji:"☕" },
  { id:"long",  label:"Long",   mins:15, emoji:"🌿" },
  { id:"exam",  label:"Exam",   mins:60, emoji:"📝" },
];
const SUBJECT_COLORS: Record<string,string> = {
  Physics:"#3b82f6",Chemistry:"#8b5cf6",Biology:"#10b981",Math:"#f59e0b",
  English:"#06b6d4",Bangla:"#ec4899",ICT:"#6366f1",General:"#64748b",
  History:"#a16207",Geography:"#0891b2","BCS Prep":"#dc2626","Admission":"#7c3aed",
};
const QUICK_REACTIONS = ["👍","❤️","🔥","✅","😂","🤔"];

/* ── helpers ── */
function avatarColor(u: string) {
  const hues = [210,262,142,38,190,330,24,0,280,168];
  return `hsl(${hues[u.charCodeAt(0)%hues.length]},65%,52%)`;
}
function Avatar({ u, size=34, online=false }: { u:string; size?:number; online?:boolean }) {
  return (
    <div style={{position:"relative",flexShrink:0,width:size,height:size}}>
      <div style={{width:size,height:size,borderRadius:size/3,background:avatarColor(u),
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:size*0.44,fontWeight:900,color:"#fff",userSelect:"none"}}>
        {u[0]?.toUpperCase()}
      </div>
      {online && (
        <div style={{position:"absolute",bottom:-1,right:-1,width:10,height:10,
          borderRadius:"50%",background:"#22c55e",border:"2px solid var(--bg)"}}/>
      )}
    </div>
  );
}
function fmtCountdown(ms: number) {
  if (ms <= 0) return "00:00";
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}
function tsLabel(ts: string) {
  return new Date(ts).toLocaleTimeString("en-BD", {hour:"2-digit", minute:"2-digit"});
}
function useNow() {
  const [t,setT] = useState(Date.now());
  useEffect(()=>{const id=setInterval(()=>setT(Date.now()),1000);return()=>clearInterval(id);},[]);
  return t;
}

function getShareUrl(roomId: string, pin?: string) {
  const base = `${window.location.origin}/study-room/${roomId}`;
  return pin ? `${base}#pin=${encodeURIComponent(pin)}` : base;
}

/* ══════════════════════════════════════════════════════════
   INVITE MODAL
══════════════════════════════════════════════════════════ */
function InviteModal({ room, pin, onClose }: { room: Room; pin?: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = getShareUrl(room.id, pin);
  const qr  = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}&bgcolor=0f172a&color=a78bfa&format=png&margin=12`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`📚 Join my study room "${room.name}" on Red Rose 🥀!\n\n🔗 ${url}`)}`;
  const color = SUBJECT_COLORS[room.subject]||"#64748b";

  function copy() {
    navigator.clipboard.writeText(url).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2200); }).catch(()=>{});
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.78)",zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0 0 0 0"}}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="sr-invite-sheet" style={{animation:"sr-slide-up 280ms cubic-bezier(0.34,1.56,0.64,1)"}}>
        {/* Handle bar */}
        <div style={{width:40,height:4,borderRadius:2,background:"var(--border)",margin:"0 auto 18px"}}/>

        {/* Room identity */}
        <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:20}}>
          <div style={{width:48,height:48,borderRadius:14,background:`${color}22`,border:`2px solid ${color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
            📚
          </div>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:"var(--text)"}}>{room.name}</div>
            <div style={{display:"flex",gap:6,marginTop:3,alignItems:"center"}}>
              <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:`${color}20`,color,fontWeight:800}}>{room.subject}</span>
              {pin && <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(239,68,68,0.1)",color:"#ef4444",fontWeight:700}}>🔒 PIN included</span>}
            </div>
          </div>
        </div>

        {/* QR code */}
        <div style={{display:"flex",justifyContent:"center",marginBottom:18}}>
          <div style={{padding:10,background:"#0f172a",borderRadius:16,border:"2px solid rgba(167,139,250,0.25)",boxShadow:"0 0 30px rgba(167,139,250,0.12)"}}>
            <img src={qr} alt="QR Code" width={160} height={160} style={{display:"block",borderRadius:8}}
              onError={e=>(e.currentTarget.style.display="none")}/>
          </div>
        </div>

        {/* Link row */}
        <div style={{display:"flex",gap:8,alignItems:"center",background:"var(--bg)",borderRadius:12,padding:"10px 12px",marginBottom:14,border:"1px solid var(--border)"}}>
          <span style={{flex:1,fontSize:12,color:"var(--sub)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{url}</span>
          <button onClick={copy}
            style={{padding:"6px 14px",borderRadius:9,background:copied?"#22c55e":"linear-gradient(135deg,#4f46e5,#7c3aed)",
              color:"#fff",border:"none",fontWeight:800,fontSize:12,cursor:"pointer",flexShrink:0,transition:"background 200ms",whiteSpace:"nowrap"}}>
            {copied?"✓ Copied!":"Copy Link"}
          </button>
        </div>

        {/* Action buttons */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:8}}>
          <a href={whatsapp} target="_blank" rel="noopener noreferrer"
            style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"13px",borderRadius:14,
              background:"#25D366",color:"#fff",textDecoration:"none",fontWeight:800,fontSize:14}}>
            <span style={{fontSize:20}}>📱</span> WhatsApp
          </a>
          <button onClick={copy}
            style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"13px",borderRadius:14,
              background:"var(--surface)",color:"var(--text)",border:"1px solid var(--border)",fontWeight:800,fontSize:14,cursor:"pointer"}}>
            <span style={{fontSize:20}}>{copied?"✅":"🔗"}</span> {copied?"Copied!":"Copy Link"}
          </button>
        </div>

        <button onClick={onClose}
          style={{width:"100%",padding:"13px",borderRadius:14,background:"var(--border)",border:"none",color:"var(--sub)",fontWeight:700,fontSize:14,cursor:"pointer",marginTop:4}}>
          Close
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   LOBBY
══════════════════════════════════════════════════════════ */
function Lobby({ onEnter }: { onEnter:(room:Room,pin?:string)=>void }) {
  const [rooms,setRooms]   = useState<Room[]>([]);
  const [loading,setLoad]  = useState(true);
  const [creating,setCreating] = useState(false);
  const [joinPin,setJoinPin]   = useState<{room:Room;val:string}|null>(null);
  const [shareRoom,setShareRoom] = useState<{room:Room;pin?:string}|null>(null);
  const [form,setForm] = useState({ name:"", subject:"General", maxMembers:"8", isPrivate:false, pin:"" });
  const [err,setErr]   = useState("");
  const [, navigate]   = useLocation();

  const loadRooms = useCallback(()=>{
    fetch("/api/study-rooms").then(r=>r.json())
      .then(d=>{ if(Array.isArray(d)) setRooms(d); setLoad(false); })
      .catch(()=>setLoad(false));
  },[]);
  useEffect(()=>{ loadRooms(); const t=setInterval(loadRooms,5000); return()=>clearInterval(t); },[loadRooms]);

  async function create(){
    setErr("");
    if(!form.name.trim()){ setErr("Room name is required"); return; }
    const r = await fetch("/api/study-rooms",{method:"POST",headers:xhdr(),body:JSON.stringify({...form,maxMembers:Number(form.maxMembers)})});
    const d = await r.json();
    if(d.error){ setErr(d.error); return; }
    onEnter(d, form.isPrivate && form.pin ? form.pin : undefined);
  }
  async function join(room:Room, pin?:string){
    setErr("");
    const r = await fetch(`/api/study-rooms/${room.id}/join`,{method:"POST",headers:xhdr(),body:JSON.stringify({pin:pin||""})});
    const d = await r.json();
    if(d.error){ setErr(d.error); return; }
    onEnter(d);
  }

  const me = UN();
  return (
    <div style={{background:"var(--bg)",minHeight:"100svh"}}>
      <Header onMenuClick={()=>navigate("/")} />
      <div style={{maxWidth:540,margin:"0 auto",padding:"14px 14px 100px"}}>

        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
          <div style={{width:46,height:46,borderRadius:14,background:"linear-gradient(135deg,#4f46e5,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
            🏠
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:18,fontWeight:900,color:"var(--text)"}}>Group Study Rooms</div>
            <div style={{fontSize:12,color:"var(--sub)"}}>Study together, stay motivated</div>
          </div>
          <button onClick={()=>setCreating(c=>!c)}
            style={{padding:"9px 16px",borderRadius:12,background:creating?"var(--border)":"linear-gradient(135deg,#4f46e5,#7c3aed)",color:creating?"var(--sub)":"#fff",border:"none",fontWeight:800,fontSize:13,cursor:"pointer"}}>
            {creating?"✕":"＋ New"}
          </button>
        </div>

        {/* Create room form */}
        {creating && (
          <div style={{background:"var(--surface)",borderRadius:18,padding:18,marginBottom:16,border:"1px solid var(--border)",animation:"fadeSlideUp 200ms ease"}}>
            <div style={{fontSize:14,fontWeight:800,color:"var(--text)",marginBottom:14}}>🆕 Create a Study Room</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
                placeholder="Room name — e.g. SSC Physics Warriors" maxLength={50} autoFocus
                style={{padding:"11px 14px",borderRadius:12,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:14,outline:"none"}}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <select value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}
                  style={{padding:"11px 12px",borderRadius:12,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13}}>
                  {SUBJECTS.map(s=><option key={s}>{s}</option>)}
                </select>
                <select value={form.maxMembers} onChange={e=>setForm({...form,maxMembers:e.target.value})}
                  style={{padding:"11px 12px",borderRadius:12,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13}}>
                  {[2,4,6,8,10,15,20].map(n=><option key={n} value={n}>{n} max</option>)}
                </select>
              </div>
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:"var(--sub)",padding:"2px 0"}}>
                <input type="checkbox" checked={form.isPrivate} onChange={e=>setForm({...form,isPrivate:e.target.checked})} style={{width:16,height:16,cursor:"pointer"}}/>
                🔒 Private (PIN protected)
              </label>
              {form.isPrivate && (
                <input value={form.pin} onChange={e=>setForm({...form,pin:e.target.value})}
                  placeholder="Set PIN (optional)" maxLength={8}
                  style={{padding:"11px 14px",borderRadius:12,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:14,outline:"none"}}/>
              )}
              {err && <div style={{fontSize:12,color:"#ef4444",padding:"8px 12px",background:"rgba(239,68,68,0.08)",borderRadius:10}}>{err}</div>}
              <button onClick={create} style={{padding:"13px",borderRadius:14,background:"linear-gradient(135deg,#4f46e5,#7c3aed)",color:"#fff",border:"none",fontWeight:800,fontSize:14,cursor:"pointer"}}>
                🚀 Create Room
              </button>
            </div>
          </div>
        )}

        {/* PIN prompt */}
        {joinPin && (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
            <div style={{background:"var(--surface)",borderRadius:20,padding:24,width:"100%",maxWidth:300,boxShadow:"0 24px 48px rgba(0,0,0,0.4)"}}>
              <div style={{textAlign:"center",marginBottom:16}}>
                <div style={{fontSize:36}}>🔒</div>
                <div style={{fontSize:15,fontWeight:800,color:"var(--text)",marginTop:6}}>Private Room</div>
                <div style={{fontSize:12,color:"var(--sub)",marginTop:4}}>Enter PIN for "{joinPin.room.name}"</div>
              </div>
              <input value={joinPin.val} onChange={e=>setJoinPin({...joinPin,val:e.target.value})}
                placeholder="PIN" maxLength={8} autoFocus type="password"
                onKeyDown={e=>e.key==="Enter"&&join(joinPin.room,joinPin.val)}
                style={{width:"100%",padding:"12px",borderRadius:12,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:16,outline:"none",boxSizing:"border-box",textAlign:"center",letterSpacing:"0.2em",marginBottom:10}}/>
              {err && <div style={{fontSize:12,color:"#ef4444",textAlign:"center",marginBottom:8}}>{err}</div>}
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setJoinPin(null);setErr("");}} style={{flex:1,padding:11,borderRadius:12,border:"1.5px solid var(--border)",background:"transparent",color:"var(--sub)",fontWeight:700,fontSize:13,cursor:"pointer"}}>Cancel</button>
                <button onClick={()=>join(joinPin.room,joinPin.val)} style={{flex:2,padding:11,borderRadius:12,background:"linear-gradient(135deg,#4f46e5,#7c3aed)",color:"#fff",border:"none",fontWeight:800,fontSize:13,cursor:"pointer"}}>Join</button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div style={{textAlign:"center",padding:48,color:"var(--sub)"}}>
            <div style={{fontSize:32,marginBottom:8,animation:"spin 1s linear infinite",display:"inline-block"}}>⏳</div>
            <div>Loading rooms…</div>
          </div>
        )}

        {!loading && rooms.length===0 && !creating && (
          <div style={{textAlign:"center",padding:"60px 20px"}}>
            <div style={{fontSize:56,marginBottom:12}}>🏠</div>
            <div style={{fontSize:17,fontWeight:800,color:"var(--text)",marginBottom:8}}>No active rooms</div>
            <div style={{fontSize:13,color:"var(--sub)",lineHeight:1.6}}>Create a room and invite your friends<br/>to study together!</div>
            <button onClick={()=>setCreating(true)} style={{marginTop:20,padding:"12px 28px",borderRadius:14,background:"linear-gradient(135deg,#4f46e5,#7c3aed)",color:"#fff",border:"none",fontWeight:800,fontSize:14,cursor:"pointer"}}>
              ＋ Create Room
            </button>
          </div>
        )}

        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {rooms.map(room=>{
            const color = SUBJECT_COLORS[room.subject]||"#64748b";
            const full  = room.members.length >= room.maxMembers;
            const mine  = room.members.includes(me);
            const online = (room.onlineMembers||[]).length;
            return (
              <div key={room.id} className="sr-room-card" style={{borderColor:`${color}40`}}>
                <div style={{display:"flex",gap:12,alignItems:"center"}}>
                  {/* Subject icon */}
                  <div style={{width:50,height:50,borderRadius:14,background:`${color}22`,border:`1.5px solid ${color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                    📚
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                      <span style={{fontSize:14,fontWeight:800,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:180}}>{room.name}</span>
                      {room.isPrivate && <span style={{fontSize:9,padding:"1px 7px",borderRadius:20,background:"rgba(239,68,68,0.12)",color:"#ef4444",fontWeight:700}}>🔒 PRIVATE</span>}
                    </div>
                    <div style={{display:"flex",gap:6,marginTop:4,alignItems:"center",flexWrap:"wrap"}}>
                      <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:`${color}20`,color,fontWeight:800}}>{room.subject}</span>
                      <span style={{fontSize:11,color:"var(--sub)"}}>by {room.host}</span>
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:14,fontWeight:900,color:full&&!mine?"#ef4444":"var(--text)"}}>{room.members.length}<span style={{fontSize:10,color:"var(--sub)",fontWeight:400}}>/{room.maxMembers}</span></div>
                    {online>0 && <div style={{fontSize:10,color:"#22c55e",fontWeight:700}}>● {online} online</div>}
                  </div>
                </div>

                {/* Member avatar row */}
                {room.members.length>0 && (
                  <div style={{display:"flex",gap:-4,marginTop:12,alignItems:"center"}}>
                    <div style={{display:"flex",flexDirection:"row"}}>
                      {room.members.slice(0,7).map((m,i)=>(
                        <div key={m} style={{marginLeft:i===0?0:-8,zIndex:room.members.length-i}}>
                          <div style={{width:28,height:28,borderRadius:8,background:avatarColor(m),
                            border:"2px solid var(--surface)",display:"flex",alignItems:"center",
                            justifyContent:"center",fontSize:11,fontWeight:900,color:"#fff"}} title={m}>
                            {m[0].toUpperCase()}
                          </div>
                        </div>
                      ))}
                    </div>
                    {room.members.length>7 && <span style={{fontSize:11,color:"var(--sub)",marginLeft:6}}>+{room.members.length-7} more</span>}
                    {room.timerState?.running && (
                      <span style={{marginLeft:"auto",fontSize:11,padding:"3px 10px",borderRadius:20,background:"rgba(108,127,255,0.15)",color:"var(--purple)",fontWeight:700}}>
                        ⏱ Timer running
                      </span>
                    )}
                  </div>
                )}

                <div style={{display:"flex",gap:8,marginTop:12}}>
                  <button
                    onClick={()=>{ setErr(""); if(room.isPrivate&&!mine) setJoinPin({room,val:""}); else join(room); }}
                    disabled={full&&!mine}
                    className="sr-join-btn"
                    style={{flex:1,marginTop:0,background:mine?"linear-gradient(135deg,#4f46e5,#7c3aed)":full?"var(--border)":"linear-gradient(135deg,#4f46e5,#7c3aed)",
                      color:full&&!mine?"var(--sub)":"#fff",cursor:full&&!mine?"not-allowed":"pointer"}}>
                    {mine?"↩ Re-enter →":full?"Room Full":"Join Room →"}
                  </button>
                  <button onClick={()=>setShareRoom({room})}
                    style={{width:44,borderRadius:14,border:"1.5px solid var(--border)",background:"var(--bg)",
                      color:"var(--sub)",fontSize:18,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    🔗
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {shareRoom && <InviteModal room={shareRoom.room} pin={shareRoom.pin} onClose={()=>setShareRoom(null)}/>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ROOM — full messenger UI
══════════════════════════════════════════════════════════ */
function RoomView({ room: init, onLeave, invitePin }: { room:Room; onLeave:()=>void; invitePin?:string }) {
  const [room,setRoom]       = useState<Room>(init);
  const [msgs,setMsgs]       = useState<Msg[]>([]);
  const [text,setText]       = useState("");
  const [sending,setSending] = useState(false);
  const [tab,setTab]         = useState<"chat"|"members"|"timer">("chat");
  const [reactionFor,setReactionFor] = useState<string|null>(null);
  const [reactions,setReactions]     = useState<Record<string,string[]>>({});
  const [showInvite,setShowInvite]   = useState(false);
  const chatEnd  = useRef<HTMLDivElement>(null);
  const lastTs   = useRef<string>("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const now      = useNow();

  const me     = UN();
  const isHost = room.host === me;
  const color  = SUBJECT_COLORS[room.subject]||"#64748b";
  const onlineList = room.onlineMembers||[];

  /* ── heartbeat every 8s ── */
  useEffect(()=>{
    function beat(){ fetch(`/api/study-rooms/${room.id}/heartbeat`,{method:"POST",headers:xhdr(),body:"{}"}); }
    beat();
    const t=setInterval(beat,8000);
    return()=>clearInterval(t);
  },[room.id]);

  /* ── poll room + messages ── */
  const pollRoom = useCallback(()=>{
    fetch(`/api/study-rooms/${room.id}`).then(r=>r.json()).then(d=>{ if(d.id) setRoom(d); }).catch(()=>{});
    const qs = lastTs.current?`?since=${encodeURIComponent(lastTs.current)}`:"";
    fetch(`/api/study-rooms/${room.id}/messages${qs}`).then(r=>r.json()).then((d:Msg[])=>{
      if(!Array.isArray(d)||!d.length) return;
      setMsgs(prev=>{
        const ids=new Set(prev.map(m=>m.id));
        const fresh=d.filter(m=>!ids.has(m.id));
        if(!fresh.length) return prev;
        lastTs.current=fresh[fresh.length-1].ts;
        return [...prev,...fresh].slice(-300);
      });
    }).catch(()=>{});
  },[room.id]);

  useEffect(()=>{
    fetch(`/api/study-rooms/${room.id}/messages`).then(r=>r.json()).then((d:Msg[])=>{
      if(Array.isArray(d)&&d.length){ setMsgs(d); lastTs.current=d[d.length-1].ts; }
    });
    const t=setInterval(pollRoom,2500);
    return()=>clearInterval(t);
  },[room.id,pollRoom]);

  useEffect(()=>{ if(tab==="chat") chatEnd.current?.scrollIntoView({behavior:"smooth"}); },[msgs,tab]);

  async function send(){
    const t=text.trim();
    if(!t||sending) return;
    setSending(true); setText("");
    await fetch(`/api/study-rooms/${room.id}/messages`,{method:"POST",headers:xhdr(),body:JSON.stringify({text:t})});
    setSending(false);
    setTimeout(()=>inputRef.current?.focus(),50);
  }

  async function leave(){
    await fetch(`/api/study-rooms/${room.id}/leave`,{method:"POST",headers:xhdr(),body:"{}"});
    onLeave();
  }

  async function toggleTimer(){
    const running=!room.timerState.running;
    await fetch(`/api/study-rooms/${room.id}/timer`,{method:"PUT",headers:xhdr(),
      body:JSON.stringify({running,mode:room.timerState.mode,duration:room.timerState.duration})});
    pollRoom();
  }
  async function changeMode(mode:string,duration:number){
    await fetch(`/api/study-rooms/${room.id}/timer`,{method:"PUT",headers:xhdr(),body:JSON.stringify({running:false,mode,duration})});
    pollRoom();
  }

  const timerMs  = room.timerState.running&&room.timerState.endAt ? Math.max(0,room.timerState.endAt-now) : room.timerState.duration*60*1000;
  const timerPct = room.timerState.running&&room.timerState.endAt ? 1-(timerMs/(room.timerState.duration*60*1000)) : 0;

  /* ── group consecutive messages by sender ── */
  const grouped = msgs.map((m,i)=>{
    const prev=msgs[i-1];
    const next=msgs[i+1];
    const isFirst=!prev||prev.username!==m.username||prev.type==="system";
    const isLast=!next||next.username!==m.username||next.type==="system";
    return {...m,isFirst,isLast};
  });

  function addReaction(msgId:string, emoji:string){
    setReactions(prev=>{
      const cur=prev[msgId]||[];
      const already=cur.includes(emoji);
      return {...prev,[msgId]:already?cur.filter(e=>e!==emoji):[...cur,emoji]};
    });
    setReactionFor(null);
  }

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100svh",background:"var(--bg)",overflow:"hidden"}}>

      {/* ── Messenger header ── */}
      <div style={{background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"10px 14px",flexShrink:0,boxShadow:"0 1px 0 var(--border)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={leave} style={{background:"none",border:"none",color:"var(--text)",cursor:"pointer",fontSize:22,padding:"0 4px 0 0",flexShrink:0,lineHeight:1}}>←</button>
          {/* Room avatar */}
          <div style={{width:40,height:40,borderRadius:12,background:`${color}22`,border:`2px solid ${color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
            📚
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:15,fontWeight:800,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{room.name}</div>
            <div style={{display:"flex",gap:5,alignItems:"center",marginTop:1}}>
              <span style={{fontSize:10,padding:"1px 7px",borderRadius:20,background:`${color}20`,color,fontWeight:700}}>{room.subject}</span>
              <span style={{fontSize:11,color:onlineList.length>0?"#22c55e":"var(--sub)"}}>
                {onlineList.length>0?`● ${onlineList.length} online`:`${room.members.length} members`}
              </span>
            </div>
          </div>
          {/* Online avatar stack */}
          <div style={{display:"flex",flexDirection:"row",alignItems:"center"}}>
            {room.members.slice(0,4).map((m,i)=>(
              <div key={m} style={{marginLeft:i===0?0:-8,zIndex:10-i}}>
                <Avatar u={m} size={28} online={onlineList.includes(m)}/>
              </div>
            ))}
            {room.members.length>4 && <span style={{marginLeft:4,fontSize:10,color:"var(--sub)",fontWeight:700}}>+{room.members.length-4}</span>}
          </div>
          {/* Invite button */}
          <button onClick={()=>setShowInvite(true)}
            title="Invite friends"
            style={{marginLeft:6,width:34,height:34,borderRadius:10,border:"1.5px solid var(--border)",
              background:"var(--bg)",color:"var(--sub)",fontSize:16,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            🔗
          </button>
        </div>

        {/* Timer strip — compact */}
        <div style={{marginTop:8,display:"flex",alignItems:"center",gap:8,background:"var(--bg)",borderRadius:10,padding:"7px 10px",border:`1px solid ${room.timerState.running?"var(--purple)":"var(--border)"}`}}>
          <div style={{position:"relative",width:34,height:34,flexShrink:0}}>
            <svg width={34} height={34} viewBox="0 0 34 34">
              <circle cx={17} cy={17} r={14} fill="none" stroke="rgba(108,127,255,0.15)" strokeWidth={3}/>
              <circle cx={17} cy={17} r={14} fill="none" stroke="var(--purple)" strokeWidth={3}
                strokeLinecap="round" strokeDasharray={2*Math.PI*14}
                strokeDashoffset={2*Math.PI*14*(1-timerPct)}
                transform="rotate(-90 17 17)" style={{transition:"stroke-dashoffset 1s linear"}}/>
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:900,color:"var(--purple)",fontFamily:"monospace"}}>
              {room.timerState.running?`${Math.round(timerPct*100)}%`:"⏱"}
            </div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:900,color:"var(--text)",fontFamily:"monospace",lineHeight:1}}>{fmtCountdown(timerMs)}</div>
            <div style={{fontSize:10,color:"var(--sub)"}}>{TIMER_MODES.find(m=>m.id===room.timerState.mode)?.emoji} {room.timerState.mode} · {room.timerState.duration}m</div>
          </div>
          {isHost ? (
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              {TIMER_MODES.map(m=>(
                <button key={m.id} onClick={()=>changeMode(m.id,m.mins)}
                  style={{padding:"4px 7px",borderRadius:7,border:"1px solid var(--border)",
                    background:room.timerState.mode===m.id?"var(--purple)":"transparent",
                    color:room.timerState.mode===m.id?"#fff":"var(--sub)",
                    fontSize:9,cursor:"pointer",fontWeight:700,flexShrink:0}}>
                  {m.emoji}
                </button>
              ))}
              <button onClick={toggleTimer}
                style={{padding:"6px 12px",borderRadius:8,background:room.timerState.running?"#ef4444":"#22c55e",
                  color:"#fff",border:"none",fontWeight:800,fontSize:11,cursor:"pointer",flexShrink:0,marginLeft:2}}>
                {room.timerState.running?"⏹":"▶"}
              </button>
            </div>
          ) : (
            <div style={{fontSize:10,color:"var(--sub)"}}>Host controls timer</div>
          )}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{display:"flex",background:"var(--surface)",borderBottom:"1px solid var(--border)",flexShrink:0}}>
        {(["chat","members"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{flex:1,padding:"9px 0",border:"none",background:"none",
              fontSize:12,fontWeight:tab===t?800:500,
              color:tab===t?"var(--purple)":"var(--sub)",cursor:"pointer",
              borderBottom:tab===t?"2px solid var(--purple)":"2px solid transparent",transition:"all 150ms"}}>
            {t==="chat"?`💬 Messages`:`👥 Members (${room.members.length})`}
          </button>
        ))}
      </div>

      {/* ── CHAT TAB ── */}
      {tab==="chat" && (
        <>
          {/* Chat wallpaper + messages */}
          <div className="sr-chat-bg" style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:2}}>

            {msgs.length===0 && (
              <div style={{textAlign:"center",padding:"48px 20px",color:"var(--sub)"}}>
                <div style={{fontSize:40,marginBottom:10}}>👋</div>
                <div style={{fontSize:14,fontWeight:700,color:"var(--text)",marginBottom:4}}>Start the conversation!</div>
                <div style={{fontSize:12}}>Say hi and let everyone know you're here.</div>
              </div>
            )}

            {grouped.map((m,idx)=>{
              const isMe  = m.username===me;
              const isSys = m.type==="system";
              const rxns  = reactions[m.id]||[];

              if(isSys) return (
                <div key={m.id} style={{textAlign:"center",margin:"6px 0"}}>
                  <span style={{fontSize:11,color:"var(--sub)",background:"var(--surface)",padding:"4px 12px",borderRadius:20,display:"inline-block"}}>
                    {m.text}
                  </span>
                </div>
              );

              return (
                <div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start",gap:1,marginTop:m.isFirst?6:1}}>
                  {/* Sender name for incoming (only on first in group) */}
                  {!isMe && m.isFirst && (
                    <div style={{display:"flex",alignItems:"center",gap:6,paddingLeft:42}}>
                      <span style={{fontSize:11,fontWeight:700,color:avatarColor(m.username)}}>{m.username}</span>
                    </div>
                  )}
                  <div style={{display:"flex",alignItems:"flex-end",gap:6,flexDirection:isMe?"row-reverse":"row",maxWidth:"80%"}}>
                    {/* Avatar — only on last message in group */}
                    <div style={{width:32,flexShrink:0}}>
                      {!isMe && m.isLast && <Avatar u={m.username} size={30} online={onlineList.includes(m.username)}/>}
                    </div>

                    <div style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start",gap:2}}>
                      <div
                        className={isMe?"sr-bubble-me":"sr-bubble-them"}
                        style={{borderRadius:isMe?(m.isFirst?"18px 18px 4px 18px":m.isLast?"18px 4px 18px 18px":"18px 4px 4px 18px"):(m.isFirst?"18px 18px 18px 4px":m.isLast?"4px 18px 18px 18px":"4px 18px 18px 4px")}}
                        onDoubleClick={()=>setReactionFor(reactionFor===m.id?null:m.id)}>
                        {m.text}
                      </div>
                      {/* Reactions */}
                      {rxns.length>0 && (
                        <div style={{display:"flex",gap:2,flexWrap:"wrap",justifyContent:isMe?"flex-end":"flex-start",paddingBottom:2}}>
                          {rxns.map((e,i)=>(
                            <button key={i} onClick={()=>addReaction(m.id,e)}
                              style={{padding:"2px 5px",borderRadius:10,background:"var(--surface)",border:"1px solid var(--border)",fontSize:12,cursor:"pointer"}}>
                              {e}
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Reaction picker */}
                      {reactionFor===m.id && (
                        <div style={{display:"flex",gap:4,background:"var(--surface)",borderRadius:24,padding:"6px 10px",boxShadow:"0 4px 16px rgba(0,0,0,0.2)",border:"1px solid var(--border)",zIndex:10}}>
                          {QUICK_REACTIONS.map(e=>(
                            <button key={e} onClick={()=>addReaction(m.id,e)}
                              style={{background:"none",border:"none",fontSize:18,cursor:"pointer",padding:"0 2px",lineHeight:1}}>
                              {e}
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Timestamp — only on last bubble of group */}
                      {m.isLast && (
                        <span style={{fontSize:10,color:"var(--sub)",paddingLeft:4,paddingRight:4}}>{tsLabel(m.ts)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEnd}/>
          </div>

          {/* ── Input bar ── */}
          <div style={{padding:"10px 12px",borderTop:"1px solid var(--border)",background:"var(--surface)",flexShrink:0,display:"flex",gap:8,alignItems:"flex-end"}}>
            <textarea ref={inputRef} value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message…"
              rows={1} maxLength={500}
              onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} }}
              style={{flex:1,padding:"10px 14px",borderRadius:22,border:"1.5px solid var(--border)",background:"var(--bg)",
                color:"var(--text)",fontSize:13,outline:"none",resize:"none",fontFamily:"inherit",
                lineHeight:1.5,maxHeight:100,overflowY:"auto"}}/>
            <button onClick={send} disabled={!text.trim()||sending}
              style={{width:42,height:42,borderRadius:21,background:text.trim()?"linear-gradient(135deg,#4f46e5,#7c3aed)":"var(--border)",
                color:text.trim()?"#fff":"var(--sub)",border:"none",fontWeight:900,fontSize:16,cursor:text.trim()?"pointer":"not-allowed",
                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 150ms"}}>
              ➤
            </button>
          </div>
        </>
      )}

      {/* ── MEMBERS TAB ── */}
      {tab==="members" && (
        <div style={{flex:1,overflowY:"auto",padding:"10px 14px"}}>
          {/* Online section */}
          {onlineList.length>0 && (
            <>
              <div style={{fontSize:10,fontWeight:800,color:"#22c55e",letterSpacing:"0.1em",padding:"4px 4px 8px"}}>● ONLINE NOW — {onlineList.length}</div>
              {onlineList.map(m=><MemberRow key={m} username={m} host={room.host} isMe={m===me} online={true}/>)}
            </>
          )}
          {/* Offline/other section */}
          {room.members.filter(m=>!onlineList.includes(m)).length>0 && (
            <>
              <div style={{fontSize:10,fontWeight:800,color:"var(--sub)",letterSpacing:"0.1em",padding:"12px 4px 8px"}}>MEMBERS</div>
              {room.members.filter(m=>!onlineList.includes(m)).map(m=><MemberRow key={m} username={m} host={room.host} isMe={m===me} online={false}/>)}
            </>
          )}
        </div>
      )}

      {showInvite && <InviteModal room={room} pin={invitePin} onClose={()=>setShowInvite(false)}/>}
    </div>
  );
}

function MemberRow({ username, host, isMe, online }: { username:string; host:string; isMe:boolean; online:boolean }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 10px",borderRadius:14,
      background:isMe?"rgba(108,127,255,0.06)":"transparent",marginBottom:4,
      border:isMe?"1px solid rgba(108,127,255,0.15)":"1px solid transparent"}}>
      <Avatar u={username} size={42} online={online}/>
      <div style={{flex:1}}>
        <div style={{fontSize:14,fontWeight:700,color:"var(--text)",display:"flex",alignItems:"center",gap:6}}>
          {username}
          {username===host && <span style={{fontSize:10,padding:"1px 6px",borderRadius:20,background:"rgba(245,158,11,0.15)",color:"#f59e0b",fontWeight:800}}>👑 Host</span>}
          {isMe && <span style={{fontSize:10,padding:"1px 6px",borderRadius:20,background:"rgba(108,127,255,0.15)",color:"var(--purple)",fontWeight:800}}>You</span>}
        </div>
        <div style={{fontSize:11,color:online?"#22c55e":"var(--sub)",marginTop:1}}>
          {online?"● Active now":"● Away"}
        </div>
      </div>
      {/* Avatar initial as profile card */}
      <div style={{width:36,height:36,borderRadius:10,background:avatarColor(username),display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"#fff"}}>
        {username[0]?.toUpperCase()}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ENTRY POINT
══════════════════════════════════════════════════════════ */
export default function StudyRoom() {
  const [activeRoom,  setActiveRoom]  = useState<Room|null>(null);
  const [invitePin,   setInvitePin]   = useState<string|undefined>(undefined);
  const [,params]   = useRoute("/study-room/:id");
  const [,navigate] = useLocation();

  /* ── auto-join via direct URL (e.g. shared invite link) ── */
  useEffect(()=>{
    if(params?.id && !activeRoom){
      /* extract PIN from URL hash: /study-room/abc#pin=1234 */
      const hash  = window.location.hash; // "#pin=1234"
      const match = hash.match(/[#&]pin=([^&]*)/);
      const hashPin = match ? decodeURIComponent(match[1]) : undefined;

      fetch(`/api/study-rooms/${params.id}`)
        .then(r=>r.json()).then(d=>{
          if(d.id){
            fetch(`/api/study-rooms/${d.id}/join`,{
              method:"POST",headers:xhdr(),
              body:JSON.stringify({ pin: hashPin||"" })
            }).then(r=>r.json()).then(j=>{
              if(j.id){ setActiveRoom(j); setInvitePin(hashPin); }
            });
          }
        }).catch(()=>{});
    }
  },[params?.id]);

  if(activeRoom) return (
    <RoomView room={activeRoom} invitePin={invitePin}
      onLeave={()=>{ setActiveRoom(null); setInvitePin(undefined); navigate("/study-room"); }}/>
  );
  return (
    <Lobby onEnter={(r,pin)=>{ setActiveRoom(r); setInvitePin(pin); navigate(`/study-room/${r.id}`); }}/>
  );
}
