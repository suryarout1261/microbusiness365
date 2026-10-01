-- ==============================================================================
-- MicroBusiness365 Cloud SaaS PostgreSQL Schema & Row Level Security (RLS)
-- Migration: 20260919_cloud_saas_schema.sql
-- ==============================================================================

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. Businesses & Multi-Tenancy Ownership
-- ==============================================================================

CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  business_type TEXT,
  owner_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  pincode TEXT,
  gstin TEXT,
  currency TEXT DEFAULT 'INR',
  tax_settings TEXT DEFAULT '18',
  logo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner', -- 'owner' | 'admin' | 'member'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, user_id)
);

-- RLS Helper function to check if auth.uid() has access to a business
CREATE OR REPLACE FUNCTION is_business_member(b_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members
    WHERE business_id = b_id AND user_id = auth.uid()
  );
$$;

-- RLS Helper function to check if auth.uid() is owner of business
CREATE OR REPLACE FUNCTION is_business_owner(b_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members
    WHERE business_id = b_id AND user_id = auth.uid() AND role = 'owner'
  );
$$;

-- ==============================================================================
-- 3. Business Entities (Corresponding to Dexie Schema)
-- ==============================================================================

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  gstin TEXT,
  notes TEXT,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  credit_limit NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  gstin TEXT,
  notes TEXT,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  credit_limit NUMERIC DEFAULT 0,
  supply_types TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'product' | 'expense' | 'income'
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  category_id TEXT,
  type TEXT NOT NULL DEFAULT 'physical', -- 'physical' | 'service'
  unit TEXT NOT NULL DEFAULT 'pcs',
  purchase_price NUMERIC NOT NULL DEFAULT 0,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 18,
  current_stock NUMERIC NOT NULL DEFAULT 0,
  minimum_stock NUMERIC NOT NULL DEFAULT 5,
  supplier_id TEXT,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'in' | 'out' | 'adjust'
  quantity NUMERIC NOT NULL,
  reason TEXT,
  reference_type TEXT, -- 'sale' | 'purchase'
  reference_id TEXT,
  date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sale_number TEXT NOT NULL,
  customer_id TEXT,
  date TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  amount_due NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending', -- 'paid' | 'partial' | 'pending'
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Sale Items
CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sale_id TEXT NOT NULL,
  product_id TEXT,
  product_name_snapshot TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 18,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  cost_price_snapshot NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  purchase_number TEXT NOT NULL,
  supplier_id TEXT,
  date TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  amount_due NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending', -- 'paid' | 'partial' | 'pending'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Purchase Items
CREATE TABLE IF NOT EXISTS purchase_items (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  purchase_id TEXT NOT NULL,
  product_id TEXT,
  product_name_snapshot TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 18,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  invoice_no TEXT,
  sale_id TEXT,
  customer_id TEXT,
  customer_name TEXT,
  customer_address TEXT,
  customer_gstin TEXT,
  date TEXT,
  due_date TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  due_amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- 'draft' | 'sent' | 'paid' | 'partial' | 'pending' | 'overdue'
  notes TEXT,
  items JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Quotations
CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  quotation_number TEXT NOT NULL,
  customer_id TEXT,
  date TEXT,
  valid_until TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'sent' | 'accepted' | 'rejected'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Quotation Items
CREATE TABLE IF NOT EXISTS quotation_items (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  quotation_id TEXT NOT NULL,
  product_id TEXT,
  product_name_snapshot TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  expense_number TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  date TEXT,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  payment_number TEXT,
  reference_type TEXT NOT NULL, -- 'sale' | 'purchase' | 'expense'
  reference_id TEXT,
  customer_id TEXT,
  supplier_id TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  date TEXT,
  method TEXT NOT NULL DEFAULT 'cash',
  notes TEXT,
  direction TEXT NOT NULL, -- 'in' | 'out'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ==============================================================================
-- 4. Subscription & Usage Management Tables
-- ==============================================================================

-- Configurable SaaS Plans
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  regular_price_monthly NUMERIC NOT NULL DEFAULT 0,
  offer_price_monthly NUMERIC NOT NULL DEFAULT 0,
  max_storage_bytes BIGINT NOT NULL DEFAULT 104857600, -- 100 MB
  max_transactions BIGINT NOT NULL DEFAULT 1000,
  max_customers BIGINT NOT NULL DEFAULT 500,
  max_products BIGINT NOT NULL DEFAULT 500,
  max_invoices BIGINT NOT NULL DEFAULT 500,
  max_users INTEGER NOT NULL DEFAULT 1,
  max_devices INTEGER NOT NULL DEFAULT 2,
  max_branches INTEGER NOT NULL DEFAULT 1,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'past_due' | 'canceled' | 'expired'
  billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' | 'annual' | '2year' | '3year'
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  razorpay_customer_id TEXT,
  razorpay_subscription_id TEXT,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment Transactions Ledger
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  razorpay_order_id TEXT NOT NULL,
  razorpay_payment_id TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created', -- 'created' | 'paid' | 'failed'
  receipt TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Realtime Usage Tracking Records
CREATE TABLE IF NOT EXISTS usage_records (
  business_id TEXT PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  storage_bytes_used BIGINT NOT NULL DEFAULT 0,
  transactions_count BIGINT NOT NULL DEFAULT 0,
  customers_count BIGINT NOT NULL DEFAULT 0,
  products_count BIGINT NOT NULL DEFAULT 0,
  invoices_count BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 5. Seed Data: SaaS Plans (Free, Starter, Pro, Business)
-- ==============================================================================

INSERT INTO plans (id, name, display_name, regular_price_monthly, offer_price_monthly, max_storage_bytes, max_transactions, max_customers, max_products, max_invoices, max_users, max_devices, max_branches, features)
VALUES
(
  'free',
  'Free Local',
  'Free Offline Mode',
  0,
  0,
  0, -- No cloud storage
  999999999, -- Unlimited local
  999999999,
  999999999,
  999999999,
  1,
  1,
  1,
  '["Full offline Dexie storage", "Unlimited local transactions", "Inventory management", "Point of sale & invoicing", "Local receipt printer", "No account required"]'::jsonb
),
(
  'starter',
  'Starter Cloud',
  'Starter Plan',
  299,
  149,
  104857600, -- 100 MB
  1000,
  500,
  500,
  1000,
  1,
  2,
  1,
  '["100 MB Cloud Storage", "1,000 Cloud Transactions", "500 Customers & Products", "Automatic Cloud Backup", "Sync across 2 devices", "GST & Reports", "Email Support"]'::jsonb
),
(
  'pro',
  'Pro Cloud',
  'Professional Plan',
  499,
  249,
  524288000, -- 500 MB
  5000,
  2500,
  2500,
  5000,
  3,
  5,
  2,
  '["500 MB Cloud Storage", "5,000 Cloud Transactions", "2,500 Customers & Products", "Real-time Multi-device Sync (5 devices)", "3 Team Members", "Custom Invoices & Quotations", "Advanced Analytics & Audit Trail", "Priority Support"]'::jsonb
),
(
  'business',
  'Business Scale',
  'Enterprise Business',
  699,
  349,
  2147483648, -- 2 GB
  20000,
  10000,
  10000,
  20000,
  10,
  10,
  5,
  '["2 GB Cloud Storage", "20,000 Cloud Transactions", "10,000 Customers & Products", "Multi-branch Support (up to 5 branches)", "10 Team Members & Device Access", "Role-based Access Control", "Automated Daily Cloud Backups", "Dedicated 24/7 Priority Support"]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  regular_price_monthly = EXCLUDED.regular_price_monthly,
  offer_price_monthly = EXCLUDED.offer_price_monthly,
  max_storage_bytes = EXCLUDED.max_storage_bytes,
  max_transactions = EXCLUDED.max_transactions,
  max_customers = EXCLUDED.max_customers,
  max_products = EXCLUDED.max_products,
  max_invoices = EXCLUDED.max_invoices,
  max_users = EXCLUDED.max_users,
  max_devices = EXCLUDED.max_devices,
  max_branches = EXCLUDED.max_branches,
  features = EXCLUDED.features;

-- ==============================================================================
-- 6. Row Level Security (RLS) Enablement & Policies
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

-- Plans RLS (Public read for active plans)
CREATE POLICY "Public read plans" ON plans FOR SELECT USING (is_active = TRUE);

-- Businesses RLS
CREATE POLICY "Members can view businesses" ON businesses FOR SELECT USING (is_business_member(id) OR owner_id = auth.uid());
CREATE POLICY "Users can create businesses" ON businesses FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update businesses" ON businesses FOR UPDATE USING (is_business_owner(id) OR owner_id = auth.uid());
CREATE POLICY "Owners can delete businesses" ON businesses FOR DELETE USING (is_business_owner(id) OR owner_id = auth.uid());

-- Business Members RLS
CREATE POLICY "Members can view membership" ON business_members FOR SELECT USING (is_business_member(business_id) OR user_id = auth.uid());
CREATE POLICY "Owners can manage membership" ON business_members FOR ALL USING (is_business_owner(business_id) OR user_id = auth.uid());

-- Generic Macro-style RLS for all tenant-scoped business entities
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'customers', 'suppliers', 'categories', 'products', 'stock_movements',
    'sales', 'sale_items', 'purchases', 'purchase_items', 'invoices',
    'quotations', 'quotation_items', 'expenses', 'payments', 'usage_records'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Members can select %I" ON %I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Members can select %I" ON %I FOR SELECT USING (is_business_member(business_id));', tbl, tbl);

    EXECUTE format('DROP POLICY IF EXISTS "Members can insert %I" ON %I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Members can insert %I" ON %I FOR INSERT WITH CHECK (is_business_member(business_id));', tbl, tbl);

    EXECUTE format('DROP POLICY IF EXISTS "Members can update %I" ON %I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Members can update %I" ON %I FOR UPDATE USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));', tbl, tbl);

    EXECUTE format('DROP POLICY IF EXISTS "Members can delete %I" ON %I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Members can delete %I" ON %I FOR DELETE USING (is_business_member(business_id));', tbl, tbl);
  END LOOP;
END $$;

-- Subscriptions RLS
CREATE POLICY "Users can view own subscription" ON subscriptions FOR SELECT USING (user_id = auth.uid() OR is_business_member(business_id));
CREATE POLICY "Users can manage own subscription" ON subscriptions FOR ALL USING (user_id = auth.uid());

-- Payment Transactions RLS
CREATE POLICY "Users can view own transactions" ON payment_transactions FOR SELECT USING (user_id = auth.uid() OR is_business_member(business_id));

-- ==============================================================================
-- 7. Indexes for High-Performance Synchronization
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_business_members_user ON business_members(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_biz_updated ON customers(business_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_suppliers_biz_updated ON suppliers(business_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_products_biz_updated ON products(business_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_sales_biz_updated ON sales(business_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_biz ON sale_items(business_id, sale_id);
CREATE INDEX IF NOT EXISTS idx_purchases_biz_updated ON purchases(business_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_invoices_biz_updated ON invoices(business_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_quotations_biz_updated ON quotations(business_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_expenses_biz_updated ON expenses(business_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_payments_biz_updated ON payments(business_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_biz ON stock_movements(business_id, product_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_biz ON subscriptions(business_id, status);
