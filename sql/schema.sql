-- Hubify Mail Database Schema
-- Run this file to initialize the database

-- Drop tables if exist (for fresh install)
DROP TABLE IF EXISTS emails CASCADE;
DROP TABLE IF EXISTS inboxes CASCADE;
DROP TABLE IF EXISTS domains CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- Domains table
CREATE TABLE domains (
  id SERIAL PRIMARY KEY,
  domain VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inboxes table
CREATE TABLE inboxes (
  id SERIAL PRIMARY KEY,
  local_part VARCHAR(255) NOT NULL,
  domain_id INTEGER REFERENCES domains(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours'),
  UNIQUE(local_part, domain_id)
);

-- Emails table
CREATE TABLE emails (
  id SERIAL PRIMARY KEY,
  inbox_id INTEGER REFERENCES inboxes(id) ON DELETE CASCADE,
  from_address VARCHAR(255),
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  has_attachment BOOLEAN DEFAULT false,
  received_at TIMESTAMP DEFAULT NOW()
);

-- Admin users table
CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_inboxes_expires ON inboxes(expires_at);
CREATE INDEX idx_inboxes_local_domain ON inboxes(local_part, domain_id);
CREATE INDEX idx_emails_inbox ON emails(inbox_id);
CREATE INDEX idx_emails_received ON emails(received_at);
CREATE INDEX idx_domains_active ON domains(is_active);

-- Insert sample domains (modify as needed)
INSERT INTO domains (domain) VALUES 
  ('hubify.store'),
  ('mail.hubify.store'),
  ('temp.hubify.store');

-- Display success message
SELECT 'Database schema created successfully!' as message;
