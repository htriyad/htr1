import { Router } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const router = Router();
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta";

const DATA_DIR = path.resolve(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
function rd<T>(file: string, def: T): T {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return def;
  try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return def; }
}
function wr(file: string, data: unknown) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}
function uid() { return crypto.randomBytes(8).toString("hex"); }

async function ai(prompt: string, system: string, temp = 0.7, maxTokens = 2000): Promise<string> {
  if (!GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY is not set");
  const models = [MODEL, "gemini-2.5-flash-lite", "gemini-2.0-flash-lite", "gemini-2.0-flash"];
  let lastErr = "";
  for (const m of models) {
    try {
      const r = await fetch(`${BASE}/models/${m}:generateContent?key=${GOOGLE_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: temp, maxOutputTokens: maxTokens }
        })
      });
      if (r.ok) {
        const d: any = await r.json();
        return d?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
      }
      lastErr = `status ${r.status}`;
      if (r.status !== 429 && r.status !== 503) break;
    } catch (e: any) { lastErr = e.message; }
  }
  throw new Error(`AI failed: ${lastErr}`);
}

/* ══════════════════════════════════════════════════════════
   1. DYNAMIC DIFFICULTY FRACTALS
   POST /api/fractal/expand   { topic }
   Returns 4 levels of questions: basic, connective, counterfactual, meta
══════════════════════════════════════════════════════════ */
router.post("/expand", async (req: any, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: "Topic required" });
  try {
    const text = await ai(
      `Topic: "${topic}"
Generate exactly 4 questions at these cognitive levels. Return ONLY valid JSON, no markdown fences.
{
  "basic": "A factual recall question about this topic",
  "connective": "A question connecting this topic to broader context, historical forces, or other concepts",
  "counterfactual": "A 'what if' or alternative-history question that requires deep reasoning about the topic",
  "meta": "A metacognitive question: ask the student to explain WHY they believe their answer is correct, what evidence supports it, and what would change their mind"
}`,
      "You are a Bangladeshi SSC/HSC/Admission/BCS knowledge fractal engine. Generate intellectually stimulating questions that force deep thinking at 4 cognitive levels. Questions should be specific, challenging, and thought-provoking. Return ONLY valid JSON.",
      0.75,
      600
    );
    const clean = text.replace(/```json|```/g, "").trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return res.status(422).json({ error: "Could not parse fractal", raw: text.slice(0, 200) });
    res.json(JSON.parse(match[0]));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

/* ══════════════════════════════════════════════════════════
   2. "BUT WHY?" RECURSIVE QUIZZING
   POST /api/fractal/why   { concept, prevQuestion, prevAnswer, depth }
   Returns the next level "But Why?" question
══════════════════════════════════════════════════════════ */
router.post("/why", async (req: any, res) => {
  const { concept, prevQuestion, prevAnswer, depth = 1 } = req.body;
  if (!concept) return res.status(400).json({ error: "Concept required" });
  try {
    const text = await ai(
      `Concept: "${concept}"
${prevQuestion ? `Previous question (depth ${depth - 1}): "${prevQuestion}"` : ""}
${prevAnswer ? `Student's answer: "${prevAnswer}"` : ""}
Current depth: ${depth}

Generate the next "But Why?" question — one level DEEPER into the causal chain.
Return ONLY valid JSON:
{
  "question": "The deeper 'but why?' follow-up question",
  "hint": "A subtle Socratic hint to guide thinking (1 sentence)",
  "causal_link": "Brief explanation of how this level connects to the previous one"
}`,
      "You are a Socratic tutor for Bangladeshi students. Each 'But Why?' must go ONE level deeper into causality, mechanism, or first principles. Never repeat — always descend. Return ONLY valid JSON.",
      0.8, 400
    );
    const clean = text.replace(/```json|```/g, "").trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return res.status(422).json({ error: "Parse error", raw: text.slice(0, 200) });
    res.json({ ...JSON.parse(match[0]), depth });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

/* ══════════════════════════════════════════════════════════
   3. GRADE META-COGNITIVE REASONING
   POST /api/fractal/grade   { question, reasoning }
   Returns score + detailed feedback
══════════════════════════════════════════════════════════ */
router.post("/grade", async (req: any, res) => {
  const { question, reasoning } = req.body;
  if (!question || !reasoning) return res.status(400).json({ error: "Question and reasoning required" });
  try {
    const text = await ai(
      `Question: "${question}"
Student's reasoning: "${reasoning}"

Grade this metacognitive reasoning. Return ONLY valid JSON:
{
  "score": <0-100>,
  "grade_label": "Excellent|Good|Developing|Needs Work",
  "strengths": ["point1", "point2"],
  "gaps": ["missing point or logical flaw"],
  "deeper_insight": "One profound insight the student missed entirely",
  "encouragement": "1 sentence of genuine, specific encouragement"
}`,
      "You are a strict but fair academic grader. Grade based on: logical coherence (30%), use of evidence (30%), awareness of counterarguments (20%), clarity (20%). Return ONLY valid JSON.",
      0.5, 600
    );
    const clean = text.replace(/```json|```/g, "").trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return res.status(422).json({ error: "Parse error" });
    res.json(JSON.parse(match[0]));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

/* ══════════════════════════════════════════════════════════
   4. PREDICTIVE FORGETTING HEATMAP + COUNTER-MEME
   POST /api/fractal/heatmap   { topicScores: [{subject, correct, total, lastSeen}] }
   Returns heatmap data + AI-generated counter-meme for weakest topic
══════════════════════════════════════════════════════════ */
router.post("/heatmap", async (req: any, res) => {
  const { topicScores } = req.body;
  if (!Array.isArray(topicScores) || topicScores.length === 0) {
    return res.status(400).json({ error: "topicScores array required" });
  }
  try {
    // Compute forgetting risk using Ebbinghaus-inspired formula
    const now = Date.now();
    const heatmap = topicScores.map((t: any) => {
      const accuracy = t.total > 0 ? t.correct / t.total : 0;
      const daysSince = t.lastSeen ? (now - new Date(t.lastSeen).getTime()) / 86400000 : 14;
      // Higher risk = lower accuracy + more days passed
      const retentionFactor = Math.exp(-daysSince / (7 * (0.3 + accuracy * 0.7)));
      const forgettingRisk = Math.round((1 - retentionFactor) * 100);
      return {
        subject: t.subject,
        forgettingRisk: Math.min(99, Math.max(1, forgettingRisk)),
        accuracy: Math.round(accuracy * 100),
        daysSince: Math.round(daysSince),
        predictedExamMiss: forgettingRisk > 65,
      };
    }).sort((a: any, b: any) => b.forgettingRisk - a.forgettingRisk);

    // Generate counter-meme for the weakest topic
    const weakest = heatmap[0];
    let counterMeme = null;
    if (weakest && weakest.forgettingRisk > 40) {
      const memeText = await ai(
        `Topic the student is about to forget: "${weakest.subject}"
Forgetting risk: ${weakest.forgettingRisk}%
Accuracy so far: ${weakest.accuracy}%

Create ONE unforgettable memory meme — a weird, absurd, vivid association that locks this topic into long-term memory forever.
Return ONLY valid JSON:
{
  "meme": "The ultra-memorable meme/association/story (2-3 sentences, creative, absurd, specific)",
  "hook_word": "One shocking/funny word to anchor it",
  "visual_cue": "Describe a vivid mental image in 1 sentence"
}`,
        "You are a memory champion and cognitive scientist. Create wildly memorable, slightly absurd mnemonics that stick forever. The weirder and more specific, the better. Return ONLY valid JSON.",
        0.9, 400
      );
      const clean = memeText.replace(/```json|```/g, "").trim();
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) counterMeme = { ...JSON.parse(match[0]), subject: weakest.subject };
    }
    res.json({ heatmap, counterMeme });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

/* ══════════════════════════════════════════════════════════
   5. EXAM DNA ANALYZER
   POST /api/fractal/exam-dna   { content, count? }
   Reverse-engineers question DNA from notes/past exams
══════════════════════════════════════════════════════════ */
router.post("/exam-dna", async (req: any, res) => {
  const { content, count = 10 } = req.body;
  if (!content || String(content).trim().length < 20) {
    return res.status(400).json({ error: "Content too short (min 20 chars)" });
  }
  const c = String(content).slice(0, 3000);
  try {
    const text = await ai(
      `Analyze this content and generate ${count} exam questions based on its DNA.
Content:
"""
${c}
"""
Return ONLY valid JSON:
{
  "dna": {
    "dominant_patterns": ["pattern1", "pattern2", "pattern3"],
    "trick_types": ["type1", "type2"],
    "key_concepts": ["concept1", "concept2", "concept3"],
    "difficulty_signature": "Easy/Medium/Hard/Mixed",
    "question_style": "MCQ/Short-answer/Essay/Mixed"
  },
  "questions": [
    {
      "text": "question text",
      "options": [{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."},{"id":"D","text":"..."}],
      "correct": "A",
      "solution": "explanation",
      "blind_spot": true or false,
      "pattern_used": "which DNA pattern this tests"
    }
  ]
}`,
      "You are an exam question forensics expert for Bangladeshi SSC/HSC/BCS. Analyze the 'DNA' of input content — its patterns, emphasis, trick types — then generate never-before-seen questions that feel identical to what would appear in a real exam. Return ONLY valid JSON.",
      0.6, 3000
    );
    const clean = text.replace(/```json|```/g, "").trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return res.status(422).json({ error: "Parse error", raw: text.slice(0, 300) });
    res.json(JSON.parse(match[0]));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

/* ══════════════════════════════════════════════════════════
   MEMORY SPORES
   GET  /api/fractal/spores
   POST /api/fractal/spores   { fact, rhyme, pattern, subject, authorName }
   POST /api/fractal/spores/:id/helpful
══════════════════════════════════════════════════════════ */
router.get("/spores", (_req, res) => {
  res.json(rd<any[]>("spores.json", []));
});

router.post("/spores", (req: any, res) => {
  const b = req.body as any;
  const fact = String(b.fact || "").trim().slice(0, 300);
  const rhyme = String(b.rhyme || "").trim().slice(0, 300);
  const pattern = String(b.pattern || "").trim().slice(0, 200);
  const subject = String(b.subject || "General").trim().slice(0, 80);
  const authorName = String(b.authorName || "Anonymous").trim().slice(0, 80);
  if (!fact) return res.status(400).json({ error: "fact required" });
  const spore = {
    id: uid(),
    fact, rhyme, pattern, subject, authorName,
    helpfulCount: 0,
    teachingScore: 0,
    createdAt: new Date().toISOString(),
  };
  const list = rd<any[]>("spores.json", []);
  list.unshift(spore);
  wr("spores.json", list.slice(0, 500));
  res.json(spore);
});

router.post("/spores/:id/helpful", (req: any, res) => {
  const list = rd<any[]>("spores.json", []);
  const s = list.find(x => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: "Not found" });
  s.helpfulCount = (s.helpfulCount || 0) + 1;
  s.teachingScore = Math.round(s.helpfulCount * 1.5);
  wr("spores.json", list);
  res.json({ ok: true, teachingScore: s.teachingScore });
});

/* AI-generate a spore for a given fact */
router.post("/spores/ai-generate", async (req: any, res) => {
  const { fact, subject } = req.body;
  if (!fact) return res.status(400).json({ error: "fact required" });
  try {
    const text = await ai(
      `Fact: "${fact}" (Subject: ${subject || "General"})
Create a memory spore — a tiny, shareable mnemonic that sticks in memory instantly.
Return ONLY valid JSON:
{
  "rhyme": "A short rhyme or rhythm-based phrase that encodes the fact (1-2 lines)",
  "pattern": "A visual/structural pattern or acronym to remember it"
}`,
      "You are a memory champion. Create spores — tiny mnemonic capsules — that encode facts in rhyme and pattern. Be creative, fun, and specific. Return ONLY valid JSON.",
      0.85, 300
    );
    const clean = text.replace(/```json|```/g, "").trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return res.status(422).json({ error: "Parse error" });
    res.json(JSON.parse(match[0]));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
