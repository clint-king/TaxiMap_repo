-- Migration: Update payments table for Yoco payment gateway support
-- Date: 2025-01-XX
-- Description: Updates payment_method ENUM to only include 'card' (Yoco processes card payments) and ensures payment_gateway and gateway_response fields are properly used

-- Step 1: Modify payment_method ENUM to only include 'card' for Yoco card payments
-- Since Yoco is the only payment gateway and it processes card payments, we only need 'card'
ALTER TABLE payments 
MODIFY COLUMN payment_method ENUM('card') NOT NULL DEFAULT 'card';

-- Note: Since Yoco is the only payment gateway and it processes card payments,
-- we only need 'card' as the payment method. If you add other payment gateways
-- in the future (like EFT, mobile payments, etc.), you can extend this ENUM.

-- Step 2: Change payment_gateway from VARCHAR to ENUM with only 'yoco'
-- Since Yoco is the only payment gateway, we can use ENUM for better data integrity
ALTER TABLE payments 
MODIFY COLUMN payment_gateway ENUM('yoco') NOT NULL DEFAULT 'yoco';

-- Step 3: Ensure gateway_response can store Yoco payment response
-- (Already JSON, so no change needed, but adding comment for clarity)
ALTER TABLE payments 
MODIFY COLUMN gateway_response JSON COMMENT 'Full gateway response including Yoco payment token, ID, and status';

-- Step 4: Add index on payment_gateway for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_gateway ON payments(payment_gateway);

-- Verification query (run after migration):
-- SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'payments' 
-- AND COLUMN_NAME IN ('payment_method', 'payment_gateway', 'gateway_response');

