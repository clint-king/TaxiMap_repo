-- Add email verification fields to users table
ALTER TABLE users 
ADD COLUMN verification_token VARCHAR(255) NULL,
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN verification_token_expires TIMESTAMP NULL;

-- Add index for verification token
CREATE INDEX idx_verification_token ON users(verification_token);

-- Update existing users to have verified email (for backward compatibility)
UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL;

-- Add unique constraint for verification token
ALTER TABLE users 
ADD CONSTRAINT unique_verification_token UNIQUE (verification_token); 