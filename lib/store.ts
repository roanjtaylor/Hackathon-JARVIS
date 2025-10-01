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
  addLogEntry: (entry: string) => void;
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
  session: { nodes: [], edges: [], notes: [], conversationLog: [] },
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

  addLogEntry: (entry) =>
    set((state) => {
      const updatedSession = {
        ...state.session,
        conversationLog: [...(state.session.conversationLog || []), entry],
      };

      return { ...state, session: updatedSession };
    }),

  reset: () => set({
    session: { nodes: [], edges: [], notes: [], conversationLog: [] },
    currentSessionId: null
  }),

  createNewSession: () => {
    set({
      session: { nodes: [], edges: [], notes: [], conversationLog: [] },
      currentSessionId: null
    });
  },

  saveSession: async (title) => {
    const state = get();
    set({ loading: true });

    try {
      console.log('🔄 Starting save session...');

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('❌ Auth error:', authError);
        throw authError;
      }
      if (!user) {
        console.error('❌ No user found');
        throw new Error('Not authenticated');
      }

      console.log('✅ User authenticated:', user.id);

      const sessionData = {
        user_id: user.id,
        title: title || `Session ${new Date().toLocaleDateString()}`,
        nodes: state.session.nodes,
        edges: state.session.edges,
        notes: state.session.notes,
        conversation_log: state.session.conversationLog || [],
      };

      console.log('📦 Session data to save:', {
        ...sessionData,
        nodes: `${sessionData.nodes.length} nodes`,
        edges: `${sessionData.edges.length} edges`,
        conversation_log: `${sessionData.conversation_log.length} messages`,
      });

      if (state.currentSessionId) {
        // Update existing session
        console.log('🔄 Updating existing session:', state.currentSessionId);
        const { data, error } = await supabase
          .from('sessions')
          .update(sessionData)
          .eq('id', state.currentSessionId)
          .select()
          .single();

        if (error) {
          console.error('❌ Update error:', error);
          throw error;
        }

        console.log('✅ Session updated successfully:', data);

        // Update sessions list
        set((state) => ({
          sessions: state.sessions.map(s =>
            s.id === state.currentSessionId ? data : s
          ),
          loading: false,
        }));
      } else {
        // Create new session
        console.log('➕ Creating new session');
        const { data, error } = await supabase
          .from('sessions')
          .insert(sessionData)
          .select()
          .single();

        if (error) {
          console.error('❌ Insert error:', error);
          throw error;
        }

        console.log('✅ Session created successfully:', data);

        set((state) => ({
          currentSessionId: data.id,
          sessions: [data, ...state.sessions],
          loading: false,
        }));
      }

      console.log('✅ Save completed successfully');
    } catch (error: any) {
      console.error('❌ Error saving session:', error);
      console.error('Error details:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
      alert(`Failed to save session: ${error?.message || 'Unknown error'}`);
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
          conversationLog: data.conversation_log || [],
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
      console.log('🔄 Loading sessions...');

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('❌ Auth error:', authError);
        throw authError;
      }
      if (!user) {
        console.error('❌ No user found');
        throw new Error('Not authenticated');
      }

      console.log('✅ User authenticated:', user.id);

      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ Load error:', error);
        throw error;
      }

      console.log('✅ Sessions loaded:', data?.length || 0, 'sessions');
      console.log('Sessions data:', data);

      set({
        sessions: data || [],
        loading: false,
      });
    } catch (error: any) {
      console.error('❌ Error loading sessions:', error);
      console.error('Error details:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
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
          ? { nodes: [], edges: [], notes: [], conversationLog: [] }
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