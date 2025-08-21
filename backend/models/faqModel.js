import poolDb from "../config/db.js";

const getAllFAQs = async (category = null) => {
  let db;
  try {
    db = await poolDb.getConnection();
    let query = 'SELECT * FROM faqs WHERE is_active = true';
    let params = [];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY category ASC, created_at DESC';
    
    const [rows] = await db.execute(query, params);
    return rows;
  } catch (error) {
    console.log('Error getting FAQs:', error);
    return [];
  } finally {
    if (db) db.release();
  }
};

const getFAQCategories = async () => {
  let db;
  try {
    db = await poolDb.getConnection();
    const [rows] = await db.execute('SELECT DISTINCT category FROM faqs WHERE is_active = true ORDER BY category');
    return rows.map(row => row.category);
  } catch (error) {
    console.log('Error getting FAQ categories:', error);
    return [];
  } finally {
    if (db) db.release();
  }
};

const createFAQ = async (faqData) => {
  let db;
  try {
    db = await poolDb.getConnection();
    const { question, answer, category = 'general' } = faqData;
    
    const [result] = await db.execute(
      'INSERT INTO faqs (question, answer, category, is_active) VALUES (?, ?, ?, ?)',
      [question, answer, category, true]
    );
    
    return result.insertId;
  } catch (error) {
    console.log('Error creating FAQ:', error);
    return null;
  } finally {
    if (db) db.release();
  }
};

const updateFAQ = async (id, faqData) => {
  let db;
  try {
    db = await poolDb.getConnection();
    const { question, answer, category, is_active } = faqData;
    
    const [result] = await db.execute(
      'UPDATE faqs SET question = ?, answer = ?, category = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [question, answer, category, is_active, id]
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    console.log('Error updating FAQ:', error);
    return false;
  } finally {
    if (db) db.release();
  }
};

const deleteFAQ = async (id) => {
  let db;
  try {
    db = await poolDb.getConnection();
    const [result] = await db.execute('DELETE FROM faqs WHERE id = ?', [id]);
    return result.affectedRows > 0;
  } catch (error) {
    console.log('Error deleting FAQ:', error);
    return false;
  } finally {
    if (db) db.release();
  }
};

const getFAQById = async (id) => {
  let db;
  try {
    db = await poolDb.getConnection();
    const [rows] = await db.execute('SELECT * FROM faqs WHERE id = ?', [id]);
    return rows[0];
  } catch (error) {
    console.log('Error getting FAQ by ID:', error);
    return null;
  } finally {
    if (db) db.release();
  }
};

export default {
  getAllFAQs,
  getFAQCategories,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  getFAQById
};
