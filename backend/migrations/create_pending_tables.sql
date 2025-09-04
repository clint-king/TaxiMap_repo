-- Create pending tables for user contributions
-- These tables store user-submitted data before admin approval

CREATE TABLE IF NOT EXISTS pendingtaxirank (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location_coord POINT NOT NULL,
    province VARCHAR(100) NOT NULL,
    address TEXT,
    exist BOOLEAN DEFAULT FALSE,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_location (location_coord),
    INDEX idx_province (province),
    INDEX idx_user (user_id)
);

CREATE TABLE IF NOT EXISTS pendingroutes (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    start_rank_id INT NOT NULL,
    end_rank_id INT NOT NULL,
    travelMethod VARCHAR(50) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (start_rank_id) REFERENCES pendingtaxirank(ID) ON DELETE CASCADE,
    FOREIGN KEY (end_rank_id) REFERENCES pendingtaxirank(ID) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_user (user_id)
);

CREATE TABLE IF NOT EXISTS pendingminiroutes (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    pending_route_id INT NOT NULL,
    route_index INT NOT NULL,
    coords POINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pending_route_id) REFERENCES pendingroutes(ID) ON DELETE CASCADE,
    INDEX idx_route (pending_route_id),
    INDEX idx_index (route_index)
);

CREATE TABLE IF NOT EXISTS pendingdirectionroutes (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    pending_route_id INT NOT NULL,
    direction_index INT NOT NULL,
    coords POINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pending_route_id) REFERENCES pendingroutes(ID) ON DELETE CASCADE,
    INDEX idx_route (pending_route_id),
    INDEX idx_index (direction_index)
);

CREATE TABLE IF NOT EXISTS contributors (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    contribution_count INT DEFAULT 0,
    total_approved INT DEFAULT 0,
    total_rejected INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user (user_id)
);
