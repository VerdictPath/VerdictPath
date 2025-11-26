--
-- Chat System Migration - HIPAA Compliant Real-time Messaging
-- Created: 2025-11-24
--

-- Conversations table: stores chat conversation metadata
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_type VARCHAR(50) NOT NULL CHECK (conversation_type IN ('lawfirm_client', 'provider_patient', 'firm_provider')),
  created_by_type VARCHAR(20) NOT NULL CHECK (created_by_type IN ('user', 'law_firm', 'medical_provider')),
  created_by_id INTEGER NOT NULL,
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversation participants: tracks who can access each conversation
CREATE TABLE IF NOT EXISTS conversation_participants (
  id SERIAL PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  participant_type VARCHAR(20) NOT NULL CHECK (participant_type IN ('user', 'law_firm', 'medical_provider')),
  participant_id INTEGER NOT NULL,
  role VARCHAR(20) DEFAULT 'primary' CHECK (role IN ('primary', 'delegate')),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_muted BOOLEAN DEFAULT FALSE,
  last_read_message_id UUID,
  last_read_at TIMESTAMP,
  UNIQUE (conversation_id, participant_type, participant_id)
);

-- Messages table: stores encrypted message content
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'law_firm', 'medical_provider')),
  sender_id INTEGER NOT NULL,
  sender_name VARCHAR(255),
  body_ciphertext TEXT NOT NULL,
  body_iv VARCHAR(255) NOT NULL,
  body_auth_tag VARCHAR(255) NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'attachment')),
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Message deliveries: tracks delivery and read status per participant
CREATE TABLE IF NOT EXISTS message_deliveries (
  id SERIAL PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  participant_id INTEGER NOT NULL REFERENCES conversation_participants(id) ON DELETE CASCADE,
  delivery_status VARCHAR(20) DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'read', 'failed')),
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (message_id, participant_id)
);

-- Message audit log: HIPAA compliance audit trail
CREATE TABLE IF NOT EXISTS message_audit_log (
  id SERIAL PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'export', 'search')),
  actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('user', 'law_firm', 'medical_provider', 'system')),
  actor_id INTEGER,
  ip_address VARCHAR(45),
  user_agent TEXT,
  context JSONB DEFAULT '{}',
  action_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(conversation_type);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by_type, created_by_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conv_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_participant ON conversation_participants(participant_type, participant_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_unread ON conversation_participants(participant_id) WHERE last_read_message_id IS NULL OR last_read_at < NOW() - INTERVAL '1 day';

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_type, sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_deliveries_participant ON message_deliveries(participant_id);
CREATE INDEX IF NOT EXISTS idx_message_deliveries_message ON message_deliveries(message_id);
CREATE INDEX IF NOT EXISTS idx_message_deliveries_unread ON message_deliveries(participant_id) WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_message_audit_conversation ON message_audit_log(conversation_id, action_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_audit_actor ON message_audit_log(actor_type, actor_id, action_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_audit_action ON message_audit_log(action, action_at DESC);

-- Trigger to update conversation.last_message_at on new message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.sent_at,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_chat_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversations_timestamp
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_timestamps();

CREATE TRIGGER trigger_update_messages_timestamp
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_timestamps();

-- Comments for documentation
COMMENT ON TABLE conversations IS 'Stores chat conversation metadata with HIPAA compliance';
COMMENT ON TABLE conversation_participants IS 'Tracks participants in each conversation with access control';
COMMENT ON TABLE messages IS 'Stores encrypted messages with AES-256-GCM encryption';
COMMENT ON TABLE message_deliveries IS 'Tracks message delivery and read status per participant';
COMMENT ON TABLE message_audit_log IS 'HIPAA-compliant audit trail for all message operations';
