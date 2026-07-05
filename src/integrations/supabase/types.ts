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
      announcement_dismissals: {
        Row: {
          announcement_id: string
          dismissed_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          dismissed_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          dismissed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_dismissals_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "system_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
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
      chat_flags: {
        Row: {
          flag_type: string
          id: string
          session_id: string | null
          triggered_at: string
          user_id: string
        }
        Insert: {
          flag_type: string
          id?: string
          session_id?: string | null
          triggered_at?: string
          user_id: string
        }
        Update: {
          flag_type?: string
          id?: string
          session_id?: string | null
          triggered_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_flags_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          date: string
          id: string
          message_count: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          message_count?: number
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          message_count?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      crisis_lines: {
        Row: {
          country_code: string
          country_name: string
          hours: string | null
          line_name: string
          phone: string | null
          text_option: string | null
          website: string | null
        }
        Insert: {
          country_code: string
          country_name: string
          hours?: string | null
          line_name: string
          phone?: string | null
          text_option?: string | null
          website?: string | null
        }
        Update: {
          country_code?: string
          country_name?: string
          hours?: string | null
          line_name?: string
          phone?: string | null
          text_option?: string | null
          website?: string | null
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
      daily_devotionals: {
        Row: {
          body: Json | null
          date: string
          generated_at: string
          id: string
          related: Json | null
          takeaway: string | null
          theme: string
          title: string | null
          verse_id: number | null
          verse_reference: string | null
          verse_text: string | null
        }
        Insert: {
          body?: Json | null
          date: string
          generated_at?: string
          id?: string
          related?: Json | null
          takeaway?: string | null
          theme: string
          title?: string | null
          verse_id?: number | null
          verse_reference?: string | null
          verse_text?: string | null
        }
        Update: {
          body?: Json | null
          date?: string
          generated_at?: string
          id?: string
          related?: Json | null
          takeaway?: string | null
          theme?: string
          title?: string | null
          verse_id?: number | null
          verse_reference?: string | null
          verse_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_devotionals_verse_id_fkey"
            columns: ["verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_grace_notes: {
        Row: {
          created_at: string
          date: string
          grace_note: string
          id: string
          theme: string
          user_id: string
          verse_id: number | null
          verse_reference: string
          verse_text: string
        }
        Insert: {
          created_at?: string
          date: string
          grace_note: string
          id?: string
          theme: string
          user_id: string
          verse_id?: number | null
          verse_reference: string
          verse_text: string
        }
        Update: {
          created_at?: string
          date?: string
          grace_note?: string
          id?: string
          theme?: string
          user_id?: string
          verse_id?: number | null
          verse_reference?: string
          verse_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_grace_notes_verse_id_fkey"
            columns: ["verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      heart_notes: {
        Row: {
          ai_response: string | null
          body: string
          created_at: string
          date: string
          id: string
          summary: string | null
          superseded_at: string | null
          user_id: string
        }
        Insert: {
          ai_response?: string | null
          body: string
          created_at?: string
          date?: string
          id?: string
          summary?: string | null
          superseded_at?: string | null
          user_id: string
        }
        Update: {
          ai_response?: string | null
          body?: string
          created_at?: string
          date?: string
          id?: string
          summary?: string | null
          superseded_at?: string | null
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
          country_code: string | null
          created_at: string
          faith_phase: string | null
          id: string
          inferred_themes: Json
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
          country_code?: string | null
          created_at?: string
          faith_phase?: string | null
          id: string
          inferred_themes?: Json
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
          country_code?: string | null
          created_at?: string
          faith_phase?: string | null
          id?: string
          inferred_themes?: Json
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_announcements: {
        Row: {
          active: boolean
          body: string | null
          created_at: string
          expires_at: string | null
          id: string
          link_label: string | null
          link_url: string | null
          publish_at: string
          severity: string
          title: string
        }
        Insert: {
          active?: boolean
          body?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          link_label?: string | null
          link_url?: string | null
          publish_at?: string
          severity?: string
          title: string
        }
        Update: {
          active?: boolean
          body?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          link_label?: string | null
          link_url?: string | null
          publish_at?: string
          severity?: string
          title?: string
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
      user_verse_log: {
        Row: {
          id: string
          sent_at: string
          user_id: string
          verse_id: number
        }
        Insert: {
          id?: string
          sent_at?: string
          user_id: string
          verse_id: number
        }
        Update: {
          id?: string
          sent_at?: string
          user_id?: string
          verse_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_verse_log_verse_id_fkey"
            columns: ["verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
        ]
      }
      verses: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          posture_tags: string[]
          reference: string
          text: string
          theme: string
        }
        Insert: {
          created_at?: string
          id: number
          is_active?: boolean
          posture_tags?: string[]
          reference: string
          text: string
          theme: string
        }
        Update: {
          created_at?: string
          id?: number
          is_active?: boolean
          posture_tags?: string[]
          reference?: string
          text?: string
          theme?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      increment_session_message_count: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      select_verse_for_user: {
        Args: { p_posture: string; p_segment: string; p_user_id: string }
        Returns: {
          reference: string
          theme: string
          verse_id: number
          verse_text: string
        }[]
      }
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
