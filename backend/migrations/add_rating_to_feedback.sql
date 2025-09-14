-- Add rating field to feedback table
ALTER TABLE feedback ADD COLUMN rating INT DEFAULT NULL;

-- Add check constraint to ensure rating is between 1 and 5
ALTER TABLE feedback ADD CONSTRAINT chk_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

ALTER TABLE feedback 
MODIFY feedback_type 
ENUM('improvement','bug','feature','general') NOT NULL DEFAULT 'general';