-- ============================================
-- FIX DRIVER OWNER_ID FOR EXISTING DRIVERS
-- ============================================
-- Purpose: Update existing drivers in driver_profiles to have the correct owner_id
-- 
-- This script helps identify and fix drivers that don't have an owner_id set
-- ============================================

-- Step 1: Check which drivers are missing owner_id
SELECT 
    dp.ID as driver_profile_id,
    dp.user_id,
    u.name as driver_name,
    u.email as driver_email,
    dp.owner_id,
    u_owner.name as owner_name,
    u_owner.email as owner_email
FROM driver_profiles dp
INNER JOIN users u ON dp.user_id = u.ID
LEFT JOIN users u_owner ON dp.owner_id = u_owner.ID
WHERE dp.owner_id IS NULL OR dp.owner_id = 0;

-- Step 2: If you want to assign drivers to owners based on vehicle assignments:
-- (This assigns drivers to the owner of their currently assigned vehicle)
UPDATE driver_profiles dp
INNER JOIN vehicles v ON v.driver_id = dp.user_id
SET dp.owner_id = v.owner_id
WHERE (dp.owner_id IS NULL OR dp.owner_id = 0)
  AND v.owner_id IS NOT NULL;

-- Step 3: If you want to manually assign a specific driver to a specific owner:
-- Replace ? with the actual owner's user ID and driver's user ID
-- UPDATE driver_profiles 
-- SET owner_id = ? -- Owner's user ID
-- WHERE user_id = ?; -- Driver's user ID

-- Step 4: Verify the update
SELECT 
    dp.ID as driver_profile_id,
    dp.user_id,
    u.name as driver_name,
    u.email as driver_email,
    dp.owner_id,
    u_owner.name as owner_name,
    u_owner.email as owner_email
FROM driver_profiles dp
INNER JOIN users u ON dp.user_id = u.ID
LEFT JOIN users u_owner ON dp.owner_id = u_owner.ID
WHERE u.user_type = 'driver';

