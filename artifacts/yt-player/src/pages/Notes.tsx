import { useState, useEffect } from "react";
import Header from "../components/Header";

interface Note { id:string; title:string; body:string; color:string; pinned:boolean; createdAt:string; updatedAt:string; }

const COLORS = ["#fff","#fef9c3","#fce7f3","#dbeafe","#dcfce7","#fef3c7","#ede9fe","#fee2e2"];
const KEY = "rr_personal_notes";

function loadNotes(): Note[] { try { return JSON.parse(localStorage.getItem(KEY)||"[]"); } catch { return []; } }
function saveNotes(n: Note[]) { localStorage.setItem(KEY, JSON.stringify(n)); }

export default function Notes() {
  const [notes, setNotes]     = useState<Note[]>(loadNotes);
  const [editing, setEditing] = useState<Note|null>(null);
  const [search, setSearch]   = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody]  = useState("");
  const [newColor, setNewColor] = useState(COLORS[1]);

  useEffect(() => { saveNotes(notes); }, [notes]);

  function createNote() {
    if (!newTitle.trim() && !newBody.trim()) return;
    const note: Note = {
      id: Date.now().toString(), title: newTitle.trim()||"Untitled",
      body: newBody, color: newColor, pinned: false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    setNotes(ns => [note, ...ns]);
    setNewTitle(""); setNewBody(""); setNewColor(COLORS[1]);
  }

  function updateNote(updated: Note) {
    setNotes(ns => ns.map(n => n.id===updated.id ? { ...updated, updatedAt: new Date().toISOString() } : n));
    setEditing(null);
  }

  function deleteNote(id: string) {
    if (!confirm("Delete this note?")) return;
    setNotes(ns => ns.filter(n=>n.id!==id));
    if (editing?.id === id) setEditing(null);
  }

  function togglePin(id: string) {
    setNotes(ns => ns.map(n => n.id===id ? { ...n, pinned:!n.pinned } : n));
  }

  const filtered = notes.filter(n =>
    !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.body.toLowerCase().includes(search.toLowerCase())
  ).sort((a,b) => (b.pinned?1:0)-(a.pinned?1:0));

  if (editing) {
    return (
      <div style={{background:"var(--bg)",minHeight:"100svh"}}>
        <Header showBack onBack={()=>setEditing(null)} />
        <div style={{padding:"16px 14px 40px"}}>
          <input value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})}
            style={{width:"100%",fontSize:20,fontWeight:900,border:"none",background:"transparent",color:"var(--text)",outline:"none",marginBottom:12,fontFamily:"Lato,sans-serif",boxSizing:"border-box"}}
            placeholder="Title" />
          <textarea value={editing.body} onChange={e=>setEditing({...editing,body:e.target.value})}
            style={{width:"100%",minHeight:300,fontSize:14,border:"none",background:"transparent",color:"var(--text)",outline:"none",resize:"none",lineHeight:1.8,fontFamily:"Roboto,'Noto Sans Bengali',sans-serif",boxSizing:"border-box"}}
            placeholder="Write your notes here..." />
          {/* Color picker */}
          <div style={{display:"flex",gap:8,marginTop:16,flexWrap:"wrap"}}>
            {COLORS.map(c=>(
              <button key={c} onClick={()=>setEditing({...editing,color:c})}
                style={{width:28,height:28,borderRadius:"50%",background:c,border:editing.color===c?"3px solid var(--purple)":"1.5px solid var(--border)",cursor:"pointer"}} />
            ))}
          </div>
          <div style={{display:"flex",gap:10,marginTop:18}}>
            <button onClick={()=>updateNote(editing)} style={{flex:1,padding:12,borderRadius:12,background:"var(--purple)",border:"none",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer"}}>Save Note</button>
            <button onClick={()=>deleteNote(editing.id)} style={{padding:"12px 18px",borderRadius:12,background:"#fee2e2",border:"none",color:"#dc2626",fontSize:14,fontWeight:800,cursor:"pointer"}}>🗑</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{background:"var(--bg)",minHeight:"100svh"}}>
      <Header showBack backTo="/" />
      <div style={{padding:"0 0 80px"}}>
        {/* Hero */}
        <div style={{margin:"16px 14px",background:"linear-gradient(135deg,#fef3c7,#fce7f3)",borderRadius:18,padding:"18px 20px",border:"1px solid rgba(0,0,0,0.06)"}}>
          <h1 style={{fontSize:22,fontWeight:900,color:"#92400e",fontFamily:"Lato,sans-serif",marginBottom:4}}>📝 Personal Notes</h1>
          <p style={{fontSize:13,color:"#92400e",opacity:0.8}}>{notes.length} notes saved locally on this device</p>
        </div>

        {/* Create new */}
        <div style={{margin:"0 14px 16px",background:"var(--card)",borderRadius:16,padding:16,border:"1px solid var(--border)",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <input value={newTitle} onChange={e=>setNewTitle(e.target.value)}
            placeholder="Note title..." style={{width:"100%",fontSize:15,fontWeight:700,border:"none",background:"transparent",color:"var(--text)",outline:"none",marginBottom:8,fontFamily:"Lato,sans-serif",boxSizing:"border-box"}} />
          <textarea value={newBody} onChange={e=>setNewBody(e.target.value)}
            placeholder="Write something..." rows={3}
            style={{width:"100%",fontSize:13,border:"none",background:"transparent",color:"var(--text)",outline:"none",resize:"none",lineHeight:1.6,fontFamily:"Roboto,'Noto Sans Bengali',sans-serif",boxSizing:"border-box"}} />
          <div style={{display:"flex",gap:8,marginTop:10,alignItems:"center",flexWrap:"wrap"}}>
            {COLORS.map(c=>(
              <button key={c} onClick={()=>setNewColor(c)}
                style={{width:22,height:22,borderRadius:"50%",background:c,border:newColor===c?"2.5px solid var(--purple)":"1.5px solid var(--border)",cursor:"pointer"}} />
            ))}
            <button onClick={createNote} style={{marginLeft:"auto",padding:"8px 20px",borderRadius:10,background:"var(--purple)",border:"none",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer"}}>
              + Save Note
            </button>
          </div>
        </div>

        {/* Search */}
        {notes.length > 3 && (
          <div style={{padding:"0 14px",marginBottom:12}}>
            <input className="dash-search-input" style={{width:"100%",padding:"10px 14px",borderRadius:12,border:"1.5px solid var(--border)",background:"var(--card)",fontSize:14,color:"var(--text)",outline:"none",fontFamily:"inherit"}}
              placeholder="Search notes..." value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
        )}

        {filtered.length === 0 && (
          <div style={{textAlign:"center",padding:48,color:"var(--sub)"}}>
            <div style={{fontSize:48}}>📝</div>
            <h3 style={{color:"var(--text)",marginTop:12}}>No notes yet</h3>
            <p style={{fontSize:13}}>Create your first note above</p>
          </div>
        )}

        {/* Masonry grid */}
        <div style={{padding:"0 14px",columns:"2",columnGap:12}}>
          {filtered.map(n => (
            <div key={n.id} style={{
              background:n.color, borderRadius:14, padding:14, marginBottom:12,
              border:"1px solid rgba(0,0,0,0.08)", breakInside:"avoid",
              cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,0.05)",
              transition:"transform 150ms,box-shadow 150ms",
            }}
              onClick={()=>setEditing({...n})}>
              <div style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:6}}>
                <div style={{fontSize:13,fontWeight:800,color:"#333",flex:1,lineHeight:1.3}}>
                  {n.pinned && <span style={{color:"#d97706",marginRight:4}}>📌</span>}
                  {n.title}
                </div>
                <button onClick={e=>{e.stopPropagation();togglePin(n.id);}}
                  style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:n.pinned?"#d97706":"rgba(0,0,0,0.2)",padding:0,flexShrink:0}}>
                  📌
                </button>
              </div>
              {n.body && <div style={{fontSize:12,color:"#555",lineHeight:1.6,display:"-webkit-box",WebkitLineClamp:4,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{n.body}</div>}
              <div style={{fontSize:10,color:"rgba(0,0,0,0.4)",marginTop:8}}>{new Date(n.updatedAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
