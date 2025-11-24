-- ============================================
-- FIX VEHICLES EXTRASPACE_PARCEL_SP CONSTRAINT
-- ============================================
-- Problem: The vehicles table has two conflicting check constraints:
--   - vehicles_chk_2: extraspace_parcel_sp >= 1 AND extraspace_parcel_sp <= 4 (INCORRECT)
--   - vehicles_chk_3: extraspace_parcel_sp >= 4 AND extraspace_parcel_sp <= 16 (CORRECT)
-- 
-- This causes only value 4 to be valid, but the application needs values 4, 8, 12, or 16.
-- 
-- Solution: Drop the incorrect vehicles_chk_2 constraint, keeping only vehicles_chk_3
-- ============================================

-- Drop the incorrect constraint (vehicles_chk_2: 1-4 range)
ALTER TABLE vehicles DROP CHECK vehicles_chk_2;

-- Verify the remaining constraint is correct
-- vehicles_chk_3 should remain: extraspace_parcel_sp >= 4 AND extraspace_parcel_sp <= 16
-- This allows values: 4, 8, 12, 16 (multiples of 4 within the range)

