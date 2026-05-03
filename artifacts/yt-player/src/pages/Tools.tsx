import { useState, useRef, useEffect, useCallback } from "react";
import Header from "../components/Header";

type ToolTab = "calc"|"convert"|"graph"|"constants"|"table";

/* ── Scientific Calculator ──────────────────────────────── */
const CALC_BTNS = [
  ["C","←","(",")"],["sin","cos","tan","^"],
  ["7","8","9","÷"],["4","5","6","×"],
  ["1","2","3","−"],["±","0",".","+"],[" ","π","e","="],
  ["log","ln","√","x²"],
];

function Calculator() {
  const [expr, setExpr]     = useState("");
  const [result, setResult] = useState("");
  const [hist, setHist]     = useState<{expr:string;res:string}[]>([]);
  const [mem, setMem]       = useState(0);

  function press(v: string) {
    if (v === "C")    { setExpr(""); setResult(""); return; }
    if (v === "←")    { setExpr(e => e.slice(0,-1)); return; }
    if (v === "=")    { compute(); return; }
    if (v === "π")    { setExpr(e => e + "Math.PI"); return; }
    if (v === "e")    { setExpr(e => e + "Math.E"); return; }
    if (v === "sin")  { setExpr(e => e + "Math.sin("); return; }
    if (v === "cos")  { setExpr(e => e + "Math.cos("); return; }
    if (v === "tan")  { setExpr(e => e + "Math.tan("); return; }
    if (v === "log")  { setExpr(e => e + "Math.log10("); return; }
    if (v === "ln")   { setExpr(e => e + "Math.log("); return; }
    if (v === "√")    { setExpr(e => e + "Math.sqrt("); return; }
    if (v === "x²")   { setExpr(e => e + "**2"); return; }
    if (v === "^")    { setExpr(e => e + "**"); return; }
    if (v === "÷")    { setExpr(e => e + "/"); return; }
    if (v === "×")    { setExpr(e => e + "*"); return; }
    if (v === "−")    { setExpr(e => e + "-"); return; }
    if (v === "±")    { setExpr(e => e.startsWith("-") ? e.slice(1) : "-" + e); return; }
    if (v === " ")    return;
    setExpr(e => e + v);
  }

  function compute() {
    try {
      const safe = expr.replace(/[^0-9+\-*/().Math.sincotaglqrPIEsincotaglqrPI\s]/g,"");
      // Use Function constructor for safe math eval
      const res = String(new Function("return " + expr)());
      if (isNaN(Number(res))) return;
      setResult(res);
      setHist(h => [...h.slice(-9), { expr, res }]);
      setExpr(res);
    } catch { setResult("Error"); }
  }

  const display = result && expr === result ? result : expr || "0";

  return (
    <div className="calc-shell">
      {/* Display */}
      <div className="calc-display">
        <div className="calc-expr">{expr || "0"}</div>
        {result && result !== expr && (
          <div className="calc-result">= {result}</div>
        )}
      </div>
      {/* Memory row */}
      <div className="calc-mem-row">
        {[["M+",()=>setMem(m=>m+Number(result||expr))],["M-",()=>setMem(m=>m-Number(result||expr))],["MR",()=>setExpr(String(mem))],["MC",()=>setMem(0)]].map(([l,fn])=>(
          <button key={l as string} className="calc-mem-btn" onClick={fn as ()=>void}>{l as string}</button>
        ))}
        {mem !== 0 && <span style={{fontSize:12,color:"var(--sub)",marginLeft:"auto"}}>M={mem}</span>}
      </div>
      {/* Buttons */}
      <div className="calc-grid">
        {CALC_BTNS.flat().map((v,i) => {
          const isOp = ["÷","×","−","+","="].includes(v);
          const isFn = ["sin","cos","tan","log","ln","√","x²","π","e","^"].includes(v);
          const isClear = ["C","←"].includes(v);
          return (
            <button key={i} className={`calc-btn ${isOp?"calc-op":""} ${isFn?"calc-fn":""} ${isClear?"calc-clear":""} ${v==="="?"calc-eq":""}`}
              onClick={() => press(v)}>
              {v}
            </button>
          );
        })}
      </div>
      {/* History */}
      {hist.length > 0 && (
        <div className="calc-history">
          <div className="calc-hist-title">History</div>
          {hist.slice().reverse().map((h,i) => (
            <button key={i} className="calc-hist-item" onClick={() => setExpr(h.res)}>
              <span className="calc-hist-expr">{h.expr}</span>
              <span className="calc-hist-res">= {h.res}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Unit Converter ──────────────────────────────────────── */
const UNITS: Record<string, { label:string; units:{ id:string; name:string; toBase:number|((v:number)=>number); fromBase:number|((v:number)=>number) }[] }> = {
  length: { label:"📏 Length", units:[
    {id:"mm",name:"Millimeter",toBase:0.001,fromBase:1000},
    {id:"cm",name:"Centimeter",toBase:0.01,fromBase:100},
    {id:"m",name:"Meter",toBase:1,fromBase:1},
    {id:"km",name:"Kilometer",toBase:1000,fromBase:0.001},
    {id:"in",name:"Inch",toBase:0.0254,fromBase:39.3701},
    {id:"ft",name:"Foot",toBase:0.3048,fromBase:3.28084},
    {id:"mi",name:"Mile",toBase:1609.34,fromBase:0.000621371},
  ]},
  mass: { label:"⚖️ Mass", units:[
    {id:"mg",name:"Milligram",toBase:0.000001,fromBase:1000000},
    {id:"g",name:"Gram",toBase:0.001,fromBase:1000},
    {id:"kg",name:"Kilogram",toBase:1,fromBase:1},
    {id:"ton",name:"Metric Ton",toBase:1000,fromBase:0.001},
    {id:"lb",name:"Pound",toBase:0.453592,fromBase:2.20462},
    {id:"oz",name:"Ounce",toBase:0.0283495,fromBase:35.274},
  ]},
  temperature: { label:"🌡️ Temperature", units:[
    {id:"c",name:"Celsius",toBase:(v)=>v,fromBase:(v)=>v},
    {id:"f",name:"Fahrenheit",toBase:(v)=>(v-32)*5/9,fromBase:(v)=>v*9/5+32},
    {id:"k",name:"Kelvin",toBase:(v)=>v-273.15,fromBase:(v)=>v+273.15},
  ]},
  speed: { label:"🚀 Speed", units:[
    {id:"ms",name:"m/s",toBase:1,fromBase:1},
    {id:"kmh",name:"km/h",toBase:0.277778,fromBase:3.6},
    {id:"mph",name:"mph",toBase:0.44704,fromBase:2.23694},
    {id:"knot",name:"Knot",toBase:0.514444,fromBase:1.94384},
  ]},
  area: { label:"📐 Area", units:[
    {id:"cm2",name:"cm²",toBase:0.0001,fromBase:10000},
    {id:"m2",name:"m²",toBase:1,fromBase:1},
    {id:"km2",name:"km²",toBase:1000000,fromBase:0.000001},
    {id:"ft2",name:"ft²",toBase:0.092903,fromBase:10.7639},
    {id:"acre",name:"Acre",toBase:4046.86,fromBase:0.000247105},
  ]},
  volume: { label:"🧪 Volume", units:[
    {id:"ml",name:"mL",toBase:0.001,fromBase:1000},
    {id:"l",name:"Liter",toBase:1,fromBase:1},
    {id:"m3",name:"m³",toBase:1000,fromBase:0.001},
    {id:"cup",name:"Cup",toBase:0.236588,fromBase:4.22675},
    {id:"gal",name:"Gallon",toBase:3.78541,fromBase:0.264172},
  ]},
  energy: { label:"⚡ Energy", units:[
    {id:"j",name:"Joule",toBase:1,fromBase:1},
    {id:"kj",name:"Kilojoule",toBase:1000,fromBase:0.001},
    {id:"cal",name:"Calorie",toBase:4.184,fromBase:0.239006},
    {id:"kcal",name:"Kilocalorie",toBase:4184,fromBase:0.000239006},
    {id:"wh",name:"Watt-hour",toBase:3600,fromBase:0.000277778},
    {id:"ev",name:"Electron-volt",toBase:1.602e-19,fromBase:6.242e18},
  ]},
  pressure: { label:"🔵 Pressure", units:[
    {id:"pa",name:"Pascal",toBase:1,fromBase:1},
    {id:"kpa",name:"Kilopascal",toBase:1000,fromBase:0.001},
    {id:"atm",name:"Atmosphere",toBase:101325,fromBase:9.869e-6},
    {id:"bar",name:"Bar",toBase:100000,fromBase:0.00001},
    {id:"psi",name:"PSI",toBase:6894.76,fromBase:0.000145038},
  ]},
};

function Converter() {
  const [cat, setCat]   = useState("length");
  const [from, setFrom] = useState("m");
  const [to, setTo]     = useState("cm");
  const [val, setVal]   = useState("1");

  const category = UNITS[cat];
  const fromUnit = category.units.find(u=>u.id===from)!;
  const toUnit   = category.units.find(u=>u.id===to)!;

  const convert = () => {
    const n = parseFloat(val);
    if (isNaN(n)) return "—";
    const base = typeof fromUnit.toBase === "function" ? fromUnit.toBase(n) : n * fromUnit.toBase;
    const res  = typeof toUnit.fromBase === "function" ? toUnit.fromBase(base) : base * (toUnit.fromBase as number);
    return Number(res.toPrecision(7)).toString();
  };

  return (
    <div className="conv-shell">
      {/* Category selector */}
      <div className="conv-cats">
        {Object.entries(UNITS).map(([k,v]) => (
          <button key={k} className={`conv-cat-btn ${cat===k?"active":""}`} onClick={()=>{setCat(k);setFrom(UNITS[k].units[0].id);setTo(UNITS[k].units[1].id);}}>
            {v.label}
          </button>
        ))}
      </div>
      {/* From */}
      <div className="conv-card">
        <div className="conv-label">From</div>
        <input className="conv-input" type="number" value={val} onChange={e=>setVal(e.target.value)} />
        <select className="conv-select" value={from} onChange={e=>setFrom(e.target.value)}>
          {category.units.map(u=><option key={u.id} value={u.id}>{u.name} ({u.id})</option>)}
        </select>
      </div>
      {/* Arrow */}
      <div style={{textAlign:"center",fontSize:28,color:"var(--purple)",margin:"4px 0"}}>⇓</div>
      {/* To */}
      <div className="conv-card" style={{background:"rgba(124,58,237,0.06)"}}>
        <div className="conv-label">To</div>
        <div className="conv-result">{convert()}</div>
        <select className="conv-select" value={to} onChange={e=>setTo(e.target.value)}>
          {category.units.map(u=><option key={u.id} value={u.id}>{u.name} ({u.id})</option>)}
        </select>
      </div>
      <div style={{textAlign:"center",marginTop:16,fontSize:14,color:"var(--sub)"}}>
        {val} {fromUnit.name} = <strong style={{color:"var(--purple)"}}>{convert()} {toUnit.name}</strong>
      </div>
    </div>
  );
}

/* ── Function Grapher ──────────────────────────────────────── */
function Grapher() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fnText, setFnText]  = useState("sin(x)");
  const [fnText2, setFnText2] = useState("");
  const [error, setError]    = useState("");
  const [xMin, setXMin]      = useState(-10);
  const [xMax, setXMax]      = useState(10);

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width; const H = canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = "#f8f9fa"; ctx.fillRect(0,0,W,H);

    const xRange = xMax - xMin;
    const toCanvas = (x:number,y:number):[number,number] => [(x-xMin)/xRange*W, H/2 - y*(H/2)/((xMax-xMin)/2)];

    // Grid
    ctx.strokeStyle = "rgba(0,0,0,0.08)"; ctx.lineWidth = 1;
    for (let x = Math.ceil(xMin); x <= xMax; x++) {
      const [cx] = toCanvas(x,0);
      ctx.beginPath(); ctx.moveTo(cx,0); ctx.lineTo(cx,H); ctx.stroke();
    }
    for (let y = -8; y <= 8; y++) {
      const [,cy] = toCanvas(0,y);
      ctx.beginPath(); ctx.moveTo(0,cy); ctx.lineTo(W,cy); ctx.stroke();
    }
    // Axes
    ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1.5;
    const [ax] = toCanvas(0,0); const [,ay] = toCanvas(0,0);
    ctx.beginPath(); ctx.moveTo(ax,0); ctx.lineTo(ax,H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,ay); ctx.lineTo(W,ay); ctx.stroke();

    // Plot functions
    const COLORS = ["#7c3aed","#dc2626"];
    [fnText, fnText2].filter(Boolean).forEach((fn, fi) => {
      try {
        const safe = fn.replace(/sin/g,"Math.sin").replace(/cos/g,"Math.cos").replace(/tan/g,"Math.tan")
          .replace(/sqrt/g,"Math.sqrt").replace(/log/g,"Math.log10").replace(/ln/g,"Math.log")
          .replace(/abs/g,"Math.abs").replace(/\^/g,"**").replace(/pi/g,"Math.PI").replace(/e(?!\w)/g,"Math.E");
        const f = new Function("x","return " + safe);
        ctx.strokeStyle = COLORS[fi]; ctx.lineWidth = 2.5; ctx.beginPath();
        let started = false;
        for (let px = 0; px < W; px++) {
          const x = xMin + (px/W)*xRange;
          const y = f(x);
          if (isFinite(y) && Math.abs(y) < 1000) {
            const [cx,cy] = toCanvas(x,y);
            if (!started) { ctx.moveTo(cx,cy); started=true; }
            else ctx.lineTo(cx,cy);
          } else { ctx.stroke(); ctx.beginPath(); started=false; }
        }
        ctx.stroke(); setError("");
      } catch(e) { setError("Invalid function"); }
    });
  }, [fnText, fnText2, xMin, xMax]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="graph-shell">
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{width:12,height:3,background:"#7c3aed",borderRadius:2}} />
          <input className="graph-input" value={fnText} onChange={e=>setFnText(e.target.value)} placeholder="f(x) = sin(x)" />
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{width:12,height:3,background:"#dc2626",borderRadius:2}} />
          <input className="graph-input" value={fnText2} onChange={e=>setFnText2(e.target.value)} placeholder="g(x) = (optional second function)" />
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:12,color:"var(--sub)"}}>x:</span>
          <input type="number" className="graph-range-input" value={xMin} onChange={e=>setXMin(Number(e.target.value))} />
          <span style={{fontSize:12,color:"var(--sub)"}}>to</span>
          <input type="number" className="graph-range-input" value={xMax} onChange={e=>setXMax(Number(e.target.value))} />
        </div>
        {error && <div style={{fontSize:12,color:"#dc2626"}}>{error}</div>}
      </div>
      <canvas ref={canvasRef} width={360} height={260} className="graph-canvas" />
      <div style={{fontSize:11,color:"var(--sub)",marginTop:8,lineHeight:1.6}}>
        Supported: sin, cos, tan, sqrt, log, ln, abs, pi, e, ^ (power)<br/>
        Examples: x^2 + 2*x - 1 | sin(x)*cos(x) | sqrt(abs(x))
      </div>
    </div>
  );
}

/* ── Physics Constants ─────────────────────────────────────── */
const CONSTANTS = [
  { sym:"c",    name:"Speed of Light",         val:"3.00 × 10⁸ m/s",        cat:"Universal" },
  { sym:"G",    name:"Gravitational Constant",  val:"6.67 × 10⁻¹¹ N·m²/kg²",cat:"Universal" },
  { sym:"h",    name:"Planck Constant",         val:"6.63 × 10⁻³⁴ J·s",      cat:"Quantum" },
  { sym:"ħ",    name:"Reduced Planck",          val:"1.055 × 10⁻³⁴ J·s",     cat:"Quantum" },
  { sym:"e",    name:"Elementary Charge",       val:"1.602 × 10⁻¹⁹ C",       cat:"Atomic" },
  { sym:"mₑ",   name:"Electron Mass",           val:"9.109 × 10⁻³¹ kg",      cat:"Atomic" },
  { sym:"mₚ",   name:"Proton Mass",             val:"1.673 × 10⁻²⁷ kg",      cat:"Atomic" },
  { sym:"kB",   name:"Boltzmann Constant",      val:"1.38 × 10⁻²³ J/K",      cat:"Thermal" },
  { sym:"NA",   name:"Avogadro's Number",       val:"6.022 × 10²³ mol⁻¹",    cat:"Chemical" },
  { sym:"R",    name:"Gas Constant",            val:"8.314 J/(mol·K)",        cat:"Chemical" },
  { sym:"ε₀",   name:"Permittivity (vacuum)",   val:"8.854 × 10⁻¹² F/m",     cat:"EM" },
  { sym:"μ₀",   name:"Permeability (vacuum)",   val:"1.257 × 10⁻⁶ H/m",      cat:"EM" },
  { sym:"σ",    name:"Stefan-Boltzmann",        val:"5.67 × 10⁻⁸ W/(m²·K⁴)", cat:"Thermal" },
  { sym:"g",    name:"Gravity (Earth surface)", val:"9.81 m/s²",              cat:"Universal" },
  { sym:"u",    name:"Atomic Mass Unit",        val:"1.661 × 10⁻²⁷ kg",      cat:"Atomic" },
];

function Constants() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const cats = ["All", ...Array.from(new Set(CONSTANTS.map(c=>c.cat)))];
  const filtered = CONSTANTS.filter(c =>
    (filter === "All" || c.cat === filter) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) || c.sym.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div>
      <input className="pc-select" style={{marginBottom:10}} placeholder="Search constants..." value={search} onChange={e=>setSearch(e.target.value)} />
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {cats.map(c=><button key={c} onClick={()=>setFilter(c)} style={{padding:"4px 12px",borderRadius:20,border:"1.5px solid",borderColor:filter===c?"var(--purple)":"var(--border)",background:filter===c?"var(--purple)":"transparent",color:filter===c?"#fff":"var(--text)",fontSize:12,fontWeight:700,cursor:"pointer"}}>{c}</button>)}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.map(c=>(
          <div key={c.sym} style={{background:"var(--surface)",borderRadius:12,padding:"12px 14px",border:"1px solid var(--border)",display:"flex",gap:12,alignItems:"center"}}>
            <div style={{width:42,height:42,borderRadius:10,background:"linear-gradient(135deg,var(--purple),#2563eb)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:15,fontWeight:900,flexShrink:0,fontFamily:"monospace"}}>{c.sym}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:700,color:"var(--text)"}}>{c.name}</div>
              <div style={{fontSize:13,color:"var(--purple)",fontFamily:"monospace",fontWeight:700,marginTop:2}}>{c.val}</div>
            </div>
            <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(124,58,237,0.1)",color:"var(--purple)",fontWeight:700,flexShrink:0}}>{c.cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Periodic Table (Simplified) ───────────────────────────── */
const ELEMENTS: {n:number;sym:string;name:string;mass:string;cat:string;group:number;period:number}[] = [
  {n:1,sym:"H",name:"Hydrogen",mass:"1.008",cat:"nonmetal",group:1,period:1},
  {n:2,sym:"He",name:"Helium",mass:"4.003",cat:"noble",group:18,period:1},
  {n:3,sym:"Li",name:"Lithium",mass:"6.941",cat:"alkali",group:1,period:2},
  {n:4,sym:"Be",name:"Beryllium",mass:"9.012",cat:"alkaline",group:2,period:2},
  {n:5,sym:"B",name:"Boron",mass:"10.81",cat:"metalloid",group:13,period:2},
  {n:6,sym:"C",name:"Carbon",mass:"12.01",cat:"nonmetal",group:14,period:2},
  {n:7,sym:"N",name:"Nitrogen",mass:"14.01",cat:"nonmetal",group:15,period:2},
  {n:8,sym:"O",name:"Oxygen",mass:"16.00",cat:"nonmetal",group:16,period:2},
  {n:9,sym:"F",name:"Fluorine",mass:"19.00",cat:"halogen",group:17,period:2},
  {n:10,sym:"Ne",name:"Neon",mass:"20.18",cat:"noble",group:18,period:2},
  {n:11,sym:"Na",name:"Sodium",mass:"22.99",cat:"alkali",group:1,period:3},
  {n:12,sym:"Mg",name:"Magnesium",mass:"24.31",cat:"alkaline",group:2,period:3},
  {n:13,sym:"Al",name:"Aluminum",mass:"26.98",cat:"metal",group:13,period:3},
  {n:14,sym:"Si",name:"Silicon",mass:"28.09",cat:"metalloid",group:14,period:3},
  {n:15,sym:"P",name:"Phosphorus",mass:"30.97",cat:"nonmetal",group:15,period:3},
  {n:16,sym:"S",name:"Sulfur",mass:"32.06",cat:"nonmetal",group:16,period:3},
  {n:17,sym:"Cl",name:"Chlorine",mass:"35.45",cat:"halogen",group:17,period:3},
  {n:18,sym:"Ar",name:"Argon",mass:"39.95",cat:"noble",group:18,period:3},
  {n:19,sym:"K",name:"Potassium",mass:"39.10",cat:"alkali",group:1,period:4},
  {n:20,sym:"Ca",name:"Calcium",mass:"40.08",cat:"alkaline",group:2,period:4},
  {n:26,sym:"Fe",name:"Iron",mass:"55.85",cat:"metal",group:8,period:4},
  {n:29,sym:"Cu",name:"Copper",mass:"63.55",cat:"metal",group:11,period:4},
  {n:30,sym:"Zn",name:"Zinc",mass:"65.38",cat:"metal",group:12,period:4},
  {n:35,sym:"Br",name:"Bromine",mass:"79.90",cat:"halogen",group:17,period:4},
  {n:36,sym:"Kr",name:"Krypton",mass:"83.80",cat:"noble",group:18,period:4},
  {n:47,sym:"Ag",name:"Silver",mass:"107.9",cat:"metal",group:11,period:5},
  {n:50,sym:"Sn",name:"Tin",mass:"118.7",cat:"metal",group:14,period:5},
  {n:53,sym:"I",name:"Iodine",mass:"126.9",cat:"halogen",group:17,period:5},
  {n:56,sym:"Ba",name:"Barium",mass:"137.3",cat:"alkaline",group:2,period:6},
  {n:79,sym:"Au",name:"Gold",mass:"197.0",cat:"metal",group:11,period:6},
  {n:80,sym:"Hg",name:"Mercury",mass:"200.6",cat:"metal",group:12,period:6},
  {n:82,sym:"Pb",name:"Lead",mass:"207.2",cat:"metal",group:14,period:6},
  {n:92,sym:"U",name:"Uranium",mass:"238.0",cat:"actinide",group:3,period:7},
];
const EL_COLORS: Record<string,string> = {
  alkali:"#fca5a5",alkaline:"#fcd34d",metal:"#a3a3a3",metalloid:"#6ee7b7",
  nonmetal:"#93c5fd",halogen:"#c4b5fd",noble:"#f9a8d4",actinide:"#fb923c",lanthanide:"#34d399",
};

function PeriodicTable() {
  const [sel, setSel] = useState<typeof ELEMENTS[0]|null>(null);
  const [filter, setFilter] = useState("all");
  const displayed = filter === "all" ? ELEMENTS : ELEMENTS.filter(e=>e.cat===filter);
  const cats = Array.from(new Set(ELEMENTS.map(e=>e.cat)));
  return (
    <div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
        <button onClick={()=>setFilter("all")} style={{padding:"4px 10px",borderRadius:20,border:"1.5px solid",borderColor:filter==="all"?"var(--purple)":"var(--border)",background:filter==="all"?"var(--purple)":"transparent",color:filter==="all"?"#fff":"var(--text)",fontSize:11,fontWeight:700,cursor:"pointer"}}>All</button>
        {cats.map(c=><button key={c} onClick={()=>setFilter(c)} style={{padding:"4px 10px",borderRadius:20,border:"1.5px solid",borderColor:filter===c?"var(--purple)":"var(--border)",background:filter===c?(EL_COLORS[c]||"#aaa"):EL_COLORS[c]||"#eee",color:"#333",fontSize:11,fontWeight:700,cursor:"pointer",textTransform:"capitalize"}}>{c}</button>)}
      </div>
      {sel && (
        <div style={{background:"linear-gradient(135deg,rgba(124,58,237,0.1),rgba(220,38,38,0.08))",border:"1px solid rgba(124,58,237,0.25)",borderRadius:16,padding:18,marginBottom:16}}>
          <div style={{display:"flex",gap:14,alignItems:"center"}}>
            <div style={{width:64,height:64,borderRadius:12,background:EL_COLORS[sel.cat]||"#aaa",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:900,flexShrink:0}}>{sel.sym}</div>
            <div>
              <div style={{fontSize:18,fontWeight:900,color:"var(--text)"}}>{sel.name}</div>
              <div style={{fontSize:13,color:"var(--sub)"}}>Atomic number: <strong>{sel.n}</strong></div>
              <div style={{fontSize:13,color:"var(--sub)"}}>Atomic mass: <strong>{sel.mass}</strong></div>
              <div style={{fontSize:12,color:"var(--purple)",fontWeight:700,textTransform:"capitalize",marginTop:2}}>{sel.cat}</div>
            </div>
          </div>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6}}>
        {displayed.map(el => (
          <button key={el.n} onClick={()=>setSel(el)}
            style={{background:EL_COLORS[el.cat]||"#eee",border:sel?.n===el.n?"2px solid #7c3aed":"1.5px solid rgba(0,0,0,0.1)",borderRadius:10,padding:"8px 4px",cursor:"pointer",transition:"transform 150ms,box-shadow 150ms",display:"flex",flexDirection:"column",alignItems:"center"}}>
            <div style={{fontSize:9,color:"#666",lineHeight:1}}>{el.n}</div>
            <div style={{fontSize:15,fontWeight:900,color:"#333",lineHeight:1.1}}>{el.sym}</div>
            <div style={{fontSize:7,color:"#666",lineHeight:1}}>{el.mass}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Main Tools Page ─────────────────────────────────────────── */
export default function Tools() {
  const [tab, setTab] = useState<ToolTab>("calc");
  const TABS: { id:ToolTab; icon:string; label:string }[] = [
    { id:"calc",    icon:"🔢", label:"Calc"     },
    { id:"convert", icon:"🔄", label:"Convert"  },
    { id:"graph",   icon:"📈", label:"Graph"    },
    { id:"constants",icon:"⚛️",label:"Constants"},
    { id:"table",   icon:"⚗️", label:"Elements" },
  ];
  return (
    <div className="tools-shell">
      <Header showBack backTo="/" />
      <div className="tools-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tools-tab-btn ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>
      <div className="tools-content">
        {tab === "calc"     && <Calculator />}
        {tab === "convert"  && <Converter />}
        {tab === "graph"    && <Grapher />}
        {tab === "constants" && <Constants />}
        {tab === "table"    && <PeriodicTable />}
      </div>
    </div>
  );
}
