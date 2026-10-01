export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          owner_id: string | null;
          name: string;
          business_type: string | null;
          owner_name: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          country: string;
          pincode: string | null;
          gstin: string | null;
          currency: string;
          tax_settings: string;
          logo: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['businesses']['Row']> & { id: string; name: string };
        Update: Partial<Database['public']['Tables']['businesses']['Row']>;
      };
      business_members: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member';
          created_at: string;
        };
        Insert: { business_id: string; user_id: string; role?: 'owner' | 'admin' | 'member' };
        Update: Partial<Database['public']['Tables']['business_members']['Row']>;
      };
      customers: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          gstin: string | null;
          notes: string | null;
          opening_balance: number;
          credit_limit: number | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['customers']['Row']> & { id: string; business_id: string; name: string };
        Update: Partial<Database['public']['Tables']['customers']['Row']>;
      };
      suppliers: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          gstin: string | null;
          notes: string | null;
          opening_balance: number;
          credit_limit: number | null;
          supply_types: string[] | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['suppliers']['Row']> & { id: string; business_id: string; name: string };
        Update: Partial<Database['public']['Tables']['suppliers']['Row']>;
      };
      categories: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          type: 'product' | 'expense' | 'income';
          color: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['categories']['Row']> & { id: string; business_id: string; name: string; type: 'product' | 'expense' | 'income' };
        Update: Partial<Database['public']['Tables']['categories']['Row']>;
      };
      products: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          sku: string | null;
          barcode: string | null;
          category_id: string | null;
          type: 'physical' | 'service';
          unit: string;
          purchase_price: number;
          selling_price: number;
          tax_rate: number;
          current_stock: number;
          minimum_stock: number;
          supplier_id: string | null;
          description: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['products']['Row']> & { id: string; business_id: string; name: string };
        Update: Partial<Database['public']['Tables']['products']['Row']>;
      };
      stock_movements: {
        Row: {
          id: string;
          business_id: string;
          product_id: string;
          type: 'in' | 'out' | 'adjust';
          quantity: number;
          reason: string | null;
          reference_type: string | null;
          reference_id: string | null;
          date: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['stock_movements']['Row']> & { id: string; business_id: string; product_id: string; type: 'in' | 'out' | 'adjust'; quantity: number };
        Update: Partial<Database['public']['Tables']['stock_movements']['Row']>;
      };
      sales: {
        Row: {
          id: string;
          business_id: string;
          sale_number: string;
          customer_id: string | null;
          date: string | null;
          subtotal: number;
          discount: number;
          tax: number;
          total: number;
          amount_paid: number;
          amount_due: number;
          payment_status: 'paid' | 'partial' | 'pending';
          payment_method: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['sales']['Row']> & { id: string; business_id: string; sale_number: string };
        Update: Partial<Database['public']['Tables']['sales']['Row']>;
      };
      sale_items: {
        Row: {
          id: string;
          business_id: string;
          sale_id: string;
          product_id: string | null;
          product_name_snapshot: string | null;
          quantity: number;
          unit_price: number;
          discount: number;
          tax_rate: number;
          tax_amount: number;
          total: number;
          cost_price_snapshot: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['sale_items']['Row']> & { id: string; business_id: string; sale_id: string };
        Update: Partial<Database['public']['Tables']['sale_items']['Row']>;
      };
      purchases: {
        Row: {
          id: string;
          business_id: string;
          purchase_number: string;
          supplier_id: string | null;
          date: string | null;
          subtotal: number;
          discount: number;
          tax: number;
          total: number;
          amount_paid: number;
          amount_due: number;
          payment_status: 'paid' | 'partial' | 'pending';
          notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['purchases']['Row']> & { id: string; business_id: string; purchase_number: string };
        Update: Partial<Database['public']['Tables']['purchases']['Row']>;
      };
      purchase_items: {
        Row: {
          id: string;
          business_id: string;
          purchase_id: string;
          product_id: string | null;
          product_name_snapshot: string | null;
          quantity: number;
          unit_price: number;
          discount: number;
          tax_rate: number;
          total: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['purchase_items']['Row']> & { id: string; business_id: string; purchase_id: string };
        Update: Partial<Database['public']['Tables']['purchase_items']['Row']>;
      };
      invoices: {
        Row: {
          id: string;
          business_id: string;
          invoice_number: string;
          invoice_no: string | null;
          sale_id: string | null;
          customer_id: string | null;
          customer_name: string | null;
          customer_address: string | null;
          customer_gstin: string | null;
          date: string | null;
          due_date: string | null;
          subtotal: number;
          tax: number;
          total: number;
          paid_amount: number | null;
          due_amount: number | null;
          status: string;
          notes: string | null;
          items: Json | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['invoices']['Row']> & { id: string; business_id: string; invoice_number: string };
        Update: Partial<Database['public']['Tables']['invoices']['Row']>;
      };
      quotations: {
        Row: {
          id: string;
          business_id: string;
          quotation_number: string;
          customer_id: string | null;
          date: string | null;
          valid_until: string | null;
          subtotal: number;
          tax: number;
          total: number;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['quotations']['Row']> & { id: string; business_id: string; quotation_number: string };
        Update: Partial<Database['public']['Tables']['quotations']['Row']>;
      };
      quotation_items: {
        Row: {
          id: string;
          business_id: string;
          quotation_id: string;
          product_id: string | null;
          product_name_snapshot: string | null;
          quantity: number;
          unit_price: number;
          discount: number;
          total: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['quotation_items']['Row']> & { id: string; business_id: string; quotation_id: string };
        Update: Partial<Database['public']['Tables']['quotation_items']['Row']>;
      };
      expenses: {
        Row: {
          id: string;
          business_id: string;
          expense_number: string;
          category: string;
          description: string | null;
          amount: number;
          date: string | null;
          payment_method: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['expenses']['Row']> & { id: string; business_id: string; expense_number: string; category: string; amount: number };
        Update: Partial<Database['public']['Tables']['expenses']['Row']>;
      };
      payments: {
        Row: {
          id: string;
          business_id: string;
          payment_number: string | null;
          reference_type: string;
          reference_id: string | null;
          customer_id: string | null;
          supplier_id: string | null;
          amount: number;
          date: string | null;
          method: string;
          notes: string | null;
          direction: 'in' | 'out';
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['payments']['Row']> & { id: string; business_id: string; reference_type: string; amount: number; direction: 'in' | 'out' };
        Update: Partial<Database['public']['Tables']['payments']['Row']>;
      };
      plans: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          regular_price_monthly: number;
          offer_price_monthly: number;
          max_storage_bytes: number;
          max_transactions: number;
          max_customers: number;
          max_products: number;
          max_invoices: number;
          max_users: number;
          max_devices: number;
          max_branches: number;
          features: Json;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['plans']['Row']> & { id: string; name: string };
        Update: Partial<Database['public']['Tables']['plans']['Row']>;
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          business_id: string;
          plan_id: string;
          status: 'active' | 'past_due' | 'canceled' | 'expired';
          billing_cycle: 'monthly' | 'annual' | '2year' | '3year';
          current_period_start: string;
          current_period_end: string | null;
          razorpay_customer_id: string | null;
          razorpay_subscription_id: string | null;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['subscriptions']['Row']> & { user_id: string; business_id: string; plan_id: string };
        Update: Partial<Database['public']['Tables']['subscriptions']['Row']>;
      };
      payment_transactions: {
        Row: {
          id: string;
          user_id: string;
          business_id: string;
          razorpay_order_id: string;
          razorpay_payment_id: string | null;
          amount: number;
          currency: string;
          status: 'created' | 'paid' | 'failed';
          receipt: string | null;
          raw_payload: Json | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['payment_transactions']['Row']> & { user_id: string; business_id: string; razorpay_order_id: string; amount: number };
        Update: Partial<Database['public']['Tables']['payment_transactions']['Row']>;
      };
      usage_records: {
        Row: {
          business_id: string;
          storage_bytes_used: number;
          transactions_count: number;
          customers_count: number;
          products_count: number;
          invoices_count: number;
          updated_at: string;
        };
        Insert: { business_id: string } & Partial<Database['public']['Tables']['usage_records']['Row']>;
        Update: Partial<Database['public']['Tables']['usage_records']['Row']>;
      };
    };
  };
}
