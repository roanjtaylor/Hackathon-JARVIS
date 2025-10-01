"use client";
import { useRef, useState } from "react";

export function VoicePanel({ onText }: { onText: (t: string) => void }) {
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const chunks = useRef<BlobPart[]>([]);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      r.ondataavailable = (e) => chunks.current.push(e.data);
      r.onstop = async () => {
        setIsProcessing(true);
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        chunks.current = [];

        const fd = new FormData();
        fd.append("file", blob, "audio.webm");

        try {
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          const { text, error } = await res.json();
          if (error) {
            console.error("Transcription error:", error);
          } else if (text) {
            onText(text);
          }
        } catch (error) {
          console.error("Transcription failed:", error);
        } finally {
          setIsProcessing(false);
        }

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };
      r.start();
      setRec(r);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Error accessing microphone. Please check your permissions.");
    }
  }

  function stop() {
    rec?.stop();
    setRec(null);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {!rec ? (
        <button
          className="px-4 py-3 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50"
          onClick={start}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Processing...
            </>
          ) : (
            <>
              🎙️ Hold to Talk
            </>
          )}
        </button>
      ) : (
        <button
          className="px-4 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2 animate-pulse"
          onClick={stop}
        >
          ■ Stop Recording
        </button>
      )}

      <div className="text-xs text-gray-500 text-center max-w-xs">
        {rec ? "Recording... Click stop when done" : "Click to start voice input"}
      </div>
    </div>
  );
}