import { db } from '../../firebase.config.js';
import { getDocs, collection, query, where } from 'firebase/firestore';

/**
 * Gets available staff members from the users collection
 * The issue was that we were looking for an 'availability' field that might not exist
 * and we were expecting specific roles that might be formatted differently
 */
const getAvailableStaff = async () => {
  try {
    // First, get all users who have a role of Doctor or Nurse (case insensitive)
    const usersCollection = collection(db, 'users');
    const querySnapshot = await getDocs(usersCollection);
    
    const staff = [];
    
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      
      // Check if user is staff (Doctor or Nurse) - case insensitive comparison
      const role = userData.role ? userData.role.toLowerCase() : '';
      const isDoctor = role.includes('doctor');
      const isNurse = role.includes('nurse');
      
      if (isDoctor || isNurse) {
        // Determine if staff is available
        // If availability field doesn't exist, assume they're available by default
        const isAvailable = userData.availability !== false;
        
        // Only add available staff
        if (isAvailable) {
          staff.push({
            staff_id: doc.id,
            // Store the exact role from the database
            role: isDoctor ? 'Doctor' : 'Nurse',
            fullName: userData.fullName || 'Unknown',
            roomNumber: userData.roomNumber || null,
            // Include other relevant data
            email: userData.email,
            phoneNumber: userData.phoneNumber,
            availability: true
          });
        }
      }
    });
    
    // Debug log
    console.log(`Found ${staff.length} available staff members:`, JSON.stringify(staff));
    
    return staff;
  } catch (error) {
    console.error(`Failed to fetch available staff: ${error.message}`);
    // Return empty array instead of throwing to prevent cascade failures
    return [];
  }
};

export { getAvailableStaff };