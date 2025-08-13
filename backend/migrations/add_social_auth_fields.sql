-- Add social authentication fields to users table
ALTER TABLE users 
ADD COLUMN social_id VARCHAR(255) NULL,
ADD COLUMN social_provider VARCHAR(50) NULL,
ADD COLUMN profile_picture TEXT NULL,
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add indexes for better performance
CREATE INDEX idx_social_id_provider ON users(social_id, social_provider);
CREATE INDEX idx_email ON users(email);

-- Add unique constraint for social authentication
ALTER TABLE users 
ADD CONSTRAINT unique_social_user UNIQUE (social_id, social_provider);

-- Update existing users to have default user_type if not set
UPDATE users SET user_type = 'client' WHERE user_type IS NULL; 