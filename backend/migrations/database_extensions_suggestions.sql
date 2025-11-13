-- ============================================
-- DATABASE EXTENSIONS FOR DRIVER/OWNER/BOOKING SYSTEM
-- ============================================
-- This file contains suggested database extensions for a complete
-- taxi/transport booking system with drivers, owners, and bookings
-- ============================================
--
-- QUICK REFERENCE: USER ARCHITECTURE
-- ============================================
-- 
-- ✅ SINGLE USERS TABLE (users) stores ALL user types:
--    - Clients (user_type='client')
--    - Drivers (user_type='driver') 
--    - Owners (user_type='owner')
--    - Admins (user_type='admin')
--
-- ✅ PROFILE TABLES extend users (NOT separate user tables):
--    - driver_profiles.user_id → users.id (one-to-one)
--    - owner_profiles.user_id → users.id (one-to-one)
--    - Clients & Admins: No profile table needed
--
-- ✅ ALL other tables reference users.id:
--    - vehicles.owner_id → users.id
--    - vehicles.driver_id → users.id
--    - bookings.user_id → users.id
--    - bookings.owner_id → users.id
--
-- VISUAL STRUCTURE:
-- ============================================
--
-- users (ALL users here)
-- │
-- ├─→ driver_profiles (if user_type='driver')
-- │   └─→ driver_documents
-- │
-- ├─→ owner_profiles (if user_type='owner')
-- │
-- ├─→ vehicles (if user_type='owner') → owner_id
-- │   └─→ vehicles (if assigned) → driver_id
-- │       └─→ bookings → user_id (client), owner_id, vehicle_id
-- │           ├─→ passenger_profiles / booking_passengers
-- │           ├─→ booking_parcels
-- │           └─→ payments → payer_profiles
-- │
-- └─→ existing_routes (pre-approved routes served by vehicles)
--
-- ============================================

-- ============================================
-- 1. EXISTING (REGISTERED) ROUTES
-- ============================================
CREATE TABLE IF NOT EXISTS existing_routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM("long-distance", "local") DEFAULT "long-distance",
    route_name VARCHAR(255) NOT NULL,
    origin VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NULL,
    distance_km DECIMAL(6,2) NULL,
    typical_duration_minutes INT NULL,
    base_fare DECIMAL(10,2) NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_route (origin, destination)
);

-- ============================================
-- 2. VEHICLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    driver_id INT NULL, -- NULL if no driver assigned
    existing_route_id INT NULL,
    registration_number VARCHAR(20) NOT NULL UNIQUE,
    license_plate VARCHAR(20) NOT NULL,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    color VARCHAR(30),
    capacity INT NOT NULL DEFAULT 15 CHECK (capacity >= 10 AND capacity <= 22), -- Passenger capacity (10-22 seats: minibus min to van max)
    vehicle_type ENUM('minibus', 'van') NOT NULL,
    vehicle_status ENUM('active', 'maintenance', 'inactive', 'suspended') DEFAULT 'active',
    route_types JSON, -- Array of route types: ['local'], ['long-distance'], ['custom'], ['local', 'custom'], ['long-distance', 'custom']
    -- Note: Cannot have both 'local' and 'long-distance' in the same array
    -- If vehicle has ['local', 'custom'], permit document uses 'local'
    -- If vehicle has ['long-distance', 'custom'], permit document uses 'long-distance'
    description TEXT, -- Vehicle description/details
    images JSON, -- Array of vehicle image URLs
    videos JSON, -- Array of vehicle video URLs
    features JSON, -- AC, WiFi, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (existing_route_id) REFERENCES existing_routes(id) ON DELETE SET NULL,
    INDEX idx_owner (owner_id),
    INDEX idx_driver (driver_id),
    INDEX idx_status (vehicle_status),
    INDEX idx_registration (registration_number),
    INDEX idx_license_plate (license_plate),
    INDEX idx_existing_route (existing_route_id)
);

-- ============================================
-- 2B. VEHICLE DOCUMENTS (Roadworthy, Permit, Route Selection)
-- ============================================
 -- Note: Documents are stored as images (JPG, PNG, etc.)
-- Multiple images can be stored for each document type (e.g., front/back of roadworthy)
CREATE TABLE IF NOT EXISTS vehicle_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT NOT NULL,
    document_type ENUM('roadworthy', 'permit', 'temporary_permit',  'registration', 'other') NOT NULL,
    reference_number VARCHAR(100) NULL, -- Official reference number from the document (e.g., roadworthy certificate number, permit number)
    image_url VARCHAR(500) NOT NULL, -- URL to document image (JPG, PNG, etc.)
    image_order INT DEFAULT 1, -- Order for multiple images of same document (1, 2, 3...)
    expiry_date DATE,
    issue_date DATE,
    issuing_authority VARCHAR(255), -- e.g., "Department of Transport", "Local Municipality"
    -- Permit-specific fields (only used when document_type is 'permit' or 'temporary_permit')
    route_type ENUM('long-distance', 'local') NULL, -- Route type for permits (only 'local' or 'long-distance', no 'custom')
    -- For local routes: route contains single location name (e.g., "Johannesburg", "Pretoria", "Kempton Park")
    -- For long-distance routes: route_origin and route_destination contain the two locations
    route VARCHAR(255) NULL, -- Local route: single location name (e.g., "Johannesburg")
    route_origin VARCHAR(255) NULL, -- Long-distance route: origin location (e.g., "Tzaneen")
    route_destination VARCHAR(255) NULL, -- Long-distance route: destination location (e.g., "Johannesburg")
    -- Note: For local routes, use 'route' field. For long-distance routes, use 'route_origin' and 'route_destination'
    status ENUM('pending', 'verified', 'rejected', 'expired', 'expiring_soon') DEFAULT 'pending',
    verified_by INT NULL, -- Admin who verified
    verified_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_vehicle (vehicle_id),
    INDEX idx_type (document_type),
    INDEX idx_status (status),
    INDEX idx_expiry (expiry_date),
    INDEX idx_vehicle_type (vehicle_id, document_type), -- For finding all images of a specific document type
    INDEX idx_route_type (route_type), -- For filtering permits by route type
    INDEX idx_route_origin (route_origin), -- For querying long-distance routes by origin
    INDEX idx_route_destination (route_destination), -- For querying long-distance routes by destination
    INDEX idx_route_local (route), -- For querying local routes
    INDEX idx_reference_number_vehicle (reference_number) -- For reference lookups
);

-- ============================================
-- 4. OWNER PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS owner_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    business_name VARCHAR(255),
    business_registration_number VARCHAR(50),
    tax_number VARCHAR(50),
    business_type ENUM('individual', 'company') DEFAULT 'individual',
    total_vehicles INT DEFAULT 0,
    total_drivers INT DEFAULT 0,
    status ENUM('active', 'pending', 'suspended', 'inactive') DEFAULT 'pending',
    verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    verification_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,   
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_verification (verification_status)
);

-- ============================================
-- 5. BOOKINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (  
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_reference VARCHAR(20) UNIQUE,
    user_id INT NULL, -- Passenger/client who made the booking (nullable for pooled route-based requests)
    owner_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    driver_id INT NULL, -- Optional assigned driver at time of booking
    existing_route_id INT NULL, -- Set when booking_mode = 'route'
    booking_mode ENUM('route', 'custom') NOT NULL DEFAULT 'route',
    booking_status ENUM('pending', 'confirmed', 'paid', 'cancelled', 'completed', 'refunded') DEFAULT 'pending',
    passenger_count INT DEFAULT 1,
    payment_transaction_id VARCHAR(255),
    total_amount_needed DECIMAL(10,2) NOT NULL,
    total_amount_paid DECIMAL(10,2) NOT NULL,
    scheduled_pickup DATETIME NOT NULL,
    route_points JSON, -- Array of route points
    special_instructions TEXT,
    cancellation_reason TEXT,
    cancelled_by INT NULL, -- User who cancelled
    cancelled_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
    FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (existing_route_id) REFERENCES existing_routes(id) ON DELETE SET NULL,
    FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (payment_transaction_id) REFERENCES payments(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_owner_booking (owner_id),
    INDEX idx_vehicle_booking (vehicle_id),
    INDEX idx_driver_booking (driver_id),
    INDEX idx_existing_route_booking (existing_route_id),
    INDEX idx_mode (booking_mode),
    INDEX idx_status (booking_status),
    INDEX idx_payment_status (payment_status),
    INDEX idx_pickup (scheduled_pickup)
);

-- booking_mode usage:
--   'route'  : booking attaches to a pre-defined route (existing_route_id must be populated)
--   'custom' : booking uses free-text pickup/dropoff captured on the booking record

-- ============================================
-- 6. PASSENGER PROFILES (Guest/non-registered passengers)
-- ============================================
CREATE TABLE IF NOT EXISTS passenger_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    id_number VARCHAR(20),
    first_seen_booking_id INT NULL,
    last_seen_booking_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (first_seen_booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
    FOREIGN KEY (last_seen_booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_first_seen (first_seen_booking_id),
    INDEX idx_last_seen (last_seen_booking_id)
);

-- ============================================
-- 7. PAYER PROFILES (External payment contributors)
-- ============================================
CREATE TABLE IF NOT EXISTS payer_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    linked_user_id INT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(30),
    metadata JSON,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (linked_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_linked_user (linked_user_id)
);

-- ============================================
-- 8. BOOKING PASSENGERS (Passengers in a booking)
-- ============================================
CREATE TABLE IF NOT EXISTS booking_passengers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    passenger_number INT NOT NULL, -- 1, 2, 3, etc.
    passenger_type ENUM('registered', 'guest') DEFAULT 'guest',
    linked_user_id INT NULL, -- Reference to existing signed-up user
    passenger_profile_id INT NULL, -- Reference to stored guest profile
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    id_number VARCHAR(20),
    code VARCHAR(7) NOT NULL,
    pickup_point POINT, -- Coordinates or structured data for preferred pickup stop
    dropoff_point POINT, -- Coordinates or structured data for preferred drop-off stop
    booking_passenger_status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
    booking_passenger_cancelled_at DATETIME NULL,
    cancellation_reason TEXT,
    is_primary BOOLEAN DEFAULT FALSE, -- Primary contact
    next_of_kin_first_name VARCHAR(100) NOT NULL,
    next_of_kin_last_name VARCHAR(100) NOT NULL,
    next_of_kin_phone VARCHAR(20) NOT NULL,
    joined_via_link BOOLEAN DEFAULT FALSE, -- Joined through shared booking link
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (linked_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (passenger_profile_id) REFERENCES passenger_profiles(id) ON DELETE SET NULL,
    INDEX idx_booking (booking_id),
    INDEX idx_primary (is_primary),
    INDEX idx_linked_user (linked_user_id),
    INDEX idx_passenger_profile (passenger_profile_id),
    INDEX idx_passenger_type (passenger_type)
);

-- passenger_type usage:
--   'registered' passengers belong to existing platform users (linked_user_id populated, passenger_profile_id NULL)
--   'guest' passengers use reusable passenger_profiles records (passenger_profile_id populated, linked_user_id NULL)

-- ============================================
-- 9. BOOKING PARCELS
-- ============================================
CREATE TABLE IF NOT EXISTS booking_parcels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    parcel_number INT NOT NULL,
    size ENUM('small', 'medium', 'large') NOT NULL,
    weight DECIMAL(5,2), -- in kg
    description TEXT,
    sender_name VARCHAR(100) NOT NULL,
    sender_phone VARCHAR(20) NOT NULL,
    receiver_name VARCHAR(100) NOT NULL,
    receiver_phone VARCHAR(20) NOT NULL,
    secret_code VARCHAR(10) NOT NULL, -- For parcel pickup verification
    receiver_code VARCHAR(10) NOT NULL,
    images JSON, -- Array of parcel image URLs
    delivery_window ENUM('tuesday', 'friday') NULL,
    status ENUM('pending', 'in_transit', 'delivered', 'failed') DEFAULT 'pending',
    delivered_at DATETIME NULL,
    delivered_to VARCHAR(100) NULL, -- Who received it
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    INDEX idx_booking (booking_id),
    INDEX idx_status (status),
    INDEX idx_secret_code (secret_code)
);

-- ============================================
-- 10. PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    user_id INT NULL, -- Registered account paying (nullable for guest contributions)
    payer_profile_id INT NULL, -- Guest/external payer profile reference
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ZAR',
    payment_method ENUM('EFT') NOT NULL DEFAULT 'EFT', -- Currently only Ozow EFT payments supported (extend enum when adding methods)
    payer_type ENUM('registered', 'guest') NOT NULL DEFAULT 'registered',
    payment_status ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled') DEFAULT 'pending',
    transaction_id VARCHAR(255) UNIQUE,
    payment_gateway VARCHAR(50), -- 'payfast', 'paystack', etc.
    gateway_response JSON, -- Store gateway response
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    refund_reason TEXT,
    refunded_at DATETIME NULL,  
    processed_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,    
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (payer_profile_id) REFERENCES payer_profiles(id) ON DELETE SET NULL,
    INDEX idx_booking (booking_id),
    INDEX idx_user (user_id),
    INDEX idx_payer_profile (payer_profile_id),
    INDEX idx_payer_type (payer_type),
    INDEX idx_status (payment_status),
    INDEX idx_transaction (transaction_id),
    INDEX idx_created (created_at)
);

-- ============================================
-- 11. RATINGS & REVIEWS (Booking-level)
-- ============================================
CREATE TABLE IF NOT EXISTS booking_ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    rated_by INT NOT NULL, -- User who gave the rating
    rated_type ENUM('driver', 'vehicle', 'owner', 'booking') NOT NULL,
    rated_user_id INT NULL, -- Driver/Owner being rated
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_visible BOOLEAN DEFAULT TRUE,
    admin_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (rated_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (rated_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_booking_rating (booking_id),
    INDEX idx_rated_user (rated_user_id),
    INDEX idx_rated_by (rated_by),
    INDEX idx_type (rated_type)
);

-- ============================================
-- 12. NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('booking', 'payment', 'rating', 'system', 'driver', 'owner') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_id INT NULL, -- ID of related booking/payment/event
    related_type VARCHAR(50) NULL, -- 'booking', 'payment', etc.
    is_read BOOLEAN DEFAULT FALSE,
    read_at DATETIME NULL,
    action_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_read (is_read),
    INDEX idx_type (type),
    INDEX idx_created (created_at)
);

-- ============================================
-- 13. DRIVER ASSIGNMENTS (Historical tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS driver_vehicle_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    driver_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    assigned_by INT NOT NULL, -- Owner/admin who assigned
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unassigned_at DATETIME NULL,
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
    notes TEXT,
    FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_driver (driver_id),
    INDEX idx_vehicle (vehicle_id),
    INDEX idx_status (status)
);

-- ============================================
-- 14. BOOKING ROUTE POINTS (Pickup/Dropoff/Stops)
-- ============================================
CREATE TABLE IF NOT EXISTS booking_route_points (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    point_type ENUM('pickup', 'dropoff', 'stop') NOT NULL,
    point_name VARCHAR(255) NOT NULL,
    coordinates POINT,
    address TEXT,
    order_index INT NOT NULL, -- Order in sequence
    expected_time DATETIME,
    actual_time DATETIME NULL,
    status ENUM('pending', 'completed', 'skipped') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    INDEX idx_booking_point (booking_id),
    INDEX idx_type (point_type),
    INDEX idx_order (order_index),
    SPATIAL INDEX idx_coordinates (coordinates)
);

-- ============================================
-- 15. REVENUE & COMMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS revenue_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    owner_id INT NOT NULL,
    driver_id INT NOT NULL,
    gross_amount DECIMAL(10,2) NOT NULL,
    platform_commission DECIMAL(10,2) DEFAULT 0.00,
    owner_amount DECIMAL(10,2) NOT NULL,
    driver_amount DECIMAL(10,2) DEFAULT 0.00,
    commission_rate DECIMAL(5,2) DEFAULT 0.00, -- Platform commission percentage
    transaction_type ENUM('booking_payment', 'commission_payout', 'refund') DEFAULT 'booking_payment',
    status ENUM('pending', 'processed', 'failed') DEFAULT 'pending',
    processed_at DATETIME NULL,
    payout_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_owner (owner_id),
    INDEX idx_driver (driver_id),
    INDEX idx_booking (booking_id),
    INDEX idx_status (status),
    INDEX idx_payout (payout_date)
);

-- ============================================
-- 16. MAINTENANCE & SERVICE RECORDS
-- ============================================
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT NOT NULL,
    maintenance_type ENUM('service', 'repair', 'inspection', 'other') NOT NULL,
    description TEXT NOT NULL,
    service_provider VARCHAR(255),
    cost DECIMAL(10,2),
    mileage INT,
    service_date DATE NOT NULL,
    next_service_date DATE,
    documents JSON, -- Service receipts, invoices
    performed_by INT NULL, -- User who recorded this
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_vehicle (vehicle_id),
    INDEX idx_date (service_date),
    INDEX idx_type (maintenance_type)
);

-- ============================================
-- 17. CANCELLATION POLICIES & PENALTIES
-- ============================================
CREATE TABLE IF NOT EXISTS cancellations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    cancelled_by INT NOT NULL,
    cancellation_type ENUM('passenger', 'driver', 'owner', 'system') NOT NULL,
    reason TEXT,
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    penalty_amount DECIMAL(10,2) DEFAULT 0.00,
    cancellation_policy_applied VARCHAR(50), -- 'full_refund', 'partial_refund', 'no_refund'
    cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
    FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_booking (booking_id),
    INDEX idx_cancelled_by (cancelled_by),
    INDEX idx_type (cancellation_type)
);

-- ============================================
-- 18. ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================
-- These indexes will help with common queries

-- Composite index for user bookings
CREATE INDEX idx_bookings_user_status ON bookings(user_id, booking_status, created_at);

-- Composite index for owner revenue
CREATE INDEX idx_revenue_owner_date ON revenue_transactions(owner_id, status, created_at);

-- ============================================
-- SUMMARY: ALL TABLES IN THIS MIGRATION
-- ============================================
-- 
-- CORE USER TABLES (Profile Extensions):
--   1. driver_profiles - Extra info for users with user_type='driver'
--   2. owner_profiles - Extra info for users with user_type='owner'
--   3. driver_documents - Documents uploaded by drivers
--
-- VEHICLE & FLEET MANAGEMENT:
--   4. existing_routes - Pre-approved long-distance routes and fares
--   5. vehicles - Vehicle inventory (optionally linked to a route)
--   6. vehicle_documents - Roadworthy / permits / etc.
--   7. vehicle_maintenance - Maintenance & service history
--   8. driver_vehicle_assignments - Historical driver→vehicle assignments
--
-- BOOKINGS & PAYMENTS:
--   9. bookings - Passenger/parcel reservations
--   10. passenger_profiles - Reusable guest passenger profiles
--   11. payer_profiles - Guest/external payment contributor profiles
--   12. booking_passengers - Per-booking passenger roster
--   13. booking_parcels - Parcel details per booking
--   14. booking_route_points - Pickup/dropoff/stop points captured per booking
--   15. payments - Payment transactions
--   16. revenue_transactions - Commission & payout calculations
--   17. cancellations - Cancellation policies & penalties
--
-- FEEDBACK & NOTIFICATIONS:
--   18. booking_ratings - Booking-level ratings & reviews
--   19. notifications - User alerts (booking/payment/system)
--   20. activity_logs - System-wide auditing
--
-- ============================================
-- EXAMPLE QUERIES: HOW TABLES CONNECT
-- ============================================

-- Example 1: Get a driver with their profile
-- SELECT u.*, dp.license_number, dp.driver_rating 
-- FROM users u
-- LEFT JOIN driver_profiles dp ON u.id = dp.user_id
-- WHERE u.id = ? AND u.user_type = 'driver';

-- Example 2: Get an owner with their vehicles
-- SELECT u.*, op.business_name, v.id as vehicle_id, v.registration_number
-- FROM users u
-- LEFT JOIN owner_profiles op ON u.id = op.user_id
-- LEFT JOIN vehicles v ON u.id = v.owner_id
-- WHERE u.id = ? AND u.user_type = 'owner';

-- Example 3: Get a booking with passenger and payment info
-- SELECT 
--     b.*,
--     bp.first_name, bp.last_name, bp.next_of_kin_phone,
--     p.amount, p.payment_status, p.transaction_id
-- FROM bookings b
-- LEFT JOIN booking_passengers bp ON b.id = bp.booking_id AND bp.is_primary = TRUE
-- LEFT JOIN payments p ON b.id = p.booking_id
-- WHERE b.id = ?;

-- Example 4: Get vehicle permit documents with route information
-- SELECT 
--     vd.*,
--     CASE 
--         WHEN vd.route_type = 'local' THEN vd.route
--         WHEN vd.route_type = 'long-distance' THEN CONCAT(vd.route_origin, ' and ', vd.route_destination)
--         ELSE NULL
--     END as route_display
-- FROM vehicle_documents vd
-- WHERE vd.document_type IN ('permit', 'temporary_permit')
--   AND vd.vehicle_id = ?;

-- Example 5: Find vehicles by route type (local)
-- SELECT v.*, vd.route as local_route
-- FROM vehicles v
-- JOIN vehicle_documents vd ON v.id = vd.vehicle_id
-- WHERE vd.document_type = 'permit'
--   AND vd.route_type = 'local'
--   AND vd.route = 'Johannesburg'
--   AND vd.status = 'verified';

-- Example 6: Find vehicles by route type (long-distance)
-- SELECT v.*, vd.route_origin, vd.route_destination
-- FROM vehicles v
-- JOIN vehicle_documents vd ON v.id = vd.vehicle_id
-- WHERE vd.document_type = 'permit'
--   AND vd.route_type = 'long-distance'
--   AND ((vd.route_origin = 'Tzaneen' AND vd.route_destination = 'Johannesburg')
--        OR (vd.route_origin = 'Johannesburg' AND vd.route_destination = 'Tzaneen'))
--   AND vd.status = 'verified';

-- Example 7: Get vehicles with route_types JSON
-- SELECT 
--     v.*,
--     JSON_EXTRACT(v.route_types, '$') as route_types_array,
--     JSON_CONTAINS(v.route_types, '"local"') as has_local,
--     JSON_CONTAINS(v.route_types, '"long-distance"') as has_long_distance,
--     JSON_CONTAINS(v.route_types, '"custom"') as has_custom
-- FROM vehicles v
-- WHERE JSON_CONTAINS(v.route_types, '"local"')
--    OR JSON_CONTAINS(v.route_types, '"long-distance"');

-- Example 8: Verify driver document reference numbers match profile data
-- SELECT 
--     dp.id_number as profile_id,
--     dp.license_number as profile_license,
--     dd.document_type,
--     dd.reference_number as document_reference,
--     CASE 
--         WHEN dd.document_type = 'license' AND dd.reference_number = dp.license_number THEN 'MATCH'
--         WHEN dd.document_type = 'id_copy' AND dd.reference_number = dp.id_number THEN 'MATCH'
--         WHEN dd.document_type = 'license' AND dd.reference_number != dp.license_number THEN 'MISMATCH'
--         WHEN dd.document_type = 'id_copy' AND dd.reference_number != dp.id_number THEN 'MISMATCH'
--         ELSE 'N/A'
--     END as verification_status
-- FROM driver_documents dd
-- JOIN driver_profiles dp ON dd.driver_id = dp.user_id
-- WHERE dd.document_type IN ('license', 'id_copy')
--   AND dd.reference_number IS NOT NULL;

-- ============================================
-- ROUTE TYPE LOGIC EXPLANATION:
-- ============================================
-- VEHICLES TABLE (route_types JSON):
--   - A vehicle can have: ['local'], ['long-distance'], ['custom'], ['local', 'custom'], or ['long-distance', 'custom']
--   - A vehicle CANNOT have both 'local' and 'long-distance' in the same array
--   - If vehicle has ['local', 'custom'], the permit document should use route_type = 'local'
--   - If vehicle has ['long-distance', 'custom'], the permit document should use route_type = 'long-distance'
--
-- VEHICLE_DOCUMENTS TABLE (for permits):
--   - route_type can only be 'local' or 'long-distance' (no 'custom')
--   - For LOCAL routes:
--     * Use 'route' field to store single location name (e.g., "Johannesburg", "Pretoria", "Kempton Park")
--     * Leave 'route_origin' and 'route_destination' as NULL
--   - For LONG-DISTANCE routes:
--     * Use 'route_origin' and 'route_destination' to store the two locations (e.g., "Tzaneen" and "Johannesburg")
--     * Leave 'route' as NULL
--   - This structure allows easy querying of both origin and destination separately
--
-- QUERYING EXAMPLES:
--   - Find all vehicles with local permits in Johannesburg:
--     SELECT * FROM vehicle_documents WHERE route_type = 'local' AND route = 'Johannesburg';
--   - Find all vehicles with long-distance permits from Tzaneen to Johannesburg:
--     SELECT * FROM vehicle_documents 
--     WHERE route_type = 'long-distance' 
--       AND route_origin = 'Tzaneen' 
--       AND route_destination = 'Johannesburg';
--   - Find vehicles that can operate both local and custom routes:
--     SELECT * FROM vehicles WHERE JSON_CONTAINS(route_types, '["local", "custom"]');

-- ============================================
-- USAGE NOTES:
-- ============================================
-- 1. Run these migrations in order if you're creating from scratch
-- 2. If tables already exist, modify CREATE TABLE to ALTER TABLE
-- 3. Consider adding soft deletes (deleted_at) for important tables
-- 4. Add more indexes based on your query patterns
-- 5. When inserting route_types JSON, use: JSON_ARRAY('local', 'custom') or JSON_ARRAY('long-distance')
-- 6. Consider partitioning large tables (bookings) by date
-- 7. Add audit logs for sensitive operations (payments, cancellations)
-- 8. Consider adding a backups table for booking data archival
--
-- REMEMBER:
-- - All users (client, driver, owner, admin) are in the users table
-- - Profile tables (driver_profiles, owner_profiles) extend users, not replace them
-- - Every foreign key to users references users.id, not a separate user type table
-- - Clients and Admins don't need profile tables - they only use the users table
--
-- ============================================

