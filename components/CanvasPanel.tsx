"use client";
import ReactFlow, { Background, Controls, Node, Edge } from "reactflow";
import "reactflow/dist/style.css";
import { useMemo } from "react";
import { useSession } from "@/lib/store";
import { NodeType } from "@/lib/types";

// Custom node component for better styling
function CustomNode({ data }: { data: { label: string; type: NodeType } }) {
  const getNodeColor = (type: NodeType) => {
    switch (type) {
      case "Problem":
        return "bg-red-100 border-red-300 text-red-800";
      case "User":
        return "bg-blue-100 border-blue-300 text-blue-800";
      case "Metric":
        return "bg-green-100 border-green-300 text-green-800";
      case "Feature":
        return "bg-purple-100 border-purple-300 text-purple-800";
      default:
        return "bg-gray-100 border-gray-300 text-gray-800";
    }
  };

  return (
    <div className={`px-3 py-2 border-2 rounded-lg shadow-sm ${getNodeColor(data.type)} min-w-[120px] text-center`}>
      <div className="font-semibold text-xs mb-1">{data.type}</div>
      <div className="text-sm">{data.label}</div>
    </div>
  );
}

const nodeTypes = {
  custom: CustomNode,
};

export function CanvasPanel() {
  const { session } = useSession();

  const nodes: Node[] = useMemo(
    () =>
      session.nodes.map((n, i) => ({
        id: n.id,
        position: {
          x: (i % 3) * 280 + 50,
          y: Math.floor(i / 3) * 150 + 50
        },
        data: { label: n.label, type: n.type },
        type: "custom",
        draggable: true,
      })),
    [session.nodes]
  );

  const edges: Edge[] = useMemo(
    () =>
      session.edges.map((e) => ({
        id: e.id,
        source: e.from,
        target: e.to,
        animated: true,
        style: { strokeWidth: 2 },
      })),
    [session.edges]
  );

  return (
    <div className="h-full border rounded-lg bg-white relative">
      {session.nodes.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="text-6xl mb-4">🧠</div>
            <div className="text-lg font-medium">Canvas is empty</div>
            <div className="text-sm">Start talking to JARVIS to build your idea</div>
          </div>
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Background />
          <Controls />
        </ReactFlow>
      )}
    </div>
  );
}