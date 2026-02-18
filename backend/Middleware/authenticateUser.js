import jwt from 'jsonwebtoken';
import config from "../config/configurations.js";

const authenticateUser = (req, res, next) => {
  // Check for token in cookies first (for traditional web apps)
  let token = req.cookies.token;

  // If no cookie token, check Authorization header (for API calls with Bearer token)
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }
  }

  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Access denied. No token provided. Please log in.' 
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      message: 'Invalid or expired token. Please log in again.' 
    });
  }
};

export default authenticateUser;
