import { useEffect, useState, useCallback } from "react";
import Header from "../components/Header";
import MathText from "../components/MathText";

const TOKEN = () => localStorage.getItem("rr_user_token") || "";
interface Formula { id:string; subject:string; category:string; title:string; latex:string; description?:string; }

const BOOKMARK_KEY = "rr_formula_bookmarks";
function getBookmarks(): string[] { try { return JSON.parse(localStorage.getItem(BOOKMARK_KEY)||"[]"); } catch { return []; } }
function toggleBookmark(id:string) {
  const b = getBookmarks();
  const nb = b.includes(id) ? b.filter(x=>x!==id) : [...b,id];
  localStorage.setItem(BOOKMARK_KEY, JSON.stringify(nb));
  return nb;
}

export default function Formulas() {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [search, setSearch]     = useState("");
  const [subj, setSubj]         = useState("All");
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [bookmarks, setBookmarks] = useState<string[]>(getBookmarks);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(() =>
    fetch("/api/formulas", { headers: { Authorization: `Bearer ${TOKEN()}` } })
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setFormulas(d); setLoading(false); }), []);

  useEffect(() => { load(); }, [load]);

  const subjects = ["All", ...Array.from(new Set(formulas.map(f=>f.subject).filter(Boolean)))];

  const filtered = formulas.filter(f => {
    const q = search.toLowerCase();
    const matchSearch = !q || f.title.toLowerCase().includes(q) || f.subject.toLowerCase().includes(q) || (f.description||"").toLowerCase().includes(q);
    const matchSubj = subj === "All" || f.subject === subj;
    const matchBk = !onlyBookmarked || bookmarks.includes(f.id);
    return matchSearch && matchSubj && matchBk;
  });

  // Group by subject + category
  const grouped: Record<string, Record<string, Formula[]>> = {};
  filtered.forEach(f => {
    const s = f.subject || "General";
    const c = f.category || "General";
    if (!grouped[s]) grouped[s] = {};
    if (!grouped[s][c]) grouped[s][c] = [];
    grouped[s][c].push(f);
  });

  function bookmark(id: string) { setBookmarks(toggleBookmark(id)); }

  return (
    <div className="formulas-shell">
      <Header showBack backTo="/" />
      <div className="formulas-content">
        <div className="formulas-hero">
          <div className="formulas-hero-icon">∑</div>
          <div>
            <h1 className="formulas-hero-title">Formula Library</h1>
            <p className="formulas-hero-sub">All important formulas — bookmarkable, searchable</p>
          </div>
        </div>

        {/* Filters */}
        <div style={{padding:"0 14px",marginBottom:12}}>
          <input className="cc-search" style={{width:"100%",marginBottom:10,boxSizing:"border-box"}}
            placeholder="🔍 Search formulas..." value={search} onChange={e=>setSearch(e.target.value)} />
          <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
            {subjects.map(s=>(
              <button key={s} onClick={()=>setSubj(s)} style={{flexShrink:0,padding:"5px 14px",borderRadius:20,border:"1.5px solid",borderColor:subj===s?"var(--purple)":"var(--border)",background:subj===s?"var(--purple)":"transparent",color:subj===s?"#fff":"var(--text)",fontSize:12,fontWeight:700,cursor:"pointer"}}>{s}</button>
            ))}
          </div>
          <div style={{marginTop:8,display:"flex",alignItems:"center",gap:8}}>
            <button onClick={()=>setOnlyBookmarked(b=>!b)} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:20,border:"1.5px solid",borderColor:onlyBookmarked?"#d97706":"var(--border)",background:onlyBookmarked?"#fef3c7":"transparent",color:onlyBookmarked?"#92400e":"var(--text)",fontSize:12,fontWeight:700,cursor:"pointer"}}>
              ⭐ Bookmarked only
            </button>
            <span style={{fontSize:12,color:"var(--sub)"}}>{filtered.length} formulas</span>
          </div>
        </div>

        {loading && <div style={{textAlign:"center",padding:40,color:"var(--sub)"}}>Loading formulas…</div>}

        {!loading && filtered.length === 0 && (
          <div style={{textAlign:"center",padding:48}}>
            <div style={{fontSize:48}}>∑</div>
            <h3 style={{color:"var(--text)",marginTop:12}}>No formulas found</h3>
            <p style={{color:"var(--sub)",fontSize:13}}>
              {formulas.length === 0 ? "Admin hasn't added formulas yet." : "Try a different search or filter."}
            </p>
          </div>
        )}

        {Object.entries(grouped).map(([subject, cats]) => (
          <div key={subject} style={{marginBottom:20}}>
            <div style={{padding:"14px 14px 8px",fontSize:18,fontWeight:900,color:"var(--purple)",fontFamily:"Lato,sans-serif",display:"flex",alignItems:"center",gap:8}}>
              📚 {subject}
            </div>
            {Object.entries(cats).map(([category, fmls]) => (
              <div key={category} style={{marginBottom:14}}>
                {category !== "General" && (
                  <div style={{padding:"4px 14px 8px",fontSize:13,fontWeight:700,color:"var(--sub)"}}>{category}</div>
                )}
                <div style={{padding:"0 14px",display:"flex",flexDirection:"column",gap:10}}>
                  {fmls.map(f => (
                    <div key={f.id} className="formula-card">
                      <div className="formula-card-header">
                        <div className="formula-card-title">{f.title}</div>
                        <button className="formula-bookmark-btn" onClick={()=>bookmark(f.id)}
                          style={{color:bookmarks.includes(f.id)?"#d97706":"var(--sub)"}}>
                          {bookmarks.includes(f.id) ? "⭐" : "☆"}
                        </button>
                      </div>
                      <div className="formula-latex">
                        <MathText text={f.latex || f.title} />
                      </div>
                      {f.description && (
                        <div className="formula-desc">{f.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
        <div style={{height:40}} />
      </div>
    </div>
  );
}
