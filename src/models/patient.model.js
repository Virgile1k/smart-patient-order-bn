import { db } from '../firebase.config.js';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  limit,
  orderBy 
} from 'firebase/firestore';

/**
 * Creates a new patient record in Firestore
 * @param {Object} data - Patient data containing contact and vitals information
 * @returns {Promise<Object>} Object containing patientId and success status
 */
const registerPatient = async (data) => {
  try {
    const patientId = `P${Date.now()}`;
    
    // Validate required fields
    if (!data.contact || !data.contact.name) {
      throw new Error('Patient name is required');
    }
    
    if (!data.vitals) {
      throw new Error('Vitals information is required');
    }
    
    // Ensure vitals object has all required fields
    const requiredVitals = ['height', 'weight', 'bloodPressure', 'heartRate', 'bodyTemperature', 'age'];
    const missingVitals = requiredVitals.filter(field => !data.vitals[field]);
    
    if (missingVitals.length > 0) {
      throw new Error(`Missing required vital signs: ${missingVitals.join(', ')}`);
    }
    
    // Create patient document with proper structure
    const patientData = {
      contact: {
        name: data.contact.name,
        contactNumber: data.contact.contactNumber || null,
        email: data.contact.email || null,
        address: data.contact.address || null,
        gender: data.contact.gender || null
      },
      vitals: {
        height: data.vitals.height,
        weight: data.vitals.weight,
        bloodPressure: data.vitals.bloodPressure,
        heartRate: data.vitals.heartRate,
        bodyTemperature: data.vitals.bodyTemperature,
        age: data.vitals.age
      },
      additionalNotes: data.additionalNotes || '',
      severity: 'Pending',
      status: 'Queued',
      timestamp: new Date().toISOString(),
      assignedStaff: {
        doctor: null,
        nurse: null
      }
    };
    
    await setDoc(doc(db, 'patients', patientId), patientData);
    
    return { patientId, ...patientData, success: true };
  } catch (error) {
    console.error('Error registering patient:', error);
    throw new Error(`Failed to register patient: ${error.message}`);
  }
};

/**
 * Updates an existing patient record
 * @param {string} patientId - Patient ID
 * @param {Object} data - Updated patient data
 * @returns {Promise<Object>} Object containing success status and updated patient data
 */
const updatePatient = async (patientId, data) => {
  try {
    const patientRef = doc(db, 'patients', patientId);
    const patientDoc = await getDoc(patientRef);
    
    if (!patientDoc.exists()) {
      throw new Error(`Patient with ID ${patientId} not found`);
    }
    
    // If updating assignedStaff, ensure it has the proper structure
    if (data.assignedStaff !== undefined) {
      // Make sure it has the expected structure
      if (!data.assignedStaff.doctor) {
        data.assignedStaff.doctor = null;
      }
      if (!data.assignedStaff.nurse) {
        data.assignedStaff.nurse = null;
      }
    }
    
    await updateDoc(patientRef, { 
      ...data, 
      updatedAt: new Date().toISOString()
    });
    
    // Get updated patient data
    const updatedPatientDoc = await getDoc(patientRef);
    return { 
      success: true,
      id: patientId,
      ...updatedPatientDoc.data()
    };
  } catch (error) {
    console.error('Error updating patient:', error);
    throw new Error(`Failed to update patient: ${error.message}`);
  }
};

/**
 * Updates a patient's status
 * @param {string} patientId - Patient ID
 * @param {string} status - New status value
 * @returns {Promise<Object>} Updated patient data
 */
const updatePatientStatus = async (patientId, status) => {
  try {
    const validStatuses = ['Queued', 'Assigned', 'In Progress', 'Completed', 'Discharged'];
    
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    return await updatePatient(patientId, { status });
  } catch (error) {
    throw new Error(`Failed to update patient status: ${error.message}`);
  }
};

/**
 * Retrieves a patient by ID
 * @param {string} patientId - Patient ID
 * @returns {Promise<Object|null>} Patient data or null if not found
 */
const getPatientById = async (patientId) => {
  try {
    const patientDoc = await getDoc(doc(db, 'patients', patientId));
    
    if (patientDoc.exists()) {
      const data = patientDoc.data();
      
      // Ensure assignedStaff has proper structure when retrieving
      if (!data.assignedStaff) {
        data.assignedStaff = { doctor: null, nurse: null };
      } else if (typeof data.assignedStaff === 'object') {
        if (!('doctor' in data.assignedStaff)) {
          data.assignedStaff.doctor = null;
        }
        if (!('nurse' in data.assignedStaff)) {
          data.assignedStaff.nurse = null;
        }
      }
      
      return { id: patientDoc.id, ...data };
    }
    return null;
  } catch (error) {
    console.error('Error fetching patient:', error);
    throw new Error(`Failed to fetch patient: ${error.message}`);
  }
};

/**
 * Gets patients with status 'Queued'
 * @returns {Promise<Array>} Array of queued patients
 */
const getQueuedPatients = async () => {
  try {
    const q = query(
      collection(db, 'patients'), 
      where('status', '==', 'Queued'),
      orderBy('timestamp', 'asc'),
      limit(20)
    );
    
    const querySnapshot = await getDocs(q);
    const patients = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Ensure assignedStaff has proper structure
      if (!data.assignedStaff) {
        data.assignedStaff = { doctor: null, nurse: null };
      } else if (typeof data.assignedStaff === 'object') {
        if (!('doctor' in data.assignedStaff)) {
          data.assignedStaff.doctor = null;
        }
        if (!('nurse' in data.assignedStaff)) {
          data.assignedStaff.nurse = null;
        }
      }
      
      patients.push({ id: doc.id, ...data });
    });
    
    return patients;
  } catch (error) {
    console.error('Error fetching queued patients:', error);
    throw new Error(`Failed to fetch queued patients: ${error.message}`);
  }
};

/**
 * Gets patients assigned to a specific doctor
 * @param {string} doctorId - ID of the doctor
 * @returns {Promise<Array>} Array of assigned patients
 */
const getAssignedPatients = async (doctorId) => {
  try {
    if (!doctorId) {
      throw new Error('Doctor ID is required');
    }
    
    const q = query(
      collection(db, 'patients'),
      where('assignedStaff.doctor', '==', doctorId),
      where('status', 'in', ['Assigned', 'In Progress']),
      orderBy('timestamp', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    const patients = [];
    
    querySnapshot.forEach((doc) => {
      patients.push({ id: doc.id, ...doc.data() });
    });
    
    return patients;
  } catch (error) {
    console.error('Error fetching assigned patients:', error);
    throw new Error(`Failed to fetch assigned patients: ${error.message}`);
  }
};

export { 
  registerPatient, 
  updatePatient, 
  getPatientById, 
  getQueuedPatients,
  updatePatientStatus,
  getAssignedPatients
};