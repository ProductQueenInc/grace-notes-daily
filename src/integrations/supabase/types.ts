export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      background_images: {
        Row: {
          created_at: string
          filename: string
          id: string
          series: string
          storage_url: string
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          series: string
          storage_url: string
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          series?: string
          storage_url?: string
        }
        Relationships: []
      }
      daily_content: {
        Row: {
          date: string
          devotional: Json | null
          generated_at: string
          grace_note: Json | null
          id: string
          user_id: string
        }
        Insert: {
          date: string
          devotional?: Json | null
          generated_at?: string
          grace_note?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          date?: string
          devotional?: Json | null
          generated_at?: string
          grace_note?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_content_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_habits: {
        Row: {
          daily_message: boolean
          date: string
          devotional: boolean
          journal: boolean
          user_id: string
        }
        Insert: {
          daily_message?: boolean
          date: string
          devotional?: boolean
          journal?: boolean
          user_id: string
        }
        Update: {
          daily_message?: boolean
          date?: string
          devotional?: boolean
          journal?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_habits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_messages: {
        Row: {
          date: string
          id: string
          role: string
          text: string
          ts: string
          user_id: string
        }
        Insert: {
          date: string
          id?: string
          role: string
          text: string
          ts?: string
          user_id: string
        }
        Update: {
          date?: string
          id?: string
          role?: string
          text?: string
          ts?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      heart_notes: {
        Row: {
          ai_response: string | null
          body: string
          created_at: string
          date: string
          id: string
          user_id: string
        }
        Insert: {
          ai_response?: string | null
          body: string
          created_at?: string
          date?: string
          id?: string
          user_id: string
        }
        Update: {
          ai_response?: string | null
          body?: string
          created_at?: string
          date?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "heart_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listen_content: {
        Row: {
          description: string | null
          duration: string | null
          id: string
          published_at: string
          theme: string | null
          thumbnail: string | null
          title: string
          type: string | null
          url: string
        }
        Insert: {
          description?: string | null
          duration?: string | null
          id?: string
          published_at?: string
          theme?: string | null
          thumbnail?: string | null
          title: string
          type?: string | null
          url: string
        }
        Update: {
          description?: string | null
          duration?: string | null
          id?: string
          published_at?: string
          theme?: string | null
          thumbnail?: string | null
          title?: string
          type?: string | null
          url?: string
        }
        Relationships: []
      }
      prayers: {
        Row: {
          answered: boolean
          answered_at: string | null
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          answered?: boolean
          answered_at?: string | null
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          answered?: boolean
          answered_at?: string | null
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          faith_phase: string | null
          id: string
          name: string | null
          onboarded: boolean
          rhythms: string[]
          seasons: Json
          timezone: string | null
          translation: string | null
          updated_at: string
          voice: string | null
        }
        Insert: {
          created_at?: string
          faith_phase?: string | null
          id: string
          name?: string | null
          onboarded?: boolean
          rhythms?: string[]
          seasons?: Json
          timezone?: string | null
          translation?: string | null
          updated_at?: string
          voice?: string | null
        }
        Update: {
          created_at?: string
          faith_phase?: string | null
          id?: string
          name?: string | null
          onboarded?: boolean
          rhythms?: string[]
          seasons?: Json
          timezone?: string | null
          translation?: string | null
          updated_at?: string
          voice?: string | null
        }
        Relationships: []
      }
      thanksgivings: {
        Row: {
          content: string
          created_at: string
          id: string
          prayer_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          prayer_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          prayer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thanksgivings_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thanksgivings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
