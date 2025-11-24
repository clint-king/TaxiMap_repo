# Owner-Driver Relationship Update

## Overview
Updated the database schema to establish a **1-to-many relationship** between owners and drivers:
- **One owner** can have **many drivers**
- **One driver** works for **only one owner**

## Changes Made

### 1. Database Schema (`database_extensions_suggestions.sql`)
- Added `owner_id BIGINT NOT NULL` to `driver_profiles` table
- Added foreign key: `FOREIGN KEY (owner_id) REFERENCES users(ID) ON DELETE RESTRICT`
- Added index: `INDEX idx_owner (owner_id)` for efficient owner lookups

### 2. Migration File (`add_owner_id_to_driver_profiles.sql`)
- Step-by-step migration to add `owner_id` column to existing databases
- Includes instructions for updating existing driver records

### 3. Backend Controller Updates (`driverController.js`)

#### `createDriver()` Function
- Now automatically sets `owner_id` from the authenticated owner (`req.user.id`)
- Driver is automatically linked to the owner creating them

#### `getOwnerDrivers()` Function
- Updated to use direct `owner_id` lookup instead of joining through vehicles
- Much simpler and more efficient query
- Returns all drivers belonging to the owner

#### `getAllDrivers()` Function
- Now includes owner information (owner_user_id, owner_name, owner_email)
- Useful for admin views

#### `getDriverProfile()` Function
- Now includes owner information in the response
- Fixed column references to use `ID` (uppercase) consistently

## Database Relationship Structure

```
users (ID, user_type)
│
├─→ owner_profiles (user_id) ──┐
│                                │
├─→ driver_profiles             │
│   ├─→ user_id ────────────────┼─→ users(ID)
│   └─→ owner_id ───────────────┘
│
└─→ vehicles
    ├─→ owner_id ───────────────→ users(ID)
    └─→ driver_id ──────────────→ users(ID)
```

## Important Notes

1. **Existing Drivers**: If you have existing drivers in the database, you must:
   - Run the migration file `add_owner_id_to_driver_profiles.sql`
   - Manually assign owners to existing drivers (see migration file for SQL examples)
   - Then make `owner_id` NOT NULL

2. **Driver Creation**: When an owner creates a driver:
   - The driver is automatically assigned to that owner
   - No need to manually set `owner_id`

3. **Driver Updates**: Drivers cannot change their `owner_id` through the `updateDriverProfile` function
   - Only admins can reassign drivers to different owners (if needed)

4. **Query Benefits**: 
   - Finding all drivers for an owner: `SELECT * FROM driver_profiles WHERE owner_id = ?`
   - Much simpler than joining through vehicles table

## Migration Steps

1. **Backup your database** before running migrations

2. **Run the migration**:
   ```sql
   -- See add_owner_id_to_driver_profiles.sql for full migration
   ```

3. **Update existing drivers**:
   ```sql
   -- Option A: Assign based on current vehicle assignments
   UPDATE driver_profiles dp
   INNER JOIN vehicles v ON v.driver_id = dp.user_id
   SET dp.owner_id = v.owner_id
   WHERE dp.owner_id IS NULL;
   
   -- Option B: Assign to a specific owner (replace ? with owner user ID)
   UPDATE driver_profiles 
   SET owner_id = ? 
   WHERE owner_id IS NULL;
   ```

4. **Make owner_id NOT NULL** (after all drivers have owners):
   ```sql
   ALTER TABLE driver_profiles 
   MODIFY COLUMN owner_id BIGINT NOT NULL;
   ```

## API Changes

### Create Driver (POST `/api/drivers/owner/create`)
- No change in request body
- `owner_id` is automatically set from authenticated owner

### Get Owner Drivers (GET `/api/drivers/owner/my-drivers`)
- Response now includes all drivers for the owner
- More efficient query using direct `owner_id` lookup

### Get All Drivers (GET `/api/drivers/admin/all`) - Admin only
- Response now includes owner information for each driver

### Get Driver Profile (GET `/api/drivers/profile`)
- Response now includes owner information

