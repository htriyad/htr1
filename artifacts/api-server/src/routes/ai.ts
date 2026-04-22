import { Router } from "express";

/* ─────────────────────────────────────────────────────────────────────────
   Red Rose 🥀 AI — powered by Google Gemini
   Uses GOOGLE_API_KEY (Gemini REST API).
   Streaming via SSE (server-sent events) using Gemini's streamGenerateContent.
   ───────────────────────────────────────────────────────────────────────── */

const router = Router();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta";

const BRAND = "Red Rose 🥀 AI";

const FORMAT_RULES = `
FORMATTING RULES — ALWAYS follow:
- Reply must be SHORT but DETAILED (no fluff, no repetition).
- Use Markdown: **bold** for key terms, *italic* for emphasis, __underline__ for definitions, ==highlight== for the most important phrase, \`code\` for formulas/IDs.
- Use bullet lists "- " or numbered "1." for steps.
- Use LaTeX for math: $x^2+1$ inline or $$\\int x\\,dx$$ block.
- Chemistry: \\ce{H2O}.
- Mix Bangla + English naturally where helpful.
- End with a one-line ==Key Takeaway==.
`.trim();

const SYS_TUTOR = `You are ${BRAND}, a friendly study assistant for Bangladeshi students (SSC, HSC, Admission, BCS).
${FORMAT_RULES}`;

const SYS_ROUTINE = `You are ${BRAND} — a study routine planner. Generate a clear weekly schedule as a Markdown table with days × time slots, including breaks and revision.
${FORMAT_RULES}`;

const SYS_CAREER = `You are ${BRAND} — a career counselor for Bangladeshi students.
${FORMAT_RULES}
Give: top 3 career paths, required exams, 2-year roadmap, target universities, focus subjects.`;

type Msg = { role: "system" | "user" | "assistant"; content: string };

interface GeminiPart { text: string }
interface GeminiContent { role: "user" | "model"; parts: GeminiPart[] }

/* Convert OpenAI-style messages (with separate system) into Gemini contents + systemInstruction. */
function toGemini(messages: Msg[]): { systemInstruction: { parts: GeminiPart[] } | undefined; contents: GeminiContent[] } {
  let system = "";
  const contents: GeminiContent[] = [];
  for (const m of messages) {
    if (m.role === "system") { system += (system ? "\n\n" : "") + m.content; continue; }
    contents.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] });
  }
  return {
    systemInstruction: system ? { parts: [{ text: system }] } : undefined,
    contents,
  };
}

async function runChat(messages: Msg[], opts: { temperature?: number } = {}): Promise<string> {
  if (!GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY is not set");
  const body = {
    ...toGemini(messages),
    generationConfig: { temperature: opts.temperature ?? 0.6, maxOutputTokens: 1500 },
  };
  const r = await fetch(`${BASE}/models/${MODEL}:generateContent?key=${GOOGLE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`Gemini ${r.status}: ${txt.slice(0, 250)}`);
  }
  const data: any = await r.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p: any) => p?.text || "").join("");
}

async function streamChat(messages: Msg[], res: any) {
  if (!GOOGLE_API_KEY) {
    res.write(`data: ${JSON.stringify({ error: "GOOGLE_API_KEY is not set on the server" })}\n\n`);
    res.end();
    return;
  }
  const body = {
    ...toGemini(messages),
    generationConfig: { temperature: 0.6, maxOutputTokens: 1500 },
  };
  // alt=sse gives clean SSE frames with JSON chunks.
  const upstream = await fetch(
    `${BASE}/models/${MODEL}:streamGenerateContent?alt=sse&key=${GOOGLE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(body),
    },
  );

  if (!upstream.ok || !upstream.body) {
    const txt = await upstream.text().catch(() => "");
    res.write(`data: ${JSON.stringify({ error: `Gemini ${upstream.status}: ${txt.slice(0, 250)}` })}\n\n`);
    res.end();
    return;
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const ln of lines) {
      const line = ln.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try {
        const parsed = JSON.parse(payload);
        const parts = parsed?.candidates?.[0]?.content?.parts ?? [];
        const delta = parts.map((p: any) => p?.text || "").join("");
        if (delta) res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      } catch {
        // ignore
      }
    }
  }
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
}

/* POST /api/ai/chat */
router.post("/chat", async (req, res) => {
  const { messages, context } = req.body as { messages: Msg[]; context?: string };
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const sys = context ? `${SYS_TUTOR}\n\nContext: ${context}` : SYS_TUTOR;
    const msgs: Msg[] = [
      { role: "system", content: sys },
      ...(messages || []).slice(-20).map((m) => ({ role: m.role as Msg["role"], content: m.content })),
    ];
    await streamChat(msgs, res);
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err?.message || "AI error" })}\n\n`);
    res.end();
  }
});

/* POST /api/ai/routine */
router.post("/routine", async (req, res) => {
  const { goals, weakSubjects, availableHours, daysLeft } = req.body;
  try {
    const prompt = `Goals: ${goals}
Weak subjects: ${weakSubjects?.join(", ") || "Not specified"}
Available hours/day: ${availableHours || 4}
Days until exam: ${daysLeft || 30}

Create a detailed weekly schedule.`;
    const text = await runChat([
      { role: "system", content: SYS_ROUTINE },
      { role: "user", content: prompt },
    ]);
    res.json({ routine: text || "Could not generate routine." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* POST /api/ai/career */
router.post("/career", async (req, res) => {
  const { topicScores, interests, goals } = req.body;
  try {
    const prompt = `Topic scores: ${JSON.stringify(topicScores || {})}
Interests: ${interests || "Not specified"}
Goals: ${goals || "Not specified"}

Provide career recommendations.`;
    const text = await runChat([
      { role: "system", content: SYS_CAREER },
      { role: "user", content: prompt },
    ]);
    res.json({ recommendations: text || "Could not generate recommendations." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* POST /api/ai/explain — streaming */
router.post("/explain", async (req, res) => {
  const { question, topic, level } = req.body;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  try {
    await streamChat(
      [
        { role: "system", content: SYS_TUTOR },
        { role: "user", content: `Please explain this ${topic || "topic"} at ${level || "HSC"} level:\n\n${question}` },
      ],
      res,
    );
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

/* POST /api/ai/generate-questions */
router.post("/generate-questions", async (req, res) => {
  const { topic, count, level, type } = req.body;
  try {
    const text = await runChat(
      [
        { role: "system", content: `You are ${BRAND} — generate MCQs in pure JSON only, no prose, no markdown fences.` },
        {
          role: "user",
          content: `Generate ${count || 5} MCQ questions on "${topic}" for ${level || "HSC"} ${type || "Science"} students.
Return ONLY a JSON array with this shape:
[{"text":"question","options":[{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."},{"id":"D","text":"..."}],"correct":"A","solution":"explanation"}]
Use LaTeX $...$ for math. Bangla allowed.`,
        },
      ],
      { temperature: 0.4 },
    );
    const cleaned = text.replace(/```json|```/g, "");
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) return res.status(422).json({ error: "Could not parse questions", raw: text.slice(0, 400) });
    res.json({ questions: JSON.parse(match[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
