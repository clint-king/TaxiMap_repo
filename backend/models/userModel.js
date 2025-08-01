
import poolDb from "../config/db.js";

const createUser = async (name, email, hashedPassword) => {
  let db;
  try{
    db = await poolDb.getConnection();

  const [result] = await db.execute(
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
    [name, email, hashedPassword]
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

export default {
  createUser,
  getUserByEmail
};
