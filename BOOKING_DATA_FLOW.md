# Booking Data Flow in booking-public.html

This document explains how data is stored and managed as users progress through the booking steps in `booking-public.html`.

## Overview

The booking system uses a combination of:
- **JavaScript variables** (in-memory state)
- **sessionStorage** (temporary data, cleared when browser tab closes)
- **localStorage** (persistent data, survives browser restarts)

---

## Step-by-Step Data Storage

### **STEP 1: Route Selection**

**What happens:**
- User clicks on a route card (e.g., "Tzaneen → Johannesburg")
    
**Data stored:**

1. **JavaScript Variables:**
   ```javascript
   selectedRoute = "booking-123"  // Route ID from the clicked card
   selectedBooking = {              // Full booking object from database
       ID: 123,
       location_1: "Tzaneen",
       location_2: "Johannesburg",
       direction_type: "from_loc1",
       scheduled_pickup: "2025-01-15T10:00:00Z",
       // ... other booking fields
   }
   ```

2. **Global Storage:**
   ```javascript
   window.pendingBookings = [...]  // All pending bookings from API
   ```

**Storage location:** In-memory only (no sessionStorage/localStorage yet)

---

### **STEP 2: Location Selection (Pickup & Dropoff)**

**What happens:**
- User selects pickup and dropoff locations using Google Maps autocomplete
- Locations are displayed on the map with markers

**Data stored:**

1. **JavaScript Variables:**
   ```javascript
   pickupPoints = [
       {
           address: "123 Main St, Tzaneen, 0850",
           lat: -23.8336,
           lng: 30.1403,
           index: 1,
           marker: <Google Maps Marker Object>
       }
   ]
   
   dropoffPoints = [
       {
           address: "456 Oak Ave, Johannesburg, 2000",
           lat: -26.2041,
           lng: 28.0473,
           index: 1,
           marker: <Google Maps Marker Object>
       }
   ]
   ```

**Storage location:** In-memory only (arrays are updated as user selects locations)

**Note:** This data is NOT saved to sessionStorage until Step 3 validation

---

### **STEP 3: Passenger/Parcel Information**

**What happens:**
- User selects booking type (Passenger or Parcel)
- User fills in passenger/parcel details
- User clicks "Continue" button → triggers `validateAndProceed()`

**Data stored when "Continue" is clicked:**

1. **sessionStorage:**
   ```javascript
   // Booking type
   sessionStorage.setItem('bookingType', 'passengers' | 'parcels')
   
   // Passenger data (if booking type is 'passengers')
   sessionStorage.setItem('passengerData', JSON.stringify([
       {
           firstName: "John",
           lastName: "Doe",
           email: "john@example.com",
           phone: "0712345678",
           idNumber: "1234567890123",
           nextOfKin: {
               firstName: "Jane",
               lastName: "Doe",
               phone: "0723456789"
           }
       }
   ]))
   sessionStorage.setItem('passengerCount', "1")
   
   // Parcel data (if booking type is 'parcels')
   sessionStorage.setItem('parcelCount', "2")
   sessionStorage.setItem('parcelData', JSON.stringify({
       "parcel-1": {
           size: "large",
           weight: "25",
           description: "Furniture",
           senderName: "John Doe",
           senderPhone: "0712345678",
           receiverName: "Jane Smith",
           receiverPhone: "0723456789",
           images: ["base64image1", "base64image2"]
       },
       "parcel-2": { ... }
   }))
   
   // Trip date (for passenger bookings)
   sessionStorage.setItem('desiredTripDate', "2025-01-15T10:00:00Z")
   ```

2. **localStorage (for user preferences):**
   ```javascript
   // Primary passenger contact info (for future bookings)
   localStorage.setItem('passengerContactInfo', JSON.stringify({
       firstName: "John",
       lastName: "Doe",
       email: "john@example.com",
       phone: "0712345678"
   }))
   
   // Next of kin (for future bookings)
   localStorage.setItem('passengerNextOfKin', JSON.stringify({
       firstName: "Jane",
       lastName: "Doe",
       phone: "0723456789"
   }))
   ```

**Storage location:** sessionStorage (temporary) + localStorage (persistent for preferences)

---

### **STEP 4: Booking Summary**

**What happens:**
- System displays a summary of all booking details
- User reviews the information
- User clicks "Confirm Booking" → triggers `confirmBooking()`

**Data used:**
- All data from previous steps is read from:
  - JavaScript variables (`selectedRoute`, `pickupPoints`, `dropoffPoints`)
  - sessionStorage (`passengerData`, `parcelData`, `bookingType`, etc.)

**No new storage at this step** - data is just displayed

---

### **STEP 5: Payment**

**What happens:**
- User selects payment method (Card, EFT, Mobile, PayFast)
- User enters payment details
- User clicks "Complete Payment" → triggers `processPaymentInBooking()` → `completePaymentInBooking()`

**Data stored:**

1. **sessionStorage:**
   ```javascript
   sessionStorage.setItem('selectedVehicle', JSON.stringify({
       vehicle_id: 456,
       owner_id: 789,
       capacity: 15,
       // ... other vehicle details
   }))
   ```

**Note:** Payment method is stored in JavaScript variable `selectedPaymentMethodInBooking`

---

### **STEP 6: Payment Completion & Booking Creation**

**What happens:**
- System processes payment
- Creates booking via API (`bookingApi.createBooking()`)
- Adds passengers/parcels via API
- Creates payment record via API
- Stores booking data locally

**Data stored:**

1. **API Calls:**
   - Creates booking in database
   - Adds passengers to booking
   - Adds parcels to booking
   - Creates payment record

2. **localStorage:**
   ```javascript
   // Add to user's booking history
   const booking = {
       id: 123,
       booking_id: 123,
       reference: "BK12345678",
       routeId: "booking-123",
       routeName: "Tzaneen → Johannesburg",
       bookingType: "passengers",
       passengers: 1,
       parcels: 0,
       parcelData: null,
       seatSecretCode: "ABC123",
       pricePerPerson: 450,
       totalAmount: 450,
       pickupPoints: [
           { address: "123 Main St, Tzaneen", lat: -23.8336, lng: 30.1403 }
       ],
       dropoffPoints: [
           { address: "456 Oak Ave, Johannesburg", lat: -26.2041, lng: 28.0473 }
       ],
       tripDate: "2025-01-15T10:00:00Z",
       bookingDate: "2025-01-10T12:00:00Z",
       status: "paid",
       booking_status: "paid",
       paymentMethod: "card",
       paymentDate: "2025-01-10T12:05:00Z"
   }
   
   // Save to userBookings array
   localStorage.setItem('userBookings', JSON.stringify([...existingBookings, booking]))
   
   // Save as completed booking
   localStorage.setItem('completedBooking', JSON.stringify(booking))
   
   // Save active trip data (for passenger bookings only)
   if (bookingType === 'passengers') {
       localStorage.setItem('activeTripData', JSON.stringify({
           routeId: "booking-123",
           routeName: "Tzaneen → Johannesburg",
           passengers: 1,
           seatSecretCode: "ABC123",
           pickupPoints: [...],
           dropoffPoints: [...],
           createdAt: "2025-01-10T12:05:00Z",
           bookingId: 123,
           bookingReference: "BK12345678",
           paymentMethod: "card",
           paymentDate: "2025-01-10T12:05:00Z",
           status: "paid",
           tripTime: "10:00 am"
       }))
   }
   ```

3. **sessionStorage:**
   ```javascript
   sessionStorage.setItem('currentBooking', JSON.stringify(booking))
   ```

**Storage location:** 
- Database (via API)
- localStorage (for local access and backward compatibility)
- sessionStorage (for current session)

---

## Data Flow Summary

```
STEP 1: Route Selection
├─ JavaScript: selectedRoute, selectedBooking
└─ No storage yet

STEP 2: Location Selection
├─ JavaScript: pickupPoints[], dropoffPoints[]
└─ No storage yet

STEP 3: Passenger/Parcel Info
├─ sessionStorage: bookingType, passengerData, parcelData, passengerCount, desiredTripDate
└─ localStorage: passengerContactInfo, passengerNextOfKin (preferences)

STEP 4: Booking Summary
├─ Reads from: JavaScript variables + sessionStorage
└─ No new storage

STEP 5: Payment
├─ sessionStorage: selectedVehicle
└─ JavaScript: selectedPaymentMethodInBooking

STEP 6: Payment Completion
├─ Database: Booking, Passengers, Parcels, Payment records
├─ localStorage: userBookings[], completedBooking, activeTripData
└─ sessionStorage: currentBooking
```

---

## Key Variables Reference

### **JavaScript Variables (In-Memory)**
- `selectedRoute` - Currently selected route ID
- `selectedBooking` - Full booking object from database
- `pickupPoints[]` - Array of pickup location objects
- `dropoffPoints[]` - Array of dropoff location objects
- `passengerCount` - Number of passengers
- `parcelCount` - Number of parcels
- `bookingType` - 'passengers' or 'parcels'
- `currentStep` - Current step number (1-6)
- `desiredTripDate` - Selected trip date/time

### **sessionStorage Keys**
- `bookingType` - Type of booking
- `passengerData` - Array of passenger information
- `passengerCount` - Number of passengers
- `parcelData` - Object containing parcel information
- `parcelCount` - Number of parcels
- `desiredTripDate` - Trip date/time
- `selectedVehicle` - Selected vehicle information
- `currentBooking` - Completed booking object

### **localStorage Keys**
- `passengerContactInfo` - Primary passenger contact (for future bookings)
- `passengerNextOfKin` - Next of kin information (for future bookings)
- `userBookings` - Array of all user's bookings
- `completedBooking` - Most recently completed booking
- `activeTripData` - Active trip information (for passenger bookings)

---

## Important Notes

1. **sessionStorage** is cleared when the browser tab is closed
2. **localStorage** persists across browser sessions
3. **JavaScript variables** are lost on page refresh unless restored from storage
4. **Pickup/Dropoff points** are stored in memory until Step 3 validation
5. **API calls** create permanent records in the database
6. **localStorage** is used for backward compatibility and offline access

---

## Data Validation Points

- **Step 3:** `validateAndProceed()` validates passenger/parcel data before saving
- **Step 5:** Payment validation before processing
- **Step 6:** API validation before creating booking records

