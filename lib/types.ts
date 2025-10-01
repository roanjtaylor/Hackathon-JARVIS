export type NodeType = "Problem" | "User" | "Metric" | "Feature";

export type NodeSpec = {
  type: NodeType;
  label: string;
};

export type CanvasDelta = {
  add?: NodeSpec[];
  link?: [string, string][];
};

export type SessionState = {
  nodes: { id: string; type: NodeType; label: string }[];
  edges: { id: string; from: string; to: string }[];
  notes: string[];
  conversationLog?: string[];
};

export type JarvisMode = "LISTEN" | "INTERRUPT" | "STEP";

export type JarvisResponse = {
  reply: string;
  question?: string;
  canvasDelta: CanvasDelta;
};

export type Session = {
  id: string;
  user_id: string;
  title: string;
  nodes: { id: string; type: NodeType; label: string }[];
  edges: { id: string; from: string; to: string }[];
  notes: string[];
  conversationLog?: string[];
  created_at: string;
  updated_at: string;
};

export type Artifacts = {
  problem_statement?: string;
  solution_statement?: string;
  roadmap_md?: string;
  prd_md?: string;
  deck_md?: string;
  todo_md?: string;
  prompts?: {
    code: string;
    design: string;
    research: string;
  };
};