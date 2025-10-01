"use client";
import { useState, useEffect } from "react";
import { useSession } from "@/lib/store";
import { VoicePanel } from "@/components/VoicePanel";
import { CanvasPanel } from "@/components/CanvasPanel";
import { ArtifactsPanel } from "@/components/ArtifactsPanel";
import { SessionsPanel } from "@/components/SessionsPanel";
import { UserProfile } from "@/components/UserProfile";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SaveModal } from "@/components/SaveModal";
import { JarvisMode } from "@/lib/types";

type TabView = "voice" | "canvas" | "artifacts";

function JarvisApp() {
  const { session, mode, setMode, addNode, addLinkByLabels, addLogEntry, loadSessions, currentSessionId, saveSession, loading, sessions } = useSession();
  const [thinking, setThinking] = useState(false);
  const [activeTab, setActiveTab] = useState<TabView>("voice");
  const [speaking, setSpeaking] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const audioRef = useState<HTMLAudioElement | null>(null)[0];

  const log = session.conversationLog || [];

  const handleSaveClick = () => {
    setShowSaveModal(true);
  };

  const handleSaveConfirm = async (title: string) => {
    await saveSession(title);
    setShowSaveModal(false);
  };

  const getCurrentSessionTitle = () => {
    if (!currentSessionId) return "";
    const currentSession = sessions.find(s => s.id === currentSessionId);
    return currentSession?.title || "";
  };

  async function playAudio(text: string) {
    try {
      setSpeaking(true);

      // Stop any currently playing audio
      if (audioRef) {
        audioRef.pause();
        audioRef.currentTime = 0;
      }

      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate speech");
      }

      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audio.onended = () => {
        setSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error("Error playing audio:", error);
      setSpeaking(false);
    }
  }

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Auto-save periodically when there's content and a current session
  useEffect(() => {
    if (currentSessionId && session.nodes.length > 0) {
      const interval = setInterval(() => {
        saveSession();
      }, 30000); // Auto-save every 30 seconds

      return () => clearInterval(interval);
    }
  }, [currentSessionId, session.nodes.length, saveSession]);

  async function onTranscript(text: string) {
    addLogEntry(`🧑 ${text}`);
    setThinking(true);

    try {
      const res = await fetch("/api/think", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, mode, session }),
      });

      const data = await res.json();

      if (data.error) {
        addLogEntry(`❌ Error: ${data.error}`);
        return;
      }

      // Apply canvas changes
      data.canvasDelta?.add?.forEach((n: any) => addNode(n.type, n.label));
      data.canvasDelta?.link?.forEach(([a, b]: [string, string]) =>
        addLinkByLabels(a, b)
      );

      // Add responses to log and play audio
      if (data.reply) {
        addLogEntry(`🤖 ${data.reply}`);
        await playAudio(data.reply);
      }
      if (mode !== "LISTEN" && data.question) {
        addLogEntry(`❓ ${data.question}`);
        await playAudio(data.question);
      }

      // Auto-save after conversation update
      if (currentSessionId) {
        saveSession();
      }
    } catch (error) {
      console.error("Error processing transcript:", error);
      addLogEntry(`❌ Failed to process your input`);
    } finally {
      setThinking(false);
    }
  }

  return (
    <main className="h-screen flex flex-col bg-gray-50">
      {/* Top Header with Tabs */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <div className="font-bold text-2xl">JARVIS</div>

            {/* Tab Navigation */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab("voice")}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === "voice"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Voice Input
              </button>
              <button
                onClick={() => setActiveTab("canvas")}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === "canvas"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Canvas
              </button>
              <button
                onClick={() => setActiveTab("artifacts")}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === "artifacts"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Artifacts
              </button>
            </div>
          </div>

          <UserProfile />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sessions Sidebar */}
        <SessionsPanel />

        {/* Tab Content */}
        <div className="flex-1 p-6 overflow-hidden">
          {activeTab === "voice" && (
            <div className="h-full max-w-4xl mx-auto bg-white border rounded-lg p-6 flex flex-col gap-4">
              {/* Mode Selection & Save Button */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-2">
                  {(["LISTEN", "INTERRUPT", "STEP"] as JarvisMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                        mode === m
                          ? "bg-black text-white"
                          : "bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleSaveClick}
                  disabled={session.nodes.length === 0 && log.length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <span>💾</span>
                  <span>{currentSessionId ? "Save" : "Save Session"}</span>
                </button>
              </div>

              <VoicePanel onText={onTranscript} />

              {/* Chat Log */}
              <div className="flex-1 overflow-auto border rounded-lg p-4 bg-gray-50 text-sm space-y-3">
                {log.length === 0 ? (
                  <div className="text-gray-700 py-6 px-4 space-y-6">
                    <div className="text-center">
                      <div className="text-5xl mb-4">💡</div>
                      <div className="font-semibold text-xl mb-2">What do you want to plan and build today?</div>
                      <div className="text-sm text-gray-600">
                        Share your idea with me. I'll help you think it through and build a solid plan.
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-3">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        💬 Example prompts to get started:
                      </div>
                      <div className="space-y-2">
                        {[
                          "I'm thinking about building an app that helps people...",
                          "I've noticed a problem where users struggle with...",
                          "What if we could make it easier for teams to...",
                          "I want to create a tool that solves...",
                        ].map((prompt, i) => (
                          <div
                            key={i}
                            className="p-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
                            onClick={() => {
                              // User can click to use as a starting point
                              const textarea = document.querySelector('textarea');
                              if (textarea) {
                                textarea.value = prompt;
                                textarea.focus();
                              }
                            }}
                          >
                            "{prompt}"
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  log.map((line, i) => (
                    <div key={i} className="leading-relaxed">
                      {line}
                    </div>
                  ))
                )}
                {thinking && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                    JARVIS is thinking...
                  </div>
                )}
                {speaking && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="flex gap-1">
                      <div className="w-1 h-4 bg-blue-600 animate-pulse" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1 h-4 bg-blue-600 animate-pulse" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1 h-4 bg-blue-600 animate-pulse" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    JARVIS is speaking...
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "canvas" && (
            <div className="h-full bg-white border rounded-lg overflow-hidden">
              <CanvasPanel />
            </div>
          )}

          {activeTab === "artifacts" && (
            <div className="h-full max-w-6xl mx-auto bg-white border rounded-lg p-6 overflow-auto">
              <ArtifactsPanel />
            </div>
          )}
        </div>
      </div>

      {/* Save Modal */}
      <SaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveConfirm}
        defaultTitle={getCurrentSessionTitle()}
        isSaving={loading}
      />
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