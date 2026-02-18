-- ============================================
-- WHATSAPP BOT INTEGRATION - DATABASE EXTENSIONS
-- ============================================
-- Optional database extensions for WhatsApp bot functionality
-- These are NOT required - you can start with just the phone field
-- ============================================

-- ============================================
-- 1. ADD WHATSAPP FIELDS TO USERS TABLE
-- ============================================
-- This links WhatsApp numbers to user accounts
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20) NULL,
ADD COLUMN IF NOT EXISTS whatsapp_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS whatsapp_verified_at DATETIME NULL,
ADD COLUMN IF NOT EXISTS preferred_contact_method ENUM('email', 'phone', 'whatsapp') DEFAULT 'email';

-- Index for fast WhatsApp number lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_number ON users(whatsapp_number);

-- ============================================
-- 2. WHATSAPP MESSAGES LOG
-- ============================================
-- Store all WhatsApp messages for history and debugging
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL, -- NULL if user not identified yet
    whatsapp_number VARCHAR(20) NOT NULL,
    message_id VARCHAR(255) UNIQUE, -- WhatsApp message ID
    message_type ENUM('text', 'button', 'template', 'media', 'location') DEFAULT 'text',
    direction ENUM('inbound', 'outbound') NOT NULL,
    message_text TEXT,
    media_url VARCHAR(500) NULL,
    button_payload VARCHAR(255) NULL, -- For button clicks
    status ENUM('sent', 'delivered', 'read', 'failed') DEFAULT 'sent',
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_whatsapp_number (whatsapp_number),
    INDEX idx_message_id (message_id),
    INDEX idx_created (created_at),
    INDEX idx_direction (direction)
);

-- ============================================
-- 3. WHATSAPP CONVERSATION STATE
-- ============================================
-- Track where users are in multi-step conversation flows
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    whatsapp_number VARCHAR(20) NOT NULL,
    conversation_state VARCHAR(100) NOT NULL, -- e.g., 'booking_start', 'select_route', 'enter_passenger_info'
    context_data JSON, -- Store temporary data during conversation
    last_interaction_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at DATETIME NULL, -- Auto-expire old conversations (e.g., 1 hour)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_whatsapp_number (whatsapp_number),
    INDEX idx_state (conversation_state),
    INDEX idx_expires (expires_at),
    INDEX idx_last_interaction (last_interaction_at)
);

-- ============================================
-- 4. WHATSAPP TEMPLATES
-- ============================================
-- Store WhatsApp Business API templates
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL UNIQUE,
    template_id VARCHAR(100) NOT NULL, -- WhatsApp Business API template ID
    category ENUM('booking_confirmation', 'trip_reminder', 'payment_receipt', 'trip_update', 'custom') NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    variables JSON, -- Template variables like ["name", "trip_date", "amount"]
    example_text TEXT, -- Example of how template looks
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_template_id (template_id)
);

-- ============================================
-- 5. WHATSAPP NOTIFICATIONS QUEUE
-- ============================================
-- Queue messages to send later (reminders, confirmations, etc.)
CREATE TABLE IF NOT EXISTS whatsapp_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    notification_type ENUM('booking_confirmation', 'trip_reminder', 'payment_receipt', 'trip_update', 'custom') NOT NULL,
    whatsapp_number VARCHAR(20) NOT NULL,
    template_id INT NULL, -- Reference to whatsapp_templates
    message_data JSON, -- Template variables/data
    scheduled_for DATETIME NOT NULL,
    sent_at DATETIME NULL,
    status ENUM('pending', 'sent', 'delivered', 'read', 'failed') DEFAULT 'pending',
    error_message TEXT NULL,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_scheduled (scheduled_for),
    INDEX idx_whatsapp_number (whatsapp_number),
    INDEX idx_notification_type (notification_type)
);

-- ============================================
-- EXAMPLE DATA
-- ============================================

-- Example: Insert a WhatsApp template
-- INSERT INTO whatsapp_templates (template_name, template_id, category, variables, example_text)
-- VALUES (
--     'booking_confirmation',
--     'booking_confirmation_001',
--     'booking_confirmation',
--     '["name", "trip_date", "route", "booking_id"]',
--     'Hi {{name}}, your booking #{{booking_id}} for {{route}} on {{trip_date}} is confirmed!'
-- );

-- ============================================
-- USAGE NOTES
-- ============================================
-- 1. These tables are OPTIONAL - you can start without them
-- 2. Start with just adding whatsapp_number to users table
-- 3. Add other tables as you need more features
-- 4. Conversation state can also be stored in Redis/cache for faster access
-- 5. Message logging is useful for debugging but not required
-- 6. Templates are only needed if using WhatsApp Business API
--
-- MINIMAL SETUP:
--   - Just add whatsapp_number field to users table
--   - Link WhatsApp number to existing phone number
--   - Use existing bookings/trips tables
--
-- FULL SETUP:
--   - All tables above
--   - Message logging
--   - Conversation state tracking
--   - Template management
--   - Notification queue
-- ============================================

