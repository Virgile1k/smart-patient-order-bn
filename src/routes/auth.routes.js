 // src/routes/auth.routes.js
import express from 'express';
import { login, registerUser, updateProfile, getProfile, getAllUsersController } from '../controller/auth/auth.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import multer from 'multer';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// Public routes
router.post('/login', login);
router.post('/register', upload.single('image'), registerUser);

// Protected routes
router.put('/profile/:uid', authMiddleware, upload.single('image'), updateProfile);
router.get('/profile/me', authMiddleware, getProfile);
// Add new route
router.get('/users', authMiddleware, getAllUsersController);

export default router;