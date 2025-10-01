"use client";
import { useState } from "react";
import { useSession } from "@/lib/store";
import { Artifacts } from "@/lib/types";

export function ArtifactsPanel() {
  const { session } = useSession();
  const [artifacts, setArtifacts] = useState<Artifacts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (session.nodes.length === 0) {
      setError("Add some ideas to your canvas first!");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setArtifacts(data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate artifacts");
    } finally {
      setLoading(false);
    }
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Artifacts</h3>
        <button
          onClick={generate}
          disabled={loading || session.nodes.length === 0}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Generating...
            </div>
          ) : (
            "Make Artifacts"
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto space-y-4">
        {artifacts ? (
          <>
            <Section
              title="PRD.md"
              text={artifacts.prd_md}
              onCopy={() => copyToClipboard(artifacts.prd_md, "PRD")}
            />
            <Section
              title="Deck.md"
              text={artifacts.deck_md}
              onCopy={() => copyToClipboard(artifacts.deck_md, "Deck")}
            />
            <Section
              title="prompts/code.txt"
              text={artifacts.prompts?.code}
              onCopy={() => copyToClipboard(artifacts.prompts?.code || "", "Code Prompt")}
            />
            <Section
              title="prompts/design.txt"
              text={artifacts.prompts?.design}
              onCopy={() => copyToClipboard(artifacts.prompts?.design || "", "Design Prompt")}
            />
            <Section
              title="prompts/research.txt"
              text={artifacts.prompts?.research}
              onCopy={() => copyToClipboard(artifacts.prompts?.research || "", "Research Prompt")}
            />
          </>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-4">📄</div>
            <div className="text-lg font-medium">No artifacts yet</div>
            <div className="text-sm">Generate artifacts from your canvas</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  text,
  onCopy,
}: {
  title: string;
  text: string;
  onCopy: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-sm text-gray-700">{title}</div>
        <button
          className="px-3 py-1 border rounded text-xs hover:bg-gray-50 transition-colors"
          onClick={handleCopy}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <textarea
        className="w-full h-32 text-sm border rounded p-2 resize-none bg-gray-50"
        value={text || ""}
        readOnly
        placeholder="Content will appear here..."
      />
    </div>
  );
}