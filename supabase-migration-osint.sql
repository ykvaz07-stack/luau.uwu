-- IP Logs table for OSINT tracking
CREATE TABLE IF NOT EXISTS ip_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification codes for email signup
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ip_logs_user_id ON ip_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ip_logs_ip_address ON ip_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_logs_created_at ON ip_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);

-- RLS
ALTER TABLE ip_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Only admin can read ip_logs (via service_role key in API routes)
CREATE POLICY "Only service role can read ip_logs" ON ip_logs
  FOR ALL USING (false);
CREATE POLICY "Only service role can manage verification_codes" ON verification_codes
  FOR ALL USING (false);
