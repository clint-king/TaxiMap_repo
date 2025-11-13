# WhatsApp Bot Integration Guide

## Overview
This guide explains how to integrate WhatsApp bot functionality into your booking system and what database changes (if any) are needed.

## Good News: Minimal Database Changes Needed! ✅

Your existing database structure is **already compatible** with WhatsApp bot integration! Here's why:

### What You Already Have:
- ✅ Users table with `phone` field
- ✅ Bookings system
- ✅ Trips system
- ✅ All the core functionality

### What You Might Want to Add (Optional):
- WhatsApp-specific metadata
- Message logging
- Conversation state tracking

## Database Extensions for WhatsApp Bot

### Option 1: Minimal Changes (Recommended to Start)
**No database changes needed!** Use existing phone numbers.

### Option 2: Enhanced WhatsApp Features
Add these optional tables for better WhatsApp integration:

---

## Suggested Database Extensions

### 1. WhatsApp User Linking (Optional but Recommended)

```sql
-- Add WhatsApp-specific fields to users table
ALTER TABLE users 
ADD COLUMN whatsapp_number VARCHAR(20) NULL,
ADD COLUMN whatsapp_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN whatsapp_verified_at DATETIME NULL,
ADD COLUMN preferred_contact_method ENUM('email', 'phone', 'whatsapp') DEFAULT 'email';

-- Index for WhatsApp lookups
CREATE INDEX idx_whatsapp_number ON users(whatsapp_number);
```

**Why?**
- Link WhatsApp numbers to user accounts
- Track verification status
- Allow users to choose preferred contact method

### 2. WhatsApp Messages Log (For Debugging & History)

```sql
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
    INDEX idx_created (created_at)
);
```

**Why?**
- Track all WhatsApp conversations
- Debug issues
- Message history
- Analytics

### 3. WhatsApp Conversation State (For Multi-Step Flows)

```sql
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    whatsapp_number VARCHAR(20) NOT NULL,
    conversation_state VARCHAR(100) NOT NULL, -- e.g., 'booking_start', 'select_route', 'enter_passenger_info'
    context_data JSON, -- Store temporary data during conversation
    last_interaction_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at DATETIME NULL, -- Auto-expire old conversations
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_whatsapp_number (whatsapp_number),
    INDEX idx_state (conversation_state),
    INDEX idx_expires (expires_at)
);
```

**Why?**
- Track where user is in conversation flow
- Store temporary data (e.g., selected route, passenger count)
- Handle multi-step booking process
- Auto-cleanup old conversations

### 4. WhatsApp Templates (For Pre-approved Messages)

```sql
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL UNIQUE,
    template_id VARCHAR(100) NOT NULL, -- WhatsApp Business API template ID
    category ENUM('booking_confirmation', 'trip_reminder', 'payment_receipt', 'trip_update', 'custom') NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    variables JSON, -- Template variables like {{name}}, {{trip_date}}
    example_text TEXT, -- Example of how template looks
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_status (status)
);
```

**Why?**
- Store WhatsApp Business API templates
- Track template approval status
- Manage message templates centrally

### 5. WhatsApp Notifications Queue (For Scheduled Messages)

```sql
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_scheduled (scheduled_for),
    INDEX idx_whatsapp_number (whatsapp_number)
);
```

**Why?**
- Queue messages to send later
- Send trip reminders
- Handle retries for failed messages
- Track delivery status

---

## Complete Migration File

I'll create a complete migration file with all WhatsApp-related tables.

---

## How WhatsApp Bot Would Work

### User Flow Example:

1. **User sends WhatsApp message**: "Book a trip"
2. **Bot checks**: Is this number linked to a user account?
   - If yes: Load user data
   - If no: Ask to link account or create new
3. **Bot guides through booking**:
   - "Which route? (1) JHB→CT (2) JHB→DBN"
   - User selects: "1"
   - Bot: "How many passengers?"
   - User: "2"
   - ... continues through booking flow
4. **Bot creates booking** in existing `bookings` table
5. **Bot sends confirmation** via WhatsApp

### Database Interaction:

```
WhatsApp Message → Bot → Check whatsapp_conversations (current state)
                    ↓
              Update conversation state
                    ↓
              Store data in context_data (JSON)
                    ↓
              When booking complete → Create in bookings table
                    ↓
              Send confirmation via WhatsApp
                    ↓
              Log in whatsapp_messages table
```

---

## Integration Points

### 1. User Authentication via WhatsApp
```sql
-- Find user by WhatsApp number
SELECT * FROM users 
WHERE whatsapp_number = '+27123456789' 
  AND whatsapp_verified = TRUE;
```

### 2. Create Booking via WhatsApp
```sql
-- Same booking creation, just triggered by WhatsApp
INSERT INTO bookings (trip_id, user_id, booking_type, ...)
VALUES (?, ?, 'passenger', ...);
```

### 3. Send Notifications
```sql
-- Queue WhatsApp notification
INSERT INTO whatsapp_notifications 
(user_id, notification_type, whatsapp_number, scheduled_for, ...)
VALUES (?, 'booking_confirmation', '+27123456789', NOW(), ...);
```

---

## What You DON'T Need to Change

✅ **Keep existing tables as-is:**
- `users` - Just add WhatsApp fields (optional)
- `bookings` - Works perfectly for WhatsApp bookings
- `trips` - No changes needed
- `vehicles` - No changes needed
- `payments` - No changes needed

**The WhatsApp bot is just another interface to your existing system!**

---

## WhatsApp Bot Implementation Options

### Option 1: WhatsApp Business API (Official)
- **Pros**: Official, reliable, supports templates
- **Cons**: Requires approval, costs money
- **Best for**: Production, large scale

### Option 2: WhatsApp Web API (Unofficial)
- **Pros**: Free, easy to start
- **Cons**: Against ToS, can be banned
- **Best for**: Testing, small scale

### Option 3: Third-party Services
- **Pros**: Easy integration, managed service
- **Cons**: Additional cost, dependency
- **Examples**: Twilio, MessageBird, ChatAPI

---

## Recommended Approach

### Phase 1: Start Simple (No DB Changes)
1. Use existing `phone` field in users table
2. Link WhatsApp number to phone number
3. Basic booking flow via WhatsApp
4. Store conversation state in memory/cache (Redis)

### Phase 2: Add Database Support (Optional)
1. Add WhatsApp fields to users table
2. Add message logging table
3. Add conversation state table
4. Better tracking and analytics

### Phase 3: Advanced Features
1. Template management
2. Notification queue
3. Scheduled messages
4. Analytics and reporting

---

## Example: Simple WhatsApp Bot Flow

```
User: "Hi"
Bot: "Hello! I can help you book a trip. What's your phone number?"
User: "+27123456789"
Bot: [Checks users table by phone]
     "Welcome John! Would you like to:
      1. Book a trip
      2. Check my bookings
      3. Cancel a booking"
User: "1"
Bot: "Which route?
      1. Johannesburg → Cape Town
      2. Johannesburg → Durban"
User: "1"
Bot: "How many passengers?"
User: "2"
Bot: [Creates booking in bookings table]
     "Booking confirmed! Your trip is scheduled for..."
```

---

## Security Considerations

1. **Verify WhatsApp numbers** before linking to accounts
2. **Rate limiting** to prevent spam
3. **Session timeout** for conversations
4. **Encrypt sensitive data** in conversation context
5. **Validate all inputs** before database operations

---

## Summary

### Do You Need Database Changes?

**Short answer: NO, but it helps!**

- ✅ **Can start without changes**: Use existing phone field
- ✅ **Recommended additions**: WhatsApp number field, message logging
- ✅ **Optional enhancements**: Conversation state, templates, notifications

### Key Points:

1. **Your existing database works** - WhatsApp bot is just another interface
2. **Minimal changes needed** - Add WhatsApp-specific metadata
3. **Same booking flow** - WhatsApp bot creates same bookings
4. **Optional features** - Add as needed for better UX

The WhatsApp bot will use your existing `bookings`, `trips`, `users` tables - it's just a different way for users to interact with your system!

