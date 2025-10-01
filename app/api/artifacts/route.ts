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