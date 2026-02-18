// jobs/bookingJob.js
import  bookingQueue from "../queue/bookingQueue.js";
import pool from "../db.js";

bookingQueue.process(async (job) => {
  const { bookingId } = job.data;
  console.log("Processing booking", bookingId);
  const result = await closeBooking(bookingId);
  console.log("Booking result:", result);
});


// const BOOKING_STATUS = {
//   PENDING: "pending",
//   FULLY_PAID: "fully_paid",
//   ACTIVE: "active",
//   CANCELLED: "cancelled"
// };

// close the booking appropriately based on its current status
async function closeBooking(bookingId) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      "SELECT booking_status FROM bookings WHERE ID = ? FOR UPDATE",
      [bookingId]
    );

    if (rows.length === 0) {
      await conn.rollback();
      return { success: false, message: "Booking not found" };
    }

    const status = rows[0].booking_status;

    if (status === "pending") {
      // refund logic here (insert refund, update wallet, etc.)
      await conn.rollback(); // or commit, depending on logic
      return { success: true, message: "Pending booking refunded" };
    }

    if (status === "fully_paid") {
      const [result] = await conn.execute(
        "UPDATE bookings SET booking_status = ? WHERE ID = ?",
        ["active", bookingId]
      );

      if (result.affectedRows === 0) {
        throw new Error("Status update failed");
      }

      await conn.commit();
      return { success: true, message: "Updated successfully" };
    }

    await conn.rollback();
    return {
      success: false,
      message: `Cannot close booking from status: ${status}`
    };

  } catch (err) {
    await conn.rollback();
    console.error("closeBooking error:", err);
    return { success: false, message: "Internal server error" };
  } finally {
    conn.release();
  }
}

