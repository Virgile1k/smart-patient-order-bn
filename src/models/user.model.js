import { db } from '../firebase.config.js';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const createUser = async (uid, data) => {
  try {
    // Initialize with default availability
    await setDoc(doc(db, 'users', uid), {
      email: data.email,
      role: data.role || 'staff',
      fullName: data.fullName || '',
      phoneNumber: data.phoneNumber || '',
      nationalId: data.nationalId || '',
      emergencyContact: data.emergencyContact || '',
      medicalConditions: data.medicalConditions || '',
      imageUrl: data.imageUrl || '', // Store the URL of the uploaded image
      // Default to available if role is doctor or nurse
      availability: data.role?.toLowerCase().includes('doctor') || 
                   data.role?.toLowerCase().includes('nurse') ? 
                   true : null,
      // Set room number if provided (for doctors)
      ...(data.roomNumber ? { roomNumber: data.roomNumber } : {}),
      createdAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }
};

const updateUser = async (uid, data) => {
  try {
    const userRef = doc(db, 'users', uid);
    
    // Include updatedAt timestamp
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    await updateDoc(userRef, updateData);
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }
};

const getUserById = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
};

export { createUser, updateUser, getUserById };