# Database Extensions Guide

## Overview
This document outlines suggested database extensions for your taxi/transport booking system that integrates drivers, owners, and bookings.

## Current System Analysis
Based on your codebase, you currently have:
- ✅ Users table with user_type (client, driver, owner)
- ✅ Routes and taxi rank system
- ✅ Feedback and FAQ system
- ✅ User activity logging
- ✅ Pending contributions system

## Recommended Extensions

### 1. **Core Business Tables** (Priority: HIGH)

#### Vehicles Table
- Track all vehicles owned by owners
- Link vehicles to drivers
- Store vehicle registration, insurance, capacity
- Status tracking (active, maintenance, etc.)

#### Driver Profiles
- License information and verification
- Driver ratings and experience
- Document management (license, ID, PDP)
- Verification workflow

#### Owner Profiles
- Business registration details
- Vehicle and driver counts
- Verification status

### 2. **Booking System Tables** (Priority: HIGH)

#### Trips Table
- Scheduled/active trips
- Links route, vehicle, driver, owner
- Passenger and parcel capacity tracking
- Unique trip links for passenger joining
- Status management

#### Bookings Table
- Individual booking records
- Links to trips
- Payment tracking
- Cancellation handling

#### Booking Passengers
- Store passenger details (including next of kin)
- Track which passengers joined via link
- Support multiple passengers per booking

#### Booking Parcels
- Parcel details (size, sender, receiver)
- Secret codes for pickup
- Delivery status tracking

### 3. **Payment System** (Priority: HIGH)

#### Payments Table
- Payment transaction records
- Multiple payment methods support
- Refund handling
- Gateway integration data

#### Revenue Transactions
- Commission tracking
- Owner and driver payouts
- Financial reporting

### 4. **Rating & Review System** (Priority: MEDIUM)

#### Trip Ratings
- Rate drivers, vehicles, owners
- Review text and responses
- Visibility controls

### 5. **Communication & Notifications** (Priority: MEDIUM)

#### Notifications Table
- User notifications
- Read/unread tracking
- Action links

### 6. **Operational Tables** (Priority: MEDIUM)

#### Trip Locations
- Detailed pickup/dropoff points
- Coordinates and timing
- Status tracking

#### Trip Tracking
- Real-time location updates
- Speed and heading data
- Historical tracking

#### Driver Vehicle Assignments
- Track driver-vehicle relationships
- Historical assignment data

### 7. **Maintenance & Operations** (Priority: LOW)

#### Vehicle Maintenance
- Service records
- Maintenance scheduling
- Cost tracking

#### Cancellations
- Cancellation reasons
- Refund and penalty tracking
- Policy enforcement

## Implementation Priority

### Phase 1: Essential (Do First)
1. Vehicles table
2. Driver profiles
3. Owner profiles
4. Trips table
5. Bookings table
6. Booking passengers
7. Booking parcels
8. Payments table

### Phase 2: Important (Do Next)
1. Revenue transactions
2. Trip locations
3. Notifications
4. Trip ratings

### Phase 3: Enhancement (Do Later)
1. Trip tracking
2. Vehicle maintenance
3. Cancellations
4. Driver assignments

## Migration Strategy

1. **Backup First**: Always backup your database before running migrations
2. **Test Environment**: Test migrations in a development environment first
3. **Incremental**: Apply migrations in phases, not all at once
4. **Data Migration**: Plan how to migrate existing data if any
5. **Rollback Plan**: Have a rollback strategy for each migration

## Key Relationships

```
Users (owner) → Vehicles → Trips → Bookings → Passengers/Parcels
Users (driver) → Driver Profiles → Vehicles → Trips
Users (client) → Bookings → Payments
Trips → Route → TaxiRank
```

## Important Considerations

### 1. **Data Integrity**
- Use foreign keys with appropriate ON DELETE actions
- Add CHECK constraints for data validation
- Use ENUMs for status fields

### 2. **Performance**
- Add indexes on frequently queried columns
- Consider composite indexes for common query patterns
- Partition large tables by date if needed

### 3. **Scalability**
- Consider archiving old trips/bookings
- Use JSON columns for flexible data (images, features)
- Plan for table partitioning if data grows large

### 4. **Security**
- Never store sensitive data unencrypted
- Use prepared statements (already doing this)
- Consider encryption for payment data

### 5. **Auditing**
- Track who created/modified records
- Consider adding audit logs for sensitive operations
- Keep historical data for disputes

## Next Steps

1. Review the migration file: `backend/migrations/database_extensions_suggestions.sql`
2. Prioritize tables based on your immediate needs
3. Create models for new tables
4. Update controllers to use new tables
5. Migrate existing data if needed
6. Test thoroughly before deploying to production

## Questions to Consider

1. **Payment Gateway**: Which payment gateway will you use? (PayFast, Paystack, etc.)
2. **Commission Structure**: What's your platform commission rate?
3. **Cancellation Policy**: What are your refund/penalty rules?
4. **Rating System**: When can users rate? (After trip completion only?)
5. **Real-time Tracking**: Do you need real-time GPS tracking?
6. **Document Storage**: Where will you store driver/vehicle documents? (S3, local storage?)

## Additional Recommendations

### 1. **Soft Deletes**
Consider adding `deleted_at` columns to important tables instead of hard deletes.

### 2. **Audit Logs**
Create an audit_logs table to track all changes to sensitive data.

### 3. **Scheduled Jobs**
Plan for background jobs:
- Payment processing
- Trip status updates
- Notification sending
- Revenue calculations

### 4. **Caching Strategy**
Consider caching:
- Active trips
- Vehicle availability
- Driver availability
- Route information

### 5. **API Rate Limiting**
Implement rate limiting for:
- Booking creation
- Payment processing
- Trip joining

## Support

For questions or issues with database extensions, refer to:
- MySQL documentation
- Your database administrator
- The migration files in `backend/migrations/`

