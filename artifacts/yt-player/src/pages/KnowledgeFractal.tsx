import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";

const T = () => localStorage.getItem("rr_user_token") || "";
const ah = (): Record<string,string> => {
  const t = T(); return t ? { Authorization:`Bearer ${t}`, "Content-Type":"application/json" } : { "Content-Type":"application/json" };
};

const post = (url: string, body: object) =>
  fetch(url, { method:"POST", headers: ah(), body: JSON.stringify(body) }).then(r => r.json());

/* ── Seed concepts for "But Why?" mode ── */
const SEED_FACTS = [
  "The mitochondria produces ATP through oxidative phosphorylation",
  "The French Revolution began in 1789 with the storming of the Bastille",
  "Photosynthesis converts CO₂ and water into glucose using sunlight",
  "The Mughal Empire declined after Aurangzeb's death in 1707",
  "Newton's First Law states that objects in motion stay in motion",
  "Bangladesh gained independence on March 26, 1971",
  "The nucleus contains the cell's genetic information (DNA)",
  "Supply and demand determines the market price of goods",
];

type FractalLevel = { basic:string; connective:string; counterfactual:string; meta:string };
type WhyNode = { question:string; hint:string; causal_link:string; depth:number; answer?:string };
type HeatmapItem = { subject:string; forgettingRisk:number; accuracy:number; daysSince:number; predictedExamMiss:boolean };
type Spore = { id:string; fact:string; rhyme:string; pattern:string; subject:string; authorName:string; helpfulCount:number; teachingScore:number; createdAt:string };

export default function KnowledgeFractal() {
  const [, nav] = useLocation();
  const [tab, setTab] = useState<"fractal"|"why"|"heatmap"|"dna"|"spores">("fractal");

  /* ─── TAB 1: FRACTAL EXPAND ─── */
  const [fracTopic, setFracTopic] = useState("");
  const [fracLoading, setFracLoading] = useState(false);
  const [fracError, setFracError] = useState("");
  const [fracLevels, setFracLevels] = useState<FractalLevel|null>(null);
  const [activeLevel, setActiveLevel] = useState<keyof FractalLevel|null>(null);
  const [answerInput, setAnswerInput] = useState("");
  const [gradedResult, setGradedResult] = useState<any>(null);
  const [gradeLoading, setGradeLoading] = useState(false);

  async function generateFractal() {
    if (!fracTopic.trim()) return;
    setFracLoading(true); setFracError(""); setFracLevels(null); setActiveLevel(null); setGradedResult(null);
    try {
      const d = await post("/api/fractal/expand", { topic: fracTopic });
      if (d.error) throw new Error(d.error);
      setFracLevels(d);
    } catch(e:any) { setFracError(e.message); }
    setFracLoading(false);
  }

  async function gradeReasoning() {
    if (!fracLevels || !answerInput.trim()) return;
    setGradeLoading(true);
    try {
      const d = await post("/api/fractal/grade", { question: fracLevels.meta, reasoning: answerInput });
      setGradedResult(d);
    } catch {}
    setGradeLoading(false);
  }

  /* ─── TAB 2: BUT WHY? ─── */
  const [whyFact, setWhyFact] = useState(() => SEED_FACTS[Math.floor(Math.random() * SEED_FACTS.length)]);
  const [whyChain, setWhyChain] = useState<WhyNode[]>([]);
  const [whyCurrent, setWhyCurrent] = useState("");
  const [whyAnswer, setWhyAnswer] = useState("");
  const [whyLoading, setWhyLoading] = useState(false);
  const [whyDepth, setWhyDepth] = useState(0);
  const whyEndRef = useRef<HTMLDivElement>(null);

  async function askWhy() {
    setWhyLoading(true);
    const prev = whyChain[whyChain.length - 1];
    try {
      const d = await post("/api/fractal/why", {
        concept: whyFact,
        prevQuestion: prev?.question || whyFact,
        prevAnswer: prev?.answer || whyAnswer,
        depth: whyDepth + 1,
      });
      if (d.error) throw new Error(d.error);
      const node: WhyNode = { ...d, depth: whyDepth + 1 };
      setWhyChain(c => [...c, node]);
      setWhyCurrent(node.question);
      setWhyDepth(n => n + 1);
      setWhyAnswer("");
      setTimeout(() => whyEndRef.current?.scrollIntoView({ behavior:"smooth" }), 100);
    } catch {}
    setWhyLoading(false);
  }

  function resetWhy() {
    setWhyChain([]);
    setWhyCurrent("");
    setWhyDepth(0);
    setWhyAnswer("");
    setWhyFact(SEED_FACTS[Math.floor(Math.random() * SEED_FACTS.length)]);
  }

  /* ─── TAB 3: FORGETTING HEATMAP ─── */
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [heatmapData, setHeatmapData] = useState<HeatmapItem[]|null>(null);
  const [counterMeme, setCounterMeme] = useState<any>(null);
  const [heatError, setHeatError] = useState("");

  function getTopicScores() {
    try {
      const raw = localStorage.getItem("rr_smart_quiz_history") || "[]";
      return JSON.parse(raw);
    } catch { return []; }
  }

  async function generateHeatmap() {
    setHeatmapLoading(true); setHeatError(""); setHeatmapData(null); setCounterMeme(null);
    const scores = getTopicScores();
    if (scores.length === 0) {
      // Generate with demo data
      const demo = ["Physics","Chemistry","Biology","Mathematics","Bangla","English","ICT","History"].map(s => ({
        subject:s, correct: Math.floor(Math.random()*8), total:10,
        lastSeen: new Date(Date.now() - Math.random()*14*86400000).toISOString()
      }));
      try {
        const d = await post("/api/fractal/heatmap", { topicScores: demo });
        if (d.error) throw new Error(d.error);
        setHeatmapData(d.heatmap); setCounterMeme(d.counterMeme);
      } catch(e:any) { setHeatError(e.message); }
    } else {
      try {
        const d = await post("/api/fractal/heatmap", { topicScores: scores });
        if (d.error) throw new Error(d.error);
        setHeatmapData(d.heatmap); setCounterMeme(d.counterMeme);
      } catch(e:any) { setHeatError(e.message); }
    }
    setHeatmapLoading(false);
  }

  function riskColor(r: number) {
    if (r >= 75) return "#dc2626";
    if (r >= 55) return "#ea580c";
    if (r >= 35) return "#d97706";
    if (r >= 20) return "#65a30d";
    return "#16a34a";
  }
  function riskLabel(r: number) {
    if (r >= 75) return "Critical";
    if (r >= 55) return "High Risk";
    if (r >= 35) return "Moderate";
    if (r >= 20) return "Low Risk";
    return "Safe";
  }

  /* ─── TAB 4: EXAM DNA ─── */
  const [dnaContent, setDnaContent] = useState("");
  const [dnaLoading, setDnaLoading] = useState(false);
  const [dnaResult, setDnaResult] = useState<any>(null);
  const [dnaError, setDnaError] = useState("");
  const [expandedQ, setExpandedQ] = useState<number|null>(null);
  const [dnaAnswers, setDnaAnswers] = useState<Record<number,string>>({});
  const [dnaRevealed, setDnaRevealed] = useState<Record<number,boolean>>({});

  async function analyzeExamDNA() {
    if (dnaContent.trim().length < 20) return;
    setDnaLoading(true); setDnaError(""); setDnaResult(null); setExpandedQ(null); setDnaAnswers({}); setDnaRevealed({});
    try {
      const d = await post("/api/fractal/exam-dna", { content: dnaContent, count: 10 });
      if (d.error) throw new Error(d.error);
      setDnaResult(d);
    } catch(e:any) { setDnaError(e.message); }
    setDnaLoading(false);
  }

  /* ─── TAB 5: MEMORY SPORES ─── */
  const [spores, setSpores] = useState<Spore[]>([]);
  const [sporeLoading, setSporeLoading] = useState(true);
  const [sporeFact, setSporeFact] = useState("");
  const [sporeSubject, setSporeSubject] = useState("Biology");
  const [sporeRhyme, setSporeRhyme] = useState("");
  const [sporePattern, setSporePattern] = useState("");
  const [sporeAiLoading, setSporeAiLoading] = useState(false);
  const [sporeSubmitting, setSporeSubmitting] = useState(false);
  const [authorName, setAuthorName] = useState(() => localStorage.getItem("rr_username") || "Anonymous");
  const [injectedSpore, setInjectedSpore] = useState<Spore|null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetch("/api/fractal/spores", { headers: ah() }).then(r=>r.json()).then(d => {
      if (Array.isArray(d)) setSpores(d);
      setSporeLoading(false);
    }).catch(() => setSporeLoading(false));
  }, []);

  async function aiGenerateSpore() {
    if (!sporeFact.trim()) return;
    setSporeAiLoading(true);
    try {
      const d = await post("/api/fractal/spores/ai-generate", { fact: sporeFact, subject: sporeSubject });
      if (!d.error) { setSporeRhyme(d.rhyme || ""); setSporePattern(d.pattern || ""); }
    } catch {}
    setSporeAiLoading(false);
  }

  async function submitSpore() {
    if (!sporeFact.trim() || !sporeRhyme.trim()) return;
    setSporeSubmitting(true);
    try {
      const d = await post("/api/fractal/spores", {
        fact: sporeFact, rhyme: sporeRhyme, pattern: sporePattern,
        subject: sporeSubject, authorName,
      });
      if (!d.error) {
        setSpores(s => [d, ...s]);
        setSporeFact(""); setSporeRhyme(""); setSporePattern("");
        setShowCreate(false);
      }
    } catch {}
    setSporeSubmitting(false);
  }

  async function markHelpful(id: string) {
    await post(`/api/fractal/spores/${id}/helpful`, {});
    setSpores(s => s.map(sp => sp.id === id ? { ...sp, helpfulCount: sp.helpfulCount+1, teachingScore: Math.round((sp.helpfulCount+1)*1.5) } : sp));
  }

  function injectRandomSpore() {
    if (spores.length === 0) return;
    const s = spores[Math.floor(Math.random() * spores.length)];
    setInjectedSpore(s);
    setTimeout(() => setInjectedSpore(null), 5000);
  }

  const TABS = [
    { key:"fractal", icon:"🌀", label:"Fractal Expand" },
    { key:"why",     icon:"🔍", label:"But Why?" },
    { key:"heatmap", icon:"🗓️", label:"Heatmap" },
    { key:"dna",     icon:"🧬", label:"Exam DNA" },
    { key:"spores",  icon:"🦠", label:"Spores" },
  ] as const;

  const scoreColor = (s: number) => s >= 80 ? "#16a34a" : s >= 60 ? "#d97706" : "#dc2626";

  return (
    <div className="fractal-shell">

      {/* ── Subliminal Spore Injection ── */}
      {injectedSpore && (
        <div className="spore-injection" onClick={() => setInjectedSpore(null)}>
          <div className="spore-inject-card">
            <div className="spore-inject-pulse" />
            <div style={{ fontSize:28, marginBottom:8 }}>🦠</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", marginBottom:4 }}>MEMORY SPORE INJECTED</div>
            <div style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:8, lineHeight:1.5 }}>{injectedSpore.fact}</div>
            <div style={{ fontSize:13, color:"#a78bfa", fontStyle:"italic", lineHeight:1.5 }}>"{injectedSpore.rhyme}"</div>
            {injectedSpore.pattern && <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", marginTop:6 }}>{injectedSpore.pattern}</div>}
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:8 }}>tap to dismiss</div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="fractal-hero">
        <button className="fractal-back-btn" onClick={() => nav("/")} aria-label="Back">←</button>
        <div style={{ flex:1 }}>
          <div className="fractal-hero-title">Knowledge Fractal</div>
          <div className="fractal-hero-sub">Generative · Recursive · Social learning engine</div>
        </div>
        <button className="fractal-inject-btn" onClick={injectRandomSpore} title="Inject random spore">🦠</button>
      </div>

      {/* ── Tabs ── */}
      <div className="fractal-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`fractal-tab-btn${tab===t.key?" active":""}`} onClick={() => setTab(t.key)}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════ TAB 1: FRACTAL EXPAND ══════════ */}
      {tab === "fractal" && (
        <div className="fractal-content">
          <div className="fractal-intro-card">
            <div className="fractal-intro-title">🌀 Dynamic Difficulty Fractals</div>
            <div className="fractal-intro-sub">One topic → infinite depth. Type any concept and watch it fracture into 4 cognitive levels: from memory recall to metacognitive reasoning.</div>
          </div>

          <div className="fractal-input-row">
            <input
              className="fractal-topic-input"
              placeholder="Type any topic… e.g. 'Photosynthesis', 'Liberation War', 'Pythagoras'"
              value={fracTopic}
              onInput={(e:any) => setFracTopic(e.target.value)}
              onKeyDown={(e:any) => e.key === "Enter" && generateFractal()}
            />
            <button className="fractal-expand-btn" onClick={generateFractal} disabled={fracLoading || !fracTopic.trim()}>
              {fracLoading ? <span className="fractal-spinner" /> : "Expand →"}
            </button>
          </div>

          <div className="fractal-quick-topics">
            {["Atomic Bomb","Osmosis","Battle of Plassey","Photosynthesis","Newton's Laws","Liberation War 1971","Cell Division","Algebra"].map(t => (
              <button key={t} className="fractal-topic-chip" onClick={() => { setFracTopic(t); }}>{t}</button>
            ))}
          </div>

          {fracError && <div className="fractal-error">{fracError}</div>}

          {fracLoading && (
            <div className="fractal-loading-state">
              <div className="fractal-dna-anim">
                {[0,1,2,3,4].map(i => <div key={i} className="fractal-dna-dot" style={{ animationDelay:`${i*0.15}s` }} />)}
              </div>
              <div style={{ fontSize:13, color:"var(--sub)", marginTop:12 }}>Growing your knowledge fractal…</div>
            </div>
          )}

          {fracLevels && (
            <div className="fractal-levels">
              {(["basic","connective","counterfactual","meta"] as const).map((level, i) => {
                const meta = {
                  basic:         { icon:"🟢", tag:"BASIC",         color:"#16a34a", bg:"#dcfce7", label:"Recall", desc:"Memory retrieval" },
                  connective:    { icon:"🔵", tag:"CONNECTIVE",    color:"#2563eb", bg:"#dbeafe", label:"Connect", desc:"Broader context & links" },
                  counterfactual:{ icon:"🟡", tag:"COUNTERFACTUAL",color:"#d97706", bg:"#fef3c7", label:"Imagine", desc:"Alternative history thinking" },
                  meta:          { icon:"🔴", tag:"META-COGNITIVE",color:"#dc2626", bg:"#fee2e2", label:"Reflect", desc:"Grade your own reasoning" },
                }[level];
                const isActive = activeLevel === level;
                return (
                  <div key={level} className={`fractal-level-card${isActive ? " active" : ""}`}
                    style={{ borderLeftColor: meta.color, animationDelay:`${i*0.1}s` }}>
                    <div className="fractal-level-header" onClick={() => setActiveLevel(isActive ? null : level)}>
                      <span className="fractal-level-tag" style={{ background: meta.bg, color: meta.color }}>{meta.icon} {meta.tag}</span>
                      <span style={{ fontSize:11, color:"var(--sub)" }}>{meta.desc}</span>
                      <span style={{ marginLeft:"auto", fontSize:18, color: meta.color }}>{isActive ? "▾" : "▸"}</span>
                    </div>
                    <div className="fractal-level-question">{fracLevels[level]}</div>

                    {isActive && (
                      <div className="fractal-level-body" style={{ animationName:"fadeSlideUp" }}>
                        {level === "meta" ? (
                          <>
                            <textarea
                              className="fractal-reasoning-input"
                              placeholder="Write your full reasoning here… Explain WHY you believe your answer. What evidence supports it? What would change your mind?"
                              value={answerInput}
                              onInput={(e:any) => setAnswerInput(e.target.value)}
                              rows={4}
                            />
                            <button className="fractal-grade-btn" onClick={gradeReasoning} disabled={gradeLoading || !answerInput.trim()}>
                              {gradeLoading ? <span className="fractal-spinner" /> : "🎓 Grade My Reasoning →"}
                            </button>
                            {gradedResult && (
                              <div className="fractal-grade-result" style={{ borderColor: scoreColor(gradedResult.score) }}>
                                <div className="fractal-grade-score" style={{ color: scoreColor(gradedResult.score) }}>
                                  {gradedResult.score}/100 — {gradedResult.grade_label}
                                </div>
                                {gradedResult.strengths?.length > 0 && (
                                  <div className="fractal-grade-section">
                                    <div className="fractal-grade-sec-title" style={{ color:"#16a34a" }}>✅ Strengths</div>
                                    {gradedResult.strengths.map((s:string,i:number) => <div key={i} className="fractal-grade-point">• {s}</div>)}
                                  </div>
                                )}
                                {gradedResult.gaps?.length > 0 && (
                                  <div className="fractal-grade-section">
                                    <div className="fractal-grade-sec-title" style={{ color:"#dc2626" }}>❌ Gaps</div>
                                    {gradedResult.gaps.map((s:string,i:number) => <div key={i} className="fractal-grade-point">• {s}</div>)}
                                  </div>
                                )}
                                {gradedResult.deeper_insight && (
                                  <div className="fractal-grade-section">
                                    <div className="fractal-grade-sec-title" style={{ color:"#7c3aed" }}>💡 Deeper Insight You Missed</div>
                                    <div className="fractal-grade-point" style={{ fontStyle:"italic" }}>{gradedResult.deeper_insight}</div>
                                  </div>
                                )}
                                {gradedResult.encouragement && (
                                  <div className="fractal-encourage">{gradedResult.encouragement}</div>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <input
                            className="fractal-answer-input"
                            placeholder="Type your answer…"
                            value={activeLevel === level ? answerInput : ""}
                            onInput={(e:any) => setAnswerInput(e.target.value)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════ TAB 2: BUT WHY? ══════════ */}
      {tab === "why" && (
        <div className="fractal-content">
          <div className="fractal-intro-card" style={{ background:"linear-gradient(135deg,#1e1b4b,#312e81)", border:"none" }}>
            <div className="fractal-intro-title" style={{ color:"#a5b4fc" }}>🔍 But Why? — Infinite Depth</div>
            <div className="fractal-intro-sub" style={{ color:"rgba(165,180,252,0.75)" }}>Answer once → ask "But Why?" forever. There is no bottom. You choose your depth.</div>
          </div>

          <div className="why-seed-card">
            <div style={{ fontSize:11, fontWeight:800, color:"var(--sub)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6 }}>Starting Fact (Depth 0)</div>
            <div className="why-fact-text">{whyFact}</div>
            <div className="why-seed-actions">
              <button className="why-shuffle-btn" onClick={resetWhy} title="New random fact">🔀 New fact</button>
              <div style={{ fontSize:11, color:"var(--sub)" }}>Depth: <strong style={{ color:"var(--purple)" }}>{whyDepth}</strong></div>
            </div>
          </div>

          {whyChain.length === 0 && (
            <div style={{ textAlign:"center", padding:"28px 0" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
              <div style={{ fontSize:14, color:"var(--sub)" }}>Ready to go deeper?</div>
            </div>
          )}

          <div className="why-chain">
            {whyChain.map((node, i) => (
              <div key={i} className="why-node" style={{ animationDelay:`${i*0.05}s` }}>
                <div className="why-node-depth">Depth {node.depth}</div>
                <div className="why-node-link">{node.causal_link}</div>
                <div className="why-node-question">❓ {node.question}</div>
                {node.hint && <div className="why-node-hint">💡 Hint: {node.hint}</div>}
              </div>
            ))}
            <div ref={whyEndRef} />
          </div>

          <div className="why-answer-panel">
            <textarea
              className="why-answer-input"
              placeholder={whyChain.length === 0 ? "What do you know about this fact? Start with anything…" : "Your answer to the question above…"}
              value={whyAnswer}
              onInput={(e:any) => setWhyAnswer(e.target.value)}
              rows={3}
            />
            <button
              className="why-btn"
              onClick={askWhy}
              disabled={whyLoading}
              style={{ background: whyLoading ? "#6b7280" : "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
            >
              {whyLoading ? <span className="fractal-spinner" /> : <><span>But Why?</span><span style={{ fontSize:18 }}>→</span></>}
            </button>
            {whyDepth > 0 && (
              <button className="why-reset-btn" onClick={resetWhy}>↩ Reset chain</button>
            )}
          </div>
        </div>
      )}

      {/* ══════════ TAB 3: FORGETTING HEATMAP ══════════ */}
      {tab === "heatmap" && (
        <div className="fractal-content">
          <div className="fractal-intro-card" style={{ background:"linear-gradient(135deg,#1a0a0a,#450a0a)", border:"none" }}>
            <div className="fractal-intro-title" style={{ color:"#fca5a5" }}>🗓️ Predictive Forgetting Heatmap</div>
            <div className="fractal-intro-sub" style={{ color:"rgba(252,165,165,0.75)" }}>See exactly which topic you'll forget before your exam — then get an unforgettable counter-meme to fix it.</div>
          </div>

          {!heatmapData && !heatmapLoading && (
            <div style={{ padding:"24px 14px", textAlign:"center" }}>
              <div style={{ fontSize:48, marginBottom:16 }}>🗓️</div>
              <div style={{ fontSize:14, color:"var(--sub)", marginBottom:20, lineHeight:1.6 }}>
                The system will analyze your quiz history using the Ebbinghaus forgetting curve to predict which topics will fail you in the next exam.
              </div>
              <button className="fractal-expand-btn" style={{ margin:"0 auto", display:"block", padding:"14px 32px", fontSize:15 }} onClick={generateHeatmap}>
                Generate My Forgetting Map →
              </button>
            </div>
          )}

          {heatmapLoading && (
            <div className="fractal-loading-state">
              <div className="fractal-dna-anim">
                {[0,1,2,3,4].map(i => <div key={i} className="fractal-dna-dot" style={{ animationDelay:`${i*0.15}s`, background:`hsl(${i*60},70%,55%)` }} />)}
              </div>
              <div style={{ fontSize:13, color:"var(--sub)", marginTop:12 }}>Computing forgetting curves…</div>
            </div>
          )}

          {heatError && <div className="fractal-error">{heatError}</div>}

          {heatmapData && (
            <>
              <div className="heatmap-legend">
                {[["#16a34a","Safe"],["#65a30d","Low"],["#d97706","Moderate"],["#ea580c","High"],["#dc2626","Critical"]].map(([c,l]) => (
                  <span key={l} className="heatmap-legend-item"><span className="heatmap-legend-dot" style={{ background:c }} />{l}</span>
                ))}
              </div>

              <div className="heatmap-grid">
                {heatmapData.map((item, i) => (
                  <div key={i} className="heatmap-cell" style={{ borderColor: riskColor(item.forgettingRisk) }}>
                    <div className="heatmap-cell-risk" style={{ background: riskColor(item.forgettingRisk) }}>
                      {item.forgettingRisk}%
                    </div>
                    <div className="heatmap-cell-subject">{item.subject}</div>
                    <div className="heatmap-cell-meta">
                      <span>acc {item.accuracy}%</span>
                      <span>{item.daysSince}d ago</span>
                    </div>
                    <div className="heatmap-cell-label" style={{ color: riskColor(item.forgettingRisk) }}>
                      {riskLabel(item.forgettingRisk)}
                    </div>
                    {item.predictedExamMiss && <div className="heatmap-cell-warning">⚠️ Will miss</div>}
                  </div>
                ))}
              </div>

              {counterMeme && (
                <div className="counter-meme-card">
                  <div className="counter-meme-badge">🧠 Counter-Meme Generated for: {counterMeme.subject}</div>
                  <div className="counter-meme-hook">{counterMeme.hook_word}</div>
                  <div className="counter-meme-text">{counterMeme.meme}</div>
                  {counterMeme.visual_cue && (
                    <div className="counter-meme-visual">👁️ Visual: {counterMeme.visual_cue}</div>
                  )}
                </div>
              )}

              <div style={{ padding:"14px", textAlign:"center" }}>
                <button className="fractal-expand-btn" style={{ opacity:0.7, fontSize:13 }} onClick={generateHeatmap}>
                  ↻ Regenerate
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════ TAB 4: EXAM DNA ══════════ */}
      {tab === "dna" && (
        <div className="fractal-content">
          <div className="fractal-intro-card" style={{ background:"linear-gradient(135deg,#042f2e,#134e4a)", border:"none" }}>
            <div className="fractal-intro-title" style={{ color:"#5eead4" }}>🧬 Exam DNA Analyzer</div>
            <div className="fractal-intro-sub" style={{ color:"rgba(94,234,212,0.75)" }}>Paste your professor's past questions or your notes. The AI reverse-engineers the question DNA and generates 10 never-before-seen exam questions.</div>
          </div>

          <div className="dna-input-card">
            <div style={{ fontSize:12, fontWeight:800, color:"var(--sub)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>Paste Notes or Past Exam Questions</div>
            <textarea
              className="dna-textarea"
              placeholder={"Paste anything:\n• Your class notes\n• Past exam questions\n• Textbook paragraphs\n• Topic keywords\n\nMinimum 20 characters."}
              value={dnaContent}
              onInput={(e:any) => setDnaContent(e.target.value)}
              rows={7}
            />
            <div className="dna-actions">
              <span style={{ fontSize:11, color:"var(--sub)" }}>{dnaContent.length} / 3000 chars</span>
              <button className="fractal-expand-btn" style={{ padding:"11px 24px" }}
                onClick={analyzeExamDNA} disabled={dnaLoading || dnaContent.trim().length < 20}>
                {dnaLoading ? <span className="fractal-spinner" /> : "🧬 Analyze DNA →"}
              </button>
            </div>
          </div>

          {dnaError && <div className="fractal-error">{dnaError}</div>}

          {dnaLoading && (
            <div className="fractal-loading-state">
              <div className="fractal-dna-anim">
                {[0,1,2,3,4].map(i => <div key={i} className="fractal-dna-dot" style={{ animationDelay:`${i*0.15}s`, background:"#5eead4" }} />)}
              </div>
              <div style={{ fontSize:13, color:"var(--sub)", marginTop:12 }}>Sequencing exam DNA…</div>
            </div>
          )}

          {dnaResult && (
            <>
              <div className="dna-profile-card">
                <div className="dna-profile-title">🧬 Exam DNA Profile</div>
                <div className="dna-profile-grid">
                  <div className="dna-profile-item">
                    <div className="dna-label">Difficulty</div>
                    <div className="dna-value">{dnaResult.dna?.difficulty_signature}</div>
                  </div>
                  <div className="dna-profile-item">
                    <div className="dna-label">Style</div>
                    <div className="dna-value">{dnaResult.dna?.question_style}</div>
                  </div>
                </div>
                {dnaResult.dna?.dominant_patterns?.length > 0 && (
                  <div className="dna-tags-row">
                    <div className="dna-label" style={{ marginBottom:6 }}>Patterns Detected</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {dnaResult.dna.dominant_patterns.map((p:string,i:number) => (
                        <span key={i} className="dna-tag" style={{ background:"rgba(94,234,212,0.12)", color:"#14b8a6" }}>{p}</span>
                      ))}
                    </div>
                  </div>
                )}
                {dnaResult.dna?.trick_types?.length > 0 && (
                  <div className="dna-tags-row">
                    <div className="dna-label" style={{ marginBottom:6 }}>⚠️ Trick Types</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {dnaResult.dna.trick_types.map((t:string,i:number) => (
                        <span key={i} className="dna-tag" style={{ background:"rgba(239,68,68,0.1)", color:"#ef4444" }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding:"0 14px 8px" }}>
                <div style={{ fontSize:15, fontWeight:800, color:"var(--text)", marginBottom:12, fontFamily:"'Lato',sans-serif" }}>
                  Generated Questions ({dnaResult.questions?.length || 0})
                </div>
                {(dnaResult.questions || []).map((q: any, i: number) => (
                  <div key={i} className="dna-question-card">
                    <div className="dna-q-header" onClick={() => setExpandedQ(expandedQ === i ? null : i)}>
                      <span className="dna-q-num">Q{i+1}</span>
                      {q.blind_spot && <span className="dna-blind-spot">🎯 Blind Spot</span>}
                      {q.pattern_used && <span className="dna-pattern-used">{q.pattern_used}</span>}
                      <span style={{ marginLeft:"auto", color:"var(--sub)" }}>{expandedQ === i ? "▾" : "▸"}</span>
                    </div>
                    <div className="dna-q-text">{q.text}</div>
                    {expandedQ === i && (
                      <div className="dna-q-body">
                        <div className="dna-options">
                          {(q.options || []).map((opt: any) => {
                            const isSelected = dnaAnswers[i] === opt.id;
                            const revealed = dnaRevealed[i];
                            const isCorrect = opt.id === q.correct;
                            let bg = "transparent", border = "var(--border)", color = "var(--sub)";
                            if (revealed && isCorrect) { bg="#dcfce7"; border="#16a34a"; color="#166534"; }
                            else if (revealed && isSelected && !isCorrect) { bg="#fee2e2"; border="#dc2626"; color="#991b1b"; }
                            else if (isSelected && !revealed) { bg="rgba(124,58,237,0.08)"; border="var(--purple)"; color="var(--purple)"; }
                            return (
                              <button key={opt.id} className="dna-option-btn" style={{ background:bg, borderColor:border, color }}
                                onClick={() => !revealed && setDnaAnswers(a => ({...a, [i]:opt.id}))}>
                                <span className="dna-opt-id" style={{ background:revealed&&isCorrect?"#16a34a":revealed&&isSelected?"#dc2626":isSelected?"var(--purple)":"rgba(0,0,0,0.08)", color:(revealed&&isCorrect)||(revealed&&isSelected)||isSelected?"#fff":"var(--sub)" }}>{opt.id}</span>
                                <span>{opt.text}</span>
                              </button>
                            );
                          })}
                        </div>
                        {!dnaRevealed[i] ? (
                          <button className="dna-reveal-btn" disabled={!dnaAnswers[i]}
                            onClick={() => setDnaRevealed(r => ({...r, [i]:true}))}>
                            Reveal Answer
                          </button>
                        ) : (
                          <div className="dna-solution">{q.solution}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════ TAB 5: MEMORY SPORES ══════════ */}
      {tab === "spores" && (
        <div className="fractal-content">
          <div className="fractal-intro-card" style={{ background:"linear-gradient(135deg,#0c0a1e,#1e0533)", border:"none" }}>
            <div className="fractal-intro-title" style={{ color:"#c4b5fd" }}>🦠 Memory Spore Ecosystem</div>
            <div className="fractal-intro-sub" style={{ color:"rgba(196,181,253,0.75)" }}>When you struggle with a fact, encode it as a spore — a tiny rhyme + pattern. Share it. As it helps others, your Teaching Immune Score rises.</div>
          </div>

          <div className="spores-action-row">
            <button className="spore-create-btn" onClick={() => setShowCreate(!showCreate)}>
              {showCreate ? "✕ Cancel" : "➕ Create Spore"}
            </button>
            <button className="spore-inject-random-btn" onClick={injectRandomSpore} disabled={spores.length === 0}>
              🦠 Inject Random
            </button>
          </div>

          {showCreate && (
            <div className="spore-create-card">
              <div style={{ fontSize:14, fontWeight:800, color:"var(--text)", marginBottom:16, fontFamily:"'Lato',sans-serif" }}>Create a Memory Spore</div>
              <div className="spore-field">
                <label className="spore-label">The Fact to Encode</label>
                <input className="spore-input" placeholder="e.g. Napoleon was 5ft 7in tall, above average for his era" value={sporeFact} onInput={(e:any) => setSporeFact(e.target.value)} />
              </div>
              <div className="spore-field">
                <label className="spore-label">Subject</label>
                <select className="spore-input" value={sporeSubject} onChange={(e:any) => setSporeSubject(e.target.value)}>
                  {["Biology","Chemistry","Physics","Mathematics","History","Bangla","English","ICT","BCS","General"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <button className="spore-ai-btn" onClick={aiGenerateSpore} disabled={sporeAiLoading || !sporeFact.trim()}>
                {sporeAiLoading ? <span className="fractal-spinner" /> : "✨ AI Generate Rhyme + Pattern"}
              </button>
              <div className="spore-field">
                <label className="spore-label">Rhyme / Rhythm (required)</label>
                <textarea className="spore-input" rows={2} placeholder="e.g. 'Napoleon felt small? That's not true at all!'" value={sporeRhyme} onInput={(e:any) => setSporeRhyme(e.target.value)} />
              </div>
              <div className="spore-field">
                <label className="spore-label">Pattern / Acronym (optional)</label>
                <input className="spore-input" placeholder="e.g. 5+7 = 12 = above average" value={sporePattern} onInput={(e:any) => setSporePattern(e.target.value)} />
              </div>
              <div className="spore-field">
                <label className="spore-label">Your Name</label>
                <input className="spore-input" value={authorName} onInput={(e:any) => setAuthorName(e.target.value)} />
              </div>
              <button className="spore-submit-btn" onClick={submitSpore} disabled={sporeSubmitting || !sporeFact.trim() || !sporeRhyme.trim()}>
                {sporeSubmitting ? <span className="fractal-spinner" /> : "🦠 Release Spore into Ecosystem"}
              </button>
            </div>
          )}

          {sporeLoading ? (
            <div className="fractal-loading-state"><div className="fractal-spinner" style={{ width:32, height:32 }} /></div>
          ) : spores.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 14px" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🦠</div>
              <div style={{ fontSize:14, color:"var(--sub)" }}>No spores yet — be the first to create one!</div>
            </div>
          ) : (
            <div className="spores-grid">
              {spores.map(sp => (
                <div key={sp.id} className="spore-card">
                  <div className="spore-card-header">
                    <span className="spore-subject-badge">{sp.subject}</span>
                    <span className="spore-author">by {sp.authorName}</span>
                    {sp.teachingScore > 0 && <span className="spore-score">🛡️ {sp.teachingScore}</span>}
                  </div>
                  <div className="spore-fact">{sp.fact}</div>
                  <div className="spore-rhyme">🎵 "{sp.rhyme}"</div>
                  {sp.pattern && <div className="spore-pattern">🔑 {sp.pattern}</div>}
                  <div className="spore-card-footer">
                    <button className="spore-helpful-btn" onClick={() => markHelpful(sp.id)}>
                      👍 Helpful ({sp.helpfulCount || 0})
                    </button>
                    <span style={{ fontSize:10, color:"var(--sub)" }}>{new Date(sp.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
