-- ============================================
-- ADD OWNER_ID TO DRIVER_PROFILES TABLE
-- ============================================
-- Purpose: Establish 1-to-many relationship (one owner has many drivers)
-- A driver works for ONLY ONE owner
-- 
-- Note: This migration assumes all existing drivers need to be assigned to owners.
-- You may need to manually update existing driver_profiles records with owner_id
-- before making this column NOT NULL.
-- ============================================

-- Step 1: Add owner_id column as nullable first (to allow existing records)
ALTER TABLE driver_profiles 
ADD COLUMN owner_id BIGINT NULL AFTER user_id;

-- Step 2: Add foreign key constraint
ALTER TABLE driver_profiles 
ADD CONSTRAINT fk_driver_profiles_owner 
FOREIGN KEY (owner_id) REFERENCES users(ID) ON DELETE RESTRICT;

-- Step 3: Add index for owner lookups
ALTER TABLE driver_profiles 
ADD INDEX idx_owner (owner_id);

-- Step 4: IMPORTANT - Update existing driver_profiles with owner_id
-- You need to manually assign owners to existing drivers, or:
-- Option A: Assign drivers to owners based on their current vehicle assignments
-- UPDATE driver_profiles dp
-- INNER JOIN vehicles v ON v.driver_id = dp.user_id
-- SET dp.owner_id = v.owner_id
-- WHERE dp.owner_id IS NULL;

-- Option B: Set a default owner (change the ID to an actual owner user ID)
-- UPDATE driver_profiles 
-- SET owner_id = ? -- Replace ? with actual owner user ID
-- WHERE owner_id IS NULL;

-- Step 5: After updating all records, make owner_id NOT NULL
-- ALTER TABLE driver_profiles 
-- MODIFY COLUMN owner_id BIGINT NOT NULL;

