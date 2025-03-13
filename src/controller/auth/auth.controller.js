import { loginUser, addUser, updateUserProfile, getUserProfile, getAllUsers } from '../../services/auth/auth.service.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Ensure JWT_SECRET is defined
const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

const login = async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Authenticate user with Firebase via loginUser service
    const user = await loginUser(email, password);
    
    // Log user data for debugging
    console.log('User authenticated:', { uid: user.uid, email: user.email, role: user.role });

    // Generate JWT token
    const token = jwt.sign(
      { uid: user.uid, email: user.email, role: user.role },
      SECRET_KEY,
      { expiresIn: '1h' } // Token expires in 1 hour
    );

    // Log the generated token for debugging
    console.log('Generated token:', token);

    // Send successful response
    res.status(200).json({
      message: 'Login successful',
      user: {
        uid: user.uid,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    // Log the error for debugging
    console.error('Login error:', error.message);
    res.status(401).json({ error: error.message || 'Invalid credentials' });
  }
};

const registerUser = async (req, res) => {
  const { email, password, role, fullName, phoneNumber, nationalId, emergencyContact, medicalConditions } = req.body;
  const image = req.file;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const newUser = await addUser({
      email,
      password,
      role,
      fullName,
      phoneNumber,
      nationalId,
      emergencyContact,
      medicalConditions,
      image: image ? image.buffer : null,
    });
    res.status(201).json({ message: 'User registered successfully', user: newUser });
  } catch (error) {
    console.error('Register error:', error.message);
    if (error.message.includes('email-already-in-use')) {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: error.message });
  }
};

const updateProfile = async (req, res) => {
  const { uid } = req.params;
  const { fullName, phoneNumber, nationalId, emergencyContact, medicalConditions } = req.body;
  const image = req.file;

  if (!uid) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  if (req.user.uid !== uid) {
    return res.status(403).json({ error: 'Unauthorized to update this profile' });
  }

  try {
    const updatedUser = await updateUserProfile(uid, {
      fullName,
      phoneNumber,
      nationalId,
      emergencyContact,
      medicalConditions,
      image: image ? image.buffer : null,
    });
    res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

const getProfile = async (req, res) => {
  const uid = req.params.uid || req.user.uid;

  if (!uid) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  if (req.user.uid !== uid) {
    return res.status(403).json({ error: 'Unauthorized to view this profile' });
  }

  try {
    const userProfile = await getUserProfile(uid);
    res.status(200).json({ message: 'Profile retrieved successfully', user: userProfile });
  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

const getAllUsersController = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }

    const users = await getAllUsers();
    res.status(200).json({ 
      message: 'Users retrieved successfully', 
      users,
      total: users.length 
    });
  } catch (error) {
    console.error('Get all users error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export { login, registerUser, updateProfile, getProfile, getAllUsersController };