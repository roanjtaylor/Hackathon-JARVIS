import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string
          user_id: string
          title: string
          nodes: any[]
          edges: any[]
          notes: string[]
          conversation_log: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          nodes?: any[]
          edges?: any[]
          notes?: string[]
          conversation_log?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          nodes?: any[]
          edges?: any[]
          notes?: string[]
          conversation_log?: string[]
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}