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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          address: string
          contact_person: string
          created_at: string
          email: string
          id: string
          name: string
          payment_terms: number
          phone: string
          tax_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          contact_person: string
          created_at?: string
          email: string
          id?: string
          name: string
          payment_terms?: number
          phone: string
          tax_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          contact_person?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          payment_terms?: number
          phone?: string
          tax_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          attachment: string | null
          category: string
          created_at: string
          date: string
          description: string
          id: string
          payment_mode: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          attachment?: string | null
          category: string
          created_at?: string
          date: string
          description: string
          id?: string
          payment_mode: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          attachment?: string | null
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          payment_mode?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_received: number
          created_at: string
          discount: number
          due_date: string
          gst_percent: number
          id: string
          invoice_date: string
          invoice_number: string
          line_items: Json
          pending_amount: number
          po_date: string | null
          po_id: string | null
          po_number: string | null
          status: string
          total_cost: number
          transportation_cost: number
          updated_at: string
          user_id: string
          vendor_id: string
          vendor_name: string
        }
        Insert: {
          amount_received?: number
          created_at?: string
          discount?: number
          due_date: string
          gst_percent?: number
          id?: string
          invoice_date: string
          invoice_number: string
          line_items?: Json
          pending_amount?: number
          po_date?: string | null
          po_id?: string | null
          po_number?: string | null
          status?: string
          total_cost?: number
          transportation_cost?: number
          updated_at?: string
          user_id: string
          vendor_id: string
          vendor_name: string
        }
        Update: {
          amount_received?: number
          created_at?: string
          discount?: number
          due_date?: string
          gst_percent?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          line_items?: Json
          pending_amount?: number
          po_date?: string | null
          po_id?: string | null
          po_number?: string | null
          status?: string
          total_cost?: number
          transportation_cost?: number
          updated_at?: string
          user_id?: string
          vendor_id?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_name: string | null
          company_logo_url: string | null
          created_at: string | null
          id: string
          ifsc_code: string | null
          organization_address: string | null
          organization_email: string | null
          organization_gst_tin: string | null
          organization_name: string | null
          organization_phone: string | null
          organization_website: string | null
          updated_at: string | null
          upi_id: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          company_logo_url?: string | null
          created_at?: string | null
          id: string
          ifsc_code?: string | null
          organization_address?: string | null
          organization_email?: string | null
          organization_gst_tin?: string | null
          organization_name?: string | null
          organization_phone?: string | null
          organization_website?: string | null
          updated_at?: string | null
          upi_id?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          company_logo_url?: string | null
          created_at?: string | null
          id?: string
          ifsc_code?: string | null
          organization_address?: string | null
          organization_email?: string | null
          organization_gst_tin?: string | null
          organization_name?: string | null
          organization_phone?: string | null
          organization_website?: string | null
          updated_at?: string | null
          upi_id?: string | null
        }
        Relationships: []
      }
      sale_orders: {
        Row: {
          created_at: string
          customer_id: string
          customer_name: string
          id: string
          line_items: Json
          notes: string | null
          po_date: string | null
          po_number: string | null
          so_date: string
          so_number: string
          status: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          customer_name: string
          id?: string
          line_items?: Json
          notes?: string | null
          po_date?: string | null
          po_number?: string | null
          so_date: string
          so_number: string
          status?: string
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          customer_name?: string
          id?: string
          line_items?: Json
          notes?: string | null
          po_date?: string | null
          po_number?: string | null
          so_date?: string
          so_number?: string
          status?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          contact_person: string
          created_at: string
          email: string
          gst_tin: string
          id: string
          name: string
          payment_terms: number
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_person: string
          created_at?: string
          email: string
          gst_tin: string
          id?: string
          name: string
          payment_terms?: number
          phone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_person?: string
          created_at?: string
          email?: string
          gst_tin?: string
          id?: string
          name?: string
          payment_terms?: number
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
