# Jarvis MVP — “Intelligent Blank Page” (Hackathon)

A **real-time, voice-first critical-thinking cofounder** for startup builders. Jarvis listens, **asks tough clarifying questions**, and **visualizes** your idea live on a canvas (problem, users, metrics, features). When you’re ready, it generates a **PRD outline**, a **pitch deck outline**, and **LLM Prompt Packs** (code/design/research) you can paste into your favorite tools.

This README is copy-paste ready for a fresh repo / Claude Code project to generate the MVP quickly.

---

## ✨ TL;DR

- **Problem:** AI can execute anything, but people feed it vague, biased, unstructured ideas. The bottleneck is **thinking**, not doing.
- **Solution:** A conversational cofounder that **forces clarity** (short back-and-forth, critiques), **externalizes thinking** (live canvas), then outputs **concrete artifacts** (PRD, deck, prompt packs).
- **MVP Scope (today):**

  - Push-to-talk voice → **Whisper** transcription
  - Modes: **Listen / Interrupt / Step**
  - **One concise critique** per turn
  - **Canvas** with 4 node types: Problem, User, Metric, Feature
  - **Artifacts**: PRD.md, Deck.md, Prompt Packs (code/design/research)
  - **Session memory** stored as a single JSON state

- **Non-goals (today):** Full codegen, deep integrations, multi-user collab.

---

## 🧱 Architecture (minimal & fast)

- **Frontend:** Next.js (App Router) + React + Tailwind + React Flow (canvas) + Zustand (state)
- **Backend:** Next.js API routes (serverless)
- **AI:** OpenAI

  - **STT**: `whisper-1` (audio → text)
  - **LLM**: `gpt-4o-mini` (dialogue + critiques + artifacts)

- **State:** In-memory (Zustand) for the session; optional Supabase later
- **Deployment:** Vercel (optional); set `OPENAI_API_KEY`

---

## 🚀 Quickstart

### 1) Create the project

```bash
npx create-next-app@latest jarvis-mvp --typescript --eslint
cd jarvis-mvp
```

### 2) Install deps

```bash
npm install openai reactflow zustand nanoid
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 3) Tailwind config

**`tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
```

**`app/globals.css`** (ensure these lines exist at top)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 4) Environment vars

**`.env.local`**

```
OPENAI_API_KEY=sk-...
```

> On Vercel, add `OPENAI_API_KEY` in Project → Settings → Environment Variables.

---

## 📁 Suggested File Structure

```
app/
  api/
    transcribe/route.ts
    think/route.ts
    artifacts/route.ts
  page.tsx
  layout.tsx
components/
  VoicePanel.tsx
  CanvasPanel.tsx
  ArtifactsPanel.tsx
lib/
  store.ts
  types.ts
  systemPrompt.ts
public/
  favicon.ico
styles/ (optional)
```

---

## 🧠 Core Types

**`lib/types.ts`**

```ts
export type NodeType = "Problem" | "User" | "Metric" | "Feature";
export type NodeSpec = { type: NodeType; label: string };

export type CanvasDelta = {
  add?: NodeSpec[];
  link?: [string, string][];
};

export type SessionState = {
  nodes: { id: string; type: NodeType; label: string }[];
  edges: { id: string; from: string; to: string }[];
  notes: string[];
};
```

---

## 🎯 System Prompt (critical cofounder)

**`lib/systemPrompt.ts`**

```ts
export const SYSTEM_PROMPT = `
You are Jarvis, a critical-thinking cofounder.

Always:
1) Help the human think for themselves; never judge if an idea is "good/bad".
2) After each user turn, produce at most ONE concise challenge/question unless in Listen mode.
3) Prefer specifics: ONE primary user, the core problem, ONE primary metric, smallest viable scope.
4) Maintain and extend a simple canvas: Problems, Users, Metrics, Features.
5) When asked to update the canvas, return JSON ONLY following the provided schema.
6) Keep responses short and actionable.

Modes:
- LISTEN: capture key points; ask 0 questions.
- INTERRUPT: if the user speaks at length, interject with 1 short critique.
- STEP: ask exactly 1 short, targeted question each turn.
`;
```

---

## 🔊 Transcription API (Whisper)

> **Note:** Use Node runtime (not Edge) for file streaming.

**`app/api/transcribe/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as unknown as File;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const transcription = await client.audio.transcriptions.create({
      file,
      model: "whisper-1",
      response_format: "verbose_json",
    });

    return NextResponse.json({ text: transcription.text });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Transcription failed" },
      { status: 500 }
    );
  }
}
```

---

## 🧩 Think + Canvas Delta API

**`app/api/think/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import { SessionState } from "@/lib/types";

export const runtime = "edge";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const responseSchema = {
  name: "JarvisThink",
  schema: {
    type: "object",
    properties: {
      reply: { type: "string" },
      question: { type: "string", nullable: true },
      canvasDelta: {
        type: "object",
        properties: {
          add: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["Problem", "User", "Metric", "Feature"],
                },
                label: { type: "string" },
              },
              required: ["type", "label"],
              additionalProperties: false,
            },
          },
          link: {
            type: "array",
            items: {
              type: "array",
              items: { type: "string" },
              minItems: 2,
              maxItems: 2,
            },
          },
        },
        additionalProperties: false,
      },
    },
    required: ["reply", "canvasDelta"],
    additionalProperties: false,
  },
  strict: true,
};

export async function POST(req: NextRequest) {
  try {
    const {
      transcript,
      mode,
      session,
    }: {
      transcript: string;
      mode: "LISTEN" | "INTERRUPT" | "STEP";
      session: SessionState;
    } = await req.json();

    const summary = (t: "Problem" | "User" | "Metric" | "Feature") =>
      session.nodes
        .filter((n) => n.type === t)
        .map((n) => n.label)
        .join("; ") || "(none)";

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `MODE: ${mode}

SESSION SUMMARY:
- Problems: ${summary("Problem")}
- Users: ${summary("User")}
- Metrics: ${summary("Metric")}
- Features: ${summary("Feature")}

USER SAID:
${transcript}

Respond with JSON ONLY using the JarvisThink schema.`,
      },
    ];

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_schema", json_schema: responseSchema },
      messages,
    });

    const parsed = JSON.parse(resp.choices[0].message.content!);
    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Think failed" },
      { status: 500 }
    );
  }
}
```

---

## 📄 Artifacts API (PRD, Deck, Prompt Packs)

**`app/api/artifacts/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { SessionState } from "@/lib/types";

export const runtime = "edge";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { session }: { session: SessionState } = await req.json();

    const prompt = `
You're generating concise artifacts from a product canvas.
Return JSON with: prd_md, deck_md, prompts { code, design, research }.
Keep it tight, concrete, and copy-pastable.

Canvas:
${JSON.stringify(session, null, 2)}
`;

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You compress product canvases into crisp artifacts.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    return NextResponse.json(JSON.parse(resp.choices[0].message.content!));
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Artifacts failed" },
      { status: 500 }
    );
  }
}
```

---

## 🗃️ Session Store (Zustand)

**`lib/store.ts`**

```ts
import { create } from "zustand";
import { SessionState, NodeType } from "./types";
import { nanoid } from "nanoid";

type S = {
  mode: "LISTEN" | "INTERRUPT" | "STEP";
  session: SessionState;
  setMode: (m: S["mode"]) => void;
  addNode: (type: NodeType, label: string) => void;
  addLinkByLabels: (from: string, to: string) => void;
  reset: () => void;
};

export const useSession = create<S>((set, get) => ({
  mode: "STEP",
  session: { nodes: [], edges: [], notes: [] },
  setMode: (m) => set({ mode: m }),
  addNode: (type, label) =>
    set((s) => {
      if (s.session.nodes.find((n) => n.label === label)) return s;
      s.session.nodes.push({ id: nanoid(), type, label });
      return { ...s };
    }),
  addLinkByLabels: (from, to) =>
    set((s) => {
      const a = s.session.nodes.find((n) => n.label === from);
      const b = s.session.nodes.find((n) => n.label === to);
      if (!a || !b) return s;
      s.session.edges.push({ id: nanoid(), from: a.id, to: b.id });
      return { ...s };
    }),
  reset: () => set({ session: { nodes: [], edges: [], notes: [] } }),
}));
```

---

## 🎙️ Voice Panel (push-to-talk)

**`components/VoicePanel.tsx`**

```tsx
"use client";
import { useRef, useState } from "react";

export function VoicePanel({ onText }: { onText: (t: string) => void }) {
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const r = new MediaRecorder(stream);
    r.ondataavailable = (e) => chunks.current.push(e.data);
    r.onstop = async () => {
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      chunks.current = [];
      const fd = new FormData();
      fd.append("file", blob, "audio.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const { text } = await res.json();
      if (text) onText(text);
    };
    r.start();
    setRec(r);
  }

  function stop() {
    rec?.stop();
    setRec(null);
  }

  return (
    <div className="flex items-center gap-2">
      {!rec ? (
        <button
          className="px-3 py-2 rounded bg-black text-white"
          onClick={start}
        >
          🎙️ Hold to Talk
        </button>
      ) : (
        <button
          className="px-3 py-2 rounded bg-red-600 text-white"
          onClick={stop}
        >
          ■ Stop
        </button>
      )}
    </div>
  );
}
```

---

## 🧠 Canvas (React Flow)

**`components/CanvasPanel.tsx`**

```tsx
"use client";
import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";
import { useMemo } from "react";
import { useSession } from "@/lib/store";

export function CanvasPanel() {
  const { session } = useSession();

  const nodes = useMemo(
    () =>
      session.nodes.map((n, i) => ({
        id: n.id,
        position: { x: (i % 4) * 240, y: Math.floor(i / 4) * 150 },
        data: { label: `${n.type}: ${n.label}` },
        type: "default",
      })),
    [session.nodes]
  );

  const edges = useMemo(
    () =>
      session.edges.map((e) => ({ id: e.id, source: e.from, target: e.to })),
    [session.edges]
  );

  return (
    <div className="h-full border rounded-lg">
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
```

---

## 🧾 Artifacts Panel

**`components/ArtifactsPanel.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useSession } from "@/lib/store";

export function ArtifactsPanel() {
  const { session } = useSession();
  const [out, setOut] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    const res = await fetch("/api/artifacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session }),
    });
    setOut(await res.json());
    setLoading(false);
  }

  return (
    <div className="h-full flex flex-col gap-2">
      <button
        onClick={generate}
        className="px-3 py-2 bg-black text-white rounded"
      >
        {loading ? "Generating..." : "Make Artifacts"}
      </button>
      {out && (
        <>
          <Section title="PRD.md" text={out.prd_md} />
          <Section title="Deck.md" text={out.deck_md} />
          <Section title="prompts/code.txt" text={out.prompts?.code} />
          <Section title="prompts/design.txt" text={out.prompts?.design} />
          <Section title="prompts/research.txt" text={out.prompts?.research} />
        </>
      )}
    </div>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <div className="border rounded p-2">
      <div className="font-semibold mb-1">{title}</div>
      <textarea className="w-full h-40 text-sm" value={text ?? ""} readOnly />
      <button
        className="mt-1 px-2 py-1 border rounded"
        onClick={() => navigator.clipboard.writeText(text ?? "")}
      >
        Copy
      </button>
    </div>
  );
}
```

---

## 🖥️ Page & Layout

**`app/layout.tsx`**

```tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jarvis MVP",
  description: "Intelligent blank page for founders",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-900">{children}</body>
    </html>
  );
}
```

**`app/page.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useSession } from "@/lib/store";
import { VoicePanel } from "@/components/VoicePanel";
import { CanvasPanel } from "@/components/CanvasPanel";
import { ArtifactsPanel } from "@/components/ArtifactsPanel";

export default function Page() {
  const { session, mode, setMode, addNode, addLinkByLabels } = useSession();
  const [log, setLog] = useState<string[]>([]);

  async function onTranscript(text: string) {
    setLog((l) => [...l, `🧑 ${text}`]);
    const res = await fetch("/api/think", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: text, mode, session }),
    });
    const data = await res.json();

    data.canvasDelta?.add?.forEach((n: any) => addNode(n.type, n.label));
    data.canvasDelta?.link?.forEach(([a, b]: [string, string]) =>
      addLinkByLabels(a, b)
    );

    if (data.reply) setLog((l) => [...l, `🤖 ${data.reply}`]);
    if (mode !== "LISTEN" && data.question)
      setLog((l) => [...l, `❓ ${data.question}`]);
  }

  return (
    <main className="h-screen grid grid-cols-[340px_1fr_420px] gap-3 p-3">
      <div className="border rounded p-3 flex flex-col gap-3 overflow-hidden">
        <div className="font-bold text-lg">Jarvis</div>
        <div className="flex gap-2">
          {["LISTEN", "INTERRUPT", "STEP"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m as any)}
              className={`px-2 py-1 border rounded ${
                mode === m ? "bg-black text-white" : ""
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <VoicePanel onText={onTranscript} />
        <div className="text-sm overflow-auto grow border rounded p-2 bg-neutral-50">
          {log.map((line, i) => (
            <div key={i} className="mb-1">
              {line}
            </div>
          ))}
        </div>
      </div>

      <CanvasPanel />
      <ArtifactsPanel />
    </main>
  );
}
```

---

## 🧪 Run

```bash
npm run dev
# open http://localhost:3000
# Speak: "I want to build a football app for amateur teams"
# Switch modes, watch canvas build, generate artifacts
```

---

## 🎬 60–90s Demo Script (judge-facing)

1. “**Most AI tools are great at doing—but awful at thinking.** Founders dump a paragraph in, get a paragraph out. That’s not how we think.”
2. “Jarvis is a **critical-thinking cofounder**. I’ll speak a fuzzy idea; it will **ask one tough question** and **visualize** the idea live.”
3. Speak: “I want a football app for amateur teams.”

   - Switch to **STEP** → Jarvis asks “Who’s the primary user?” → node appears.
   - Add a **metric** critique → metric node appears.

4. “Show solution map” → features appear; drag a node to show control.
5. “**Make artifacts**” → PRD, deck outline, and prompt packs appear with **Copy** buttons.
6. “Jarvis doesn’t tell me if it’s good or bad—it **forces me to think clearly**. Once the plan is solid, I leave with everything to execute.”

---

## ✅ Acceptance Criteria

- Push-to-talk → transcription works.
- Modes: **Listen** (no question), **Step** (exactly one), **Interrupt** (short interjection after longer input).
- At least **three** meaningful critique turns in a typical flow.
- Canvas shows nodes + edges within **<500ms** after LLM reply.
- One click → PRD, deck, prompt packs generated & copyable.

---

## 🧭 Notes, Risks & Mitigations

- **Latency:** Keep responses short; show optimistic UI (skeleton nodes) if needed.
- **LLM drift:** Schema-guard canvas deltas; ignore invalid JSON.
- **Scope creep:** Stick to 4 node types and markdown artifacts only.
- **Audio:** Use webm; route is `nodejs` runtime for file streaming.

---

## 🛣️ After the Hackathon (Roadmap, not needed today)

- “Screen” node with simple wireframe sections
- Export to SVG/PNG + JSON
- Supabase persistence + multi-session
- Tutor mode (math/physics diagrams)
- Integrations: Figma, GitHub, Notion
- Lightweight agent actions with confirmations

---

## 📜 License

Add your preferred license (MIT recommended for hackathons).

---

### You’re ready.

This gives you the **intelligent blank page**: voice → critique → live canvas → crisp artifacts. Copy this README into your Claude Code project, generate the files, drop in your `OPENAI_API_KEY`, and run.
