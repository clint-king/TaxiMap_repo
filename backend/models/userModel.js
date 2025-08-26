
import poolDb from "../config/db.js";

const createUser = async (name, email, hashedPassword, verificationToken, username = null, phone = null, location = null) => {
  let db;
  try{
    db = await poolDb.getConnection();

  const [result] = await db.execute(
    'INSERT INTO users (name, email, password, verification_token, email_verified, user_type, username, phone, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [name, email, hashedPassword, verificationToken, false, 'client', username, phone, location]
  );
  return result.insertId;
  }catch(error){
    console.log(error);
   return null;
    }finally {
        if (db) db.release(); // release connection back to the pool
    }

};



const getUserByEmail = async (email) => {
  let db;
  try{
    db = await poolDb.getConnection();
const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0];
  
  }catch(error){
  console.log(error);
   return null;
  }finally {
        if (db) db.release(); // release connection back to the pool
    }
  
};

const getUserById = async (id) => {
  let db;
  try{
    db = await poolDb.getConnection();
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  }catch(error){
    console.log(error);
    return null;
  }finally {
    if (db) db.release();
  }
};



const getUserByVerificationToken = async (token) => {
  let db;
  try{
    db = await poolDb.getConnection();
    const [rows] = await db.execute('SELECT * FROM users WHERE verification_token = ?', [token]);
    return rows[0];
  }catch(error){
    console.log(error);
    return null;
  }finally {
    if (db) db.release();
  }
};

const verifyUserEmail = async (userId) => {
  let db;
  try{
    db = await poolDb.getConnection();
    const [result] = await db.execute(
      'UPDATE users SET email_verified = ?, verification_token = NULL WHERE id = ?',
      [true, userId]
    );
    return result.affectedRows > 0;
  }catch(error){
    console.log(error);
    return false;
  }finally {
    if (db) db.release();
  }
};

const updateVerificationToken = async (userId, newToken) => {
  let db;
  try{
    db = await poolDb.getConnection();
    const [result] = await db.execute(
      'UPDATE users SET verification_token = ? WHERE id = ?',
      [newToken, userId]
    );
    return result.affectedRows > 0;
  }catch(error){
    console.log(error);
    return false;
  }finally {
    if (db) db.release();
  }
};

const updateUserProfile = async (userId, profileData) => {
  let db;
  try{
    db = await poolDb.getConnection();
    const { name, username, phone, location, profile_picture } = profileData;
    console.log("name:", name);
    console.log("username:", username);
    console.log("phone:", phone);
    console.log("location:", location);
    console.log("profile_picture:", profile_picture);
    console.log("userId:", userId);
    
    // Build dynamic update query based on provided fields
    const updateFields = [];
    const updateValues = [];
    
    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (username !== undefined) {
      updateFields.push('username = ?');
      updateValues.push(username);
    }
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(phone);
    }
    if (location !== undefined) {
      updateFields.push('location = ?');
      updateValues.push(location);
    }
    if (profile_picture !== undefined) {
      updateFields.push('profile_picture = ?');
      updateValues.push(profile_picture);
    }
    
    // Always update the updated_at timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    
    // Add userId to the end for WHERE clause
    updateValues.push(userId);
    
    const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    console.log("Update query:", updateQuery);
    console.log("Update values:", updateValues);
    
    const [result] = await db.execute(updateQuery, updateValues);
    return result.affectedRows > 0;
  }catch(error){
    console.log(error);
    return false;
  }finally {
    if (db) db.release();
  }
};

const getUserByUsername = async (username) => {
  let db;
  try{
    db = await poolDb.getConnection();
    const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
  }catch(error){
    console.log(error);
    return null;
  }finally {
    if (db) db.release();
  }
};

const updatePassword = async (userId, hashedPassword) => {
  let db;
  try{
    db = await poolDb.getConnection();
    const [result] = await db.execute(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, userId]
    );
    return result.affectedRows > 0;
  }catch(error){
    console.log(error);
    return false;
  }finally {
    if (db) db.release();
  }
};

const updateEmail = async (userId, newEmail) => {
  let db;
  try{
    db = await poolDb.getConnection();
    const [result] = await db.execute(
      'UPDATE users SET email = ?, email_verified = true, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newEmail, userId]
    );
    return result.affectedRows > 0;
  }catch(error){
    console.log(error);
    return false;
  }finally {
    if (db) db.release();
  }
};

const updateEmailWithVerification = async (userId, newEmail, verificationToken) => {
  let db;
  try{
    db = await poolDb.getConnection();
    const [result] = await db.execute(
      'UPDATE users SET email = ?, verification_token = ?, email_verified = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newEmail, verificationToken, userId]
    );
    return result.affectedRows > 0;
  }catch(error){
    console.log(error);
    return false;
  }finally {
    if (db) db.release();
  }
};

// Forgot password functions
const saveResetToken = async (userId, resetToken, resetTokenExpiry) => {
  let db;
  try{
    db = await poolDb.getConnection();
    const [result] = await db.execute(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [resetToken, resetTokenExpiry, userId]
    );
    return result.affectedRows > 0;
  }catch(error){
    console.log(error);
    return false;
  }finally {
    if (db) db.release();
  }
};

const getUserByResetToken = async (resetToken) => {
  let db;
  try{
    db = await poolDb.getConnection();
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
      [resetToken]
    );
    return rows[0];
  }catch(error){
    console.log(error);
    return null;
  }finally {
    if (db) db.release();
  }
};

const resetPassword = async (userId, hashedPassword) => {
  let db;
  try{
    db = await poolDb.getConnection();
    const [result] = await db.execute(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, userId]
    );
    return result.affectedRows > 0;
  }catch(error){
    console.log(error);
    return false;
  }finally {
    if (db) db.release();
  }
};

// User activity functions
const logUserActivity = async (userId, activityData) => {
  let db;
  try {
    db = await poolDb.getConnection();
    const { activity_type, activity_title, activity_description, ip_address, user_agent, device_info, location_info } = activityData;
    
    const [result] = await db.execute(
      'INSERT INTO user_activities (user_id, activity_type, activity_title, activity_description, ip_address, user_agent, device_info, location_info) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, activity_type, activity_title, activity_description, ip_address, user_agent, device_info, location_info]
    );
    
    return result.insertId;
  } catch (error) {
    console.log('Error logging user activity:', error);
    return null;
  } finally {
    if (db) db.release();
  }
};

const getUserActivities = async (userId, limit = 50, offset = 0) => {
  let db;
  try {
    console.log('getUserActivities called with:', { userId, limit, offset });
    console.log('Types:', { userId: typeof userId, limit: typeof limit, offset: typeof offset });
    
    db = await poolDb.getConnection();
    // Use query instead of execute for LIMIT and OFFSET
    const [rows] = await db.query(
      'SELECT * FROM user_activities WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?',
      [userId, parseInt(limit), parseInt(offset)]
    );
    return rows;
  } catch (error) {
    console.log('Error getting user activities:', error);
    return [];
  } finally {
    if (db) db.release();
  }
};

const getUserActivityStats = async (userId) => {
  let db;
  try {
    db = await poolDb.getConnection();
    const [rows] = await db.execute(
      'SELECT activity_type, COUNT(*) as count FROM user_activities WHERE user_id = ? GROUP BY activity_type',
      [userId]
    );
    return rows;
  } catch (error) {
    console.log('Error getting user activity stats:', error);
    return [];
  } finally {
    if (db) db.release();
  }
};

export default {
  createUser,
  getUserByEmail,
  getUserById,
  getUserByVerificationToken,
  verifyUserEmail,
  updateVerificationToken,
  updateUserProfile,
  getUserByUsername,
  updatePassword,
  updateEmail,
  updateEmailWithVerification,
  saveResetToken,
  getUserByResetToken,
  resetPassword,
  logUserActivity,
  getUserActivities,
  getUserActivityStats
};
