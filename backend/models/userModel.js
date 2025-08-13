
import poolDb from "../config/db.js";

const createUser = async (name, email, hashedPassword, verificationToken) => {
  let db;
  try{
    db = await poolDb.getConnection();

  const [result] = await db.execute(
    'INSERT INTO users (name, email, password, verification_token, email_verified, user_type) VALUES (?, ?, ?, ?, ?, ?)',
    [name, email, hashedPassword, verificationToken, false, 'client']
  );
  return result.insertId;
  }catch(error){
    console.log(error);
   return null;
    }finally {
        if (db) db.release(); // release connection back to the pool
    }

};

const createSocialUser = async (userData) => {
  let db;
  try{
    db = await poolDb.getConnection();

    const { name, email, socialId, socialProvider, profilePicture } = userData;
    
    const [result] = await db.execute(
      'INSERT INTO users (name, email, social_id, social_provider, profile_picture, user_type) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, socialId, socialProvider, profilePicture, 'client']
    );
    return result.insertId;
  }catch(error){
    console.log(error);
    return null;
  }finally {
    if (db) db.release();
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

const getUserBySocialId = async (socialId, provider) => {
  let db;
  try{
    db = await poolDb.getConnection();
    const [rows] = await db.execute('SELECT * FROM users WHERE social_id = ? AND social_provider = ?', [socialId, provider]);
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

export default {
  createUser,
  createSocialUser,
  getUserByEmail,
  getUserById,
  getUserBySocialId,
  getUserByVerificationToken,
  verifyUserEmail,
  updateVerificationToken
};
