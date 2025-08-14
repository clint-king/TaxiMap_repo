-- Add profile fields to users table
ALTER TABLE users 
ADD COLUMN username VARCHAR(50) NULL,
ADD COLUMN phone VARCHAR(20) NULL,
ADD COLUMN location VARCHAR(255) NULL;

-- Remove bio field if it exists (it's not relevant for this application)
-- Note: This will only work if the bio column exists
-- ALTER TABLE users DROP COLUMN bio;

-- Add indexes for better performance
CREATE INDEX idx_username ON users(username);
CREATE INDEX idx_phone ON users(phone);

-- Add unique constraint for username
ALTER TABLE users 
ADD CONSTRAINT unique_username UNIQUE (username);

-- Update existing users to have default values if needed
UPDATE users SET username = CONCAT('user_', id) WHERE username IS NULL;
