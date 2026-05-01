-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tables for Ekanta CRM

-- 1. Users Table (Simple auth as per App.jsx)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial users if table is empty
INSERT INTO users (name, username, password, role)
SELECT 'Admin', 'admin', 'admin123', 'CEO'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

INSERT INTO users (name, username, password, role)
SELECT 'Vinodhini', 'vinodhini', 'pass123', 'CRE'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'vinodhini');

INSERT INTO users (name, username, password, role)
SELECT 'Arjun Kumar', 'arjun', 'pass123', 'Manager'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'arjun');

-- 2. Funnels Table
CREATE TABLE IF NOT EXISTS funnels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company TEXT,
    contact TEXT,
    phone TEXT,
    email TEXT,
    city_region TEXT,
    enquiry_type TEXT,
    funnel_type TEXT,
    lead_source TEXT NOT NULL,
    next_follow_up DATE NOT NULL,
    stage TEXT DEFAULT 'New Lead',
    products JSONB DEFAULT '[]'::jsonb,
    remarks TEXT,
    delivery_details TEXT,
    payment_terms TEXT,
    quote_no TEXT,
    quote_qty NUMERIC,
    quote_amount NUMERIC,
    quote_desc TEXT,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT NOT NULL,
    billed_amount NUMERIC,
    billed_date DATE
);

-- 3. Audit Comments Table
CREATE TABLE IF NOT EXISTS audit_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funnel_id UUID REFERENCES funnels(id) ON DELETE CASCADE,
    author TEXT NOT NULL,
    role TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE funnels;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_comments;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all on funnels" ON funnels;
DROP POLICY IF EXISTS "Allow all on users" ON users;
DROP POLICY IF EXISTS "Allow all on audit_comments" ON audit_comments;

-- Fully Permissive Policies for Debugging
-- (Note: In production, you should restrict these to authenticated users)
CREATE POLICY "Allow all on funnels" ON funnels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on audit_comments" ON audit_comments FOR ALL USING (true) WITH CHECK (true);
