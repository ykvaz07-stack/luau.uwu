-- luau.uwu Migration V2
-- Run this in Supabase SQL Editor

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'premium')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  trial_used BOOLEAN DEFAULT false,
  trial_fingerprint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('pro', 'premium')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('paypal', 'crypto')),
  crypto_address TEXT,
  crypto_amount TEXT,
  proof_url TEXT,
  transaction_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- IP logs table
CREATE TABLE IF NOT EXISTS ip_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'urgent')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disposable email domains blocklist
CREATE TABLE IF NOT EXISTS blocked_domains (
  id SERIAL PRIMARY KEY,
  domain TEXT UNIQUE NOT NULL
);

-- Insert top 50 most common disposable email domains
INSERT INTO blocked_domains (domain) VALUES
  ('guerrillamail.com'), ('tempmail.com'), ('throwaway.email'), ('temp-mail.org'),
  ('mailinator.com'), ('yopmail.com'), ('dispostable.com'), ('sharklasers.com'),
  ('guerrillamailblock.com'), ('grr.la'), ('guerrillamail.info'),
  ('guerrillamail.biz'), ('guerrillamail.de'), ('guerrillamail.net'),
  ('guerrillamail.org'), ('guerrillamailstore.com'), ('guerrillamail.tv'),
  ('guerrillamail.us'), ('guerrillamailproxy.com'), ('guerrillamails.com'),
  ('guerrillamailus.com'), ('harakirimail.com'), ('hidemail.de'),
  ('hmamail.com'), ('hopemail.biz'), ('hot-mail.cf'), ('hot-mail.com'),
  ('hotmial.com'), ('hushmail.com'), ('inbax.tk'), ('inbox.si'),
  ('inboxclean.com'), ('inboxclean.org'), ('inboxproxy.com'),
  ('incognitomail.com'), ('incognitomail.org'), ('insorg-mail.info'),
  ('jetable.com'), ('jetable.fr.nf'), ('jetable.net'), ('jetable.org'),
  ('jnxjn.com'), ('jourrapide.com'), ('junk1e.com'), ('junkmail.com'),
  ('junkmail.ga'), ('junkmail.gq'), ('kasmail.com'), ('kaspop.com'),
  ('keepmymail.com'), ('killmail.com'), ('killmail.net')
ON CONFLICT (domain) DO NOTHING;

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_domains ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own purchases" ON purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own purchases" ON purchases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own ip logs" ON ip_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view active announcements" ON announcements FOR SELECT USING (active = true);
CREATE POLICY "No client access to blocked domains" ON blocked_domains FOR ALL USING (false);

-- Indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_ip_logs_user_id ON ip_logs(user_id);
CREATE INDEX idx_ip_logs_ip ON ip_logs(ip_address);
CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX idx_announcements_active ON announcements(active);
