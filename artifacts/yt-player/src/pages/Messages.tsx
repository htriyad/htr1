import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import Header from "../components/Header";

const UN = () => localStorage.getItem("rr_username") || "guest";
const xhdr = () => ({ "Content-Type": "application/json", "x-username": UN() });
function timeAgo(ts: string) {
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  if (d < 60) return "Just now"; if (d < 3600) return `${Math.floor(d/60)}m`;
  if (d < 86400) return `${Math.floor(d/3600)}h`; return `${Math.floor(d/86400)}d`;
}
function avatarColor(u: string) {
  const p = ["#7c3aed","#0ea5e9","#f59e0b","#ef4444","#10b981","#6366f1","#ec4899","#14b8a6"];
  let n=0; for(const c of u) n+=c.charCodeAt(0); return p[n%p.length];
}
function Avatar({ u, size=36, online=false }: { u:string; size?:number; online?:boolean }) {
  return (
    <div style={{ position:"relative",flexShrink:0 }}>
      <div style={{ width:size,height:size,borderRadius:size/2.5,background:avatarColor(u),
        display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.44,fontWeight:900,color:"#fff" }}>
        {u[0]?.toUpperCase()}
      </div>
      {online && <div style={{ position:"absolute",bottom:1,right:1,width:10,height:10,borderRadius:"50%",background:"#22c55e",border:"2px solid var(--bg)" }}/>}
    </div>
  );
}

const STUN = { iceServers: [{ urls:"stun:stun.l.google.com:19302" },{ urls:"stun:stun1.l.google.com:19302" }] };

interface Thread { id:string; participants:string[]; lastMsg?:string; lastAt?:string; updatedAt:string; }
interface DMsg { id:string; threadId:string; author:string; text?:string; audioData?:string; imageData?:string; ts:string; }

/* ── voice hook ─────────────────────────────────────────── */
function useVoice() {
  const [recording, setRec] = useState(false);
  const [data, setData] = useState<string|null>(null);
  const [secs, setSecs] = useState(0);
  const mr = useRef<MediaRecorder|null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const timer = useRef<ReturnType<typeof setInterval>|null>(null);
  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      const rec = new MediaRecorder(stream); mr.current=rec; chunks.current=[];
      rec.ondataavailable = e => { if(e.data.size) chunks.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: rec.mimeType||"audio/webm" });
        const reader = new FileReader(); reader.onload=()=>setData(reader.result as string);
        reader.readAsDataURL(blob); stream.getTracks().forEach(t=>t.stop());
      };
      rec.start(); setRec(true); setSecs(0);
      timer.current = setInterval(()=>setSecs(s=>s+1), 1000);
    } catch { alert("Microphone access denied"); }
  }, []);
  const stop = useCallback(() => { mr.current?.stop(); setRec(false); if(timer.current) clearInterval(timer.current); }, []);
  const clear = useCallback(() => { setData(null); setSecs(0); }, []);
  return { recording, data, secs, start, stop, clear };
}

/* ══════════════════════════════════════════════════════════
   WEBRTC CALL OVERLAY
══════════════════════════════════════════════════════════ */
interface CallOverlayProps {
  callId: string; caller: string; callee: string;
  isIncoming: boolean; callType: "audio"|"video";
  offer?: any;
  onEnd: () => void;
}

function CallOverlay({ callId, caller, callee, isIncoming, callType, offer, onEnd }: CallOverlayProps) {
  const me = UN();
  const other = me === caller ? callee : caller;
  const [status, setStatus] = useState<"ringing"|"connecting"|"active"|"ended">(isIncoming ? "ringing" : "connecting");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [duration, setDuration] = useState(0);

  const pcRef = useRef<RTCPeerConnection|null>(null);
  const localStream = useRef<MediaStream|null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const candidateQueue = useRef<any[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const durRef = useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(() => {
    if (status === "active") {
      durRef.current = setInterval(() => setDuration(d => d+1), 1000);
      return () => { if(durRef.current) clearInterval(durRef.current); };
    }
    return undefined;
  }, [status]);

  function fmtDur(s: number) {
    return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  }

  async function setupPC() {
    const pc = new RTCPeerConnection(STUN);
    pcRef.current = pc;

    // Get local media
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true, video: callType==="video" });
      localStream.current = stream;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch { /* audio only fallback */
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
        localStream.current = stream;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
      } catch { console.warn("No media access"); }
    }

    pc.ontrack = e => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };

    pc.onicecandidate = async e => {
      if (e.candidate) {
        await fetch(`/api/calls/${callId}/candidate`, { method:"POST", headers:xhdr(), body:JSON.stringify({ candidate:e.candidate }) });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setStatus("active");
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") endCall();
    };

    return pc;
  }

  async function startCaller() {
    const pc = await setupPC();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await fetch("/api/calls", { method:"POST", headers:xhdr(), body:JSON.stringify({ callee, type:callType, offer }) });
    // Find the call id by polling
    pollForAnswer(pc);
  }

  async function acceptCall() {
    setStatus("connecting");
    const pc = await setupPC();
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    // flush queued candidates
    for (const c of candidateQueue.current) await pc.addIceCandidate(new RTCIceCandidate(c));
    candidateQueue.current = [];
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await fetch(`/api/calls/${callId}/answer`, { method:"PATCH", headers:xhdr(), body:JSON.stringify({ answer }) });
    pollForCandidates(pc);
  }

  function pollForAnswer(pc: RTCPeerConnection) {
    pollRef.current = setInterval(async () => {
      const r = await fetch(`/api/calls/${callId}`, { headers:xhdr() });
      const d = await r.json();
      if (!d || d.status === "ended" || d.status === "rejected") { endCall(); return; }
      if (d.answer && pc.signalingState === "have-local-offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(d.answer));
        clearInterval(pollRef.current!);
        pollForCandidates(pc);
      }
    }, 1000);
  }

  function pollForCandidates(pc: RTCPeerConnection) {
    let lastCnt = 0;
    pollRef.current = setInterval(async () => {
      const r = await fetch(`/api/calls/${callId}`, { headers:xhdr() });
      const d = await r.json();
      if (!d || d.status === "ended") { endCall(); return; }
      const candidates = me === d.caller ? d.calleeCandidates : d.callerCandidates;
      for (let i = lastCnt; i < candidates.length; i++) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidates[i])); } catch {}
      }
      lastCnt = candidates.length;
    }, 1000);
  }

  function endCall() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (durRef.current) clearInterval(durRef.current);
    localStream.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    fetch(`/api/calls/${callId}`, { method:"DELETE", headers:xhdr() }).catch(()=>{});
    setStatus("ended");
    setTimeout(onEnd, 800);
  }

  async function reject() {
    await fetch(`/api/calls/${callId}/reject`, { method:"PATCH", headers:xhdr(), body:"{}" });
    onEnd();
  }

  useEffect(() => {
    if (!isIncoming) startCaller();
    return () => { if(pollRef.current) clearInterval(pollRef.current); };
  }, []);

  function toggleMute() {
    localStream.current?.getAudioTracks().forEach(t => { t.enabled = muted; });
    setMuted(m => !m);
  }
  function toggleCam() {
    localStream.current?.getVideoTracks().forEach(t => { t.enabled = camOff; });
    setCamOff(c => !c);
  }

  const isVideo = callType === "video";

  return (
    <div style={{ position:"fixed",inset:0,zIndex:9999,background:"#0d0d1a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between",padding:"40px 20px 50px" }}>
      {/* Video area */}
      {isVideo && (
        <div style={{ position:"absolute",inset:0,zIndex:0,background:"#000" }}>
          <video ref={remoteVideoRef} autoPlay playsInline style={{ width:"100%",height:"100%",objectFit:"cover",opacity:status==="active"?1:0.4 }}/>
          <video ref={localVideoRef} autoPlay playsInline muted style={{ position:"absolute",top:16,right:16,width:100,height:140,objectFit:"cover",borderRadius:14,border:"2px solid rgba(255,255,255,0.3)",zIndex:10 }}/>
        </div>
      )}

      {/* Info */}
      <div style={{ zIndex:10,textAlign:"center" }}>
        <Avatar u={other} size={88}/>
        <div style={{ fontSize:24,fontWeight:900,color:"#fff",marginTop:16 }}>{other}</div>
        <div style={{ fontSize:14,color:"rgba(255,255,255,0.6)",marginTop:6 }}>
          {status === "ringing" ? isIncoming ? `Incoming ${callType} call…` : `Calling…` :
           status === "connecting" ? "Connecting…" :
           status === "active" ? fmtDur(duration) : "Call ended"}
        </div>
        {!isVideo && <div style={{ fontSize:13,color:"rgba(255,255,255,0.4)",marginTop:4 }}>{callType === "audio" ? "🎵 Audio call" : "📹 Video call"}</div>}
      </div>

      {/* Controls */}
      <div style={{ zIndex:10,display:"flex",gap:20,alignItems:"center" }}>
        {status === "ringing" && isIncoming ? (
          <>
            <button onClick={reject}
              style={{ width:64,height:64,borderRadius:"50%",background:"#ef4444",border:"none",color:"#fff",fontSize:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 24px rgba(239,68,68,0.5)" }}>
              ✕
            </button>
            <button onClick={acceptCall}
              style={{ width:64,height:64,borderRadius:"50%",background:"#22c55e",border:"none",color:"#fff",fontSize:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 24px rgba(34,197,94,0.5)" }}>
              📞
            </button>
          </>
        ) : (
          <>
            <button onClick={toggleMute}
              style={{ width:52,height:52,borderRadius:"50%",background:muted?"#ef4444":"rgba(255,255,255,0.15)",border:"none",color:"#fff",fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
              {muted ? "🔇" : "🎤"}
            </button>
            {isVideo && (
              <button onClick={toggleCam}
                style={{ width:52,height:52,borderRadius:"50%",background:camOff?"#ef4444":"rgba(255,255,255,0.15)",border:"none",color:"#fff",fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                {camOff ? "📷" : "📹"}
              </button>
            )}
            <button onClick={endCall}
              style={{ width:64,height:64,borderRadius:"50%",background:"#ef4444",border:"none",color:"#fff",fontSize:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 24px rgba(239,68,68,0.5)" }}>
              📵
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   CHAT VIEW
══════════════════════════════════════════════════════════ */
function ChatView({ thread, onBack }: { thread:Thread; onBack:()=>void }) {
  const me = UN();
  const other = thread.participants.find(p => p !== me) || "?";
  const [msgs, setMsgs] = useState<DMsg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<{id:string;type:"audio"|"video";caller:string;callee:string;incoming:boolean;offer?:any}|null>(null);
  const voice = useVoice();
  const chatEnd = useRef<HTMLDivElement>(null);
  const lastTs = useRef("");
  const imgRef = useRef<HTMLInputElement>(null);
  const [imageData, setImageData] = useState<string|null>(null);

  function onImg(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if(!f) return;
    const r = new FileReader(); r.onload=()=>setImageData(r.result as string); r.readAsDataURL(f); e.target.value="";
  }

  const poll = useCallback(async () => {
    const qs = lastTs.current ? `?since=${encodeURIComponent(lastTs.current)}` : "";
    const r = await fetch(`/api/dm/threads/${thread.id}/messages${qs}`, { headers:xhdr() });
    const d: DMsg[] = await r.json();
    if (!Array.isArray(d) || !d.length) return;
    setMsgs(prev => {
      const ids = new Set(prev.map(m=>m.id));
      const fresh = d.filter(m=>!ids.has(m.id));
      if (!fresh.length) return prev;
      lastTs.current = fresh[fresh.length-1].ts;
      return [...prev, ...fresh].slice(-300);
    });
  }, [thread.id]);

  useEffect(() => {
    fetch(`/api/dm/threads/${thread.id}/messages`, { headers:xhdr() })
      .then(r=>r.json()).then((d:DMsg[]) => { if(Array.isArray(d)&&d.length){ setMsgs(d); lastTs.current=d[d.length-1].ts; } });
    const t = setInterval(poll, 2500);
    return () => clearInterval(t);
  }, [thread.id, poll]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  // Poll for incoming calls
  useEffect(() => {
    const t = setInterval(async () => {
      if (activeCall) return;
      const r = await fetch("/api/calls/incoming", { headers:xhdr() });
      const d = await r.json();
      if (d && d.caller === other) setIncomingCall(d);
    }, 2000);
    return () => clearInterval(t);
  }, [other, activeCall]);

  async function send() {
    const t = text.trim();
    if ((!t && !voice.data && !imageData) || sending) return;
    setSending(true); setText(""); setImageData(null);
    await fetch(`/api/dm/threads/${thread.id}/messages`, { method:"POST", headers:xhdr(),
      body: JSON.stringify({ text:t||undefined, audioData:voice.data||undefined, imageData:imageData||undefined }) });
    voice.clear(); setSending(false); poll();
  }

  async function startCall(type: "audio"|"video") {
    setActiveCall({ id:"pending", type, caller:me, callee:other, incoming:false });
  }

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100svh",background:"var(--bg)",overflow:"hidden" }}>
      {/* Header */}
      <div style={{ background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"10px 14px",display:"flex",alignItems:"center",gap:12,flexShrink:0 }}>
        <button onClick={onBack} style={{ background:"none",border:"none",color:"var(--text)",fontSize:22,cursor:"pointer",padding:"0 4px",flexShrink:0 }}>←</button>
        <Avatar u={other} size={40}/>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15,fontWeight:800,color:"var(--text)" }}>{other}</div>
          <div style={{ fontSize:11,color:"#22c55e" }}>● Active</div>
        </div>
        <button onClick={() => startCall("audio")}
          style={{ width:36,height:36,borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
          📞
        </button>
        <button onClick={() => startCall("video")}
          style={{ width:36,height:36,borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
          📹
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:3 }}>
        {msgs.map((m, i) => {
          const isMe = m.author === me;
          const prev = msgs[i-1];
          const isFirst = !prev || prev.author !== m.author;
          return (
            <div key={m.id} style={{ display:"flex",flexDirection:isMe?"row-reverse":"row",gap:8,alignItems:"flex-end",marginBottom:1 }}>
              {!isMe && isFirst && <Avatar u={m.author} size={28}/>}
              {!isMe && !isFirst && <div style={{ width:28,flexShrink:0 }}/>}
              <div style={{ maxWidth:"72%",display:"flex",flexDirection:"column",gap:2 }}>
                {m.text && (
                  <div style={{ padding:"9px 13px",borderRadius:isMe?"18px 18px 4px 18px":"18px 18px 18px 4px",
                    background:isMe?"linear-gradient(135deg,#4f46e5,#7c3aed)":"var(--surface)",
                    color:isMe?"#fff":"var(--text)",fontSize:13,lineHeight:1.5,border:isMe?"none":"1px solid var(--border)" }}>
                    {m.text}
                  </div>
                )}
                {m.audioData && (
                  <div style={{ padding:"8px 12px",borderRadius:14,background:isMe?"linear-gradient(135deg,#4f46e5,#7c3aed)":"var(--surface)",border:isMe?"none":"1px solid var(--border)" }}>
                    <audio src={m.audioData} controls style={{ height:32,maxWidth:220 }}/>
                  </div>
                )}
                {m.imageData && (
                  <img src={m.imageData} alt="" style={{ maxWidth:220,borderRadius:14,display:"block",border:"1px solid var(--border)" }}/>
                )}
                <div style={{ fontSize:10,color:"var(--sub)",textAlign:isMe?"right":"left",paddingBottom:2 }}>{timeAgo(m.ts)}</div>
              </div>
            </div>
          );
        })}
        <div ref={chatEnd}/>
      </div>

      {/* Voice preview */}
      {voice.data && (
        <div style={{ padding:"8px 14px",background:"var(--surface)",borderTop:"1px solid var(--border)",display:"flex",gap:8,alignItems:"center" }}>
          <audio src={voice.data} controls style={{ flex:1,height:32 }}/>
          <button onClick={voice.clear} style={{ padding:"4px 10px",borderRadius:8,border:"none",background:"#fee2e2",color:"#dc2626",fontSize:12,cursor:"pointer",fontWeight:700 }}>✕</button>
        </div>
      )}
      {imageData && (
        <div style={{ padding:"8px 14px",background:"var(--surface)",borderTop:"1px solid var(--border)",position:"relative",display:"inline-block" }}>
          <img src={imageData} alt="" style={{ maxHeight:80,borderRadius:10 }}/>
          <button onClick={()=>setImageData(null)} style={{ position:"absolute",top:4,right:4,width:20,height:20,borderRadius:"50%",border:"none",background:"#ef4444",color:"#fff",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900 }}>✕</button>
        </div>
      )}

      {/* Input bar */}
      <div style={{ background:"var(--surface)",borderTop:"1px solid var(--border)",padding:"8px 12px",display:"flex",gap:8,alignItems:"flex-end",flexShrink:0 }}>
        <input ref={imgRef} type="file" accept="image/*" style={{ display:"none" }} onChange={onImg}/>
        <button onClick={() => imgRef.current?.click()}
          style={{ width:36,height:36,borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:18,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
          📷
        </button>
        {!voice.data && (
          !voice.recording ? (
            <button onClick={voice.start}
              style={{ width:36,height:36,borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:18,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
              🎤
            </button>
          ) : (
            <button onClick={voice.stop}
              style={{ width:36,height:36,borderRadius:10,border:"none",background:"#ef4444",color:"#fff",fontSize:16,cursor:"pointer",flexShrink:0,fontWeight:800 }}>
              ⏹{voice.secs}
            </button>
          )
        )}
        <div style={{ flex:1,background:"var(--bg)",borderRadius:20,border:"1.5px solid var(--border)",display:"flex",alignItems:"center",padding:"6px 14px 6px 14px",gap:8 }}>
          <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Message…"
            onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); } }}
            rows={1} style={{ flex:1,background:"none",border:"none",color:"var(--text)",fontSize:14,resize:"none",outline:"none",fontFamily:"inherit",maxHeight:100,lineHeight:1.4 }}/>
        </div>
        <button onClick={send} disabled={sending||(!text.trim()&&!voice.data&&!imageData)}
          style={{ width:40,height:40,borderRadius:"50%",background:(text.trim()||voice.data||imageData)?"var(--purple)":"var(--border)",border:"none",color:"#fff",fontSize:18,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
          ➤
        </button>
      </div>

      {/* Incoming call toast */}
      {incomingCall && !activeCall && (
        <div style={{ position:"absolute",top:70,left:16,right:16,zIndex:500,background:"var(--surface)",borderRadius:18,padding:"14px 16px",boxShadow:"0 8px 32px rgba(0,0,0,0.3)",border:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12 }}>
          <Avatar u={incomingCall.caller} size={44}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14,fontWeight:800,color:"var(--text)" }}>{incomingCall.caller}</div>
            <div style={{ fontSize:12,color:"var(--sub)" }}>Incoming {incomingCall.type} call</div>
          </div>
          <button onClick={() => { fetch(`/api/calls/${incomingCall.id}/reject`,{method:"PATCH",headers:xhdr(),body:"{}"}); setIncomingCall(null); }}
            style={{ width:40,height:40,borderRadius:"50%",background:"#ef4444",border:"none",color:"#fff",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
          <button onClick={() => { setActiveCall({id:incomingCall.id,type:incomingCall.type,caller:incomingCall.caller,callee:me,incoming:true,offer:incomingCall.offer}); setIncomingCall(null); }}
            style={{ width:40,height:40,borderRadius:"50%",background:"#22c55e",border:"none",color:"#fff",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>📞</button>
        </div>
      )}

      {/* Active call */}
      {activeCall && (
        <CallOverlay callId={activeCall.id} caller={activeCall.caller} callee={activeCall.callee}
          isIncoming={activeCall.incoming} callType={activeCall.type} offer={activeCall.offer}
          onEnd={() => setActiveCall(null)}/>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   INBOX
══════════════════════════════════════════════════════════ */
function Inbox({ onOpen }: { onOpen:(t:Thread)=>void }) {
  const me = UN();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [search, setSearch] = useState("");
  const [newDm, setNewDm] = useState("");
  const [starting, setStarting] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [,navigate] = useLocation();

  const load = useCallback(async () => {
    const r = await fetch("/api/dm/threads", { headers:xhdr() });
    const d = await r.json();
    if (Array.isArray(d)) setThreads(d);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  async function startDm() {
    if (!newDm.trim()) return;
    setStarting(true);
    const r = await fetch("/api/dm/threads", { method:"POST", headers:xhdr(), body:JSON.stringify({ other:newDm.trim() }) });
    const d = await r.json();
    setStarting(false); setNewDm(""); setShowNew(false);
    if (d.id) { await load(); onOpen(d); }
  }

  const filtered = threads.filter(t => {
    const other = t.participants.find(p=>p!==me)||"";
    return other.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100svh",background:"var(--bg)" }}>
      <Header/>
      <div style={{ background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"12px 14px",display:"flex",gap:10,alignItems:"center" }}>
        <div style={{ flex:1,background:"var(--bg)",borderRadius:24,border:"1.5px solid var(--border)",display:"flex",alignItems:"center",padding:"8px 14px",gap:8 }}>
          <span style={{ color:"var(--sub)",fontSize:16 }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search messages…"
            style={{ flex:1,background:"none",border:"none",color:"var(--text)",fontSize:14,outline:"none",fontFamily:"inherit" }}/>
        </div>
        <button onClick={() => setShowNew(v=>!v)}
          style={{ width:40,height:40,borderRadius:12,background:"var(--purple)",border:"none",color:"#fff",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900 }}>
          ✏️
        </button>
      </div>

      {showNew && (
        <div style={{ padding:"12px 14px",background:"var(--surface)",borderBottom:"1px solid var(--border)",display:"flex",gap:10 }}>
          <input value={newDm} onChange={e=>setNewDm(e.target.value)} placeholder="Enter username to message…"
            onKeyDown={e=>{ if(e.key==="Enter") startDm(); }}
            style={{ flex:1,padding:"10px 14px",borderRadius:12,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:14,fontFamily:"inherit" }}/>
          <button onClick={startDm} disabled={starting||!newDm.trim()}
            style={{ padding:"10px 18px",borderRadius:12,border:"none",background:"var(--purple)",color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer" }}>
            {starting?"…":"Start"}
          </button>
        </div>
      )}

      <div style={{ flex:1,overflowY:"auto" }}>
        {filtered.length === 0 && (
          <div style={{ textAlign:"center",padding:48 }}>
            <div style={{ fontSize:48,marginBottom:10 }}>💬</div>
            <div style={{ fontSize:15,fontWeight:800,color:"var(--text)",marginBottom:6 }}>No messages yet</div>
            <div style={{ color:"var(--sub)",fontSize:13 }}>Start a conversation with a username above</div>
          </div>
        )}
        {filtered.map(t => {
          const other = t.participants.find(p=>p!==me)||"?";
          return (
            <button key={t.id} onClick={() => onOpen(t)}
              style={{ width:"100%",textAlign:"left",padding:"14px 16px",border:"none",background:"transparent",cursor:"pointer",
                display:"flex",alignItems:"center",gap:12,borderBottom:"1px solid var(--border)" }}>
              <Avatar u={other} size={48} online={true}/>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:15,fontWeight:800,color:"var(--text)" }}>{other}</div>
                <div style={{ fontSize:12,color:"var(--sub)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:2 }}>
                  {t.lastMsg || "Start chatting…"}
                </div>
              </div>
              {t.lastAt && <div style={{ fontSize:11,color:"var(--sub)",flexShrink:0 }}>{timeAgo(t.lastAt)}</div>}
            </button>
          );
        })}
      </div>

      <div className="dash-bottom-nav">
        <button className="dash-bottom-nav-item" onClick={() => navigate("/")}>
          <span style={{ fontSize:22 }}>🏠</span><span style={{ fontSize:10 }}>Home</span>
        </button>
        <button className="dash-bottom-nav-item" onClick={() => navigate("/community")}>
          <span style={{ fontSize:22 }}>🌐</span><span style={{ fontSize:10 }}>Community</span>
        </button>
        <button className="dash-bottom-nav-item" style={{ color:"var(--purple)" }}>
          <span style={{ fontSize:22 }}>💬</span><span style={{ fontSize:10,fontWeight:800 }}>Messages</span>
        </button>
        <button className="dash-bottom-nav-item" onClick={() => navigate("/ask")}>
          <span style={{ fontSize:22 }}>❓</span><span style={{ fontSize:10 }}>Q&A</span>
        </button>
        <button className="dash-bottom-nav-item" onClick={() => navigate("/profile")}>
          <span style={{ fontSize:22 }}>👤</span><span style={{ fontSize:10 }}>Profile</span>
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ENTRY POINT
══════════════════════════════════════════════════════════ */
export default function Messages() {
  const [activeThread, setActiveThread] = useState<Thread|null>(null);
  const [,params] = useRoute("/messages/:threadId");

  // If URL has a threadId, open that thread
  useEffect(() => {
    if (params?.threadId) {
      fetch(`/api/dm/threads`, { headers:xhdr() })
        .then(r=>r.json()).then((threads:Thread[]) => {
          const t = threads.find(x=>x.id===params.threadId);
          if (t) setActiveThread(t);
        });
    }
  }, [params?.threadId]);

  if (activeThread) return <ChatView thread={activeThread} onBack={() => setActiveThread(null)}/>;
  return <Inbox onOpen={setActiveThread}/>;
}
