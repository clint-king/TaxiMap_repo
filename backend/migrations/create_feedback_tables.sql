-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    feedback_type ENUM('improvement', 'complaint', 'general') NOT NULL DEFAULT 'general',
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    images JSON,
    status ENUM('pending', 'reviewed', 'resolved') DEFAULT 'pending',
    admin_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create FAQs table
CREATE TABLE IF NOT EXISTS faqs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category ENUM('general', 'routes', 'account', 'technical', 'payment') NOT NULL DEFAULT 'general',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create user_questions table
CREATE TABLE IF NOT EXISTS user_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    question TEXT NOT NULL,
    email VARCHAR(255) NOT NULL,
    status ENUM('pending', 'answered', 'closed') DEFAULT 'pending',
    admin_answer TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert some sample FAQs
INSERT INTO faqs (question, answer, category) VALUES
('How do I find a route?', 'Click on the "Find route" button and enter your starting location and destination. The system will show you available taxi routes.', 'routes'),
('Can I suggest a new route?', 'Yes! Click on "Suggest route" to add a new taxi route that others can use.', 'routes'),
('How do I create an account?', 'Click on "Sign Up" and fill in your details. You\'ll need to verify your email address.', 'account'),
('I forgot my password. What should I do?', 'Click on "Forgot Password" on the login page and follow the instructions to reset your password.', 'account'),
('Are the routes accurate?', 'We strive to provide accurate routes, but please verify with local taxi drivers as routes may change.', 'routes'),
('Is this service free?', 'Yes, our route finding service is completely free to use.', 'general'),
('How do I report an issue?', 'Use the feedback button to report any issues or suggest improvements.', 'technical'),
('Can I use this on mobile?', 'Yes! Our website is fully responsive and works great on mobile devices.', 'technical'),
('Do you store my personal information?', 'We only store information necessary for your account and route preferences. See our privacy policy for details.', 'account'),
('How often are routes updated?', 'Routes are updated regularly based on user suggestions and verified information.', 'routes');
