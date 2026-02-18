-- Add banking details fields to owner_profiles table
-- Run this migration to add banking information columns

ALTER TABLE owner_profiles
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(50) NULL AFTER tax_number,
ADD COLUMN IF NOT EXISTS account_holder VARCHAR(255) NULL AFTER bank_name,
ADD COLUMN IF NOT EXISTS account_number VARCHAR(50) NULL AFTER account_holder,
ADD COLUMN IF NOT EXISTS branch_code VARCHAR(20) NULL AFTER account_number,
ADD COLUMN IF NOT EXISTS account_type ENUM('cheque', 'savings', 'transmission', 'business') NULL AFTER branch_code,
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255) NULL AFTER account_type;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_owner_banking ON owner_profiles(user_id, bank_name);
