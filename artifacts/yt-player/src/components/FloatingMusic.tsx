import { useState, useRef, useEffect, useCallback } from "react";

type SoundId = "rain"|"lofi"|"ocean"|"cafe"|"white"|"off";

interface Sound { id:SoundId; label:string; emoji:string; desc:string; }
const SOUNDS: Sound[] = [
  { id:"rain",  label:"Rain",      emoji:"🌧️", desc:"Gentle rainfall" },
  { id:"ocean", label:"Ocean",     emoji:"🌊", desc:"Calming waves"   },
  { id:"cafe",  label:"Café",      emoji:"☕", desc:"Coffee shop ambience" },
  { id:"white", label:"Focus",     emoji:"🎯", desc:"White noise focus" },
  { id:"lofi",  label:"Lo-Fi",     emoji:"🎵", desc:"Relaxing beats"  },
];

function buildSound(ctx: AudioContext, id: SoundId, vol: number): AudioNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol * 0.4, ctx.currentTime);

  if (id === "off") return gain;

  // Generate noise buffer
  const bufLen = 2 * ctx.sampleRate;
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  if (id === "white" || id === "cafe") {
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);
  } else {
    // Brown/pink noise for rain/ocean/lofi
    let b0=0,b1=0,b2=0;
    for (let i = 0; i < bufLen; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759;
      b2 = 0.96900*b2 + w*0.1538520;
      data[i] = (b0+b1+b2+w*0.0556) * 0.11;
    }
  }

  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true; src.start();

  if (id === "rain") {
    const f = ctx.createBiquadFilter(); f.type="lowpass"; f.frequency.value=1800; f.Q.value=0.5;
    const f2 = ctx.createBiquadFilter(); f2.type="highpass"; f2.frequency.value=200;
    src.connect(f); f.connect(f2); f2.connect(gain);
  } else if (id === "ocean") {
    const f = ctx.createBiquadFilter(); f.type="lowpass"; f.frequency.value=600; f.Q.value=1;
    // LFO for wave motion
    const lfo = ctx.createOscillator(); const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.12; lfoGain.gain.value = 200;
    lfo.connect(lfoGain); lfoGain.connect(f.frequency); lfo.start();
    src.connect(f); f.connect(gain);
  } else if (id === "cafe") {
    const f = ctx.createBiquadFilter(); f.type="bandpass"; f.frequency.value=800; f.Q.value=0.3;
    src.connect(f); f.connect(gain);
    // Add random "voice murmur" tones
    const osc = ctx.createOscillator(); const oGain = ctx.createGain();
    osc.type="sine"; osc.frequency.value=280; oGain.gain.value=0.02;
    osc.connect(oGain); oGain.connect(gain); osc.start();
  } else if (id === "white") {
    const f = ctx.createBiquadFilter(); f.type="lowpass"; f.frequency.value=6000;
    src.connect(f); f.connect(gain);
  } else if (id === "lofi") {
    const f = ctx.createBiquadFilter(); f.type="lowpass"; f.frequency.value=3000;
    src.connect(f); f.connect(gain);
    // Simple lo-fi chord progression
    const NOTES = [261.6, 329.6, 392, 523.3]; // C major
    NOTES.forEach((freq, i) => {
      const o = ctx.createOscillator(); const og = ctx.createGain();
      o.type = "triangle"; o.frequency.value = freq;
      og.gain.value = 0.015;
      o.connect(og); og.connect(gain); o.start(ctx.currentTime + i * 0.3);
    });
  }

  return gain;
}

export default function FloatingMusic() {
  const [active, setActive]   = useState<SoundId>("off");
  const [volume, setVolume]   = useState(0.6);
  const [open, setOpen]       = useState(false);
  const [expanded, setExpanded] = useState(false);
  const ctxRef    = useRef<AudioContext|null>(null);
  const nodeRef   = useRef<AudioNode|null>(null);
  const gainRef   = useRef<GainNode|null>(null);

  const stop = useCallback(() => {
    try { (nodeRef.current as any)?.stop?.(); } catch {}
    try { nodeRef.current?.disconnect(); } catch {}
    nodeRef.current = null;
  }, []);

  const play = useCallback((id: SoundId) => {
    stop();
    if (id === "off") return;
    try {
      if (!ctxRef.current || ctxRef.current.state === "closed") {
        ctxRef.current = new AudioContext();
      }
      const ctx = ctxRef.current;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume, ctx.currentTime);
      masterGain.connect(ctx.destination);
      gainRef.current = masterGain;
      const node = buildSound(ctx, id, volume);
      node.connect(masterGain);
      nodeRef.current = node;
    } catch(e) { console.error(e); }
  }, [stop, volume]);

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.setValueAtTime(volume, ctxRef.current!.currentTime);
  }, [volume]);

  function toggle(id: SoundId) {
    if (active === id) { setActive("off"); stop(); }
    else { setActive(id); play(id); }
  }

  const activeSound = SOUNDS.find(s=>s.id===active);

  return (
    <div className="music-fab-wrap">
      {open && (
        <div className="music-panel">
          <div className="music-panel-header">
            <span style={{fontSize:14,fontWeight:800}}>🎵 Ambient Sounds</span>
            <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"var(--sub)"}}>✕</button>
          </div>
          <div className="music-sounds-grid">
            {SOUNDS.map(s => (
              <button key={s.id} className={`music-sound-btn ${active===s.id?"active":""}`} onClick={()=>toggle(s.id)}>
                <span style={{fontSize:24}}>{s.emoji}</span>
                <span style={{fontSize:12,fontWeight:700}}>{s.label}</span>
                <span style={{fontSize:10,color:active===s.id?"rgba(255,255,255,0.8)":"var(--sub)"}}>{s.desc}</span>
                {active === s.id && <span style={{fontSize:9,background:"rgba(255,255,255,0.2)",padding:"2px 6px",borderRadius:99,marginTop:2}}>● Playing</span>}
              </button>
            ))}
            <button className={`music-sound-btn ${active==="off"?"active":""}`} onClick={()=>{setActive("off");stop();}}>
              <span style={{fontSize:24}}>🔇</span>
              <span style={{fontSize:12,fontWeight:700}}>Off</span>
              <span style={{fontSize:10,color:"var(--sub)"}}>Silence</span>
            </button>
          </div>
          {/* Volume */}
          <div className="music-volume-row">
            <span style={{fontSize:14}}>🔈</span>
            <input type="range" min={0} max={1} step={0.05} value={volume}
              onChange={e=>setVolume(Number(e.target.value))}
              style={{flex:1,accentColor:"var(--purple)"}} />
            <span style={{fontSize:14}}>🔊</span>
          </div>
        </div>
      )}

      <button className={`music-fab ${active!=="off"?"playing":""}`} onClick={()=>setOpen(o=>!o)}
        title={active !== "off" ? `Playing: ${activeSound?.label}` : "Ambient sounds"}>
        {active !== "off" ? (
          <span style={{fontSize:18}}>{activeSound?.emoji}</span>
        ) : (
          <span style={{fontSize:18}}>🎵</span>
        )}
      </button>
    </div>
  );
}
