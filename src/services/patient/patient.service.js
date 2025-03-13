import { db } from '../../firebase.config.js';
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { getAvailableStaff } from './staff.service.js';
import { PatientQueue, analyzeVitalsWithGemini } from '../../utils/gemini.util.js';
import { io } from '../../server.js';

// Initialize the patient queue
const patientQueue = new PatientQueue();

// Set initial resources (adjust these based on your system’s capacity)
patientQueue.setResources(5, 10, 5); // 5 doctors, 10 nurses, 5 rooms

const MIN_QUEUE_THRESHOLD = 10; // Minimum number of patients before auto-assignment

const createPatient = async (data) => {
  try {
    const patientId = `P${Date.now()}`;
    
    const vitals = {
      height: data.vitals?.height ?? null,
      weight: data.vitals?.weight ?? null,
      bloodPressure: data.vitals?.bloodPressure ?? null,
      heartRate: data.vitals?.heartRate ?? null,
      bodyTemperature: data.vitals?.bodyTemperature ?? null,
      age: data.vitals?.age ?? null
    };

    if (!data.contact || !data.contact.name) {
      throw new Error('Patient name and contact information are required');
    }

    const requiredVitals = ['heartRate', 'bodyTemperature', 'bloodPressure'];
    const missingVitals = requiredVitals.filter(v => vitals[v] === null);
    if (missingVitals.length > 0) {
      throw new Error(`Required vitals missing: ${missingVitals.join(', ')}`);
    }

    await setDoc(doc(db, 'patients', patientId), {
      contact: data.contact,
      vitals,
      severity: 'Pending',
      status: 'Queued',
      queueType: null,
      queuePosition: null,
      registrationTime: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      assignedStaff: { doctor: null, nurse: null },
      additionalNotes: data.additionalNotes || '',
    });
    
    return { patientId, success: true };
  } catch (error) {
    throw new Error(`Failed to create patient: ${error.message}`);
  }
};

const updatePatient = async (patientId, data) => {
  try {
    const patientRef = doc(db, 'patients', patientId);
    
    if (data.assignedStaff) {
      data.assignedStaff = {
        doctor: data.assignedStaff.doctor || null,
        nurse: data.assignedStaff.nurse || null,
      };
    }
    
    await updateDoc(patientRef, { 
      ...data, 
      lastUpdated: new Date().toISOString() 
    });
    
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to update patient: ${error.message}`);
  }
};

const getPatientById = async (patientId) => {
  try {
    const patientDoc = await getDoc(doc(db, 'patients', patientId));
    if (patientDoc.exists()) {
      const data = patientDoc.data();
      data.assignedStaff = data.assignedStaff || { doctor: null, nurse: null };
      return { id: patientDoc.id, ...data };
    }
    return null;
  } catch (error) {
    throw new Error(`Failed to fetch patient: ${error.message}`);
  }
};

const registerPatient = async (patientData) => {
  try {
    const { patientId } = await createPatient(patientData);
    const patient = await getPatientById(patientId);

    // Add patient to the queue with AI-analyzed severity
    const queueInfo = await patientQueue.addPatient({
      id: patientId,
      vitals: patientData.vitals,
      contact: patientData.contact,
      additionalNotes: patientData.additionalNotes,
    });

    // Update Firestore with queue information
    await updatePatient(patientId, {
      severity: queueInfo.severity,
      status: 'Queued',
      queueType: queueInfo.severity,
      queuePosition: queueInfo.queuePosition,
    });

    // Check if queue threshold is met and attempt assignment
    if (patientQueue.getQueueLength() >= MIN_QUEUE_THRESHOLD) {
      await tryAutoAssign();
    }

    return {
      patientId,
      severity: queueInfo.severity,
      status: 'Queued',
      queueType: queueInfo.severity,
      queuePosition: queueInfo.queuePosition,
      estimatedWaitTime: queueInfo.estimatedWaitTime,
      message: 'Patient registered and placed in queue',
    };
  } catch (error) {
    throw new Error(`Failed to register and process patient: ${error.message}`);
  }
};

const getWaitingPatients = async () => {
  try {
    const q = query(collection(db, 'patients'), where('status', '==', 'Waiting'));
    const querySnapshot = await getDocs(q);
    const patients = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      data.assignedStaff = data.assignedStaff || { doctor: null, nurse: null };
      patients.push({ id: doc.id, ...data });
    });
    
    return patients;
  } catch (error) {
    throw new Error(`Failed to fetch waiting patients: ${error.message}`);
  }
};

const getQueueByType = async (queueType) => {
  try {
    const allPatients = patientQueue.getAllPatients();
    return allPatients.filter(p => p.severity === queueType).map(p => ({
      id: p.patient.id,
      ...p.patient,
      severity: p.severity,
      queuePosition: p.position,
      queueType: p.severity,
      status: 'Queued'
    }));
  } catch (error) {
    throw new Error(`Failed to fetch ${queueType} queue: ${error.message}`);
  }
};

const getQueuedPatients = async () => {
  try {
    const allPatients = patientQueue.getAllPatients();
    return allPatients.map(p => ({
      id: p.patient.id,
      ...p.patient,
      severity: p.severity,
      queuePosition: p.position,
      queueType: p.severity,
      status: 'Queued'
    }));
  } catch (error) {
    throw new Error(`Failed to fetch queued patients: ${error.message}`);
  }
};

const getAssignedPatients = async (doctorId) => {
  try {
    const q = query(
      collection(db, 'patients'),
      where('assignedStaff.doctor.id', '==', doctorId),
      where('status', 'in', ['Assigned', 'In Progress'])
    );
    
    const querySnapshot = await getDocs(q);
    const patients = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      data.assignedStaff = data.assignedStaff || { doctor: null, nurse: null };
      patients.push({
        patientId: doc.id,
        contact: data.contact,
        vitals: data.vitals,
        severity: data.severity || 'Pending',
        status: data.status,
        queueType: data.queueType,
        assignedStaff: data.assignedStaff,
        registrationTime: data.registrationTime,
        additionalNotes: data.additionalNotes || ''
      });
    });
    
    console.log(`Fetched ${patients.length} assigned patients for doctor ${doctorId}`);
    return patients;
  } catch (error) {
    throw new Error(`Failed to fetch assigned patients: ${error.message}`);
  }
};

const processWaitingQueue = async () => {
  const waitingPatients = await getWaitingPatients();
  
  if (waitingPatients.length === 0) {
    return { processed: 0, message: 'No patients in waiting queue' };
  }
  
  let processed = 0;
  
  for (const patient of waitingPatients) {
    const queueInfo = await patientQueue.addPatient({
      id: patient.id,
      vitals: patient.vitals,
      contact: patient.contact,
      additionalNotes: patient.additionalNotes
    });
    
    await updatePatient(patient.id, {
      severity: queueInfo.severity,
      status: 'Queued',
      queueType: queueInfo.severity,
      queuePosition: queueInfo.queuePosition
    });
    
    processed++;
  }
  
  // Check if threshold is met after processing waiting patients
  if (patientQueue.getQueueLength() >= MIN_QUEUE_THRESHOLD) {
    await tryAutoAssign();
  }
  
  return { 
    processed, 
    message: `Processed ${processed} patients from waiting queue` 
  };
};

const assignStaffToQueues = async () => {
  const availableStaff = await getAvailableStaff();
  const nextPatients = patientQueue.getNextPatients(availableStaff.length);
  
  const results = {
    critical: 0,
    moderate: 0,
    normal: 0,
    total: 0
  };
  
  for (const entry of nextPatients) {
    const patientId = entry.patient.id;
    const availableDoctors = availableStaff.filter(s => s.role === 'Doctor');
    const doctor = availableDoctors.shift();
    
    if (!doctor) continue;
    
    let nurse = null;
    if (entry.severity === 'Critical') {
      const availableNurses = availableStaff.filter(s => s.role === 'Nurse');
      nurse = availableNurses.shift();
    }
    
    const assignedStaff = {
      doctor: doctor ? {
        id: doctor.staff_id,
        name: doctor.fullName,
        roomNumber: doctor.roomNumber || 'Not Assigned'
      } : null,
      nurse: nurse ? {
        id: nurse.staff_id,
        name: nurse.fullName
      } : null
    };
    
    await updatePatient(patientId, {
      status: 'Assigned',
      assignedStaff
    });
    
    patientQueue.removePatient(patientId);
    results[entry.severity.toLowerCase()]++;
    results.total++;
  }
  
  return results;
};

const assignNextPatient = async (doctorId) => {
  const availableStaff = await getAvailableStaff();
  const doctor = availableStaff.find(s => s.staff_id === doctorId && s.role === 'Doctor');
  
  if (!doctor) {
    throw new Error(`Doctor ${doctorId} not found or not available`);
  }
  
  const nextPatient = patientQueue.getNextPatients(1)[0];
  
  if (!nextPatient) {
    return {
      success: false,
      message: 'No patients in queue'
    };
  }
  
  const patientId = nextPatient.patient.id;
  const assignedStaff = {
    doctor: {
      id: doctor.staff_id,
      name: doctor.fullName,
      roomNumber: doctor.roomNumber || 'Not Assigned'
    },
    nurse: nextPatient.patient.assignedStaff?.nurse || null
  };
  
  await updatePatient(patientId, {
    status: 'Assigned',
    assignedStaff
  });
  
  patientQueue.removePatient(patientId);
  
  return {
    success: true,
    patientId,
    patientName: nextPatient.patient.contact.name,
    severity: nextPatient.severity,
    roomNumber: doctor.roomNumber || 'Not Assigned',
    message: `Patient ${nextPatient.patient.contact.name} assigned to Dr. ${doctor.fullName}`
  };
};

 const updatePatientStatus = async (patientId, status) => {
  const patient = await getPatientById(patientId);
  if (!patient) throw new Error(`Patient with ID ${patientId} not found`);
  
  const validStatuses = ['Waiting', 'Queued', 'Assigned', 'In Progress', 'Completed', 'Discharged'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }
  
  if (status === 'Discharged' && patient.status !== 'Completed') {
    throw new Error('Patient must be marked as Completed before Discharged');
  }
  
  let updateData = { status };
  if (status === 'Completed') {
    const treatingDoctor = patient.assignedStaff?.doctor 
      ? { 
          id: patient.assignedStaff.doctor.id,
          name: patient.assignedStaff.doctor.name || 'Unknown Doctor',
          roomNumber: patient.assignedStaff.doctor.roomNumber || 'Not Assigned'
        } 
      : null;
      
    updateData = {
      ...updateData,
      completedBy: treatingDoctor,
      completedAt: new Date().toISOString()
    };
  }
  
  await updatePatient(patientId, { ...updateData, lastUpdated: new Date().toISOString() });
  
  if (['Assigned', 'In Progress', 'Completed', 'Discharged'].includes(status)) {
    patientQueue.removePatient(patientId);
  }
  
  const updatedPatient = await getPatientById(patientId);
  
  // Emit to public namespace
  io.of('/public').emit('patientStatusUpdated', {
    patientId,
    status,
    updatedData: {
      patientId: patientId, // Ensure patientId is set
      severity: updatedPatient.severity,
      queueType: updatedPatient.queueType,
      status: updatedPatient.status,
      assignedStaff: updatedPatient.assignedStaff,
      contact: updatedPatient.contact,
      vitals: updatedPatient.vitals,
      additionalNotes: updatedPatient.additionalNotes
    },
    timestamp: new Date().toISOString()
  });
  
  return updatedPatient;
};

const getQueueStats = async () => {
  return patientQueue.getQueueStats();
};

const getDoctorDailyStats = async (doctorId, targetDate) => {
  try {
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Firestore query with multiple where clauses
    const q = query(
      collection(db, 'patients'),
      where('assignedStaff.doctor.id', '==', doctorId),
      where('lastUpdated', '>=', startOfDay.toISOString()),
      where('lastUpdated', '<=', endOfDay.toISOString())
    );

    const querySnapshot = await getDocs(q);
    const patients = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      patients.push({
        patientId: doc.id,
        contact: data.contact || '',
        vitals: data.vitals || {},
        severity: data.severity || 'Unknown',
        status: data.status || 'Unknown',
        registrationTime: data.registrationTime || '',
        completedAt: data.completedAt || null,
        lastUpdated: data.lastUpdated || '',
        additionalNotes: data.additionalNotes || ''
      });
    });

    return patients;
  } catch (error) {
    // Specific handling for index-related errors
    if (error.code === 'FAILED_PRECONDITION' && error.message.includes('requires an index')) {
      throw new Error(
        'Query requires a composite index. Please create it in the Firebase Console: ' +
        'https://console.firebase.google.com/project/smartpatientorder/firestore/indexes'
      );
    }
    throw new Error(`Failed to fetch doctor daily stats: ${error.message}`);
  }
};

const getAdminReport = async (startDate, endDate) => {
  try {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, 'patients'),
      where('lastUpdated', '>=', start.toISOString()),
      where('lastUpdated', '<=', end.toISOString())
    );

    const querySnapshot = await getDocs(q);
    const patients = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      patients.push({
        patientId: doc.id,
        contact: data.contact,
        vitals: data.vitals,
        severity: data.severity,
        status: data.status,
        assignedStaff: data.assignedStaff || { doctor: null, nurse: null },
        registrationTime: data.registrationTime,
        completedAt: data.completedAt,
        lastUpdated: data.lastUpdated,
        additionalNotes: data.additionalNotes || ''
      });
    });

    return patients;
  } catch (error) {
    throw new Error(`Failed to fetch admin report data: ${error.message}`);
  }
};

// Try to assign patients automatically wphen queue threshold is met
const tryAutoAssign = async () => {
  if (patientQueue.getQueueLength() < MIN_QUEUE_THRESHOLD) {
    console.log(`Queue length (${patientQueue.getQueueLength()}) below threshold (${MIN_QUEUE_THRESHOLD}). Waiting for more patients.`);
    return { assigned: 0 };
  }

  const availableStaff = await getAvailableStaff();
  const availableDoctors = availableStaff.filter((s) => s.role === 'Doctor');
  const nextPatients = patientQueue.getNextPatients(availableDoctors.length);

  if (nextPatients.length === 0 || availableDoctors.length === 0) {
    console.log('No patients to assign or no doctors available');
    return { assigned: 0 };
  }

  let assignedCount = 0;

  for (const entry of nextPatients) {
    const patientId = entry.patient.id;
    const doctor = availableDoctors.shift(); // Take the next available doctor

    if (!doctor) break; // No more doctors available

    let nurse = null;
    if (entry.severity === 'Critical') {
      const availableNurses = availableStaff.filter((s) => s.role === 'Nurse');
      nurse = availableNurses.shift();
    }

    const assignedStaff = {
      doctor: {
        id: doctor.staff_id,
        name: doctor.fullName,
        roomNumber: doctor.roomNumber || 'Not Assigned',
      },
      nurse: nurse
        ? {
            id: nurse.staff_id,
            name: nurse.fullName,
          }
        : null,
    };

    await updatePatient(patientId, {
      status: 'Assigned',
      assignedStaff,
    });

    patientQueue.removePatient(patientId);
    assignedCount++;

    io.emit('patientAssigned', {
      patientId,
      doctorId: doctor.staff_id,
      severity: entry.severity,
      message: `Patient ${entry.patient.contact.name} assigned to Dr. ${doctor.fullName}`,
      roomNumber: doctor.roomNumber || 'Not Assigned',
      timestamp: new Date().toISOString(),
    });
  }

  console.log(`Automatically assigned ${assignedCount} patients`);
  return { assigned: assignedCount };
};

// Monitor queue and staff availability in real-time
const startQueueMonitoring = () => {
  // Update queue priorities every 30 seconds
  setInterval(() => {
    patientQueue.updatePriorities();
  }, 30000);

  // Listen to new patient registrations (triggered by Firestore updates)
  const patientsQuery = query(collection(db, 'patients'), where('status', '==', 'Queued'));
  onSnapshot(patientsQuery, async (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'added') {
        if (patientQueue.getQueueLength() >= MIN_QUEUE_THRESHOLD) {
          await tryAutoAssign();
        }
      }
    });
  });

  // Listen to staff availability changes
  const staffQuery = query(collection(db, 'staff'), where('status', '==', 'available'));
  onSnapshot(staffQuery, async (snapshot) => {
    if (!snapshot.empty && patientQueue.getQueueLength() >= MIN_QUEUE_THRESHOLD) {
      await tryAutoAssign();
    }
  });
};

// Fetch all patients ever assigned to a doctor
const getAllDoctorPatients = async (doctorId) => {
  try {
    const q = query(
      collection(db, 'patients'),
      where('assignedStaff.doctor.id', '==', doctorId)
    );

    const querySnapshot = await getDocs(q);
    const patients = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      patients.push({
        patientId: doc.id,
        contact: data.contact,
        vitals: data.vitals,
        severity: data.severity,
        status: data.status,
        registrationTime: data.registrationTime,
        completedAt: data.completedAt,
        lastUpdated: data.lastUpdated,
        additionalNotes: data.additionalNotes || ''
      });
    });

    return patients;
  } catch (error) {
    throw new Error(`Failed to fetch all doctor patients: ${error.message}`);
  }
};

const getAllPatients = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'patients'));
    const patients = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      patients.push({
        patientId: doc.id,
        contact: data.contact,
        vitals: data.vitals,
        severity: data.severity,
        status: data.status,
        assignedStaff: data.assignedStaff || { doctor: null, nurse: null },
        registrationTime: data.registrationTime,
        completedAt: data.completedAt,
        lastUpdated: data.lastUpdated,
        additionalNotes: data.additionalNotes || ''
      });
    });

    return patients;
  } catch (error) {
    throw new Error(`Failed to fetch all patients: ${error.message}`);
  }
};

// Start the monitoring system
startQueueMonitoring();

export { 
  createPatient, 
  updatePatient, 
  getPatientById, 
  getWaitingPatients,
  getQueueByType,
  getQueuedPatients, 
  getAssignedPatients, 
  registerPatient,
  processWaitingQueue,
  assignStaffToQueues,
  assignNextPatient,
  updatePatientStatus,
  getQueueStats,
  getDoctorDailyStats,  // New
  getAdminReport,
  getAllDoctorPatients,
  getAllPatients 

};