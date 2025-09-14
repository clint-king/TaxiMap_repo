import poolDb from "../config/db.js";

const createFeedback = async (feedbackData) => {
  let db;
  try {
    db = await poolDb.getConnection();
    const { user_id, feedback_type, subject, message, images, rating } = feedbackData;
    
    const [result] = await db.execute(
      'INSERT INTO feedback (user_id, feedback_type, subject, message, images, rating, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user_id, feedback_type, subject, message, JSON.stringify(images || []), rating || null, 'pending']
    );
    
    return result.insertId;
  } catch (error) {
    console.log('Error creating feedback:', error);
    return null;
  } finally {
    if (db) db.release();
  }
};

const getUserFeedback = async (userId) => {
  let db;
  try {
    db = await poolDb.getConnection();
    const [rows] = await db.execute(
      'SELECT * FROM feedback WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  } catch (error) {
    console.log('Error getting user feedback:', error);
    return [];
  } finally {
    if (db) db.release();
  }
};

const getFeedbackById = async (id, userId) => {
  let db;
  try {
    db = await poolDb.getConnection();
    const [rows] = await db.execute(
      'SELECT * FROM feedback WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return rows[0];
  } catch (error) {
    console.log('Error getting feedback by ID:', error);
    return null;
  } finally {
    if (db) db.release();
  }
};

const getAllFeedback = async () => {
  let db;
  try {
    db = await poolDb.getConnection();
    const [rows] = await db.execute(`
      SELECT f.*, u.id as user_id, u.username, u.email 
      FROM feedback f 
      JOIN users u ON f.user_id = u.id 
      ORDER BY f.created_at DESC
    `);
    return rows;
  } catch (error) {
    console.log('Error getting all feedback:', error);
    return [];
  } finally {
    if (db) db.release();
  }
};

const updateFeedbackStatus = async (id, status, admin_response) => {
  let db;
  try {
    db = await poolDb.getConnection();
    const [result] = await db.execute(
      'UPDATE feedback SET status = ?, admin_response = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, admin_response, id]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.log('Error updating feedback status:', error);
    return false;
  } finally {
    if (db) db.release();
  }
};

export default {
  createFeedback,
  getUserFeedback,
  getFeedbackById,
  getAllFeedback,
  updateFeedbackStatus
};
