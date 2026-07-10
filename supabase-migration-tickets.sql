-- Tickets system
CREATE TABLE IF NOT EXISTS tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'resolved')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  message TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own tickets only
CREATE POLICY "Users view own tickets" ON tickets
  FOR SELECT USING (auth.uid() = user_id);
-- Users can create tickets
CREATE POLICY "Users create tickets" ON tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Users can update their own tickets (for closing)
CREATE POLICY "Users update own tickets" ON tickets
  FOR UPDATE USING (auth.uid() = user_id);
-- Users can view messages on their tickets only
CREATE POLICY "Users view own ticket messages" ON ticket_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tickets WHERE id = ticket_id AND user_id = auth.uid())
  );

-- Add script_id to keys for per-script key locking
ALTER TABLE keys ADD COLUMN IF NOT EXISTS script_id UUID REFERENCES scripts(id) ON DELETE SET NULL;
