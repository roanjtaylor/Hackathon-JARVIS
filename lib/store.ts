import { create } from "zustand";
import { SessionState, NodeType, JarvisMode, Session } from "./types";
import { nanoid } from "nanoid";
import { supabase } from "./supabase";

type SessionStore = {
  mode: JarvisMode;
  session: SessionState;
  currentSessionId: string | null;
  sessions: Session[];
  loading: boolean;
  setMode: (m: JarvisMode) => void;
  addNode: (type: NodeType, label: string) => void;
  addLinkByLabels: (from: string, to: string) => void;
  reset: () => void;
  saveSession: (title?: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  loadSessions: () => Promise<void>;
  createNewSession: () => void;
  deleteSession: (sessionId: string) => Promise<void>;
  updateSessionTitle: (sessionId: string, title: string) => Promise<void>;
};

export const useSession = create<SessionStore>((set, get) => ({
  mode: "STEP",
  session: { nodes: [], edges: [], notes: [] },
  currentSessionId: null,
  sessions: [],
  loading: false,

  setMode: (mode) => set({ mode }),

  addNode: (type, label) =>
    set((state) => {
      if (state.session.nodes.find((n) => n.label === label)) return state;
      const newNode = { id: nanoid(), type, label };
      const updatedSession = {
        ...state.session,
        nodes: [...state.session.nodes, newNode],
      };

      // Auto-save if we have a current session
      if (state.currentSessionId) {
        get().saveSession();
      }

      return { ...state, session: updatedSession };
    }),

  addLinkByLabels: (from, to) =>
    set((state) => {
      const nodeA = state.session.nodes.find((n) => n.label === from);
      const nodeB = state.session.nodes.find((n) => n.label === to);
      if (!nodeA || !nodeB) return state;

      const newEdge = { id: nanoid(), from: nodeA.id, to: nodeB.id };
      const updatedSession = {
        ...state.session,
        edges: [...state.session.edges, newEdge],
      };

      // Auto-save if we have a current session
      if (state.currentSessionId) {
        get().saveSession();
      }

      return { ...state, session: updatedSession };
    }),

  reset: () => set({
    session: { nodes: [], edges: [], notes: [] },
    currentSessionId: null
  }),

  createNewSession: () => {
    set({
      session: { nodes: [], edges: [], notes: [] },
      currentSessionId: null
    });
  },

  saveSession: async (title) => {
    const state = get();
    set({ loading: true });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const sessionData = {
        user_id: user.id,
        title: title || `Session ${new Date().toLocaleDateString()}`,
        nodes: state.session.nodes,
        edges: state.session.edges,
        notes: state.session.notes,
      };

      if (state.currentSessionId) {
        // Update existing session
        const { data, error } = await supabase
          .from('sessions')
          .update(sessionData)
          .eq('id', state.currentSessionId)
          .select()
          .single();

        if (error) throw error;

        // Update sessions list
        set((state) => ({
          sessions: state.sessions.map(s =>
            s.id === state.currentSessionId ? data : s
          ),
          loading: false,
        }));
      } else {
        // Create new session
        const { data, error } = await supabase
          .from('sessions')
          .insert(sessionData)
          .select()
          .single();

        if (error) throw error;

        set((state) => ({
          currentSessionId: data.id,
          sessions: [data, ...state.sessions],
          loading: false,
        }));
      }
    } catch (error) {
      console.error('Error saving session:', error);
      set({ loading: false });
    }
  },

  loadSession: async (sessionId) => {
    set({ loading: true });

    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      set({
        session: {
          nodes: data.nodes || [],
          edges: data.edges || [],
          notes: data.notes || [],
        },
        currentSessionId: sessionId,
        loading: false,
      });
    } catch (error) {
      console.error('Error loading session:', error);
      set({ loading: false });
    }
  },

  loadSessions: async () => {
    set({ loading: true });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      set({
        sessions: data || [],
        loading: false,
      });
    } catch (error) {
      console.error('Error loading sessions:', error);
      set({ loading: false });
    }
  },

  deleteSession: async (sessionId) => {
    set({ loading: true });

    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      set((state) => ({
        sessions: state.sessions.filter(s => s.id !== sessionId),
        currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
        session: state.currentSessionId === sessionId
          ? { nodes: [], edges: [], notes: [] }
          : state.session,
        loading: false,
      }));
    } catch (error) {
      console.error('Error deleting session:', error);
      set({ loading: false });
    }
  },

  updateSessionTitle: async (sessionId, title) => {
    set({ loading: true });

    try {
      const { data, error } = await supabase
        .from('sessions')
        .update({ title })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        sessions: state.sessions.map(s =>
          s.id === sessionId ? data : s
        ),
        loading: false,
      }));
    } catch (error) {
      console.error('Error updating session title:', error);
      set({ loading: false });
    }
  },
}));