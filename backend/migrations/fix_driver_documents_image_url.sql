-- ============================================
-- FIX DRIVER_DOCUMENTS IMAGE_URL COLUMN SIZE
-- ============================================
-- Problem: The image_url column is VARCHAR(500) which is too small for base64-encoded images
-- Base64-encoded images can be 100KB+ which exceeds VARCHAR(500) limit
-- 
-- Solution: Change image_url to TEXT to accommodate base64 data
-- Note: For production, consider using file storage (S3, local filesystem) instead of storing base64 in database
-- ============================================

-- Alter driver_documents table to change image_url from VARCHAR(500) to TEXT
ALTER TABLE driver_documents 
MODIFY COLUMN image_url TEXT NOT NULL;

-- Also update vehicle_documents for consistency (if it has the same issue)
ALTER TABLE vehicle_documents 
MODIFY COLUMN image_url TEXT NOT NULL;

