export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      contact_info: {
        Row: {
          created_at: string | null
          email: string
          id: number
          phone_number: string
          updated_at: string | null
          whatsapp_number: string
        }
        Insert: {
          created_at?: string | null
          email?: string
          id?: number
          phone_number?: string
          updated_at?: string | null
          whatsapp_number?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: number
          phone_number?: string
          updated_at?: string | null
          whatsapp_number?: string
        }
        Relationships: []
      }
      deemed_colleges: {
        Row: {
          id: number
          slug: string
          college_name: string
          state: string
          city: string | null
          university_name: string | null
          established_year: number | null
          intake: number | null
          nri_seats: number | null
          minority_seats: number | null
          has_nri_seats: boolean
          has_minority_seats: boolean
          is_women_only: boolean
          display_order: number
          is_active: boolean
          source_type: string
          image_url: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          slug: string
          college_name: string
          state: string
          city?: string | null
          university_name?: string | null
          established_year?: number | null
          intake?: number | null
          nri_seats?: number | null
          minority_seats?: number | null
          has_nri_seats?: boolean
          has_minority_seats?: boolean
          is_women_only?: boolean
          display_order?: number
          is_active?: boolean
          source_type?: string
          image_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          slug?: string
          college_name?: string
          state?: string
          city?: string | null
          university_name?: string | null
          established_year?: number | null
          intake?: number | null
          nri_seats?: number | null
          minority_seats?: number | null
          has_nri_seats?: boolean
          has_minority_seats?: boolean
          is_women_only?: boolean
          display_order?: number
          is_active?: boolean
          source_type?: string
          image_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pg_colleges: {
        Row: {
          id: string
          college_name: string
          city: string
          state: string
          college_type: string
          ownership: string | null
          year_established: number | null
          total_pg_seats: number
          key_specialties: string[]
          short_description: string | null
          image_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          college_name: string
          city: string
          state: string
          college_type: string
          ownership?: string | null
          year_established?: number | null
          total_pg_seats?: number
          key_specialties?: string[]
          short_description?: string | null
          image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          college_name?: string
          city?: string
          state?: string
          college_type?: string
          ownership?: string | null
          year_established?: number | null
          total_pg_seats?: number
          key_specialties?: string[]
          short_description?: string | null
          image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      deemed_universities: {
        Row: {
          id: string
          college_name: string
          city: string | null
          state: string | null
          deemed_university_name: string | null
          established_year: number | null
          offers_mbbs: boolean
          description: string | null
          image_url: string | null
          fees_range: string | null
          ranking: string | null
          seats: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          college_name: string
          city?: string | null
          state?: string | null
          deemed_university_name?: string | null
          established_year?: number | null
          offers_mbbs?: boolean
          description?: string | null
          image_url?: string | null
          fees_range?: string | null
          ranking?: string | null
          seats?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          college_name?: string
          city?: string | null
          state?: string | null
          deemed_university_name?: string | null
          established_year?: number | null
          offers_mbbs?: boolean
          description?: string | null
          image_url?: string | null
          fees_range?: string | null
          ranking?: string | null
          seats?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      live_alerts: {
        Row: {
          created_at: string | null
          id: number
          image_url: string | null
          is_active: boolean | null
          link: string
          order_index: number
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          image_url?: string | null
          is_active?: boolean | null
          link: string
          order_index?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          image_url?: string | null
          is_active?: boolean | null
          link?: string
          order_index?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ug_colleges: {
        Row: {
          id: string
          college_name: string
          city: string
          state: string
          college_type: string
          established_year: number | null
          short_description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          college_name: string
          city: string
          state: string
          college_type: string
          established_year?: number | null
          short_description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          college_name?: string
          city?: string
          state?: string
          college_type?: string
          established_year?: number | null
          short_description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      mbbs_states: {
        Row: {
          colleges_count: number | null
          content: string | null
          created_at: string | null
          id: number
          image_url: string | null
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          colleges_count?: number | null
          content?: string | null
          created_at?: string | null
          id?: number
          image_url?: string | null
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          colleges_count?: number | null
          content?: string | null
          created_at?: string | null
          id?: number
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      recommended_colleges: {
        Row: {
          created_at: string | null
          domain: string
          fees: string
          id: string
          image: string
          location: string
          name: string
          seats: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain?: string
          fees: string
          id?: string
          image: string
          location: string
          name: string
          seats?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          fees?: string
          id?: string
          image?: string
          location?: string
          name?: string
          seats?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      videos: {
        Row: {
          created_at: string | null
          description: string | null
          featured: boolean | null
          id: number
          title: string | null
          videos_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          id?: number
          title?: string | null
          videos_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          id?: number
          title?: string | null
          videos_id?: string | null
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
