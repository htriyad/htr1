import { useState, useRef } from "react";

const PRIZES = [
  { label:"10 XP",  xp:10,  color:"#7c3aed", bg:"#ede9fe" },
  { label:"25 XP",  xp:25,  color:"#2563eb", bg:"#dbeafe" },
  { label:"5 XP",   xp:5,   color:"#16a34a", bg:"#dcfce7" },
  { label:"50 XP",  xp:50,  color:"#d97706", bg:"#fef3c7" },
  { label:"15 XP",  xp:15,  color:"#dc2626", bg:"#fee2e2" },
  { label:"100 XP", xp:100, color:"#7c3aed", bg:"#f3e8ff" },
  { label:"5 XP",   xp:5,   color:"#0891b2", bg:"#e0f2fe" },
  { label:"30 XP",  xp:30,  color:"#d97706", bg:"#fef9c3" },
];

const TODAY = new Date().toDateString();
const SPIN_KEY = "rr_spin_" + TODAY;

interface Props { onXP?: (xp:number) => void; }

export default function SpinWheel({ onXP }: Props) {
  const [spinning, setSpinning]   = useState(false);
  const [rotation, setRotation]   = useState(0);
  const [result, setResult]       = useState<typeof PRIZES[0]|null>(null);
  const [used, setUsed]           = useState(() => localStorage.getItem(SPIN_KEY) !== null);
  const [won, setWon]             = useState(() => { try { return JSON.parse(localStorage.getItem(SPIN_KEY)||"null"); } catch { return null; } });
  const prevRot                   = useRef(0);

  function spin() {
    if (spinning || used) return;
    setResult(null);
    const sliceAngle = 360 / PRIZES.length;
    const winIdx     = Math.floor(Math.random() * PRIZES.length);
    const spins      = 5 * 360; // 5 full rotations
    const targetAngle = spins + (360 - winIdx * sliceAngle - sliceAngle/2);
    const newRot = prevRot.current + targetAngle;
    setSpinning(true);
    setRotation(newRot);
    prevRot.current = newRot;

    setTimeout(() => {
      const prize = PRIZES[winIdx];
      setResult(prize);
      setUsed(true);
      setWon(prize);
      setSpinning(false);
      localStorage.setItem(SPIN_KEY, JSON.stringify(prize));
      if (onXP) onXP(prize.xp);
    }, 3500);
  }

  const N = PRIZES.length;
  const sliceAngle = 360 / N;
  const R = 110; const cx = 120; const cy = 120;

  function slicePath(i: number) {
    const start = (i * sliceAngle - 90) * Math.PI / 180;
    const end   = ((i+1) * sliceAngle - 90) * Math.PI / 180;
    const x1 = cx + R * Math.cos(start); const y1 = cy + R * Math.sin(start);
    const x2 = cx + R * Math.cos(end);   const y2 = cy + R * Math.sin(end);
    return `M${cx},${cy} L${x1},${y1} A${R},${R},0,0,1,${x2},${y2} Z`;
  }

  function labelPos(i: number) {
    const mid = ((i + 0.5) * sliceAngle - 90) * Math.PI / 180;
    const r   = R * 0.65;
    return { x: cx + r * Math.cos(mid), y: cy + r * Math.sin(mid), angle: (i + 0.5) * sliceAngle };
  }

  return (
    <div className="spin-wrap">
      <div className="spin-title">🎰 Daily Spin</div>
      {used && won ? (
        <div className="spin-won" style={{background:won.bg,border:`1.5px solid ${won.color}30`}}>
          <div style={{fontSize:32}}>🎉</div>
          <div style={{fontSize:20,fontWeight:900,color:won.color}}>You won {won.label}!</div>
          <div style={{fontSize:12,color:"var(--sub)"}}>Come back tomorrow for another spin</div>
        </div>
      ) : (
        <>
          {/* Wheel */}
          <div style={{position:"relative",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
            {/* Pointer */}
            <div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",zIndex:10,fontSize:20,lineHeight:1}}>▼</div>
            <svg width={240} height={240} viewBox="0 0 240 240"
              style={{transform:`rotate(${rotation}deg)`,transition:spinning?"transform 3.5s cubic-bezier(0.17,0.67,0.12,0.99)":"none",display:"block"}}>
              {PRIZES.map((_,i) => (
                <path key={i} d={slicePath(i)} fill={PRIZES[i].bg} stroke="#fff" strokeWidth="2" />
              ))}
              {PRIZES.map((_,i) => {
                const { x, y, angle } = labelPos(i);
                return (
                  <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="central"
                    fontSize="11" fontWeight="800" fill={PRIZES[i].color}
                    transform={`rotate(${angle},${x},${y})`}
                    fontFamily="Lato,Roboto,sans-serif">
                    {PRIZES[i].label}
                  </text>
                );
              })}
              <circle cx={cx} cy={cy} r={16} fill="#fff" stroke="rgba(0,0,0,0.1)" strokeWidth="2" />
            </svg>
          </div>
          {result && !spinning && (
            <div className="spin-result" style={{background:result.bg}}>
              🎉 You won <strong style={{color:result.color}}>{result.label}</strong>!
            </div>
          )}
          <button className="spin-btn" onClick={spin} disabled={spinning||used}>
            {spinning ? "Spinning…" : used ? "Spin Used Today" : "🎰 Spin Now!"}
          </button>
        </>
      )}
    </div>
  );
}
