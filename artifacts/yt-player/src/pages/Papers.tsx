import { useEffect, useState, useCallback } from "react";
import Header from "../components/Header";

const TOKEN = () => localStorage.getItem("rr_user_token") || "";

interface Paper {
  id:string; title:string; exam:string; subject:string; year:string;
  imageUrls:string[]; pdfUrl?:string; createdAt:string;
}

const EXAMS    = ["All","SSC","HSC","Admission","BCS","JSC","Other"];
const SUBJECTS = ["All","Physics","Chemistry","Biology","Mathematics","English","Bangla","ICT","History","Geography","Economy"];

export default function Papers() {
  const [papers, setPapers]   = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [exam, setExam]       = useState("All");
  const [subject, setSubj]    = useState("All");
  const [year, setYear]       = useState("All");
  const [search, setSearch]   = useState("");
  const [viewPaper, setViewPaper] = useState<Paper|null>(null);
  const [imgIdx, setImgIdx]   = useState(0);

  const load = useCallback(() =>
    fetch("/api/past-papers", { headers: { Authorization: `Bearer ${TOKEN()}` } })
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setPapers(d); setLoading(false); }), []);

  useEffect(() => { load(); }, [load]);

  const years = ["All", ...Array.from(new Set(papers.map(p=>p.year))).sort().reverse()];

  const filtered = papers.filter(p => {
    const q = search.toLowerCase();
    return (exam === "All" || p.exam === exam) &&
           (subject === "All" || p.subject === subject) &&
           (year === "All" || p.year === year) &&
           (!q || p.title.toLowerCase().includes(q) || p.subject.toLowerCase().includes(q));
  });

  if (viewPaper) {
    return (
      <div style={{background:"var(--bg)",minHeight:"100svh"}}>
        <Header showBack onBack={()=>{setViewPaper(null);setImgIdx(0);}} />
        <div style={{padding:"14px 14px 40px"}}>
          <div style={{marginBottom:12}}>
            <h2 style={{fontSize:18,fontWeight:900,color:"var(--purple)",fontFamily:"Lato,sans-serif"}}>{viewPaper.title}</h2>
            <div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>
              {[viewPaper.exam,viewPaper.subject,viewPaper.year].filter(Boolean).map(t=>(
                <span key={t} style={{fontSize:11,padding:"3px 10px",background:"rgba(124,58,237,0.1)",color:"var(--purple)",borderRadius:20,fontWeight:700}}>{t}</span>
              ))}
            </div>
          </div>
          {viewPaper.pdfUrl && (
            <a href={viewPaper.pdfUrl} target="_blank" rel="noopener noreferrer"
              style={{display:"inline-flex",alignItems:"center",gap:8,padding:"10px 20px",borderRadius:12,background:"var(--purple)",color:"#fff",textDecoration:"none",fontWeight:700,fontSize:14,marginBottom:14}}>
              📄 Open PDF
            </a>
          )}
          {viewPaper.imageUrls.length > 0 && (
            <>
              {viewPaper.imageUrls.length > 1 && (
                <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:12,paddingBottom:4}}>
                  {viewPaper.imageUrls.map((_,i)=>(
                    <button key={i} onClick={()=>setImgIdx(i)} style={{flexShrink:0,padding:"4px 14px",borderRadius:20,border:"1.5px solid",borderColor:imgIdx===i?"var(--purple)":"var(--border)",background:imgIdx===i?"var(--purple)":"transparent",color:imgIdx===i?"#fff":"var(--text)",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                      Page {i+1}
                    </button>
                  ))}
                </div>
              )}
              <div style={{borderRadius:14,overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.12)"}}>
                <img src={viewPaper.imageUrls[imgIdx]} alt={`Page ${imgIdx+1}`}
                  style={{width:"100%",display:"block",borderRadius:14}} />
              </div>
              {viewPaper.imageUrls.length > 1 && (
                <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:14}}>
                  <button onClick={()=>setImgIdx(i=>Math.max(0,i-1))} disabled={imgIdx===0}
                    style={{padding:"8px 20px",borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13,fontWeight:700,cursor:"pointer",opacity:imgIdx===0?0.4:1}}>
                    ← Prev
                  </button>
                  <span style={{fontSize:13,color:"var(--sub)",lineHeight:"2.2"}}>{imgIdx+1}/{viewPaper.imageUrls.length}</span>
                  <button onClick={()=>setImgIdx(i=>Math.min(viewPaper.imageUrls.length-1,i+1))} disabled={imgIdx===viewPaper.imageUrls.length-1}
                    style={{padding:"8px 20px",borderRadius:10,border:"1.5px solid var(--border)",background:"var(--bg)",color:"var(--text)",fontSize:13,fontWeight:700,cursor:"pointer",opacity:imgIdx===viewPaper.imageUrls.length-1?0.4:1}}>
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="papers-shell">
      <Header showBack backTo="/" />
      <div className="papers-content">
        {/* Hero */}
        <div className="papers-hero">
          <div style={{fontSize:42}}>📄</div>
          <div>
            <h1 className="papers-hero-title">Past Papers</h1>
            <p className="papers-hero-sub">SSC · HSC · Admission · BCS — Years of questions</p>
          </div>
        </div>

        {/* Filters */}
        <div style={{padding:"0 14px 16px"}}>
          <input className="cc-search" style={{width:"100%",marginBottom:10,boxSizing:"border-box"}}
            placeholder="🔍 Search papers..." value={search} onChange={e=>setSearch(e.target.value)} />
          <div style={{display:"flex",gap:6,marginBottom:8,overflowX:"auto",paddingBottom:4}}>
            {EXAMS.map(e=><button key={e} onClick={()=>setExam(e)} style={{flexShrink:0,padding:"5px 12px",borderRadius:20,border:"1.5px solid",borderColor:exam===e?"var(--purple)":"var(--border)",background:exam===e?"var(--purple)":"transparent",color:exam===e?"#fff":"var(--text)",fontSize:12,fontWeight:700,cursor:"pointer"}}>{e}</button>)}
          </div>
          <div style={{display:"flex",gap:6,marginBottom:8,overflowX:"auto",paddingBottom:4}}>
            {SUBJECTS.slice(0,6).map(s=><button key={s} onClick={()=>setSubj(s)} style={{flexShrink:0,padding:"4px 10px",borderRadius:20,border:"1.5px solid",borderColor:subject===s?"#2563eb":"var(--border)",background:subject===s?"#2563eb":"transparent",color:subject===s?"#fff":"var(--text)",fontSize:11,fontWeight:700,cursor:"pointer"}}>{s}</button>)}
          </div>
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
            {years.slice(0,8).map(y=><button key={y} onClick={()=>setYear(y)} style={{flexShrink:0,padding:"4px 10px",borderRadius:20,border:"1.5px solid",borderColor:year===y?"#16a34a":"var(--border)",background:year===y?"#16a34a":"transparent",color:year===y?"#fff":"var(--text)",fontSize:11,fontWeight:700,cursor:"pointer"}}>{y}</button>)}
          </div>
        </div>

        {loading && <div style={{textAlign:"center",padding:40,color:"var(--sub)"}}>Loading papers…</div>}
        {!loading && filtered.length === 0 && (
          <div style={{textAlign:"center",padding:48}}>
            <div style={{fontSize:48}}>📄</div>
            <h3 style={{color:"var(--text)",marginTop:12}}>No papers found</h3>
            <p style={{color:"var(--sub)",fontSize:13}}>{papers.length===0?"Admin hasn't added papers yet.":"Try different filters."}</p>
          </div>
        )}

        <div style={{padding:"0 14px",display:"flex",flexDirection:"column",gap:12}}>
          {filtered.map(p => (
            <div key={p.id} className="papers-card" onClick={()=>{setViewPaper(p);setImgIdx(0);}}>
              {p.imageUrls[0] && (
                <div style={{width:80,height:60,borderRadius:8,overflow:"hidden",flexShrink:0,background:"#000"}}>
                  <img src={p.imageUrls[0]} alt={p.title} style={{width:"100%",height:"100%",objectFit:"cover"}} />
                </div>
              )}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:15,fontWeight:800,color:"var(--purple)",lineHeight:1.3,marginBottom:6}}>{p.title}</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {[p.exam,p.subject,p.year].filter(Boolean).map(t=>(
                    <span key={t} style={{fontSize:11,padding:"2px 8px",background:"rgba(124,58,237,0.1)",color:"var(--purple)",borderRadius:20,fontWeight:700}}>{t}</span>
                  ))}
                </div>
              </div>
              <div style={{fontSize:18,color:"var(--purple)",flexShrink:0}}>›</div>
            </div>
          ))}
        </div>
        <div style={{height:40}} />
      </div>
    </div>
  );
}
