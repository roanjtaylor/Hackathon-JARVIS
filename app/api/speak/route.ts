import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "edge";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { text }: { text: string } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const mp3 = await client.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
      speed: 1.1,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (e: any) {
    console.error("TTS error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Speech generation failed" },
      { status: 500 }
    );
  }
}
