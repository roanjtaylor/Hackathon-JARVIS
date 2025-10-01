import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { SessionState } from "@/lib/types";

export const runtime = "edge";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { session }: { session: SessionState } = await req.json();

    const prompt = `
Generate artifacts from this product canvas following the Jarvis Ideation Protocol.

Return JSON with these fields:
- problem_statement: 1-2 sentences exact problem (Who + where/when pain occurs + what breaks + why alternatives fail)
- solution_statement: 1 sentence value prop (For USER, solve PROBLEM by DOING X) + 1 sentence scope guard (smallest end-to-end v1)
- roadmap_md: Markdown roadmap with phases (Phase 0: Clarify, Phase 1: v1 Slice, Phase 2: Pilot). Each phase has tasks, acceptance criteria, and metrics.
- prd_md: Markdown PRD (Problem, Primary User, Assumptions & Risks top 3, Success Metric 1 primary + 2 secondary, v1 Scope 5-7 features with acceptance, Pilot plan)
- deck_md: Markdown deck outline (10 slides: Title, Problem with evidence, Target user, Alternatives & gap, Solution, Demo flow 3 steps, KPI target, Go-to-market pilot, Risks & mitigations, Ask/next steps)
- prompts: Object with code, design, research (plain text briefs for Next.js scaffold, Figma wireframes, competitive scan)
- todo_md: Markdown checklist (Define user, Write problem statement, Choose KPI & target, List 5 v1 features, Pilot plan, Risks & mitigations)

Keep everything tight, concrete, and copy-pastable. Focus on specificity.

Canvas:
${JSON.stringify(session, null, 2)}
`;

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You compress product canvases into crisp, actionable artifacts following the Jarvis Ideation Protocol.",
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