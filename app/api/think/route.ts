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