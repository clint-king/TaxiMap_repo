-- Create pending tables for route approval system

-- Pending TaxiRank table
CREATE TABLE IF NOT EXISTS PendingTaxiRank (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location_coord JSON NOT NULL,
    province VARCHAR(100),
    address TEXT,
    exist BOOLEAN DEFAULT FALSE,
    user_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(ID) ON DELETE SET NULL
);

-- Pending Routes table
CREATE TABLE IF NOT EXISTS PendingRoutes (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    start_rank_id INT NOT NULL,
    end_rank_id INT NOT NULL,
    route_type ENUM('straight', 'loop') NOT NULL,
    travel_method VARCHAR(50) NOT NULL,
    user_id BIGINT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (start_rank_id) REFERENCES PendingTaxiRank(ID) ON DELETE CASCADE,
    FOREIGN KEY (end_rank_id) REFERENCES PendingTaxiRank(ID) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(ID) ON DELETE SET NULL
);

-- Pending Mini Routes table
CREATE TABLE IF NOT EXISTS PendingMiniRoutes (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    pending_route_id INT NOT NULL,
    message TEXT,
    coords JSON NOT NULL,
    route_index INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pending_route_id) REFERENCES PendingRoutes(ID) ON DELETE CASCADE
);

-- Pending Direction Routes table
CREATE TABLE IF NOT EXISTS PendingDirectionRoutes (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    pending_route_id INT NOT NULL,
    direction_coords JSON NOT NULL,
    direction_index INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pending_route_id) REFERENCES PendingRoutes(ID) ON DELETE CASCADE
);

-- Contributors table to track dynamic contributors
CREATE TABLE IF NOT EXISTS Contributors (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    name VARCHAR(255) NOT NULL,
    region VARCHAR(255),
    routes_contributed INT DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(ID) ON DELETE SET NULL
);

-- Insert default contributors (5 static ones)
INSERT INTO Contributors (name, region, routes_contributed, status) VALUES
('Thabo Baloyi', 'Johannesburg Routes', 28, 'active'),
('Nomsa Mthembu', 'Durban Routes', 42, 'active'),
('Lungile Ndlovu', 'Cape Town Routes', 35, 'active'),
('Sipho Mbatha', 'Pretoria Routes', 23, 'active'),
('Zanele Khumalo', 'East London Routes', 18, 'active');
