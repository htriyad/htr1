import { useEffect, useState } from "react";
import Header from "../components/Header";

const USER_TOKEN_KEY = "rr_user_token";
function authHdr(): HeadersInit {
  const t = localStorage.getItem(USER_TOKEN_KEY) || "";
  return t ? { Authorization: `Bearer ${t}` } : {};
}

interface Sheet {
  id: string; title: string; subject: string;
  exam: string; year: string; imageUrls: string[]; pdfUrl?: string; createdAt: string;
}

export default function SolveSheet() {
  const [sheets, setSheets]     = useState<Sheet[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("All");
  const [selected, setSelected] = useState<Sheet | null>(null);
  const [imgIdx, setImgIdx]     = useState(0);

  useEffect(() => {
    fetch("/api/solve-sheets", { headers: authHdr() })
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setSheets(d); })
      .finally(() => setLoading(false));
  }, []);

  const exams   = ["All", ...Array.from(new Set(sheets.map(s => s.exam).filter(Boolean)))];
  const shown   = filter === "All" ? sheets : sheets.filter(s => s.exam === filter);

  function openSheet(sheet: Sheet) { setSelected(sheet); setImgIdx(0); }

  if (selected) {
    return (
      <div style={{ minHeight:"100svh", background:"#000", display:"flex", flexDirection:"column" }}>
        {/* Lightbox header */}
        <div style={{ background:"rgba(0,0,0,0.9)", padding:"12px 16px", display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:10 }}>
          <button onClick={() => setSelected(null)}
            style={{ width:36, height:36, borderRadius:"50%", border:"none", background:"rgba(255,255,255,0.15)", color:"#fff", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            ←
          </button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>{selected.title}</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)" }}>{selected.subject} · {selected.exam} {selected.year}</div>
          </div>
          {selected.pdfUrl && (
            <a href={selected.pdfUrl} target="_blank" rel="noopener noreferrer"
              style={{ padding:"6px 14px", borderRadius:8, background:"#7c3aed", color:"#fff", fontSize:12, fontWeight:700, textDecoration:"none" }}>
              📄 PDF
            </a>
          )}
        </div>

        {/* Image viewer */}
        {selected.imageUrls.length > 0 ? (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", padding:"16px 8px" }}>
            <img
              src={selected.imageUrls[imgIdx]}
              alt={`Page ${imgIdx + 1}`}
              style={{ maxWidth:"100%", borderRadius:8, boxShadow:"0 4px 24px rgba(0,0,0,0.6)" }}
            />
            {selected.imageUrls.length > 1 && (
              <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:16 }}>
                <button onClick={() => setImgIdx(i => Math.max(0, i-1))} disabled={imgIdx===0}
                  style={{ padding:"8px 20px", borderRadius:10, border:"none", background:"rgba(255,255,255,0.15)", color:"#fff", fontSize:14, cursor:"pointer", opacity: imgIdx===0?0.4:1 }}>
                  ← Prev
                </button>
                <span style={{ color:"rgba(255,255,255,0.7)", fontSize:13 }}>{imgIdx+1} / {selected.imageUrls.length}</span>
                <button onClick={() => setImgIdx(i => Math.min(selected.imageUrls.length-1, i+1))} disabled={imgIdx===selected.imageUrls.length-1}
                  style={{ padding:"8px 20px", borderRadius:10, border:"none", background:"rgba(255,255,255,0.15)", color:"#fff", fontSize:14, cursor:"pointer", opacity: imgIdx===selected.imageUrls.length-1?0.4:1 }}>
                  Next →
                </button>
              </div>
            )}
            {/* Thumbnail strip */}
            {selected.imageUrls.length > 1 && (
              <div style={{ display:"flex", gap:8, marginTop:12, overflowX:"auto", padding:"4px 0", maxWidth:"100%" }}>
                {selected.imageUrls.map((url, i) => (
                  <img key={i} src={url} alt={`Thumb ${i+1}`} onClick={() => setImgIdx(i)}
                    style={{ width:60, height:80, objectFit:"cover", borderRadius:6, cursor:"pointer", border: i===imgIdx?"2px solid #7c3aed":"2px solid transparent", opacity: i===imgIdx?1:0.6, flexShrink:0 }} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.5)", fontSize:14 }}>
            No images. {selected.pdfUrl ? "Open the PDF above." : "No content available."}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100svh", background:"var(--bg)" }}>
      <Header showBack backTo="/" />
      <div style={{ padding:"16px 14px", maxWidth:640, margin:"0 auto" }}>
        {/* Hero */}
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>📋</div>
          <h1 style={{ fontSize:22, fontWeight:900, color:"var(--purple)", fontFamily:"Lato,sans-serif", margin:0 }}>Solve Sheet Library</h1>
          <p style={{ fontSize:13, color:"var(--sub)", marginTop:4 }}>Complete solution sheets for SSC, HSC & Admission</p>
        </div>

        {/* Filter chips */}
        <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4, marginBottom:18 }}>
          {exams.map(e => (
            <button key={e} onClick={() => setFilter(e)}
              style={{ flexShrink:0, padding:"7px 16px", borderRadius:20, border:"none", cursor:"pointer", fontSize:12, fontWeight:700,
                background: filter===e ? "var(--purple)" : "var(--surface)",
                color: filter===e ? "#fff" : "var(--text)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              {e}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign:"center", padding:40, color:"var(--sub)" }}>Loading solve sheets…</div>
        )}

        {!loading && shown.length === 0 && (
          <div style={{ textAlign:"center", padding:48 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📂</div>
            <div style={{ color:"var(--sub)", fontSize:14 }}>No solve sheets yet.<br/>Check back soon!</div>
          </div>
        )}

        {/* Grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {shown.map(sheet => (
            <button key={sheet.id} onClick={() => openSheet(sheet)}
              style={{ textAlign:"left", background:"var(--surface)", borderRadius:16, overflow:"hidden",
                boxShadow:"0 3px 12px rgba(0,0,0,0.09)", border:"none", cursor:"pointer", padding:0 }}>
              {/* Thumbnail */}
              <div style={{ width:"100%", aspectRatio:"4/3", background:"linear-gradient(135deg,#7c3aed22,#7c3aed44)", position:"relative", overflow:"hidden" }}>
                {sheet.imageUrls[0] ? (
                  <img src={sheet.imageUrls[0]} alt={sheet.title}
                    style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                ) : (
                  <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36 }}>
                    {sheet.pdfUrl ? "📄" : "📋"}
                  </div>
                )}
                <div style={{ position:"absolute", top:6, right:6, background:"rgba(124,58,237,0.9)", color:"#fff", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20 }}>
                  {sheet.exam || "Exam"}
                </div>
                {sheet.imageUrls.length > 1 && (
                  <div style={{ position:"absolute", bottom:6, right:6, background:"rgba(0,0,0,0.6)", color:"#fff", fontSize:10, padding:"2px 7px", borderRadius:10 }}>
                    {sheet.imageUrls.length} pages
                  </div>
                )}
              </div>
              {/* Info */}
              <div style={{ padding:"10px 12px" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--text)", lineHeight:1.4, marginBottom:4 }}>{sheet.title}</div>
                <div style={{ fontSize:11, color:"var(--sub)" }}>{sheet.subject} {sheet.year && `· ${sheet.year}`}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
