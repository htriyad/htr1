import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  // Resolve the API key tolerantly: prefer the canonical name, but if a
  // mangled env var key exists (e.g. trailing whitespace / accidental suffix),
  // fall back to the first env var that *starts with* the canonical prefix.
  apiKey: (() => {
    const exact = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    if (exact && exact !== "placeholder") return exact;
    const fuzzy = Object.entries(process.env).find(
      ([k, v]) => k.startsWith("AI_INTEGRATIONS_OPENAI_API_KEY") && v && v !== "placeholder"
    );
    return fuzzy?.[1] || "placeholder";
  })(),
});

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

/* POST /api/ai/chat  (streaming) */
router.post("/chat", async (req, res) => {
  const { messages, context } = req.body as { messages: {role:string;content:string}[]; context?: string };
  res.setHeader("Content-Type","text/event-stream");
  res.setHeader("Cache-Control","no-cache");
  res.setHeader("Connection","keep-alive");
  res.setHeader("Access-Control-Allow-Origin","*");

  try {
    const systemMsg = context ? `${SYS_TUTOR}\n\nContext: ${context}` : SYS_TUTOR;
    const stream = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 8192,
      messages: [
        { role:"system", content: systemMsg },
        ...messages.slice(-20).map(m => ({ role: m.role as "user"|"assistant", content: m.content })),
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) res.write(`data: ${JSON.stringify({content})}\n\n`);
    }
    res.write(`data: ${JSON.stringify({done:true})}\n\n`);
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({error: err.message||"AI error"})}\n\n`);
    res.end();
  }
});

/* POST /api/ai/routine */
router.post("/routine", async (req, res) => {
  const { goals, weakSubjects, availableHours, daysLeft } = req.body;
  try {
    const prompt = `Create a study routine for a student with these details:
Goals: ${goals}
Weak subjects: ${weakSubjects?.join(", ")||"Not specified"}
Available hours per day: ${availableHours||4}
Days until exam: ${daysLeft||30}

Create a detailed weekly schedule.`;

    const r = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 8192,
      messages: [
        { role:"system", content: SYS_ROUTINE },
        { role:"user",   content: prompt },
      ],
    });
    res.json({ routine: r.choices[0]?.message?.content || "Could not generate routine." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* POST /api/ai/career */
router.post("/career", async (req, res) => {
  const { topicScores, interests, goals } = req.body;
  try {
    const prompt = `Student performance data:
Topic scores: ${JSON.stringify(topicScores||{})}
Interests: ${interests||"Not specified"}
Goals: ${goals||"Not specified"}

Provide career recommendations.`;

    const r = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 8192,
      messages: [
        { role:"system", content: SYS_CAREER },
        { role:"user",   content: prompt },
      ],
    });
    res.json({ recommendations: r.choices[0]?.message?.content || "Could not generate recommendations." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* POST /api/ai/explain  — explain a specific topic/question */
router.post("/explain", async (req, res) => {
  const { question, topic, level } = req.body;
  res.setHeader("Content-Type","text/event-stream");
  res.setHeader("Cache-Control","no-cache");
  res.setHeader("Connection","keep-alive");
  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 8192,
      messages: [
        { role:"system", content: SYS_TUTOR },
        { role:"user",   content: `Please explain this ${topic||"topic"} at ${level||"HSC"} level:\n\n${question}` },
      ],
      stream: true,
    });
    for await (const chunk of stream) {
      const c = chunk.choices[0]?.delta?.content;
      if (c) res.write(`data: ${JSON.stringify({content:c})}\n\n`);
    }
    res.write(`data: ${JSON.stringify({done:true})}\n\n`);
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({error: err.message})}\n\n`);
    res.end();
  }
});

/* POST /api/ai/generate-questions  — generate quiz questions on a topic */
router.post("/generate-questions", async (req, res) => {
  const { topic, count, level, type } = req.body;
  try {
    const r = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 8192,
      messages: [
        { role:"system", content: "You are a question generator for Bangladeshi exam prep. Generate MCQ questions in JSON format only. No extra text." },
        { role:"user",   content: `Generate ${count||5} MCQ questions on "${topic}" for ${level||"HSC"} ${type||"Science"} students.
Return JSON array: [{"text":"question","options":[{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."},{"id":"D","text":"..."}],"correct":"A","solution":"explanation"}]
Use LaTeX for math: $x^2$. Bengali is allowed.` },
      ],
    });
    const raw = r.choices[0]?.message?.content || "[]";
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return res.status(422).json({ error:"Could not parse questions" });
    res.json({ questions: JSON.parse(match[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
