"use client";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/store";
import { Session } from "@/lib/types";

export function SessionsPanel() {
  const {
    sessions,
    currentSessionId,
    loadSessions,
    loadSession,
    saveSession,
    createNewSession,
    deleteSession,
    updateSessionTitle,
    loading,
  } = useSession();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleSaveNew = async () => {
    await saveSession();
  };

  const handleEdit = (session: Session) => {
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveEdit = async () => {
    if (editingId && editTitle.trim()) {
      await updateSessionTitle(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  return (
    <div className="w-80 border-r bg-white h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Sessions</h2>
          <button
            onClick={createNewSession}
            className="px-3 py-1 bg-black text-white rounded text-sm hover:bg-gray-800 transition-colors"
          >
            New
          </button>
        </div>

        {currentSessionId && (
          <button
            onClick={handleSaveNew}
            disabled={loading}
            className="w-full px-3 py-2 border border-black text-black rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {loading ? "Saving..." : "Save Current"}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <div className="text-2xl mb-2">💭</div>
            <div className="text-sm">No saved sessions</div>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                  currentSessionId === session.id ? "bg-blue-50 border-blue-200" : ""
                }`}
              >
                {editingId === session.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit();
                        if (e.key === "Escape") handleCancelEdit();
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      onClick={() => loadSession(session.id)}
                      className="flex-1"
                    >
                      <div className="font-medium text-sm mb-1">{session.title}</div>
                      <div className="text-xs text-gray-500">
                        {session.nodes.length} nodes • {" "}
                        {new Date(session.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(session);
                        }}
                        className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this session?")) {
                            deleteSession(session.id);
                          }
                        }}
                        className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}