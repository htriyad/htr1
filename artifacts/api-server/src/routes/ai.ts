import { Router } from "express";

/* ─────────────────────────────────────────────────────────────────────────
   FREE AI BACKEND
   Uses Pollinations.ai's public OpenAI-compatible endpoint.
   - No API key required
   - No payment required
   - Supports streaming (Server-Sent Events)
   - OpenAI-compatible request/response shape
   Endpoint: https://text.pollinations.ai/openai
   ───────────────────────────────────────────────────────────────────────── */

const router = Router();

const POLLI_URL = "https://text.pollinations.ai/openai";
const DEFAULT_MODEL = "openai"; // gpt-4o-mini class, free tier

const SYS_TUTOR = `You are RedRose AI Tutor 🥀, a friendly and intelligent study assistant for Bangladeshi students preparing for SSC, HSC, and university admission exams. You:
- Explain concepts clearly in both Bengali and English (mix naturally)
- Support mathematical equations using LaTeX notation ($...$)
- Support chemistry: H₂O, chemical equations, etc.
- Give step-by-step solutions
- Encourage and motivate students
- Keep answers concise but complete
- Generate practice questions when asked
- Predict exam patterns based on previous years`;

const SYS_ROUTINE = `You are a study routine generator. The user will give you their goals, available time, and weak subjects. Create a detailed, realistic weekly study schedule. Format it as a structured table with days and time slots. Include breaks, revision time, and exam practice. Output in a clear format that can be displayed.`;

const SYS_CAREER = `You are a career counselor for Bangladeshi students. Based on their performance data, interests, and goals, suggest:
1. Top 3 career paths that match their strengths
2. Required exams to prepare for (SSC, HSC, BCS, Medical, Engineering, etc.)
3. Step-by-step roadmap for next 2 years
4. Universities and departments to target
5. Key subjects to focus on
Be specific, practical, and encouraging. Output in structured format.`;

type Msg = { role: "system" | "user" | "assistant"; content: string };

/* Non-streaming helper — returns the full assistant message text. */
async function runChat(messages: Msg[], opts: { temperature?: number } = {}): Promise<string> {
  const r = await fetch(POLLI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      stream: false,
      private: true,
      temperature: opts.temperature ?? 0.7,
    }),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`AI provider returned ${r.status}: ${txt.slice(0, 200)}`);
  }
  const data: any = await r.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

/* Streaming helper — pipes the upstream SSE chunks straight to the client. */
async function streamChat(messages: Msg[], res: any) {
  const upstream = await fetch(POLLI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      stream: true,
      private: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const txt = await upstream.text().catch(() => "");
    res.write(`data: ${JSON.stringify({ error: `AI ${upstream.status}: ${txt.slice(0,200)}` })}\n\n`);
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

    // Parse SSE lines: each "data: {...}" line is one chunk.
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const ln of lines) {
      const line = ln.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      if (payload === "[DONE]") {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      }
      try {
        const parsed = JSON.parse(payload);
        const delta = parsed?.choices?.[0]?.delta?.content;
        if (delta) res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      } catch {
        // ignore non-JSON keep-alive lines
      }
    }
  }
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
}

/* POST /api/ai/chat — streaming */
router.post("/chat", async (req, res) => {
  const { messages, context } = req.body as { messages: Msg[]; context?: string };
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const systemMsg = context ? `${SYS_TUTOR}\n\nContext: ${context}` : SYS_TUTOR;
    const msgs: Msg[] = [
      { role: "system", content: systemMsg },
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
    const prompt = `Create a study routine for a student with these details:
Goals: ${goals}
Weak subjects: ${weakSubjects?.join(", ") || "Not specified"}
Available hours per day: ${availableHours || 4}
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
    const prompt = `Student performance data:
Topic scores: ${JSON.stringify(topicScores || {})}
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
        { role: "system", content: "You are a question generator for Bangladeshi exam prep. Generate MCQ questions in JSON format only. No extra text." },
        {
          role: "user",
          content: `Generate ${count || 5} MCQ questions on "${topic}" for ${level || "HSC"} ${type || "Science"} students.
Return JSON array: [{"text":"question","options":[{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."},{"id":"D","text":"..."}],"correct":"A","solution":"explanation"}]
Use LaTeX for math: $x^2$. Bengali is allowed.`,
        },
      ],
      { temperature: 0.4 },
    );
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return res.status(422).json({ error: "Could not parse questions", raw: text.slice(0, 400) });
    res.json({ questions: JSON.parse(match[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
