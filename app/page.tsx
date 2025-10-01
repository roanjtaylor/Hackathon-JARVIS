"use client";
import { useState, useEffect } from "react";
import { useSession } from "@/lib/store";
import { VoicePanel } from "@/components/VoicePanel";
import { CanvasPanel } from "@/components/CanvasPanel";
import { ArtifactsPanel } from "@/components/ArtifactsPanel";
import { SessionsPanel } from "@/components/SessionsPanel";
import { UserProfile } from "@/components/UserProfile";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { JarvisMode } from "@/lib/types";

function JarvisApp() {
  const { session, mode, setMode, addNode, addLinkByLabels } = useSession();
  const [log, setLog] = useState<string[]>([]);
  const [thinking, setThinking] = useState(false);

  async function onTranscript(text: string) {
    setLog((l) => [...l, `🧑 ${text}`]);
    setThinking(true);

    try {
      const res = await fetch("/api/think", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, mode, session }),
      });

      const data = await res.json();

      if (data.error) {
        setLog((l) => [...l, `❌ Error: ${data.error}`]);
        return;
      }

      // Apply canvas changes
      data.canvasDelta?.add?.forEach((n: any) => addNode(n.type, n.label));
      data.canvasDelta?.link?.forEach(([a, b]: [string, string]) =>
        addLinkByLabels(a, b)
      );

      // Add responses to log
      if (data.reply) setLog((l) => [...l, `🤖 ${data.reply}`]);
      if (mode !== "LISTEN" && data.question)
        setLog((l) => [...l, `❓ ${data.question}`]);
    } catch (error) {
      console.error("Error processing transcript:", error);
      setLog((l) => [...l, `❌ Failed to process your input`]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <main className="h-screen flex bg-gray-50">
      {/* Sessions Sidebar */}
      <SessionsPanel />

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-[360px_1fr_420px] gap-4 p-4">
        {/* Voice & Chat Panel */}
        <div className="bg-white border rounded-lg p-4 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="font-bold text-xl">JARVIS</div>
            <UserProfile />
          </div>

          {/* Mode Selection */}
          <div className="flex gap-2">
            {(["LISTEN", "INTERRUPT", "STEP"] as JarvisMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-2 border rounded text-sm transition-colors ${
                  mode === m
                    ? "bg-black text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <VoicePanel onText={onTranscript} />

          {/* Chat Log */}
          <div className="flex-1 overflow-auto border rounded p-3 bg-gray-50 text-sm space-y-2">
            {log.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-4">🎙️</div>
                <div className="font-medium">Ready to think together</div>
                <div className="text-xs">Press the mic button and start talking</div>
              </div>
            ) : (
              log.map((line, i) => (
                <div key={i} className="mb-2">
                  {line}
                </div>
              ))
            )}
            {thinking && (
              <div className="flex items-center gap-2 text-gray-500">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                JARVIS is thinking...
              </div>
            )}
          </div>
        </div>

        {/* Canvas Panel */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <CanvasPanel />
        </div>

        {/* Artifacts Panel */}
        <div className="bg-white border rounded-lg p-4 overflow-hidden">
          <ArtifactsPanel />
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <JarvisApp />
    </ProtectedRoute>
  );
}