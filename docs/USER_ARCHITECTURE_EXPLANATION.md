# User Architecture Explanation

## Current Structure (Keep This!)

Your current approach is **correct** and follows best practices. Here's how it works:

### Single Users Table (All User Types)

```
users table
├── id (PRIMARY KEY)
├── name
├── email
├── password
├── user_type (ENUM: 'client', 'driver', 'owner', 'admin') ← KEY FIELD
├── username
├── phone
├── location
├── email_verified
└── ... (other common fields)
```

**All users (client, driver, owner, admin) are stored in ONE table: `users`**

The `user_type` field distinguishes between different user roles.

## How the Extension Works

### Profile Tables (Not Separate User Tables!)

Instead of creating separate tables for each user type, we create **profile tables** that extend the users table with additional information:

```
users (BASE TABLE - All user types)
│
├── client (no additional table needed)
│   └── Uses only users table
│
├── driver (has additional profile)
│   ├── users table (base info)
│   └── driver_profiles table (driver-specific info)
│       ├── user_id → FK to users.id
│       ├── license_number
│       ├── license_expiry
│       ├── driver_rating
│       └── ...
│
├── owner (has additional profile)
│   ├── users table (base info)
│   └── owner_profiles table (owner-specific info)
│       ├── user_id → FK to users.id
│       ├── business_name
│       ├── business_registration_number
│       └── ...
│
└── admin (no additional table needed)
    └── Uses only users table
```

## Why This Architecture?

### ✅ Advantages

1. **Single Sign-On**: One account can potentially be multiple types (though we use user_type to restrict)
2. **Common Fields**: All users share email, password, name, etc.
3. **Simple Authentication**: One login system for all user types
4. **Flexible**: Easy to add new user types
5. **Normalized**: No data duplication

### ❌ Why NOT Separate Tables?

Separate tables would create:
- Data duplication (email, password, name in every table)
- Complex authentication (multiple login endpoints)
- Difficult joins (need to check multiple tables)
- Harder to change user type

## Example Queries

### Get a Driver with Profile
```sql
SELECT 
    u.id,
    u.name,
    u.email,
    u.user_type,
    dp.license_number,
    dp.driver_rating,
    dp.status
FROM users u
LEFT JOIN driver_profiles dp ON u.id = dp.user_id
WHERE u.id = ? AND u.user_type = 'driver';
```

### Get an Owner with Profile
```sql
SELECT 
    u.id,
    u.name,
    u.email,
    u.user_type,
    op.business_name,
    op.total_vehicles,
    op.verification_status
FROM users u
LEFT JOIN owner_profiles op ON u.id = op.user_id
WHERE u.id = ? AND u.user_type = 'owner';
```

### Get a Client (No Profile Needed)
```sql
SELECT 
    u.id,
    u.name,
    u.email,
    u.user_type,
    u.phone
FROM users u
WHERE u.id = ? AND u.user_type = 'client';
```

## Database Relationships

```
users (id, user_type, ...)
│
├─→ driver_profiles (user_id) ──┐
│                                │
├─→ owner_profiles (user_id) ───┤
│                                │
├─→ vehicles (owner_id) ─────────┼─→ All reference users.id
│                                │
├─→ vehicles (driver_id) ────────┤
│                                │
├─→ trips (driver_id) ───────────┤
│                                │
├─→ trips (owner_id) ────────────┤
│                                │
└─→ bookings (user_id) ──────────┘
```

## Implementation Examples

### Creating a Driver
```sql
-- Step 1: Create user
INSERT INTO users (name, email, password, user_type, ...)
VALUES ('John Driver', 'john@example.com', 'hashed_pass', 'driver', ...);

-- Step 2: Create driver profile
INSERT INTO driver_profiles (user_id, license_number, license_expiry, ...)
VALUES (LAST_INSERT_ID(), 'DL12345', '2025-12-31', ...);
```

### Creating an Owner
```sql
-- Step 1: Create user
INSERT INTO users (name, email, password, user_type, ...)
VALUES ('Jane Owner', 'jane@example.com', 'hashed_pass', 'owner', ...);

-- Step 2: Create owner profile
INSERT INTO owner_profiles (user_id, business_name, ...)
VALUES (LAST_INSERT_ID(), 'ABC Transport Co', ...);
```

### Creating a Client
```sql
-- Only one step needed!
INSERT INTO users (name, email, password, user_type, ...)
VALUES ('Bob Client', 'bob@example.com', 'hashed_pass', 'client', ...);
```

## User Type Flow

```
User Registers
    ↓
Choose user_type: 'client' | 'driver' | 'owner'
    ↓
Create record in users table
    ↓
If driver → Create driver_profiles record
If owner → Create owner_profiles record
If client → Done! (no profile needed)
```

## Can a User Be Multiple Types?

**Current Design**: No, `user_type` is a single value.

**Future Consideration**: If needed, you could:
- Option 1: Create separate user accounts for each type
- Option 2: Add a `user_roles` junction table (many-to-many)
  ```
  user_roles
  ├── user_id
  ├── role (driver, owner, client)
  └── is_primary (boolean)
  ```

For now, keep it simple with single `user_type`.

## Summary

✅ **Keep**: Single `users` table with `user_type` field  
✅ **Add**: Profile tables (`driver_profiles`, `owner_profiles`) that reference `users.id`  
❌ **Don't**: Create separate `clients`, `drivers`, `owners` tables

This is the **correct** and **standard** approach for role-based user systems!

