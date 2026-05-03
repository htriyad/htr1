import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import Header from "../components/Header";

const UN = () => localStorage.getItem("rr_username") || "guest";
const xhdr = () => ({ "Content-Type": "application/json", "x-username": UN() });

interface Room {
  id: string; name: string; subject: string; host: string;
  members: string[]; maxMembers: number; isPrivate: boolean;
  timerState: { running: boolean; endAt: number | null; mode: string; duration: number };
  lastActivity: string;
}
interface Msg { id: string; username: string; text: string; type: "chat" | "system"; ts: string; }

const SUBJECTS = ["General","Physics","Chemistry","Biology","Math","English","Bangla","ICT","History","Geography","BCS Prep","Admission"];
const TIMER_MODES = [
  { id:"focus",   label:"🎯 Focus",  mins:25 },
  { id:"short",   label:"☕ Short",  mins:5  },
  { id:"long",    label:"🌿 Long",   mins:15 },
  { id:"exam",    label:"📝 Exam",   mins:60 },
];
const SUBJECT_COLORS: Record<string,string> = {
  Physics:"#3b82f6",Chemistry:"#8b5cf6",Biology:"#10b981",Math:"#f59e0b",
  English:"#06b6d4",Bangla:"#ec4899",ICT:"#6366f1",General:"#64748b",
  History:"#a16207",Geography:"#0891b2","BCS Prep":"#dc2626","Admission":"#7c3aed",
};

function useNow() {
  const [t,setT]=useState(Date.now());
  useEffect(()=>{const id=setInterval(()=>setT(Date.now()),1000);return()=>clearInterval(id);},[]);
  return t;
}
function fmtCountdown(ms:number){
  if(ms<=0) return "00:00";
  const s=Math.ceil(ms/1000);
  return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}
function tsLabel(ts:string){
  const d=new Date(ts);
  return d.toLocaleTimeString("en-BD",{hour:"2-digit",minute:"2-digit"});
}

/* ══════════════════════════════════════════════════════════
   LOBBY
══════════════════════════════════════════════════════════ */
function Lobby({ onEnter }: { onEnter:(room:Room,isNew?:boolean)=>void }) {
  const [rooms,setRooms]   = useState<Room[]>([]);
  const [loading,setLoad]  = useState(true);
  const [creating,setCreating] = useState(false);
  const [joinPin,setJoinPin]   = useState<{room:Room;val:string}|null>(null);
  const [form,setForm] = useState({ name:"", subject:"General", maxMembers:"8", isPrivate:false, pin:"" });
  const [err,setErr]   = useState("");
  const [, navigate]   = useLocation();

  const loadRooms = useCallback(()=>{
    fetch("/api/study-rooms").then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setRooms(d); setLoad(false); }).catch(()=>setLoad(false));
  },[]);
  useEffect(()=>{ loadRooms(); const t=setInterval(loadRooms,6000); return()=>clearInterval(t); },[loadRooms]);

  async function create(){
    setErr("");
    if(!form.name.trim()){setErr("Room name is required");return;}
    const r=await fetch("/api/study-rooms",{method:"POST",headers:xhdr(),body:JSON.stringify({...form,maxMembers:Number(form.maxMembers)})});
    const d=await r.json();
    if(d.error){setErr(d.error);return;}
    onEnter(d,true);
  }

  async function join(room:Room,pin?:string){
    const r=await fetch(`/api/study-rooms/${room.id}/join`,{method:"POST",headers:xhdr(),body:JSON.stringify({pin:pin||""})});
    const d=await r.json();
    if(d.error){setErr(d.error);return;}
    onEnter(d);
  }

  const username = UN();

  return (
    <div style={{background:"var(--bg)",minHeight:"100svh"}}>
      <Header onMenuClick={()=>navigate("/")} />
      <div style={{padding:"14px 14px 100px"}}>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div>
            <div style={{fontSize:20,fontWeight:900,color:"var(--text)"}}>👥 Group Study Rooms</div>
            <div style={{fontSize:12,color:"var(--sub)",marginTop:2}}>Study together, stay motivated</div>
          </div>
          <button onClick={()=>setCreating(c=>!c)}
            style={{padding:"9px 16px",borderRadius:12,background:"var(--purple)",color:"#fff",border:"none",fontWeight:800,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
            {creating?"✕ Cancel":"＋ Create"}
          </button>
        </div>

        {/* Create room form */}
        {creating && (
          <div style={{background:"var(--surface)",borderRadius:16,padding:16,marginBottom:16,border:"1.5px solid var(--border)"}}>
            <div style={{fontSize:14,fontWeight:800,color:"var(--text)",marginBottom:12}}>🆕 New Study Room</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
                placeholder="Room name (e.g. SSC Physics Group)" maxLength={50}
                style={{padding:"10px 12px",borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13,outline:"none"}}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <select value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}
                  style={{padding:"10px 12px",borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13}}>
                  {SUBJECTS.map(s=><option key={s}>{s}</option>)}
                </select>
                <select value={form.maxMembers} onChange={e=>setForm({...form,maxMembers:e.target.value})}
                  style={{padding:"10px 12px",borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13}}>
                  {[2,4,6,8,10,15,20].map(n=><option key={n} value={n}>{n} members max</option>)}
                </select>
              </div>
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:"var(--sub)"}}>
                <input type="checkbox" checked={form.isPrivate} onChange={e=>setForm({...form,isPrivate:e.target.checked})}/>
                🔒 Private room (PIN protected)
              </label>
              {form.isPrivate && (
                <input value={form.pin} onChange={e=>setForm({...form,pin:e.target.value})}
                  placeholder="Set PIN (optional)" maxLength={8} type="text"
                  style={{padding:"10px 12px",borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13,outline:"none"}}/>
              )}
              {err && <div style={{fontSize:12,color:"#dc2626",padding:"8px 10px",background:"rgba(220,38,38,0.08)",borderRadius:8}}>{err}</div>}
              <button onClick={create}
                style={{padding:"12px",borderRadius:12,background:"var(--purple)",color:"#fff",border:"none",fontWeight:800,fontSize:14,cursor:"pointer"}}>
                🚀 Create Room
              </button>
            </div>
          </div>
        )}

        {/* PIN prompt modal */}
        {joinPin && (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
            <div style={{background:"var(--surface)",borderRadius:20,padding:24,width:"100%",maxWidth:320}}>
              <div style={{fontSize:16,fontWeight:800,color:"var(--text)",marginBottom:4}}>🔒 Private Room</div>
              <div style={{fontSize:13,color:"var(--sub)",marginBottom:14}}>Enter the PIN to join "{joinPin.room.name}"</div>
              <input value={joinPin.val} onChange={e=>setJoinPin({...joinPin,val:e.target.value})}
                placeholder="Enter PIN" maxLength={8} autoFocus
                style={{width:"100%",padding:"11px 12px",borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:14,outline:"none",boxSizing:"border-box",marginBottom:10}}
                onKeyDown={e=>{ if(e.key==="Enter") join(joinPin.room,joinPin.val); }}/>
              {err && <div style={{fontSize:12,color:"#dc2626",marginBottom:8}}>{err}</div>}
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setJoinPin(null)} style={{flex:1,padding:10,borderRadius:10,border:"1.5px solid var(--border)",background:"transparent",color:"var(--sub)",fontWeight:700,fontSize:13,cursor:"pointer"}}>Cancel</button>
                <button onClick={()=>join(joinPin.room,joinPin.val)} style={{flex:2,padding:10,borderRadius:10,background:"var(--purple)",color:"#fff",border:"none",fontWeight:800,fontSize:13,cursor:"pointer"}}>Join</button>
              </div>
            </div>
          </div>
        )}

        {loading && <div style={{textAlign:"center",padding:40,color:"var(--sub)"}}>Loading rooms…</div>}

        {!loading && rooms.length===0 && !creating && (
          <div style={{textAlign:"center",padding:"48px 20px",color:"var(--sub)"}}>
            <div style={{fontSize:48,marginBottom:12}}>🏠</div>
            <div style={{fontSize:16,fontWeight:700,color:"var(--text)",marginBottom:6}}>No active rooms</div>
            <div style={{fontSize:13}}>Create the first study room and invite friends!</div>
          </div>
        )}

        {rooms.length > 0 && (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {rooms.map(room=>{
              const color = SUBJECT_COLORS[room.subject]||"#64748b";
              const full  = room.members.length >= room.maxMembers;
              const mine  = room.members.includes(username);
              return (
                <div key={room.id} style={{background:"var(--surface)",borderRadius:16,padding:14,border:`1.5px solid ${color}33`,boxShadow:`0 2px 10px ${color}15`}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                    <div style={{width:42,height:42,borderRadius:12,background:`${color}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:`1.5px solid ${color}44`,fontSize:18}}>
                      📚
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                        <span style={{fontSize:14,fontWeight:800,color:"var(--text)"}}>{room.name}</span>
                        {room.isPrivate && <span style={{fontSize:10,padding:"1px 6px",borderRadius:20,background:"rgba(220,38,38,0.1)",color:"#dc2626"}}>🔒 Private</span>}
                      </div>
                      <div style={{display:"flex",gap:8,marginTop:3,flexWrap:"wrap",alignItems:"center"}}>
                        <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:`${color}20`,color,fontWeight:700}}>{room.subject}</span>
                        <span style={{fontSize:11,color:"var(--sub)"}}>Host: {room.host}</span>
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:13,fontWeight:800,color:full?"#dc2626":"var(--green)"}}>{room.members.length}/{room.maxMembers}</div>
                      <div style={{fontSize:10,color:"var(--sub)"}}>members</div>
                    </div>
                  </div>
                  {/* Member avatars */}
                  <div style={{display:"flex",gap:4,marginTop:10,flexWrap:"wrap",alignItems:"center"}}>
                    {room.members.slice(0,8).map(m=>(
                      <div key={m} style={{width:28,height:28,borderRadius:8,background:`hsl(${m.charCodeAt(0)*37%360},60%,55%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:"#fff",flexShrink:0}} title={m}>
                        {m[0].toUpperCase()}
                      </div>
                    ))}
                    {room.members.length>8 && <span style={{fontSize:11,color:"var(--sub)"}}>+{room.members.length-8}</span>}
                  </div>
                  {/* Timer status */}
                  {room.timerState.running && room.timerState.endAt && (
                    <div style={{marginTop:8,padding:"5px 10px",borderRadius:8,background:"rgba(108,127,255,0.1)",border:"1px solid rgba(108,127,255,0.2)",fontSize:12,color:"var(--purple)",display:"inline-flex",alignItems:"center",gap:6}}>
                      ⏱ {room.timerState.mode} session running
                    </div>
                  )}
                  <button
                    onClick={()=>{ setErr(""); if(room.isPrivate&&!mine) setJoinPin({room,val:""}); else join(room); }}
                    disabled={full&&!mine}
                    style={{marginTop:10,width:"100%",padding:"10px",borderRadius:12,border:"none",
                      background:mine?"var(--purple)":full?"var(--border)":"linear-gradient(135deg,#4f46e5,#7c3aed)",
                      color:full&&!mine?"var(--sub)":"#fff",fontWeight:800,fontSize:13,cursor:full&&!mine?"not-allowed":"pointer"}}>
                    {mine?"↩ Re-enter Room":full?"Room Full":"Join Room →"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ROOM VIEW
══════════════════════════════════════════════════════════ */
function RoomView({ room: initialRoom, onLeave }: { room: Room; onLeave:()=>void }) {
  const [room,setRoom]       = useState<Room>(initialRoom);
  const [msgs,setMsgs]       = useState<Msg[]>([]);
  const [text,setText]       = useState("");
  const [sending,setSending] = useState(false);
  const [tab,setTab]         = useState<"chat"|"members">("chat");
  const chatEnd              = useRef<HTMLDivElement>(null);
  const lastTs               = useRef<string>("");
  const now                  = useNow();

  const username = UN();
  const isHost   = room.host === username;
  const color    = SUBJECT_COLORS[room.subject]||"#64748b";

  // Poll room state + messages
  const pollRoom = useCallback(()=>{
    fetch(`/api/study-rooms/${room.id}`).then(r=>r.json()).then(d=>{ if(d.id) setRoom(d); }).catch(()=>{});
    const qs=lastTs.current?`?since=${encodeURIComponent(lastTs.current)}`:"";
    fetch(`/api/study-rooms/${room.id}/messages${qs}`).then(r=>r.json()).then((d:Msg[])=>{
      if(!Array.isArray(d)||d.length===0) return;
      setMsgs(prev=>{
        const ids=new Set(prev.map(m=>m.id));
        const fresh=d.filter(m=>!ids.has(m.id));
        if(!fresh.length) return prev;
        lastTs.current=fresh[fresh.length-1].ts;
        return [...prev,...fresh].slice(-200);
      });
    }).catch(()=>{});
  },[room.id]);

  // Initial load
  useEffect(()=>{
    fetch(`/api/study-rooms/${room.id}/messages`).then(r=>r.json()).then((d:Msg[])=>{
      if(Array.isArray(d)&&d.length){setMsgs(d);lastTs.current=d[d.length-1].ts;}
    }).catch(()=>{});
    const t=setInterval(pollRoom,2500);
    return()=>clearInterval(t);
  },[room.id,pollRoom]);

  useEffect(()=>{ chatEnd.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);

  async function send(){
    if(!text.trim()||sending) return;
    setSending(true);
    await fetch(`/api/study-rooms/${room.id}/messages`,{method:"POST",headers:xhdr(),body:JSON.stringify({text})});
    setText(""); setSending(false);
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

  async function setMode(mode:string,duration:number){
    if(room.timerState.running) await fetch(`/api/study-rooms/${room.id}/timer`,{method:"PUT",headers:xhdr(),body:JSON.stringify({running:false,mode,duration})});
    setRoom(r=>({...r,timerState:{...r.timerState,running:false,mode,duration,endAt:null}}));
  }

  const timerMs  = room.timerState.running&&room.timerState.endAt ? Math.max(0,room.timerState.endAt-now) : room.timerState.duration*60*1000;
  const timerPct = room.timerState.running&&room.timerState.endAt ? 1-(timerMs/(room.timerState.duration*60*1000)) : 0;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100svh",background:"var(--bg)"}}>
      {/* Header */}
      <div style={{background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"10px 14px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={leave} style={{background:"none",border:"none",color:"var(--sub)",cursor:"pointer",fontSize:20,padding:0,flexShrink:0}}>←</button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:800,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{room.name}</div>
            <div style={{display:"flex",gap:6,alignItems:"center",marginTop:1}}>
              <span style={{fontSize:10,padding:"1px 6px",borderRadius:20,background:`${color}20`,color,fontWeight:700}}>{room.subject}</span>
              <span style={{fontSize:11,color:"var(--sub)"}}>Host: {room.host}</span>
              <span style={{fontSize:11,color:"var(--sub)"}}>·</span>
              <span style={{fontSize:11,color:"var(--green)",fontWeight:700}}>{room.members.length}/{room.maxMembers} online</span>
            </div>
          </div>
        </div>

        {/* Shared timer strip */}
        <div style={{marginTop:10,background:"var(--bg)",borderRadius:12,padding:"10px 12px",border:`1.5px solid ${room.timerState.running?"var(--purple)":"var(--border)"}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {/* Circular mini-ring */}
            <div style={{position:"relative",width:48,height:48,flexShrink:0}}>
              <svg width={48} height={48} viewBox="0 0 48 48">
                <circle cx={24} cy={24} r={20} fill="none" stroke="rgba(108,127,255,0.15)" strokeWidth={4}/>
                <circle cx={24} cy={24} r={20} fill="none" stroke="var(--purple)" strokeWidth={4}
                  strokeLinecap="round" strokeDasharray={2*Math.PI*20} strokeDashoffset={2*Math.PI*20*(1-timerPct)}
                  transform="rotate(-90 24 24)" style={{transition:"stroke-dashoffset 1s linear"}}/>
              </svg>
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:"var(--purple)",fontFamily:"monospace"}}>
                {room.timerState.running?Math.round(timerPct*100)+"%":"▶"}
              </div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:18,fontWeight:900,color:"var(--text)",fontFamily:"monospace",lineHeight:1}}>{fmtCountdown(timerMs)}</div>
              <div style={{fontSize:11,color:"var(--sub)",marginTop:1}}>{TIMER_MODES.find(m=>m.id===room.timerState.mode)?.label||"Focus"} · {room.timerState.duration}m</div>
            </div>
            {isHost ? (
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                {/* Mode switcher */}
                <div style={{display:"flex",gap:4}}>
                  {TIMER_MODES.map(m=>(
                    <button key={m.id} onClick={()=>setMode(m.id,m.mins)}
                      style={{padding:"4px 8px",borderRadius:8,border:"1px solid var(--border)",background:room.timerState.mode===m.id?"var(--purple)":"transparent",color:room.timerState.mode===m.id?"#fff":"var(--sub)",fontSize:10,cursor:"pointer",fontWeight:700}}>
                      {m.label.split(" ")[0]}
                    </button>
                  ))}
                </div>
                <button onClick={toggleTimer}
                  style={{padding:"8px 14px",borderRadius:10,background:room.timerState.running?"#dc2626":"var(--green)",color:"#fff",border:"none",fontWeight:800,fontSize:12,cursor:"pointer",flexShrink:0}}>
                  {room.timerState.running?"⏹ Stop":"▶ Start"}
                </button>
              </div>
            ) : (
              <div style={{fontSize:11,color:"var(--sub)",textAlign:"right"}}>Only host<br/>can control</div>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{display:"flex",background:"var(--surface)",borderBottom:"1px solid var(--border)",flexShrink:0}}>
        {(["chat","members"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{flex:1,padding:"10px 0",border:"none",background:"none",fontSize:13,fontWeight:tab===t?800:500,color:tab===t?"var(--purple)":"var(--sub)",cursor:"pointer",borderBottom:tab===t?"2px solid var(--purple)":"2px solid transparent"}}>
            {t==="chat"?`💬 Chat`:`👥 Members (${room.members.length})`}
          </button>
        ))}
      </div>

      {/* Chat */}
      {tab==="chat" && (
        <>
          <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
            {msgs.map(m=>{
              const isMe = m.username===username;
              const isSys = m.type==="system";
              if(isSys) return (
                <div key={m.id} style={{textAlign:"center",fontSize:11,color:"var(--sub)",padding:"2px 0"}}>{m.text}</div>
              );
              return (
                <div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start",gap:2}}>
                  {!isMe && <span style={{fontSize:10,color:"var(--sub)",paddingLeft:4}}>{m.username}</span>}
                  <div style={{maxWidth:"78%",padding:"9px 12px",borderRadius:isMe?"14px 14px 4px 14px":"14px 14px 14px 4px",
                    background:isMe?"var(--purple)":"var(--surface)",
                    color:isMe?"#fff":"var(--text)",fontSize:13,lineHeight:1.5,wordBreak:"break-word",
                    border:isMe?"none":"1px solid var(--border)"}}>
                    {m.text}
                  </div>
                  <span style={{fontSize:10,color:"var(--sub)"}}>{tsLabel(m.ts)}</span>
                </div>
              );
            })}
            {msgs.length===0 && <div style={{textAlign:"center",color:"var(--sub)",padding:"32px 0",fontSize:13}}>Be the first to say hi! 👋</div>}
            <div ref={chatEnd}/>
          </div>
          <div style={{padding:"10px 14px",borderTop:"1px solid var(--border)",background:"var(--surface)",flexShrink:0,display:"flex",gap:8}}>
            <input value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message…"
              onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} }}
              style={{flex:1,padding:"10px 14px",borderRadius:24,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13,outline:"none"}}/>
            <button onClick={send} disabled={!text.trim()||sending}
              style={{padding:"10px 18px",borderRadius:24,background:"var(--purple)",color:"#fff",border:"none",fontWeight:800,fontSize:13,cursor:"pointer",flexShrink:0,opacity:(!text.trim()||sending)?0.5:1}}>
              ➤
            </button>
          </div>
        </>
      )}

      {/* Members */}
      {tab==="members" && (
        <div style={{flex:1,overflowY:"auto",padding:"12px 14px"}}>
          {room.members.map(m=>{
            const avatarColor=`hsl(${m.charCodeAt(0)*37%360},60%,55%)`;
            return (
              <div key={m} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:12,background:"var(--surface)",marginBottom:8,border:"1px solid var(--border)"}}>
                <div style={{width:38,height:38,borderRadius:10,background:avatarColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"#fff",flexShrink:0}}>
                  {m[0].toUpperCase()}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:"var(--text)"}}>{m}</div>
                  {m===room.host && <div style={{fontSize:10,color:"#f59e0b",fontWeight:700}}>👑 Host</div>}
                  {m===username && <div style={{fontSize:10,color:"var(--purple)",fontWeight:700}}>You</div>}
                </div>
                <div style={{width:8,height:8,borderRadius:"50%",background:"var(--green)",flexShrink:0}} title="Online"/>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ENTRY POINT — handles /study-room and /study-room/:id
══════════════════════════════════════════════════════════ */
export default function StudyRoom() {
  const [activeRoom,setActiveRoom] = useState<Room|null>(null);
  const [,params] = useRoute("/study-room/:id");
  const [,navigate] = useLocation();

  // Auto-join if URL has a room id
  useEffect(()=>{
    if(params?.id && !activeRoom){
      fetch(`/api/study-rooms/${params.id}`).then(r=>r.json()).then(d=>{
        if(d.id){
          fetch(`/api/study-rooms/${d.id}/join`,{method:"POST",headers:xhdr(),body:"{}"}).then(r=>r.json()).then(j=>{ if(j.id) setActiveRoom(j); });
        }
      }).catch(()=>{});
    }
  },[params?.id]);

  if(activeRoom) return <RoomView room={activeRoom} onLeave={()=>{ setActiveRoom(null); navigate("/study-room"); }}/>;
  return <Lobby onEnter={(r)=>{ setActiveRoom(r); navigate(`/study-room/${r.id}`); }}/>;
}
