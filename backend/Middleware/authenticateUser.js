import jwt from 'jsonwebtoken';

const authenticateUser = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) return res.status(401).json({ message: 'No token, unauthorized' });

  try {
    const decoded = jwt.verify(token, 'secret_key');
    console.log('JWT decoded:', decoded);
    console.log('JWT payload keys:', Object.keys(decoded));
    console.log('User ID in JWT:', decoded.id);
    req.user = decoded; // contains { id: ... }
    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export default  authenticateUser;
