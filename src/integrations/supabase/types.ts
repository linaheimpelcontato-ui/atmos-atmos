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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_permissions: {
        Row: {
          allowed_modules: string[]
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_modules?: string[]
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_modules?: string[]
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_number: string | null
          account_type: string
          agency: string | null
          bank: string
          created_at: string
          id: string
          initial_balance: number
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          account_type?: string
          agency?: string | null
          bank?: string
          created_at?: string
          id?: string
          initial_balance?: number
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          account_type?: string
          agency?: string | null
          bank?: string
          created_at?: string
          id?: string
          initial_balance?: number
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          cnpj: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          calendly_event_uri: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_type: string
          id: string
          manychat_subscriber_id: string | null
          meeting_url: string | null
          proposal_id: string | null
          prospect_id: string | null
          reminder_1h_sent: boolean
          reminder_24h_sent: boolean
          segment: string | null
          seller_id: string | null
          title: string
        }
        Insert: {
          calendly_event_uri?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_type?: string
          id?: string
          manychat_subscriber_id?: string | null
          meeting_url?: string | null
          proposal_id?: string | null
          prospect_id?: string | null
          reminder_1h_sent?: boolean
          reminder_24h_sent?: boolean
          segment?: string | null
          seller_id?: string | null
          title: string
        }
        Update: {
          calendly_event_uri?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          manychat_subscriber_id?: string | null
          meeting_url?: string | null
          proposal_id?: string | null
          prospect_id?: string | null
          reminder_1h_sent?: boolean
          reminder_24h_sent?: boolean
          segment?: string | null
          seller_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_items: {
        Row: {
          category: string
          created_at: string
          default_price: number
          id: string
          is_active: boolean
          name: string
          segment: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          default_price?: number
          id?: string
          is_active?: boolean
          name: string
          segment?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          default_price?: number
          id?: string
          is_active?: boolean
          name?: string
          segment?: string
          updated_at?: string
        }
        Relationships: []
      }
      chart_of_accounts: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          type: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          type?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          best_channel: string | null
          created_at: string
          email: string | null
          id: string
          linkedin: string | null
          name: string
          notes: string | null
          phone: string | null
          prospect_id: string
          role: string | null
          updated_at: string
        }
        Insert: {
          best_channel?: string | null
          created_at?: string
          email?: string | null
          id?: string
          linkedin?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          prospect_id: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          best_channel?: string | null
          created_at?: string
          email?: string | null
          id?: string
          linkedin?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          prospect_id?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      default_prices: {
        Row: {
          category: string | null
          created_at: string
          id: string
          item_name: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          item_name: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          item_name?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          channel: string
          created_at: string
          id: string
          language: string
          segment: string
          subject: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          id?: string
          language?: string
          segment?: string
          subject: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          id?: string
          language?: string
          segment?: string
          subject?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          source_key: string | null
          supplier_id: string | null
          invoice_number: string | null
          competence_date: string | null
          account_id: string | null
          amount: number
          bank_account_id: string | null
          branch_id: string | null
          created_at: string
          description: string
          due_date: string
          id: string
          installment_number: number | null
          installment_total: number | null
          is_recurring: boolean
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          proposal_id: string | null
          prospect_id: string | null
          recurrence_day: number | null
          seller_id: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          source_key?: string | null
          supplier_id?: string | null
          invoice_number?: string | null
          competence_date?: string | null
          account_id?: string | null
          amount?: number
          bank_account_id?: string | null
          branch_id?: string | null
          created_at?: string
          description: string
          due_date: string
          id?: string
          installment_number?: number | null
          installment_total?: number | null
          is_recurring?: boolean
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          proposal_id?: string | null
          prospect_id?: string | null
          recurrence_day?: number | null
          seller_id?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          source_key?: string | null
          supplier_id?: string | null
          invoice_number?: string | null
          competence_date?: string | null
          account_id?: string | null
          amount?: number
          bank_account_id?: string | null
          branch_id?: string | null
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          installment_number?: number | null
          installment_total?: number | null
          is_recurring?: boolean
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          proposal_id?: string | null
          prospect_id?: string | null
          recurrence_day?: number | null
          seller_id?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_trip_costs: {
        Row: {
          amount: number
          created_at: string
          description: string
          guide_id: string
          id: string
          proposal_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          guide_id: string
          id?: string
          proposal_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          guide_id?: string
          id?: string
          proposal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_trip_costs_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_trip_costs_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_waterfall_prices: {
        Row: {
          created_at: string
          guide_id: string
          id: string
          is_active: boolean
          price_4x4_1: number
          price_4x4_2: number
          price_4x4_3plus: number
          price_car_1: number
          price_car_2: number
          price_car_3plus: number
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          guide_id: string
          id?: string
          is_active?: boolean
          price_4x4_1?: number
          price_4x4_2?: number
          price_4x4_3plus?: number
          price_car_1?: number
          price_car_2?: number
          price_car_3plus?: number
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          guide_id?: string
          id?: string
          is_active?: boolean
          price_4x4_1?: number
          price_4x4_2?: number
          price_4x4_3plus?: number
          price_car_1?: number
          price_car_2?: number
          price_car_3plus?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_waterfall_prices_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_waterfall_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      guides: {
        Row: {
          age: number | null
          created_at: string
          daily_rate: number
          email: string | null
          gender: string | null
          guide_prices: Json | null
          has_4x4: boolean
          has_cadastur: boolean
          id: string
          instagram: string | null
          is_active: boolean
          is_kalunga: boolean
          languages: string[]
          limit_4x4: number | null
          limit_tourist: number | null
          name: string
          notes: string | null
          phone: string | null
          residence: string | null
          specialties: string[]
          updated_at: string
          user_id: string | null
          vehicle_seats: number
        }
        Insert: {
          age?: number | null
          created_at?: string
          daily_rate?: number
          email?: string | null
          gender?: string | null
          guide_prices?: Json | null
          has_4x4?: boolean
          has_cadastur?: boolean
          id?: string
          instagram?: string | null
          is_active?: boolean
          is_kalunga?: boolean
          languages?: string[]
          limit_4x4?: number | null
          limit_tourist?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          residence?: string | null
          specialties?: string[]
          updated_at?: string
          user_id?: string | null
          vehicle_seats?: number
        }
        Update: {
          age?: number | null
          created_at?: string
          daily_rate?: number
          email?: string | null
          gender?: string | null
          guide_prices?: Json | null
          has_4x4?: boolean
          has_cadastur?: boolean
          id?: string
          instagram?: string | null
          is_active?: boolean
          is_kalunga?: boolean
          languages?: string[]
          limit_4x4?: number | null
          limit_tourist?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          residence?: string | null
          specialties?: string[]
          updated_at?: string
          user_id?: string | null
          vehicle_seats?: number
        }
        Relationships: []
      }
      image_focal_points: {
        Row: {
          created_at: string
          focal_x: number
          focal_x_mobile: number | null
          focal_y: number
          focal_y_mobile: number | null
          id: string
          image_path: string
          rotation: number | null
          scale: number | null
          scale_mobile: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          focal_x?: number
          focal_x_mobile?: number | null
          focal_y?: number
          focal_y_mobile?: number | null
          id?: string
          image_path: string
          rotation?: number | null
          scale?: number | null
          scale_mobile?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          focal_x?: number
          focal_x_mobile?: number | null
          focal_y?: number
          focal_y_mobile?: number | null
          id?: string
          image_path?: string
          rotation?: number | null
          scale?: number | null
          scale_mobile?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      imersao_leads: {
        Row: {
          cargo: string
          como_conheceu: string | null
          conhece_chapada: string | null
          created_at: string
          data_especifica: string | null
          data_especifica_fim: string | null
          email: string
          empresa: string
          experiencia_grupos: string | null
          hospedagem: string | null
          id: string
          instagram_site: string | null
          nome: string
          num_participantes: string
          objetivos: Json
          observacoes: string | null
          orcamento: string | null
          quando: string
          status: string
          telefone: string
          tipo_grupo: string
        }
        Insert: {
          cargo: string
          como_conheceu?: string | null
          conhece_chapada?: string | null
          created_at?: string
          data_especifica?: string | null
          data_especifica_fim?: string | null
          email: string
          empresa: string
          experiencia_grupos?: string | null
          hospedagem?: string | null
          id?: string
          instagram_site?: string | null
          nome: string
          num_participantes: string
          objetivos?: Json
          observacoes?: string | null
          orcamento?: string | null
          quando: string
          status?: string
          telefone: string
          tipo_grupo: string
        }
        Update: {
          cargo?: string
          como_conheceu?: string | null
          conhece_chapada?: string | null
          created_at?: string
          data_especifica?: string | null
          data_especifica_fim?: string | null
          email?: string
          empresa?: string
          experiencia_grupos?: string | null
          hospedagem?: string | null
          id?: string
          instagram_site?: string | null
          nome?: string
          num_participantes?: string
          objetivos?: Json
          observacoes?: string | null
          orcamento?: string | null
          quando?: string
          status?: string
          telefone?: string
          tipo_grupo?: string
        }
        Relationships: []
      }
      itinerary_checklist: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          is_done: boolean
          proposal_id: string
          task_label: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          is_done?: boolean
          proposal_id: string
          task_label: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          is_done?: boolean
          proposal_id?: string
          task_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_checklist_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      map_points: {
        Row: {
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          name: string
          point_type: string
          product_id: string | null
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          point_type?: string
          product_id?: string | null
          x?: number
          y?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          point_type?: string
          product_id?: string | null
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "map_points_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          position: number
          segment: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          position?: number
          segment: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          position?: number
          segment?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          cost_price: number
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          segment: string
          source_id: string | null
          source_type: string | null
          supplier_id: string | null
          type: string
          unit_price: number
          updated_at: string
          variables: Json | null
        }
        Insert: {
          category?: string | null
          cost_price?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          segment?: string
          source_id?: string | null
          source_type?: string | null
          supplier_id?: string | null
          type?: string
          unit_price?: number
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          category?: string | null
          cost_price?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          segment?: string
          source_id?: string | null
          source_type?: string | null
          supplier_id?: string | null
          type?: string
          unit_price?: number
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          language: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          language?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          language?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      proposal_accommodations: {
        Row: {
          checkin_date: string | null
          checkout_date: string | null
          created_at: string
          id: string
          is_selected: boolean
          notes: string | null
          num_nights: number
          payment_type: string
          product_id: string
          proposal_id: string
          rooms: Json
        }
        Insert: {
          checkin_date?: string | null
          checkout_date?: string | null
          created_at?: string
          id?: string
          is_selected?: boolean
          notes?: string | null
          num_nights?: number
          payment_type?: string
          product_id: string
          proposal_id: string
          rooms?: Json
        }
        Update: {
          checkin_date?: string | null
          checkout_date?: string | null
          created_at?: string
          id?: string
          is_selected?: boolean
          notes?: string | null
          num_nights?: number
          payment_type?: string
          product_id?: string
          proposal_id?: string
          rooms?: Json
        }
        Relationships: [
          {
            foreignKeyName: "proposal_accommodations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_accommodations_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_cost_checks: {
        Row: {
          actual_cost: number
          catalog_cost: number
          created_at: string
          day_number: number
          id: string
          is_verified: boolean
          item_index: number
          notes: string | null
          proposal_cost: number
          proposal_id: string
          updated_at: string
        }
        Insert: {
          actual_cost?: number
          catalog_cost?: number
          created_at?: string
          day_number: number
          id?: string
          is_verified?: boolean
          item_index: number
          notes?: string | null
          proposal_cost?: number
          proposal_id: string
          updated_at?: string
        }
        Update: {
          actual_cost?: number
          catalog_cost?: number
          created_at?: string
          day_number?: number
          id?: string
          is_verified?: boolean
          item_index?: number
          notes?: string | null
          proposal_cost?: number
          proposal_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_cost_checks_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_costs: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          description: string
          id: string
          proposal_id: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          created_at?: string
          description: string
          id?: string
          proposal_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          description?: string
          id?: string
          proposal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_costs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_costs_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_day_items: {
        Row: {
          catalog_item_id: string | null
          category: string
          commission_percent: number
          cost_price: number
          created_at: string
          day_label: string | null
          day_number: number
          description: string | null
          end_time: string | null
          id: string
          item_index: number
          item_name: string | null
          proposal_id: string
          quantity: number
          start_time: string | null
          value: number
          value_text: string | null
          vehicle_type: string | null
        }
        Insert: {
          catalog_item_id?: string | null
          category: string
          commission_percent?: number
          cost_price?: number
          created_at?: string
          day_label?: string | null
          day_number?: number
          description?: string | null
          end_time?: string | null
          id?: string
          item_index?: number
          item_name?: string | null
          proposal_id: string
          quantity?: number
          start_time?: string | null
          value?: number
          value_text?: string | null
          vehicle_type?: string | null
        }
        Update: {
          catalog_item_id?: string | null
          category?: string
          commission_percent?: number
          cost_price?: number
          created_at?: string
          day_label?: string | null
          day_number?: number
          description?: string | null
          end_time?: string | null
          id?: string
          item_index?: number
          item_name?: string | null
          proposal_id?: string
          quantity?: number
          start_time?: string | null
          value?: number
          value_text?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_day_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_days: {
        Row: {
          created_at: string
          day_number: number
          description: string | null
          id: string
          observation: string | null
          proposal_id: string
        }
        Insert: {
          created_at?: string
          day_number: number
          description?: string | null
          id?: string
          observation?: string | null
          proposal_id: string
        }
        Update: {
          created_at?: string
          day_number?: number
          description?: string | null
          id?: string
          observation?: string | null
          proposal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_days_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_feedback: {
        Row: {
          content: string
          created_at: string
          id: string
          is_resolved: boolean
          proposal_id: string
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          proposal_id: string
          type?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          proposal_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_feedback_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_items: {
        Row: {
          created_at: string
          description: string
          guide_id: string | null
          id: string
          product_id: string | null
          proposal_id: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          guide_id?: string | null
          id?: string
          product_id?: string | null
          proposal_id: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          guide_id?: string | null
          id?: string
          product_id?: string | null
          proposal_id?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          atmos_service: Json | null
          code: string | null
          contract_status: string | null
          contract_url: string | null
          created_at: string
          created_by: string | null
          discount_fixed: number
          discount_percent: number
          end_date: string | null
          guide_id: string | null
          id: string
          language: string
          notes: string | null
          num_days: number | null
          num_people: number | null
          payment_status: string | null
          payment_terms: Json | null
          prospect_id: string | null
          published_at: string | null
          segment: string
          seller_id: string | null
          share_token: string | null
          show_price_breakdown: boolean
          slug: string | null
          start_date: string | null
          status: string
          subtotal: number
          tax_percent: number
          title: string
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          atmos_service?: Json | null
          code?: string | null
          contract_status?: string | null
          contract_url?: string | null
          created_at?: string
          created_by?: string | null
          discount_fixed?: number
          discount_percent?: number
          end_date?: string | null
          guide_id?: string | null
          id?: string
          language?: string
          notes?: string | null
          num_days?: number | null
          num_people?: number | null
          payment_status?: string | null
          payment_terms?: Json | null
          prospect_id?: string | null
          published_at?: string | null
          segment?: string
          seller_id?: string | null
          share_token?: string | null
          show_price_breakdown?: boolean
          slug?: string | null
          start_date?: string | null
          status?: string
          subtotal?: number
          tax_percent?: number
          title: string
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          atmos_service?: Json | null
          code?: string | null
          contract_status?: string | null
          contract_url?: string | null
          created_at?: string
          created_by?: string | null
          discount_fixed?: number
          discount_percent?: number
          end_date?: string | null
          guide_id?: string | null
          id?: string
          language?: string
          notes?: string | null
          num_days?: number | null
          num_people?: number | null
          payment_status?: string | null
          payment_terms?: Json | null
          prospect_id?: string | null
          published_at?: string | null
          segment?: string
          seller_id?: string | null
          share_token?: string | null
          show_price_breakdown?: boolean
          slug?: string | null
          start_date?: string | null
          status?: string
          subtotal?: number
          tax_percent?: number
          title?: string
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_interactions: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          prospect_id: string
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          prospect_id: string
          type: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          prospect_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_interactions_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          annual_volume: number | null
          birth_date: string | null
          brazil_destinations: string | null
          commission_rate: number | null
          company_name: string | null
          company_segment: string | null
          company_type: string | null
          country: string | null
          created_at: string
          description: string | null
          differentials: string | null
          document: string | null
          document_type: string | null
          email: string | null
          estimated_ticket: number | null
          first_contact: string | null
          id: string
          instagram: string | null
          key_clients: string | null
          last_interaction: string | null
          linkedin: string | null
          logo_url: string | null
          name: string
          next_followup_at: string | null
          notes: string | null
          operates_brazil: string | null
          phone: string | null
          potential: string | null
          priority: string | null
          segment: string
          seller_id: string | null
          source: string
          stage_id: string | null
          strategic_notes: string | null
          tags: string[]
          target_market: string | null
          type: string | null
          typical_group_size: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          annual_volume?: number | null
          birth_date?: string | null
          brazil_destinations?: string | null
          commission_rate?: number | null
          company_name?: string | null
          company_segment?: string | null
          company_type?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          differentials?: string | null
          document?: string | null
          document_type?: string | null
          email?: string | null
          estimated_ticket?: number | null
          first_contact?: string | null
          id?: string
          instagram?: string | null
          key_clients?: string | null
          last_interaction?: string | null
          linkedin?: string | null
          logo_url?: string | null
          name: string
          next_followup_at?: string | null
          notes?: string | null
          operates_brazil?: string | null
          phone?: string | null
          potential?: string | null
          priority?: string | null
          segment: string
          seller_id?: string | null
          source?: string
          stage_id?: string | null
          strategic_notes?: string | null
          tags?: string[]
          target_market?: string | null
          type?: string | null
          typical_group_size?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          annual_volume?: number | null
          birth_date?: string | null
          brazil_destinations?: string | null
          commission_rate?: number | null
          company_name?: string | null
          company_segment?: string | null
          company_type?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          differentials?: string | null
          document?: string | null
          document_type?: string | null
          email?: string | null
          estimated_ticket?: number | null
          first_contact?: string | null
          id?: string
          instagram?: string | null
          key_clients?: string | null
          last_interaction?: string | null
          linkedin?: string | null
          logo_url?: string | null
          name?: string
          next_followup_at?: string | null
          notes?: string | null
          operates_brazil?: string | null
          phone?: string | null
          potential?: string | null
          priority?: string | null
          segment?: string
          seller_id?: string | null
          source?: string
          stage_id?: string | null
          strategic_notes?: string | null
          tags?: string[]
          target_market?: string | null
          type?: string | null
          typical_group_size?: number | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          answers: Json | null
          created_at: string
          id: string
          items: Json | null
          language: string | null
          status: string
          user_email: string | null
          user_id: string | null
          user_name: string | null
          user_phone: string | null
        }
        Insert: {
          answers?: Json | null
          created_at?: string
          id?: string
          items?: Json | null
          language?: string | null
          status?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Update: {
          answers?: Json | null
          created_at?: string
          id?: string
          items?: Json | null
          language?: string | null
          status?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Relationships: []
      }
      sales_goals: {
        Row: {
          created_at: string
          goal_amount: number
          id: string
          period_start: string
          period_type: string
          segment: string
          seller_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          goal_amount?: number
          id?: string
          period_start: string
          period_type?: string
          segment?: string
          seller_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          goal_amount?: number
          id?: string
          period_start?: string
          period_type?: string
          segment?: string
          seller_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_goals_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          address: string | null
          avatar_url: string | null
          birth_date: string | null
          commission_rate: number | null
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          pix_key: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          commission_rate?: number | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          pix_key?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          commission_rate?: number | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          pix_key?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_overrides: {
        Row: {
          created_at: string | null
          device: string
          element_selector: string
          id: string
          override_type: string
          styles: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          device?: string
          element_selector: string
          id?: string
          override_type?: string
          styles?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          device?: string
          element_selector?: string
          id?: string
          override_type?: string
          styles?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          bank_account: string | null
          bank_agency: string | null
          bank_name: string | null
          cnpj: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          instagram: string | null
          is_active: boolean
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          pix_key: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          cnpj?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          pix_key?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          cnpj?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          pix_key?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          created_at: string | null
          id: string
          item_details: string | null
          item_id: string
          item_name: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_details?: string | null
          item_id: string
          item_name: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_details?: string | null
          item_id?: string
          item_name?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_published_proposal_link: { Args: Record<PropertyKey, never>; Returns: Json }
      save_public_proposal_edits: { Args: { p_proposal_id: string; p_days: Json; p_items: Json }; Returns: boolean }
      get_public_products: { Args: { p_type?: string | null }; Returns: Json }
      save_proposal_bundle: {
        Args: { p_id: string | null; p_proposal: Json; p_items: Json; p_costs: Json; p_days: Json; p_accommodations: Json; p_commissions: Json }
        Returns: Json

      }
      get_public_proposal: { Args: { p_token: string }; Returns: Json }
      submit_proposal_feedback: {
        Args: { p_content: string; p_proposal_id: string; p_share_token: string; p_type: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_own_profile: { Args: { profile_id: string }; Returns: boolean }
      is_own_wishlist_item: { Args: { item_user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
