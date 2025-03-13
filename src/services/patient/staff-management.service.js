import { db } from '../../firebase.config.js';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

/**
 * Updates a staff member's availability
 * @param {string} staffId The user ID of the staff member
 * @param {boolean} isAvailable Whether the staff member is available
 * @returns {Promise<Object>} The updated staff data
 */
const updateStaffAvailability = async (staffId, isAvailable) => {
  try {
    const userRef = doc(db, 'users', staffId);
    
    // Check if user exists
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error(`Staff member with ID ${staffId} not found`);
    }
    
    // Update availability
    await updateDoc(userRef, { 
      availability: isAvailable,
      updatedAt: new Date().toISOString()
    });
    
    // Get updated user data
    const updatedDoc = await getDoc(userRef);
    return { 
      staff_id: updatedDoc.id, 
      ...updatedDoc.data() 
    };
  } catch (error) {
    throw new Error(`Failed to update staff availability: ${error.message}`);
  }
};

/**
 * Adds room number to a doctor
 * @param {string} doctorId The user ID of the doctor
 * @param {string} roomNumber The room number to assign
 * @returns {Promise<Object>} The updated doctor data
 */
const assignDoctorRoom = async (doctorId, roomNumber) => {
  try {
    const userRef = doc(db, 'users', doctorId);
    
    // Check if user exists and is a doctor
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error(`Doctor with ID ${doctorId} not found`);
    }
    
    const userData = userDoc.data();
    if (!userData.role || !userData.role.toLowerCase().includes('doctor')) {
      throw new Error(`User with ID ${doctorId} is not a doctor`);
    }
    
    // Update room number
    await updateDoc(userRef, { 
      roomNumber: roomNumber,
      updatedAt: new Date().toISOString()
    });
    
    // Get updated user data
    const updatedDoc = await getDoc(userRef);
    return { 
      staff_id: updatedDoc.id, 
      ...updatedDoc.data() 
    };
  } catch (error) {
    throw new Error(`Failed to assign doctor room: ${error.message}`);
  }
};

export {
  updateStaffAvailability,
  assignDoctorRoom
};