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
      client_recoverables: {
        Row: {
          added_by: string
          amount: number
          client_name: string
          company_id: string
          created_at: string
          description: string | null
          financial_year: string
          id: string
          month: string | null
          paid_by_name: string
          paid_via: string | null
          recovery_date: string | null
          status: string
        }
        Insert: {
          added_by: string
          amount: number
          client_name: string
          company_id: string
          created_at?: string
          description?: string | null
          financial_year?: string
          id?: string
          month?: string | null
          paid_by_name: string
          paid_via?: string | null
          recovery_date?: string | null
          status?: string
        }
        Update: {
          added_by?: string
          amount?: number
          client_name?: string
          company_id?: string
          created_at?: string
          description?: string | null
          financial_year?: string
          id?: string
          month?: string | null
          paid_by_name?: string
          paid_via?: string | null
          recovery_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_recoverables_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          created_by: string
          currency: string
          financial_year: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          currency?: string
          financial_year?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          currency?: string
          financial_year?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      company_activity: {
        Row: {
          action: string
          company_id: string
          created_at: string
          details: Json | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_activity_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_invites: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          display_name: string | null
          email: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["company_role"]
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["company_role"]
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["company_role"]
        }
        Relationships: [
          {
            foreignKeyName: "company_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          display_name: string
          id: string
          invited_by: string | null
          joined_at: string
          role: Database["public"]["Enums"]["company_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          display_name: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["company_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          display_name?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["company_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          added_by: string
          amount: number
          category: string | null
          company_id: string
          created_at: string
          description: string
          financial_year: string
          id: string
          month: string | null
          notes: string | null
          paid_by_name: string
        }
        Insert: {
          added_by: string
          amount: number
          category?: string | null
          company_id: string
          created_at?: string
          description: string
          financial_year?: string
          id?: string
          month?: string | null
          notes?: string | null
          paid_by_name: string
        }
        Update: {
          added_by?: string
          amount?: number
          category?: string | null
          company_id?: string
          created_at?: string
          description?: string
          financial_year?: string
          id?: string
          month?: string | null
          notes?: string | null
          paid_by_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      income: {
        Row: {
          added_by: string
          amount: number
          client_name: string
          company_id: string
          created_at: string
          financial_year: string
          id: string
          month: string | null
          notes: string | null
          service_type: string | null
        }
        Insert: {
          added_by: string
          amount: number
          client_name: string
          company_id: string
          created_at?: string
          financial_year?: string
          id?: string
          month?: string | null
          notes?: string | null
          service_type?: string | null
        }
        Update: {
          added_by?: string
          amount?: number
          client_name?: string
          company_id?: string
          created_at?: string
          financial_year?: string
          id?: string
          month?: string | null
          notes?: string | null
          service_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "income_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          added_by: string
          amount: number
          client_name: string
          company_id: string
          created_at: string
          due_date: string | null
          financial_year: string
          id: string
          invoice_date: string
          notes: string | null
          payment_date: string | null
          project_name: string | null
          status: string
        }
        Insert: {
          added_by: string
          amount: number
          client_name: string
          company_id: string
          created_at?: string
          due_date?: string | null
          financial_year?: string
          id?: string
          invoice_date: string
          notes?: string | null
          payment_date?: string | null
          project_name?: string | null
          status?: string
        }
        Update: {
          added_by?: string
          amount?: number
          client_name?: string
          company_id?: string
          created_at?: string
          due_date?: string | null
          financial_year?: string
          id?: string
          invoice_date?: string
          notes?: string | null
          payment_date?: string | null
          project_name?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tools_subscriptions: {
        Row: {
          added_by: string
          billing_cycle: string
          category: string | null
          company_id: string
          created_at: string
          id: string
          monthly_cost: number
          notes: string | null
          renewal_date: string | null
          status: string
          tool_name: string
        }
        Insert: {
          added_by: string
          billing_cycle?: string
          category?: string | null
          company_id: string
          created_at?: string
          id?: string
          monthly_cost: number
          notes?: string | null
          renewal_date?: string | null
          status?: string
          tool_name: string
        }
        Update: {
          added_by?: string
          billing_cycle?: string
          category?: string | null
          company_id?: string
          created_at?: string
          id?: string
          monthly_cost?: number
          notes?: string | null
          renewal_date?: string | null
          status?: string
          tool_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tools_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_company_role: {
        Args: {
          _company_id: string
          _roles: Database["public"]["Enums"]["company_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      company_role: "owner" | "admin" | "editor" | "viewer"
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
    Enums: {
      company_role: ["owner", "admin", "editor", "viewer"],
    },
  },
} as const
