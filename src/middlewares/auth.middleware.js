import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

const authMiddleware = (req, res, next) => {
  console.log('Auth headers:', req.headers.authorization);
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    // console.log('No token provided in request');
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    // console.log('Token decoded successfully:', decoded);
    req.user = decoded;
    next();
  } catch (error) {
    // console.error('Token verification error:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export default authMiddleware;