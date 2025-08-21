import poolDb from "../config/db.js";

const createUserQuestion = async (questionData) => {
  let db;
  try {
    db = await poolDb.getConnection();
    const { user_id, question, email } = questionData;
    
    const [result] = await db.execute(
      'INSERT INTO user_questions (user_id, question, email, status) VALUES (?, ?, ?, ?)',
      [user_id, question, email, 'pending']
    );
    
    return result.insertId;
  } catch (error) {
    console.log('Error creating user question:', error);
    return null;
  } finally {
    if (db) db.release();
  }
};

const getUserQuestions = async (userId) => {
  let db;
  try {
    db = await poolDb.getConnection();
    const [rows] = await db.execute(
      'SELECT * FROM user_questions WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  } catch (error) {
    console.log('Error getting user questions:', error);
    return [];
  } finally {
    if (db) db.release();
  }
};

const getQuestionById = async (id, userId) => {
  let db;
  try {
    db = await poolDb.getConnection();
    const [rows] = await db.execute(
      'SELECT * FROM user_questions WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return rows[0];
  } catch (error) {
    console.log('Error getting question by ID:', error);
    return null;
  } finally {
    if (db) db.release();
  }
};

const getAllUserQuestions = async () => {
  let db;
  try {
    db = await poolDb.getConnection();
    const [rows] = await db.execute(`
      SELECT q.*, u.id as user_id, u.username, u.email 
      FROM user_questions q 
      JOIN users u ON q.user_id = u.id 
      ORDER BY q.created_at DESC
    `);
    return rows;
  } catch (error) {
    console.log('Error getting all user questions:', error);
    return [];
  } finally {
    if (db) db.release();
  }
};

const answerUserQuestion = async (id, admin_answer, status = 'answered') => {
  let db;
  try {
    db = await poolDb.getConnection();
    const [result] = await db.execute(
      'UPDATE user_questions SET admin_answer = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [admin_answer, status, id]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.log('Error answering user question:', error);
    return false;
  } finally {
    if (db) db.release();
  }
};

export default {
  createUserQuestion,
  getUserQuestions,
  getQuestionById,
  getAllUserQuestions,
  answerUserQuestion
};
