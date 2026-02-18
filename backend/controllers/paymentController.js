import pool from "../config/db.js";
import configurations from "../config/configurations.js";
import crypto from "crypto";
import { Webhook } from "svix";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const checkUserType = (user, allowedTypes) => {
  if (!allowedTypes.includes(user.user_type)) {
    throw new Error(
      `Access denied. Required user type: ${allowedTypes.join(" or ")}`
    );
  }
};

// Get user's payments
export const getMyPayments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
            SELECT p.*, b.booking_reference, b.scheduled_pickup
            FROM payments p
            LEFT JOIN bookings b ON p.booking_id = b.id
            WHERE p.user_id = ?
        `;
    const params = [userId];

    if (status) {
      query += ` AND p.payment_status = ?`;
      params.push(status);
    }

    query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [payments] = await pool.execute(query, params);

    res.json({
      success: true,
      payments,
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
      error: error.message,
    });
  }
};

// Get payment details
export const getPaymentDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentId } = req.params;

    const [payments] = await pool.execute(
      `SELECT p.*, b.*, u.name as payer_name
             FROM payments p
             LEFT JOIN bookings b ON p.booking_id = b.id
             LEFT JOIN users u ON p.user_id = u.id
             WHERE p.id = ?`,
      [paymentId]
    );

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const payment = payments[0];

    // Check access
    // Get user's owner profile ID if user is owner
    let userOwnerProfileId = null;
    if (req.user.user_type === "owner" && payment.booking?.owner_id) {
      const [ownerProfiles] = await pool.execute(
        "SELECT ID FROM owner_profiles WHERE user_id = ?",
        [userId]
      );
      if (ownerProfiles.length > 0) {
        userOwnerProfileId = ownerProfiles[0].ID;
      }
    }

    const isOwner =
      userOwnerProfileId !== null &&
      payment.booking?.owner_id === userOwnerProfileId;

    if (
      payment.user_id !== userId &&
      !isOwner &&
      req.user.user_type !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error("Error fetching payment details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment details",
      error: error.message,
    });
  }
};

// Process payment callback
export const processPaymentCallback = async (req, res) => {
  try {
    const { transaction_id, status, gateway_response } = req.body;

    if (!transaction_id || !status) {
      return res.status(400).json({
        success: false,
        message: "transaction_id and status are required",
      });
    }

    // Update payment
    await pool.execute(
      `UPDATE payments 
             SET payment_status = ?, 
                 gateway_response = ?,
                 processed_at = CASE WHEN ? = 'completed' THEN NOW() ELSE processed_at END
             WHERE transaction_id = ?`,
      [status, JSON.stringify(gateway_response || {}), status, transaction_id]
    );

    // If payment completed, update booking and create revenue transaction
    if (status === "completed") {
      const [payments] = await pool.execute(
        "SELECT * FROM payments WHERE transaction_id = ?",
        [transaction_id]
      );

      if (payments.length > 0) {
        const payment = payments[0];
        const [bookings] = await pool.execute(
          "SELECT * FROM bookings WHERE id = ?",
          [payment.booking_id]
        );

        if (bookings.length > 0) {
          const booking = bookings[0];

          // Create revenue transaction
          const commission_rate = 0.1; // 10% platform commission
          const platform_commission = payment.amount * commission_rate;
          const owner_amount = payment.amount - platform_commission;

          await pool.execute(
            `INSERT INTO revenue_transactions (
                            booking_id, owner_id, driver_id, gross_amount,
                            platform_commission, owner_amount, driver_amount,
                            commission_rate, transaction_type, status
                        ) VALUES (?, ?, ?, ?, ?, ?, 0.00, ?, 'booking_payment', 'processed')`,
            [
              booking.id,
              booking.owner_id,
              booking.driver_id || booking.owner_id,
              payment.amount,
              platform_commission,
              owner_amount,
              commission_rate,
            ]
          );
        }
      }
    }

    res.json({
      success: true,
      message: "Payment callback processed",
    });
  } catch (error) {
    console.error("Error processing payment callback:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process payment callback",
      error: error.message,
    });
  }
};

// Get owner's payments
export const getOwnerPayments = async (req, res) => {
  try {
    const userId = req.user.id;
    checkUserType(req.user, ["owner", "admin"]);

    const { limit = 50, offset = 0 } = req.query;

    // Get user's owner profile ID
    const [ownerProfiles] = await pool.execute(
      "SELECT ID FROM owner_profiles WHERE user_id = ?",
      [userId]
    );

    if (ownerProfiles.length === 0) {
      return res.status(403).json({
        success: false,
        message: "User does not have an owner profile",
      });
    }

    const ownerProfileId = ownerProfiles[0].ID;

    const [payments] = await pool.execute(
      `SELECT p.*, b.booking_reference, b.scheduled_pickup
             FROM payments p
             LEFT JOIN bookings b ON p.booking_id = b.id
             WHERE b.owner_id = ?
             ORDER BY p.created_at DESC
             LIMIT ? OFFSET ?`,
      [ownerProfileId, parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      payments,
    });
  } catch (error) {
    console.error("Error fetching owner payments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
      error: error.message,
    });
  }
};

export const getPaymentStatus = async (req, res) => {   
    try {
        const { paymentId, bookingId } = req.body;

        if (!paymentId || !bookingId) {
            return res.status(400).json({
                success: false,
                message: "Payment ID and Booking ID are required"
            });
        }

        //check type of user
        checkUserType(req.user, ['client']);

        //get current userID
        const userId = req.user.id;
        if(!userId){
            return res.status(400).json({
                success: false,
                message: "User ID not found"
            });
        }

        console.log(`[In getPaymentStatus] paymentID=${paymentId}  bookingID=${bookingId}  userID=${userId}`);
        
        const [payments] = await pool.execute(
            `SELECT p.*, b.booking_reference, b.scheduled_pickup
             FROM payments p
             LEFT JOIN bookings b ON p.booking_id = b.ID
             WHERE p.ID = ? AND b.ID = ? AND p.user_id = ? AND b.booking_status IN('pending','fully_paid')`,
            [paymentId, bookingId, userId]
        );

        if (payments.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Payment not found  paymentID=${paymentId}  bookingID=${bookingId}  userID=${userId}`
            });
        }

        const payment = payments[0];
        const status = payment.payment_status;
        const amount = payment.amount;
        const currency = payment.currency;

        res.json({
            success: true,
            status,
            amount,
            currency
        });
    } catch (error) {
        console.error("Error fetching payment status:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch payment status",
            error: error.message
        });
    }
};

// ============================================
// ADMIN ROUTES
// ============================================

// Get all payments
export const getAllPayments = async (req, res) => {
  try {
    checkUserType(req.user, ["admin"]);

    const { status, limit = 100, offset = 0 } = req.query;

    let query = `
            SELECT p.*, b.booking_reference, u.name as payer_name
            FROM payments p
            LEFT JOIN bookings b ON p.booking_id = b.id
            LEFT JOIN users u ON p.user_id = u.id
            WHERE 1=1
        `;
    const params = [];

    if (status) {
      query += ` AND p.payment_status = ?`;
      params.push(status);
    }

    query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [payments] = await pool.execute(query, params);

    res.json({
      success: true,
      payments,
    });
  } catch (error) {
    console.error("Error fetching all payments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
      error: error.message,
    });
  }
};

// Process refund
export const processRefund = async (req, res) => {
  try {
    checkUserType(req.user, ["admin"]);
    const { paymentId } = req.params;
    const { refund_amount, refund_reason } = req.body;

    // Get payment
    const [payments] = await pool.execute(
      "SELECT * FROM payments WHERE id = ?",
      [paymentId]
    );

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const payment = payments[0];

    if (payment.payment_status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Only completed payments can be refunded",
      });
    }

    const refundAmount = refund_amount || payment.amount;

    // Update payment
    await pool.execute(
      `UPDATE payments 
             SET payment_status = 'refunded',
                 refund_amount = ?,
                 refund_reason = ?,
                 refunded_at = NOW()
             WHERE id = ?`,
      [refundAmount, refund_reason || null, paymentId]
    );

    // Update booking
    await pool.execute(
      `UPDATE bookings 
             SET total_amount_paid = GREATEST(total_amount_paid - ?, 0),
                 booking_status = 'refunded'
             WHERE id = ?`,
      [refundAmount, payment.booking_id]
    );

    res.json({
      success: true,
      message: "Refund processed successfully",
    });
  } catch (error) {
    console.error("Error processing refund:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process refund",
      error: error.message,
    });
  }
};

  const bookingtypes ={
        PASSENGER: "passenger",
        PARCEL:"parcel"
    }


    // ...existing code...

export const initiateYocoCheckout = async (req, res) => {
  let connection;
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;
    const {
      booking_id,
      amount,
      amountInCents,
      payment_method = "card",
      payment_gateway = "yoco",
      gateway_response = null,
      passenger_data = null,
      parcel_data = null,
    } = req.body;

    // Ensure amountInCents is a valid integer
    const amountInCentsInt = Math.round(Number(amountInCents));
    
    if (!amountInCentsInt || amountInCentsInt <= 0 || isNaN(amountInCentsInt)) {
      return res
        .status(400)
        .json({ 
          success: false, 
          message: "Invalid amount", 
          received: amountInCents,
          converted: amountInCentsInt
        });
    }
    
    // Basic validation - Yoco typically accepts amounts >= 100 cents (R1.00)
    // R60 (6000 cents) is a valid amount for small parcels
    if (amountInCentsInt < 100) {
      return res
        .status(400)
        .json({ 
          success: false, 
          message: "Amount too small. Minimum amount is R1.00 (100 cents)", 
          amountInCents: amountInCentsInt,
          amountInRands: (amountInCentsInt / 100).toFixed(2)
        });
    }
    
    console.log("Creating Yoco checkout with:", {
      amountInCents: amountInCentsInt,
      amountInRands: (amountInCentsInt / 100).toFixed(2),
      currency: "ZAR",
      booking_id,
      userId,
      originalAmountReceived: amountInCents
    });

    // Use a single DB transaction for createPayment + checkout creation + payment update
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Pass the transaction connection into createPayment
    const resultP = await createPayment(
      userId,
      userType,
      booking_id,
      amount,
      payment_method,
      payment_gateway,
      gateway_response,
      passenger_data,
      parcel_data,
      connection // <<<< pass connection so createPayment does NOT commit by itself
    );

    if (!resultP.success) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: resultP.message || "Payment processing error",
        error: resultP.error || null,
      });
    }

    const paymentId = resultP.payment.paymentID;
    if (!paymentId) {
      await connection.rollback();
      return res.status(500).json({
        success: false,
        message: "Payment processing error: missing payment id",
      });
    }

    // Create Yoco checkout; if this fails, we'll rollback the DB transaction
    // Ensure amount is sent as an integer (Yoco requires integer cents)
    const response = await axios.post(
      "https://payments.yoco.com/api/checkouts",
      {
        amount: amountInCentsInt, // Use validated integer amount
        currency: "ZAR",
        successUrl: `${configurations.frontend.url}/pages/customer/booking-public.html?bookingID=${booking_id}&paymentID=${paymentId}&bookingType=${resultP.bookingType}&passengerID=${resultP.passenger != null ? resultP.passenger.id : ""}&parcelID=${resultP.parcel ? resultP.parcel.booking_parcels_id : ""}`,
        cancelUrl: `${configurations.frontend.url}/pages/customer/booking-public.html?bookingID=${booking_id}&paymentID=${paymentId}&bookingType=${resultP.bookingType}&passengerID=${resultP.passenger != null ? resultP.passenger.id : ""}&parcelID=${resultP.parcel ? resultP.parcel.booking_parcels_id : ""}`,
        metadata: {
          bookingId: booking_id,
          parcelInfo_fromCreation: resultP.parcel || null,
          parcel_data: parcel_data || null,
          paymentId: paymentId,
          isPassengerBooking: resultP.bookingType === bookingtypes.PASSENGER ? true : false,
          passengerInfo_fromCreation: resultP.passenger || null,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${configurations.yoco.secretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Update the payment record using the same transaction connection
    await connection.execute("UPDATE payments SET checkout_id = ? WHERE ID = ?", [
      response.data.id,
      paymentId,
    ]);

    // Commit the whole transaction
    await connection.commit();

    res.json({
      success: true,
      redirectUrl: response.data.redirectUrl,
      checkoutId: response.data.id,
    });
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (e) {
        console.error("Rollback failed:", e);
      }
    }
    
    // Enhanced error logging for debugging
    console.error("=== Yoco Checkout Error ===");
    console.error("Error message:", err.message);
    console.error("Error response data:", err.response?.data);
    console.error("Error response status:", err.response?.status);
    console.error("Error response headers:", err.response?.headers);
    console.error("Request data sent:", {
      amountInCents: amountInCentsInt,
      amountInRands: (amountInCentsInt / 100).toFixed(2),
      currency: "ZAR",
      booking_id,
      paymentId,
      originalAmountReceived: amountInCents
    });
    
    // Return more detailed error message
    const errorMessage = err.response?.data?.message || err.message || "Payment init failed";
    const errorDetails = err.response?.data?.error || null;
    
    res.status(err.response?.status || 500).json({ 
      success: false, 
      message: errorMessage,
      error: errorDetails,
      details: process.env.NODE_ENV === 'development' ? {
        originalError: err.message,
        responseData: err.response?.data
      } : undefined
    });
  } finally {
    if (connection) connection.release();
  }
};

// ...existing code...

// Create payment
async function createPayment(
  userId,
  userType,
  booking_id,
  amount,
  payment_method = "card",
  payment_gateway = "yoco",
  gateway_response = null,
  passenger_data = null,
  parcel_data = null,
  connection = null // optional transaction connection - when provided, do not commit/close it here
) {
  let ownConnection = false;
  try {
    if (!connection) {
      connection = await pool.getConnection();
      await connection.beginTransaction();
      ownConnection = true;
    }

    // Validate input
    if (!booking_id || !amount) {
      if (ownConnection) await connection.rollback();
      return {
        success: false,
        message: "booking_id and amount are required",
      };
    }

    // Get booking using provided connection
    const [bookings] = await connection.execute(
      "SELECT * FROM bookings WHERE id = ?",
      [booking_id]
    );

    if (bookings.length === 0) {
      if (ownConnection) await connection.rollback();
      return {
        success: false,
        message: "Booking not found",
      };
    }

    const booking = bookings[0];

    // Check access
    const isClient = userType === "client" || userType === "customer";
    const isAdmin = userType === "admin";
    const isOwner = userType === "owner";
    const isRouteBasedBooking = booking.booking_mode === "route";

    if (isAdmin || isOwner) {
      if (ownConnection) await connection.rollback();
      return {
        success: false,
        message:
          "Access denied. Only clients can make payments. Admins and owners are not allowed to pay.",
      };
    }

    if (!isClient || !isRouteBasedBooking) {
      if (ownConnection) await connection.rollback();
      return {
        success: false,
        message:
          "Access denied. Only clients can pay for route-based bookings.",
      };
    }

    // Determine payment status
    let payment_status = "pending";

    // Check booking type
    const isPassengerBooking = passenger_data && passenger_data.first_name;
    const isParcelBooking =
      parcel_data &&
      parcel_data.parcels &&
      Array.isArray(parcel_data.parcels) &&
      parcel_data.parcels.length > 0;

    if (isPassengerBooking && isParcelBooking) {
      if (ownConnection) await connection.rollback();
      return {
        success: false,
        message:
          "Cannot process both passenger and parcel bookings in the same payment",
      };
    }

    // Variables to store passenger/parcel IDs for payment insertion
    let bookingPassengerId = null;
    let bookingParcelId = null;
    let passengerResult = null;
    let parcelResult = null;

    // Insert passenger if needed (errors return without committing when caller provided connection)
    if (isPassengerBooking) {
      try {
        // ...existing passenger insert logic unchanged...
        // (kept as-is but use the provided 'connection' variable)
                // Get current passenger count for passenger_number
        const [passengerCount] = await connection.execute(
          "SELECT COUNT(*) as count FROM booking_passengers WHERE booking_id = ?",
          [booking_id]
        );
        const passenger_number = passengerCount[0].count + 1;

        // Generate unique 7-character code
        let code;
        let codeExists = true;
        let attempts = 0;
        const maxAttempts = 20;

        while (codeExists && attempts < maxAttempts) {
          // Generate 7-character alphanumeric code
          code = Math.random().toString(36).substring(2, 9).toUpperCase();
          // Ensure it's exactly 7 characters
          if (code.length < 7) {
            code = code.padEnd(
              7,
              Math.random().toString(36).substring(2, 9).toUpperCase()
            );
          }
          code = code.substring(0, 7);

          // Check if code already exists
          const [existingCode] = await connection.execute(
            "SELECT ID FROM booking_passengers WHERE code = ?",
            [code]
          );
          codeExists = existingCode.length > 0;
          attempts++;
        }

        if (codeExists) {
          throw new Error(
            "Failed to generate unique passenger code after " +
              maxAttempts +
              " attempts"
          );
        }

        // Helper function to extract coordinates from point data
        const extractCoordinates = (pointData) => {
          if (!pointData) return null;

          // Handle different coordinate formats
          let lat, lng;

          if (pointData.coordinates) {
            lat = pointData.coordinates.lat || pointData.coordinates.latitude;
            lng = pointData.coordinates.lng || pointData.coordinates.longitude;
          } else if (pointData.lat && pointData.lng) {
            lat = pointData.lat;
            lng = pointData.lng;
          } else if (pointData.latitude && pointData.longitude) {
            lat = pointData.latitude;
            lng = pointData.longitude;
          }

          // Return coordinates if valid, otherwise null
          if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
            return { lat: parseFloat(lat), lng: parseFloat(lng) };
          }

          return null;
        };

        // Extract coordinates for pickup and dropoff points
        const pickupCoords = extractCoordinates(passenger_data.pickup_point);
        const dropoffCoords = extractCoordinates(passenger_data.dropoff_point);

        // Build SQL with POINT geometry functions
        // Use ST_GeomFromText for POINT geometry: POINT(longitude latitude) - MySQL uses longitude first
        let pickupPointSQL = "NULL";
        let dropoffPointSQL = "NULL";

        if (pickupCoords) {
          pickupPointSQL = `ST_GeomFromText('POINT(${pickupCoords.lng} ${pickupCoords.lat})', 4326)`;
        }

        if (dropoffCoords) {
          dropoffPointSQL = `ST_GeomFromText('POINT(${dropoffCoords.lng} ${dropoffCoords.lat})', 4326)`;
        }

        // Extract addresses from pickup_point and dropoff_point objects
        const pickupAddress =
          passenger_data.pickup_point?.address ||
          (typeof passenger_data.pickup_point === "string"
            ? passenger_data.pickup_point
            : null) ||
          passenger_data.pickup_address ||
          null;
        const dropoffAddress =
          passenger_data.dropoff_point?.address ||
          (typeof passenger_data.dropoff_point === "string"
            ? passenger_data.dropoff_point
            : null) ||
          passenger_data.dropoff_address ||
          null;

        // Insert passenger as registered user with POINT geometry
        const [passengerInsert] = await connection.execute(
          `INSERT INTO booking_passengers (
                        booking_id, passenger_number, passenger_type, linked_user_id,
                        first_name, last_name, email, phone, id_number,
                        code, pickup_point, dropoff_point, pickup_address, dropoff_address, is_primary,
                        next_of_kin_first_name, next_of_kin_last_name, next_of_kin_phone
                    ) VALUES (?, ?, 'registered', ?, ?, ?, ?, ?, ?, ?, ${pickupPointSQL}, ${dropoffPointSQL}, ?, ?, ?, ?, ?, ?)`,
          [
            booking_id,
            passenger_number,
            userId, // linked_user_id for registered user
            passenger_data.first_name,
            passenger_data.last_name,
            passenger_data.email || null,
            passenger_data.phone || null,
            passenger_data.id_number || null,
            code,
            pickupAddress,
            dropoffAddress,
            passenger_data.is_primary || false,
            passenger_data.next_of_kin_first_name || "",
            passenger_data.next_of_kin_last_name || "",
            passenger_data.next_of_kin_phone || "",
          ]
        );

        bookingPassengerId = passengerInsert.insertId;
      } catch (error) {
        console.error("Error adding passenger to booking:", error);
        if (ownConnection) await connection.rollback();
        return {
          success: false,
          message: "Failed to add passenger to booking",
          error: error.message,
        };
      }
    }

    // Insert booking_parcels if needed (similar handling)
    if (isParcelBooking) {
      try {
        // ...existing parcel insert logic unchanged...
                // Generate unique sender_code and receiver_code
        const generateUniqueCode = async (
          tableName,
          codeColumn,
          length = 10
        ) => {
          let code;
          let codeExists = true;
          let attempts = 0;
          const maxAttempts = 20;

          while (codeExists && attempts < maxAttempts) {
            // Generate alphanumeric code
            code = Math.random()
              .toString(36)
              .substring(2, 2 + length)
              .toUpperCase();
            // Ensure it's exactly the right length
            if (code.length < length) {
              code = code.padEnd(
                length,
                Math.random()
                  .toString(36)
                  .substring(2, 2 + length)
                  .toUpperCase()
              );
            }
            code = code.substring(0, length);

            // Check if code already exists in booking_parcels table
            const [existingCode] = await connection.execute(
              `SELECT ID FROM ${tableName} WHERE ${codeColumn} = ?`,
              [code]
            );
            codeExists = existingCode.length > 0;
            attempts++;
          }

          if (codeExists) {
            throw new Error(
              `Failed to generate unique ${codeColumn} after ${maxAttempts} attempts`
            );
          }

          return code;
        };

        const senderCode = await generateUniqueCode(
          "booking_parcels",
          "sender_code"
        );
        const receiverCode = await generateUniqueCode(
          "booking_parcels",
          "receiver_code"
        );

        // Helper function to extract coordinates from point data (same as for passengers)
        const extractCoordinates = (pointData) => {
          if (!pointData) return null;

          // Handle different coordinate formats
          let lat, lng;

          if (pointData.coordinates) {
            // Check if coordinates is an array [lng, lat] (Mapbox/GeoJSON format)
            if (
              Array.isArray(pointData.coordinates) &&
              pointData.coordinates.length >= 2
            ) {
              lng = pointData.coordinates[0];
              lat = pointData.coordinates[1];
            } else if (typeof pointData.coordinates === "object") {
              // Object format: { lat, lng } or { latitude, longitude }
              lat = pointData.coordinates.lat || pointData.coordinates.latitude;
              lng =
                pointData.coordinates.lng || pointData.coordinates.longitude;
            }
          } else if (pointData.lat != null && pointData.lng != null) {
            // Direct lat/lng properties
            lat = pointData.lat;
            lng = pointData.lng;
          } else if (
            pointData.latitude != null &&
            pointData.longitude != null
          ) {
            // latitude/longitude properties
            lat = pointData.latitude;
            lng = pointData.longitude;
          }

          // Return coordinates if valid, otherwise null
          if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
            return { lat: parseFloat(lat), lng: parseFloat(lng) };
          }

          return null;
        };

        // Extract coordinates for pickup and dropoff points
        const pickupCoords = extractCoordinates(parcel_data.pickup_point);
        const dropoffCoords = extractCoordinates(parcel_data.dropoff_point);

        // Build SQL with POINT geometry functions
        // Use ST_GeomFromText for POINT geometry: POINT(longitude latitude) - MySQL uses longitude first
        let pickupPointSQL = "NULL";
        let dropoffPointSQL = "NULL";

        if (pickupCoords) {
          pickupPointSQL = `ST_GeomFromText('POINT(${pickupCoords.lng} ${pickupCoords.lat})', 4326)`;
        }

        if (dropoffCoords) {
          dropoffPointSQL = `ST_GeomFromText('POINT(${dropoffCoords.lng} ${dropoffCoords.lat})', 4326)`;
        }

        // Extract addresses from pickup_point and dropoff_point objects
        const pickupAddress =
          parcel_data.pickup_address ||
          parcel_data.pickup_point?.address ||
          (typeof parcel_data.pickup_point === "string"
            ? parcel_data.pickup_point
            : null) ||
          null;
        const dropoffAddress =
          parcel_data.dropoff_address ||
          parcel_data.dropoff_point?.address ||
          (typeof parcel_data.dropoff_point === "string"
            ? parcel_data.dropoff_point
            : null) ||
          null;

        // Insert into booking_parcels table (one record per parcel booking)
        const [bookingParcelsInsert] = await connection.execute(
          `INSERT INTO booking_parcels (
                        booking_id, user_id, sender_name, sender_phone,
                        receiver_name, receiver_phone, status, sender_code, receiver_code,
                        pickup_point, dropoff_point, pickup_address, dropoff_address,
                        booking_passenger_cancelled_at, cancellation_reason
                    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ${pickupPointSQL}, ${dropoffPointSQL}, ?, ?, ?, ?)`,
          [
            booking_id,
            userId,
            parcel_data.sender_name || "",
            parcel_data.sender_phone || "",
            parcel_data.receiver_name || "",
            parcel_data.receiver_phone || "",
            senderCode,
            receiverCode,
            pickupAddress,
            dropoffAddress,
            null, // booking_passenger_cancelled_at - NULL initially
            null, // cancellation_reason - NULL initially
          ]
        );

        bookingParcelId = bookingParcelsInsert.insertId;
      } catch (error) {
        console.error("Error adding booking_parcels:", error);
        if (ownConnection) await connection.rollback();
        return {
          success: false,
          message: "Failed to add parcel booking",
          error: error.message,
        };
      }
    }

    // Insert payment
    const [result] = await connection.execute(
      `INSERT INTO payments (
                booking_id, user_id, amount, currency,
                payment_method, payment_status,
                payment_gateway, gateway_response,
                booking_passenger_id, booking_parcel_id
            ) VALUES (?, ?, ?, 'ZAR', ?, ?, ?, ?, ?, ?)`,
      [
        booking_id,
        userId,
        amount,
        payment_method,
        payment_status,
        payment_gateway,
        gateway_response ? JSON.stringify(gateway_response) : null,
        bookingPassengerId,
        bookingParcelId,
      ]
    );

        // If parcel booking, add individual parcels to parcel table (booking_parcels already inserted above)
    if (isParcelBooking && bookingParcelId) {
      try {
        // Get sender_code and receiver_code from the booking_parcels record we just created
        const [bookingParcelsRecord] = await connection.execute(
          "SELECT sender_code, receiver_code FROM booking_parcels WHERE ID = ?",
          [bookingParcelId]
        );

        const senderCode = bookingParcelsRecord[0]?.sender_code || "";
        const receiverCode = bookingParcelsRecord[0]?.receiver_code || "";

        // Generate unique parcel numbers for each parcel (must be globally unique)
        // Get the maximum parcel_number globally to ensure uniqueness
        const [maxParcelNumber] = await connection.execute(
          "SELECT MAX(parcel_number) as max_num FROM parcel"
        );
        let nextParcelNumber = (maxParcelNumber[0].max_num || 0) + 1;

        // Helper function to generate unique parcel_number globally
        const generateUniqueParcelNumber = async () => {
          let parcelNumber;
          let numberExists = true;
          let attempts = 0;
          const maxAttempts = 50;

          while (numberExists && attempts < maxAttempts) {
            // Start from nextParcelNumber and increment if needed
            parcelNumber = nextParcelNumber;

            // Check if this parcel_number exists globally (must be unique)
            const [existingNumber] = await connection.execute(
              "SELECT ID FROM parcel WHERE parcel_number = ?",
              [parcelNumber]
            );
            numberExists = existingNumber.length > 0;

            if (numberExists) {
              nextParcelNumber++;
            }
            attempts++;
          }

          if (numberExists) {
            throw new Error(
              `Failed to generate unique parcel_number after ${maxAttempts} attempts`
            );
          }

          nextParcelNumber++; // Increment for next parcel
          return parcelNumber;
        };

        // Helper function to get quantity compared to small parcel
        const getQuantityInSmallParcels = (size) => {
          switch (size) {
            case "large":
              return 4;
            case "medium":
              return 2;
            case "small":
              return 1;
            default:
              return 1;
          }
        };

        // Insert each individual parcel into parcel table
        const insertedParcels = [];
        for (const parcel of parcel_data.parcels) {
          const parcelNumber = await generateUniqueParcelNumber();
          const quantitySp = getQuantityInSmallParcels(parcel.size);

          // Insert parcel
          const [parcelInsert] = await connection.execute(
            `INSERT INTO parcel (
                            booking_parcels_id, parcel_number, size, 
                            quantity_compared_to_sp, images
                        ) VALUES (?, ?, ?, ?, ?)`,
            [
              bookingParcelId,
              parcelNumber,
              parcel.size || "small",
              quantitySp,
              JSON.stringify(parcel.images || []),
            ]
          );

          insertedParcels.push({
            id: parcelInsert.insertId,
            parcel_number: parcelNumber,
            size: parcel.size,
            quantity_compared_to_sp: quantitySp,
          });
        }

        parcelResult = {
          booking_parcels_id: bookingParcelId,
          sender_code: senderCode,
          receiver_code: receiverCode,
          parcels: insertedParcels,
        };
      } catch (error) {
        console.error(
          "Error adding individual parcels to parcel table:",
          error
        );
        // Don't fail the payment if parcel addition fails, but log it
      }
    }

    // Prepare passenger result (already inserted before payment above)
    if (isPassengerBooking && bookingPassengerId) {
      try {
        // Get passenger details from the record we already created
        const [passengerRecord] = await connection.execute(
          "SELECT passenger_number, code FROM booking_passengers WHERE ID = ?",
          [bookingPassengerId]
        );

        if (passengerRecord.length > 0) {
          passengerResult = {
            id: bookingPassengerId,
            passenger_number: passengerRecord[0].passenger_number,
            code: passengerRecord[0].code,
          };
        }
      } catch (error) {
        console.error("Error retrieving passenger result:", error);
      }
    }

    // (keep the rest of the earlier logic that adds parcels to parcel table, prepares passengerResult etc.)
    // Ensure we do NOT commit here if a connection was provided by caller
    if (ownConnection) {
      await connection.commit();
    }

    let bookingtype = isPassengerBooking ? bookingtypes.PASSENGER : bookingtypes.PARCEL;

    return {
      success: true,
      message: "Payment created successfully",
      payment: {
        id: result.insertId,
        paymentID: result.insertId,
        payment_status: payment_status,
        payment_gateway: payment_gateway,
      },
      passenger: passengerResult,
      parcel: parcelResult,
      bookingType: bookingtype,
    };
  } catch (error) {
    console.error("Error creating payment:", error);
    try {
      if (ownConnection && connection) await connection.rollback();
    } catch (e) {
      console.error("Rollback failed in createPayment:", e);
    }
    return {
      success: false,
      message: "Failed to create payment",
      error: error.message,
    };
  } finally {
    if (ownConnection && connection) {
      connection.release();
    }
  }
}

// ...existing code...

//Yoco checkout initiation
// export const initiateYocoCheckout = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const userType = req.user.user_type;
//     console.log("The user id is: ", userId);
//     const {
//       booking_id,
//       amount,
//       amountInCents,
//       payment_method = "card", // Default to 'card' since Yoco is the only payment method
//       payment_gateway = "yoco", // Default to 'yoco' since it's the only payment gateway
//       gateway_response = null,
//       passenger_data = null, // Passenger data if this is a passenger booking
//       parcel_data = null, // Parcel data if this is a parcel booking
//     } = req.body;

//     if (!amountInCents || amountInCents <= 0) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid amount" });
//     }

//     //create payment to get payment ID for metadata
//     const resultP = await createPayment(
//       userId,
//       userType,
//       booking_id,
//       amount,
//       payment_method,
//       payment_gateway,
//       gateway_response,
//       passenger_data,
//       parcel_data
//     );
//     if (!resultP.success) {
//       console.log("The payment creation failed: ", resultP.message);
//       return res
//         .status(400)
//         .json({
//           success: false,
//           message: resultP.message || "Payment processing error",
//         });
//     }

//     console.log("The payment creation result: ", resultP);  
//     const paymentId = resultP.payment.paymentID;
//     if (!paymentId) {
//       console.error("Missing payment id returned from createPayment", resultP);
//       return res
//         .status(500)
//         .json({
//           success: false,
//           message: "Payment processing error: missing payment id",
//         });
//     }

         

//     const response = await axios.post(
//       "https://payments.yoco.com/api/checkouts",
//       {
//         amount: amountInCents,
//         currency: "ZAR",
//         successUrl: `${configurations.frontend.url}/pages/customer/booking-public.html?bookingID=${booking_id}&paymentID=${paymentId}&bookingType=${resultP.bookingType}&passengerID=${resultP.passenger != null ? resultP.passenger.id :""}&parcelID=${resultP.parcel ? resultP.parcel.booking_parcels_id : ""}`,
//         cancelUrl: `${configurations.frontend.url}/pages/customer/booking-public.html?bookingID=${booking_id}&paymentID=${paymentId}&bookingType=${resultP.bookingType}&passengerID=${resultP.passenger != null ? resultP.passenger.id :""}&parcelID=${resultP.parcel ? resultP.parcel.booking_parcels_id : ""}`,
//         metadata: {
//           bookingId: booking_id,
//           parcelInfo_fromCreation: resultP.parcel || null,
//           parcel_data: parcel_data || null,
//           paymentId: paymentId,
//           isPassengerBooking: resultP.bookingType === bookingtypes.PASSENGER ? true : false,
//           passengerInfo_fromCreation: resultP.passenger || null,
//         },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${configurations.yoco.secretKey}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     console.log("Yoco checkout response:", response.data);

//     //update the payment with checkout id
//     await pool.execute("UPDATE payments SET checkout_id = ? WHERE ID = ?", [
//       response.data.id,
//       paymentId
//     ]);


//     res.json({
//       success: true,
//       redirectUrl: response.data.redirectUrl,
//       checkoutId: response.data.id,
//     });
//   } catch (err) {
//     console.error("Yoco checkout error:", err.response?.data || err.message);
//     res.status(500).json({ success: false, message: "Payment init failed" });
//   }
// };

// // Create payment
async function OldcreatePayment(
  userId,
  userType,
  booking_id,
  amount,
  payment_method = "card",
  payment_gateway = "yoco",
  gateway_response = null,
  passenger_data = null,
  parcel_data = null
) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Validate input
    if (!booking_id || !amount) {
      return {
        success: false,
        message: "booking_id and amount are required",
      };
    }

    // Get booking
    const [bookings] = await connection.execute(
      "SELECT * FROM bookings WHERE id = ?",
      [booking_id]
    );

    if (bookings.length === 0) {
      return {
        success: false,
        message: "Booking not found",
      };
    }

    const booking = bookings[0];

    // Check access
    // Only clients (regular users) can make payments, not admins or owners

    const isClient = userType === "client" || userType === "customer";
    const isAdmin = userType === "admin";
    const isOwner = userType === "owner";
    const isRouteBasedBooking = booking.booking_mode === "route";

    // Deny payment if user is admin or owner
    if (isAdmin || isOwner) {
      return {
        success: false,
        message:
          "Access denied. Only clients can make payments. Admins and owners are not allowed to pay.",
      };
    }

    // Allow payment only for clients on route-based bookings
    if (!isClient || !isRouteBasedBooking) {
      return {
        success: false,
        message:
          "Access denied. Only clients can pay for route-based bookings.",
      };
    }

    // Determine payment status
    let payment_status = "pending";

    // Check if this is a passenger booking or parcel booking
    const isPassengerBooking = passenger_data && passenger_data.first_name;
    const isParcelBooking =
      parcel_data &&
      parcel_data.parcels &&
      Array.isArray(parcel_data.parcels) &&
      parcel_data.parcels.length > 0;

    // Ensure mutual exclusivity
    if (isPassengerBooking && isParcelBooking) {
      return {
        success: false,
        message:
          "Cannot process both passenger and parcel bookings in the same payment",
      };
    }

    // Variables to store passenger/parcel IDs for payment insertion
    let bookingPassengerId = null;
    let bookingParcelId = null;
    let passengerResult = null; // Initialize passenger result

    // If passenger booking, insert passenger FIRST to get the ID
    if (isPassengerBooking) {
      try {
        // Get current passenger count for passenger_number
        const [passengerCount] = await connection.execute(
          "SELECT COUNT(*) as count FROM booking_passengers WHERE booking_id = ?",
          [booking_id]
        );
        const passenger_number = passengerCount[0].count + 1;

        // Generate unique 7-character code
        let code;
        let codeExists = true;
        let attempts = 0;
        const maxAttempts = 20;

        while (codeExists && attempts < maxAttempts) {
          // Generate 7-character alphanumeric code
          code = Math.random().toString(36).substring(2, 9).toUpperCase();
          // Ensure it's exactly 7 characters
          if (code.length < 7) {
            code = code.padEnd(
              7,
              Math.random().toString(36).substring(2, 9).toUpperCase()
            );
          }
          code = code.substring(0, 7);

          // Check if code already exists
          const [existingCode] = await connection.execute(
            "SELECT ID FROM booking_passengers WHERE code = ?",
            [code]
          );
          codeExists = existingCode.length > 0;
          attempts++;
        }

        if (codeExists) {
          throw new Error(
            "Failed to generate unique passenger code after " +
              maxAttempts +
              " attempts"
          );
        }

        // Helper function to extract coordinates from point data
        const extractCoordinates = (pointData) => {
          if (!pointData) return null;

          // Handle different coordinate formats
          let lat, lng;

          if (pointData.coordinates) {
            lat = pointData.coordinates.lat || pointData.coordinates.latitude;
            lng = pointData.coordinates.lng || pointData.coordinates.longitude;
          } else if (pointData.lat && pointData.lng) {
            lat = pointData.lat;
            lng = pointData.lng;
          } else if (pointData.latitude && pointData.longitude) {
            lat = pointData.latitude;
            lng = pointData.longitude;
          }

          // Return coordinates if valid, otherwise null
          if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
            return { lat: parseFloat(lat), lng: parseFloat(lng) };
          }

          return null;
        };

        // Extract coordinates for pickup and dropoff points
        const pickupCoords = extractCoordinates(passenger_data.pickup_point);
        const dropoffCoords = extractCoordinates(passenger_data.dropoff_point);

        // Build SQL with POINT geometry functions
        // Use ST_GeomFromText for POINT geometry: POINT(longitude latitude) - MySQL uses longitude first
        let pickupPointSQL = "NULL";
        let dropoffPointSQL = "NULL";

        if (pickupCoords) {
          pickupPointSQL = `ST_GeomFromText('POINT(${pickupCoords.lng} ${pickupCoords.lat})', 4326)`;
        }

        if (dropoffCoords) {
          dropoffPointSQL = `ST_GeomFromText('POINT(${dropoffCoords.lng} ${dropoffCoords.lat})', 4326)`;
        }

        // Extract addresses from pickup_point and dropoff_point objects
        const pickupAddress =
          passenger_data.pickup_point?.address ||
          (typeof passenger_data.pickup_point === "string"
            ? passenger_data.pickup_point
            : null) ||
          passenger_data.pickup_address ||
          null;
        const dropoffAddress =
          passenger_data.dropoff_point?.address ||
          (typeof passenger_data.dropoff_point === "string"
            ? passenger_data.dropoff_point
            : null) ||
          passenger_data.dropoff_address ||
          null;

        // Insert passenger as registered user with POINT geometry
        const [passengerInsert] = await connection.execute(
          `INSERT INTO booking_passengers (
                        booking_id, passenger_number, passenger_type, linked_user_id,
                        first_name, last_name, email, phone, id_number,
                        code, pickup_point, dropoff_point, pickup_address, dropoff_address, is_primary,
                        next_of_kin_first_name, next_of_kin_last_name, next_of_kin_phone
                    ) VALUES (?, ?, 'registered', ?, ?, ?, ?, ?, ?, ?, ${pickupPointSQL}, ${dropoffPointSQL}, ?, ?, ?, ?, ?, ?)`,
          [
            booking_id,
            passenger_number,
            userId, // linked_user_id for registered user
            passenger_data.first_name,
            passenger_data.last_name,
            passenger_data.email || null,
            passenger_data.phone || null,
            passenger_data.id_number || null,
            code,
            pickupAddress,
            dropoffAddress,
            passenger_data.is_primary || false,
            passenger_data.next_of_kin_first_name || "",
            passenger_data.next_of_kin_last_name || "",
            passenger_data.next_of_kin_phone || "",
          ]
        );

        bookingPassengerId = passengerInsert.insertId;
      } catch (error) {
        console.error("Error adding passenger to booking:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to add passenger to booking",
          error: error.message,
        });
      }
    }

    // If parcel booking, insert booking_parcels FIRST to get the ID
    if (isParcelBooking) {
      try {
        // Generate unique sender_code and receiver_code
        const generateUniqueCode = async (
          tableName,
          codeColumn,
          length = 10
        ) => {
          let code;
          let codeExists = true;
          let attempts = 0;
          const maxAttempts = 20;

          while (codeExists && attempts < maxAttempts) {
            // Generate alphanumeric code
            code = Math.random()
              .toString(36)
              .substring(2, 2 + length)
              .toUpperCase();
            // Ensure it's exactly the right length
            if (code.length < length) {
              code = code.padEnd(
                length,
                Math.random()
                  .toString(36)
                  .substring(2, 2 + length)
                  .toUpperCase()
              );
            }
            code = code.substring(0, length);

            // Check if code already exists in booking_parcels table
            const [existingCode] = await pool.execute(
              `SELECT ID FROM ${tableName} WHERE ${codeColumn} = ?`,
              [code]
            );
            codeExists = existingCode.length > 0;
            attempts++;
          }

          if (codeExists) {
            throw new Error(
              `Failed to generate unique ${codeColumn} after ${maxAttempts} attempts`
            );
          }

          return code;
        };

        const senderCode = await generateUniqueCode(
          "booking_parcels",
          "sender_code"
        );
        const receiverCode = await generateUniqueCode(
          "booking_parcels",
          "receiver_code"
        );

        // Helper function to extract coordinates from point data (same as for passengers)
        const extractCoordinates = (pointData) => {
          if (!pointData) return null;

          // Handle different coordinate formats
          let lat, lng;

          if (pointData.coordinates) {
            // Check if coordinates is an array [lng, lat] (Mapbox/GeoJSON format)
            if (
              Array.isArray(pointData.coordinates) &&
              pointData.coordinates.length >= 2
            ) {
              lng = pointData.coordinates[0];
              lat = pointData.coordinates[1];
            } else if (typeof pointData.coordinates === "object") {
              // Object format: { lat, lng } or { latitude, longitude }
              lat = pointData.coordinates.lat || pointData.coordinates.latitude;
              lng =
                pointData.coordinates.lng || pointData.coordinates.longitude;
            }
          } else if (pointData.lat != null && pointData.lng != null) {
            // Direct lat/lng properties
            lat = pointData.lat;
            lng = pointData.lng;
          } else if (
            pointData.latitude != null &&
            pointData.longitude != null
          ) {
            // latitude/longitude properties
            lat = pointData.latitude;
            lng = pointData.longitude;
          }

          // Return coordinates if valid, otherwise null
          if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
            return { lat: parseFloat(lat), lng: parseFloat(lng) };
          }

          return null;
        };

        // Extract coordinates for pickup and dropoff points
        const pickupCoords = extractCoordinates(parcel_data.pickup_point);
        const dropoffCoords = extractCoordinates(parcel_data.dropoff_point);

        // Build SQL with POINT geometry functions
        // Use ST_GeomFromText for POINT geometry: POINT(longitude latitude) - MySQL uses longitude first
        let pickupPointSQL = "NULL";
        let dropoffPointSQL = "NULL";

        if (pickupCoords) {
          pickupPointSQL = `ST_GeomFromText('POINT(${pickupCoords.lng} ${pickupCoords.lat})', 4326)`;
        }

        if (dropoffCoords) {
          dropoffPointSQL = `ST_GeomFromText('POINT(${dropoffCoords.lng} ${dropoffCoords.lat})', 4326)`;
        }

        // Extract addresses from pickup_point and dropoff_point objects
        const pickupAddress =
          parcel_data.pickup_address ||
          parcel_data.pickup_point?.address ||
          (typeof parcel_data.pickup_point === "string"
            ? parcel_data.pickup_point
            : null) ||
          null;
        const dropoffAddress =
          parcel_data.dropoff_address ||
          parcel_data.dropoff_point?.address ||
          (typeof parcel_data.dropoff_point === "string"
            ? parcel_data.dropoff_point
            : null) ||
          null;

        // Insert into booking_parcels table (one record per parcel booking)
        const [bookingParcelsInsert] = await connection.execute(
          `INSERT INTO booking_parcels (
                        booking_id, user_id, sender_name, sender_phone,
                        receiver_name, receiver_phone, status, sender_code, receiver_code,
                        pickup_point, dropoff_point, pickup_address, dropoff_address,
                        booking_passenger_cancelled_at, cancellation_reason
                    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ${pickupPointSQL}, ${dropoffPointSQL}, ?, ?, ?, ?)`,
          [
            booking_id,
            userId,
            parcel_data.sender_name || "",
            parcel_data.sender_phone || "",
            parcel_data.receiver_name || "",
            parcel_data.receiver_phone || "",
            senderCode,
            receiverCode,
            pickupAddress,
            dropoffAddress,
            null, // booking_passenger_cancelled_at - NULL initially
            null, // cancellation_reason - NULL initially
          ]
        );

        bookingParcelId = bookingParcelsInsert.insertId;
      } catch (error) {
        console.error("Error adding booking_parcels:", error);
        return {
          success: false,
          message: "Failed to add parcel booking",
          error: error.message,
        };
      }
    }

    // Insert payment with booking_passenger_id or booking_parcel_id
    const [result] = await connection.execute(
      `INSERT INTO payments (
                booking_id, user_id, amount, currency,
                payment_method, payment_status,
                payment_gateway, gateway_response,
                booking_passenger_id, booking_parcel_id
            ) VALUES (?, ?, ?, 'ZAR', ?, ?, ?, ?, ?, ?)`,
      [
        booking_id,
        userId, // Always use the authenticated user's ID
        amount,
        payment_method,
        payment_status,
        payment_gateway,
        gateway_response ? JSON.stringify(gateway_response) : null,
        bookingPassengerId, // NULL if parcel booking
        bookingParcelId, // NULL if passenger booking
      ]
    );

    // Update booking payment status and amounts
    const newTotalPaid =
      parseFloat(booking.total_amount_paid || 0) + parseFloat(amount);

      //START OF THE COMMENT 
    // Prepare booking update query
    // Note: payment_id column has been removed from bookings table
    // Note: Booking status should not be changed here - leave it as 'pending' or whatever it currently is
    // let bookingUpdateQuery = `UPDATE bookings
    //      SET total_amount_paid = ?`;
    // let bookingUpdateParams = [newTotalPaid];

    // // If passenger booking, update passenger_count and total_seats_available
    // if (isPassengerBooking) {
    //     bookingUpdateQuery += `, passenger_count = passenger_count + 1,
    //          total_seats_available = GREATEST(0, total_seats_available - 1)`;
    // }

    // // If parcel booking, update parcel-related fields
    // if (isParcelBooking) {
    //     // Calculate parcel metrics
    //     let seatParcelCount = 0; // Number of seats bought for parcels (each parcel that is a seat parcel counts as 1)
    //     let extraspaceCount = 0; // Number of individual parcels (total parcels)
    //     let extraspaceParcelCountSp = 0; // Total small parcel equivalents to reduce from extraspace_parcel_count_sp

    //     // Helper function to get quantity compared to small parcel
    //     const getQuantityInSmallParcels = (size) => {
    //         switch(size) {
    //             case 'large': return 4;
    //             case 'medium': return 2;
    //             case 'small': return 1;
    //             default: return 1;
    //         }
    //     };

    //     // Process each parcel
    //     parcel_data.parcels.forEach(parcel => {
    //         extraspaceCount++; // Each parcel is counted (total number of individual parcels)
    //         const quantitySp = getQuantityInSmallParcels(parcel.size);

    //         if (parcel.isSeatParcel) {
    //             seatParcelCount++; // Each seat parcel counts as 1 seat
    //             // Seat parcels use seats, not extra space, so don't reduce extraspace_parcel_count_sp
    //         } else {
    //             // Only extra space parcels reduce extraspace_parcel_count_sp
    //             extraspaceParcelCountSp += quantitySp;
    //         }
    //     });

    //     // Update booking with parcel information
    //     // extraspace_occupied_sp: add the values removed from extraspace_parcel_count_sp
    //     bookingUpdateQuery += `,
    //          seat_parcel_count = seat_parcel_count + ?,
    //          extraspace_count = extraspace_count + ?,
    //          extraspace_parcel_count_sp = GREATEST(0, extraspace_parcel_count_sp - ?),
    //          extraspace_occupied_sp = extraspace_occupied_sp + ?,
    //          total_seats_available = GREATEST(0, total_seats_available - ?)`;

    //     bookingUpdateParams.push(
    //         seatParcelCount,
    //         extraspaceCount,
    //         extraspaceParcelCountSp,
    //         extraspaceParcelCountSp, // Add to extraspace_occupied_sp the same amount removed from extraspace_parcel_count_sp
    //         seatParcelCount // Reduce seats by the number of seat parcels
    //     );
    // }

    // bookingUpdateQuery += ` WHERE id = ?`;
    // bookingUpdateParams.push(booking_id);

    // await connection.execute(bookingUpdateQuery, bookingUpdateParams);

    // // Check if payment equals or exceeds expected payment
    // const totalAmountNeeded = parseFloat(booking.total_amount_needed || 0);
    // if (newTotalPaid >= totalAmountNeeded && totalAmountNeeded > 0) {
    //     // The status change will be here
    //     await connection.execute(
    //         "UPDATE bookings SET booking_status = 'fully_paid' WHERE id = ?",
    //         [booking_id]
    //     );
    // }


    //END OF THE COMMENT

    // If parcel booking, add individual parcels to parcel table (booking_parcels already inserted above)
    let parcelResult = null;
    if (isParcelBooking && bookingParcelId) {
      try {
        // Get sender_code and receiver_code from the booking_parcels record we just created
        const [bookingParcelsRecord] = await connection.execute(
          "SELECT sender_code, receiver_code FROM booking_parcels WHERE ID = ?",
          [bookingParcelId]
        );

        const senderCode = bookingParcelsRecord[0]?.sender_code || "";
        const receiverCode = bookingParcelsRecord[0]?.receiver_code || "";

        // Generate unique parcel numbers for each parcel (must be globally unique)
        // Get the maximum parcel_number globally to ensure uniqueness
        const [maxParcelNumber] = await connection.execute(
          "SELECT MAX(parcel_number) as max_num FROM parcel"
        );
        let nextParcelNumber = (maxParcelNumber[0].max_num || 0) + 1;

        // Helper function to generate unique parcel_number globally
        const generateUniqueParcelNumber = async () => {
          let parcelNumber;
          let numberExists = true;
          let attempts = 0;
          const maxAttempts = 50;

          while (numberExists && attempts < maxAttempts) {
            // Start from nextParcelNumber and increment if needed
            parcelNumber = nextParcelNumber;

            // Check if this parcel_number exists globally (must be unique)
            const [existingNumber] = await connection.execute(
              "SELECT ID FROM parcel WHERE parcel_number = ?",
              [parcelNumber]
            );
            numberExists = existingNumber.length > 0;

            if (numberExists) {
              nextParcelNumber++;
            }
            attempts++;
          }

          if (numberExists) {
            throw new Error(
              `Failed to generate unique parcel_number after ${maxAttempts} attempts`
            );
          }

          nextParcelNumber++; // Increment for next parcel
          return parcelNumber;
        };

        // Helper function to get quantity compared to small parcel
        const getQuantityInSmallParcels = (size) => {
          switch (size) {
            case "large":
              return 4;
            case "medium":
              return 2;
            case "small":
              return 1;
            default:
              return 1;
          }
        };

        // Insert each individual parcel into parcel table
        const insertedParcels = [];
        for (const parcel of parcel_data.parcels) {
          const parcelNumber = await generateUniqueParcelNumber();
          const quantitySp = getQuantityInSmallParcels(parcel.size);

          // Insert parcel
          const [parcelInsert] = await connection.execute(
            `INSERT INTO parcel (
                            booking_parcels_id, parcel_number, size, 
                            quantity_compared_to_sp, images
                        ) VALUES (?, ?, ?, ?, ?)`,
            [
              bookingParcelId,
              parcelNumber,
              parcel.size || "small",
              quantitySp,
              JSON.stringify(parcel.images || []),
            ]
          );

          insertedParcels.push({
            id: parcelInsert.insertId,
            parcel_number: parcelNumber,
            size: parcel.size,
            quantity_compared_to_sp: quantitySp,
          });
        }

        parcelResult = {
          booking_parcels_id: bookingParcelId,
          sender_code: senderCode,
          receiver_code: receiverCode,
          parcels: insertedParcels,
        };
      } catch (error) {
        console.error(
          "Error adding individual parcels to parcel table:",
          error
        );
        // Don't fail the payment if parcel addition fails, but log it
      }
    }

    // Prepare passenger result (already inserted before payment above)
    if (isPassengerBooking && bookingPassengerId) {
      try {
        // Get passenger details from the record we already created
        const [passengerRecord] = await connection.execute(
          "SELECT passenger_number, code FROM booking_passengers WHERE ID = ?",
          [bookingPassengerId]
        );

        if (passengerRecord.length > 0) {
          passengerResult = {
            id: bookingPassengerId,
            passenger_number: passengerRecord[0].passenger_number,
            code: passengerRecord[0].code,
          };
        }
      } catch (error) {
        console.error("Error retrieving passenger result:", error);
      }
    }

    await connection.commit();

  

    let bookingtype;
    if(isPassengerBooking){
        bookingtype = bookingtypes.PASSENGER;
    }else{
        bookingtype = bookingtypes.PARCEL;
    }

    return {
      success: true,
      message: "Payment created successfully",
      payment: {
        id: result.insertId,
        paymentID: result.insertId,
        payment_status: payment_status,
        payment_gateway: payment_gateway,
      },
      passenger: passengerResult, // Include passenger info if added
      parcel: parcelResult, // Include parcel info if added
      bookingType: bookingtype
    };
  } catch (error) {
    await connection.rollback();
    console.error("Error creating payment:", error);
    return {
      success: false,
      message: "Failed to create payment",
      error: error.message,
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}






export const handleYocoWebhook = async (req, res) => {
  let connection;

  try {
    const webhookSecret = configurations.yoco.webhookSecret;
    if (!webhookSecret) {
      console.error("YOCO_WEBHOOK_SECRET not configured");
      return res.status(500).send("Webhook secret not configured");
    }

    console.log("Webhook secret:", webhookSecret);
    // ---- VERIFY WEBHOOK USING SVIX ----
    const headers = req.headers;
    const payload = req.body; // MUST be raw Buffer

    console.log("payload", payload);
    const wh = new Webhook(webhookSecret);

    let event;
    try {
      event = wh.verify(payload, {
        "webhook-id": headers["webhook-id"],
        "webhook-timestamp": headers["webhook-timestamp"],
        "webhook-signature": headers["webhook-signature"]
      });
      console.log("Webhook signature verification successful");
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send("Invalid signature");
    }

    // At this point the event is trusted
    console.log(" Yoco webhook event :", event);

    const metadata = event.payload?.metadata || {};
    const bookingId = metadata.bookingId;
    const paymentId = metadata.paymentId;
    const isPassengerBooking = metadata.isPassengerBooking;

    const amount =
      event.payload?.amount != null
        ? (parseInt(event.payload.amount, 10) / 100).toFixed(2)
        : null;

    const isSuccess =
      event.type === "checkout.completed" ||
      event.type === "payment.succeeded";

    const isFailure =
      event.type === "checkout.failed" ||
      event.type === "payment.failed";

    // Ignore unrelated events safely
    if (!isSuccess && !isFailure) {
      console.log("Ignoring unrelated Yoco event:", event.type);
      return res.sendStatus(200);
    }

    // ---- DATABASE TRANSACTION ----
    connection = await pool.getConnection();
    await connection.beginTransaction();

    if (isSuccess) {
      await updateBookingforPayment(
        bookingId,
        amount,
        isPassengerBooking,
        metadata.parcel_data || null,
        connection
      );

      if (paymentId) {
        await connection.execute(
          "UPDATE payments SET payment_status = 'completed' , transaction_id = ? WHERE ID = ?",
          [event.payload.id, paymentId]
        );
      }else{
          await connection.execute(
          "UPDATE payments SET payment_status = 'completed' , transaction_id = ? WHERE checkout_id = ?",
          [event.payload.id, metadata.checkoutId]
        );
      }

      if (isPassengerBooking) {
        await connection.execute(
          "UPDATE booking_passengers SET booking_passenger_status = 'confirmed' WHERE ID = ?",
          [metadata.passengerInfo_fromCreation?.id]
        );
      } else {
        await connection.execute(
          "UPDATE booking_parcels SET status = 'confirmed' WHERE ID = ?",
          [metadata.parcelInfo_fromCreation?.booking_parcels_id]
        );
      }
    }

    if (isFailure) {
      if (paymentId) {
        await connection.execute(
          "UPDATE payments SET payment_status = 'failed' , transaction_id = ?  WHERE ID = ?",
          [ event.payload.id, paymentId]
        );
      }else{
          await connection.execute(
          "UPDATE payments SET payment_status = 'failed', transaction_id = ? WHERE checkout_id = ?",
          [event.payload.id, metadata.checkoutId]
        );
      }

      if (isPassengerBooking) {
        await connection.execute(
          "UPDATE booking_passengers SET booking_passenger_status = 'failed' WHERE ID = ?",
          [metadata.passengerInfo_fromCreation?.id]
        );
      } else {
        await connection.execute(
          "UPDATE booking_parcels SET status = 'failed' WHERE ID = ?",
          [metadata.parcelInfo_fromCreation?.booking_parcels_id]
        );
      }
    }

    console.log("Booking ID:", bookingId, "has been updated for payment");
    await connection.commit();
    res.sendStatus(200);
  } catch (err) {
    if (connection) await connection.rollback();
    console.error("Unhandled webhook error:", err);
    res.sendStatus(500); // Yoco will retry
  } finally {
    if (connection) connection.release();
  }
};

export const failedPaymentWebhook = async (req, res) => {
  let connection;
  try {
    const webhookSecret = configurations.yoco.webhookSecret;
    if (!webhookSecret) {
      console.error("YOCO_WEBHOOK_SECRET not configured");
      return res.status(500).send("Webhook secret not configured");
    }
  }catch (err) {
    console.error("Failed payment webhook error:", err);
    res.sendStatus(500);
  }
};

async function updateBookingforPayment( 
  booking_id,
  amount,
  isPassengerBooking,
  parcel_data,
  connection
) {
  // Logic to update booking

  // Prepare booking update query
  // Note: payment_id column has been removed from bookings table
  // Note: Booking status should not be changed here - leave it as 'pending' or whatever it currently is

  const db = connection || pool;

  console.log("Updating booking ID:", booking_id, "with amount:", amount , "isPassengerBooking:", isPassengerBooking , "parcel_data:", parcel_data ); ;
  let bookingUpdateQuery = `  UPDATE bookings
  SET total_amount_paid = total_amount_paid + ? `;
  let bookingUpdateParams = [amount];

  // If passenger booking, update passenger_count and total_seats_available
  if (isPassengerBooking) {
    bookingUpdateQuery += `, passenger_count = passenger_count + 1,
                 total_seats_available = GREATEST(0, total_seats_available - 1)`;
  }

  // If parcel booking, update parcel-related fields
  if (isPassengerBooking === false) {
    // Calculate parcel metrics
    let seatParcelCount = 0; // Number of seats bought for parcels (each parcel that is a seat parcel counts as 1)
    let extraspaceCount = 0; // Number of individual parcels (total parcels)
    let extraspaceParcelCountSp = 0; // Total small parcel equivalents to reduce from extraspace_parcel_count_sp

    // Helper function to get quantity compared to small parcel
    const getQuantityInSmallParcels = (size) => {
      switch (size) {
        case "large":
          return 4;
        case "medium":
          return 2;
        case "small":
          return 1;
        default:
          return 1;
      }
    };

    // Process each parcel
    parcel_data?.parcels.forEach((parcel) => {
      extraspaceCount++; // Each parcel is counted (total number of individual parcels)
      const quantitySp = getQuantityInSmallParcels(parcel.size);

      if (parcel.isSeatParcel) {
        seatParcelCount++; // Each seat parcel counts as 1 seat
        // Seat parcels use seats, not extra space, so don't reduce extraspace_parcel_count_sp
      } else {
        // Only extra space parcels reduce extraspace_parcel_count_sp
        extraspaceParcelCountSp += quantitySp;
      }
    });

    // Update booking with parcel information
    // extraspace_occupied_sp: add the values removed from extraspace_parcel_count_sp
    bookingUpdateQuery += `, 
                 seat_parcel_count = seat_parcel_count + ?,
                 extraspace_count = extraspace_count + ?,
                 extraspace_parcel_count_sp = GREATEST(0, extraspace_parcel_count_sp - ?),
                 extraspace_occupied_sp = extraspace_occupied_sp + ?,
                 total_seats_available = GREATEST(0, total_seats_available - ?)`;

    bookingUpdateParams.push(
      seatParcelCount,
      extraspaceCount,
      extraspaceParcelCountSp,
      extraspaceParcelCountSp, // Add to extraspace_occupied_sp the same amount removed from extraspace_parcel_count_sp
      seatParcelCount // Reduce seats by the number of seat parcels
    );
  }

  bookingUpdateQuery += ` WHERE   ID = ?`;
  bookingUpdateParams.push(booking_id);

  await db.execute(bookingUpdateQuery, bookingUpdateParams);

  //get total amount needed from booking
  const getBooking = await db.execute(
    "SELECT total_amount_needed, total_amount_paid FROM bookings WHERE ID = ?",
    [booking_id]
  );
    const bookingData = getBooking[0][0];

  // Check if payment equals or exceeds expected payment
  const totalAmountNeeded = parseFloat(bookingData.total_amount_needed || 0);
  const newTotalPaid = parseFloat(bookingData.total_amount_paid || 0);
  if (newTotalPaid >= totalAmountNeeded && totalAmountNeeded > 0) {
    // The status change will be here
    await db.execute(
      "UPDATE bookings SET booking_status = 'fully_paid' WHERE ID = ?",
      [booking_id]
    );
  }
}


// ...existing code...

// Call from webhook: pass connection so updates participate in same transaction
// await updateBookingforPayment( bookingId, amount, isPassengerBooking, metadata.parcel_data || null, connection );

// export async function updateBookingforPayment(
//   booking_id,
//   amount,
//   isPassengerBooking = null,
//   parcel_data = null,
//   connection = null // optional transaction connection
// ) {
//   const db = connection || pool;
//   try {
//     if (!booking_id) throw new Error("booking_id is required");
//     const amountNum = Number(amount);
//     if (isNaN(amountNum) || amountNum <= 0) throw new Error("amount must be a positive number");

//     // Load booking (use provided connection if given)
//     const [bookingRows] = await db.execute("SELECT * FROM bookings WHERE ID = ?", [booking_id]);
//     if (!bookingRows || bookingRows.length === 0) throw new Error("Booking not found");
//     const booking = bookingRows[0];

//     // Determine booking type when not provided
//     if (isPassengerBooking === null) {
//       isPassengerBooking = true;
//     }

//     // Prepare update
//     let bookingUpdateQuery = `UPDATE bookings SET total_amount_paid = total_amount_paid + ?`;
//     const bookingUpdateParams = [amountNum];

//     if (isPassengerBooking) {
//       bookingUpdateQuery += `, passenger_count = passenger_count + 1, total_seats_available = GREATEST(0, total_seats_available - 1)`;
//     } else {
//       // Parcel branch - be defensive and compute metrics from parcel_data or DB
//       let seatParcelCount = 0;
//       let extraspaceCount = 0;
//       let extraspaceParcelCountSp = 0;

//       const getQuantityInSmallParcels = (size) => {
//         switch (String(size || "").toLowerCase()) {
//           case "large": return 4;
//           case "medium": return 2;
//           case "small": return 1;
//           default: return 1;
//         }
//       };

//       if (parcel_data && Array.isArray(parcel_data.parcels) && parcel_data.parcels.length) {
//         parcel_data.parcels.forEach(p => {
//           extraspaceCount++;
//           const qty = getQuantityInSmallParcels(p.size);
//           if (p.isSeatParcel) seatParcelCount++;
//           else extraspaceParcelCountSp += qty;
//         });
//       } else {
//         // fallback: derive from parcel table linked to this booking
//         const [parcelRows] = await db.execute(
//           `SELECT p.size, p.quantity_compared_to_sp, bp.ID as booking_parcels_id
//             FROM parcel p
//             JOIN booking_parcels bp ON p.booking_parcels_id = bp.ID
//             WHERE bp.booking_id = ?`,
//           [booking_id]
//         );
//         parcelRows.forEach(p => {
//           extraspaceCount++;
//           const qty = Number(p.quantity_compared_to_sp || getQuantityInSmallParcels(p.size));
//           if (String(p.size).toLowerCase() === "seat") seatParcelCount++;
//           else extraspaceParcelCountSp += qty;
//         });
//       }

//       bookingUpdateQuery += `, seat_parcel_count = seat_parcel_count + ?, extraspace_count = extraspace_count + ?, extraspace_parcel_count_sp = GREATEST(0, extraspace_parcel_count_sp - ?), extraspace_occupied_sp = extraspace_occupied_sp + ?, total_seats_available = GREATEST(0, total_seats_available - ?)`;
//       bookingUpdateParams.push(seatParcelCount, extraspaceCount, extraspaceParcelCountSp, extraspaceParcelCountSp, seatParcelCount);
//     }

//     bookingUpdateQuery += ` WHERE ID = ?`;
//     bookingUpdateParams.push(booking_id);

//     await db.execute(bookingUpdateQuery, bookingUpdateParams);

//     // Re-fetch booking totals from DB to determine if fully paid
//     const [brows] = await db.execute("SELECT total_amount_needed, total_amount_paid FROM bookings WHERE ID = ?", [booking_id]);
//     const bookingData = brows[0] || {};
//     const totalAmountNeeded = parseFloat(bookingData.total_amount_needed || 0);
//     const newTotalPaid = parseFloat(bookingData.total_amount_paid || 0);
//     if (newTotalPaid >= totalAmountNeeded && totalAmountNeeded > 0) {
//       await db.execute("UPDATE bookings SET booking_status = 'fully_paid' WHERE ID = ?", [booking_id]);
//     }

//     return { success: true };
//   } catch (err) {
//     console.error("updateBookingforPayment error:", err);
//     throw err;
//   }
// }

// ...existing code...
export default {
  getMyPayments,
  getPaymentDetails,
  processPaymentCallback,
  getOwnerPayments,
  getAllPayments,
  processRefund,
  initiateYocoCheckout,
  handleYocoWebhook,
  getPaymentStatus
};
