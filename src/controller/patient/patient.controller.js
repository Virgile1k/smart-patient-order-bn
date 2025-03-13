import { 
  registerPatient, 
  getWaitingPatients,
  getQueueByType,
  getQueuedPatients,
  processWaitingQueue,
  assignStaffToQueues,
  assignNextPatient,
  updatePatientStatus, 
  getAssignedPatients,
  getQueueStats,
  getDoctorDailyStats,
  getAdminReport,
  getAllDoctorPatients,
  getAllPatients ,
  getPatientById, 
  updatePatient
} from '../../services/patient/patient.service.js';
import { emitPublicEvent } from '../../server.js';

const registerPatientController = async (req, res) => {
  try {
    const { 
      name, 
      contactNumber, 
      email, 
      address,
      height, 
      weight,
      bloodPressure, 
      heartRate, 
      bodyTemperature,
      age,
      gender,
      additionalNotes
    } = req.body;
    
    const contact = { 
      name, 
      contactNumber, 
      email, 
      address,
      gender
    };
    
    const vitals = { 
      height, 
      weight,
      bloodPressure, 
      heartRate, 
      bodyTemperature,
      age
    };
    
    const patientData = { 
      contact, 
      vitals,
      additionalNotes
    };
    
    const result = await registerPatient(patientData);

    emitPublicEvent('patientRegistered', {
      patientId: result.patientId,
      name,
      status: 'Queued',
      queueType: result.queueType,
      severity: result.severity,
      queuePosition: result.queuePosition,
      estimatedWaitTime: result.estimatedWaitTime,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      data: {
        patientId: result.patientId,
        severity: result.severity,
        queueType: result.queueType,
        queuePosition: result.queuePosition,
        estimatedWaitTime: result.estimatedWaitTime,
      },
      message: 'Patient registered and queued successfully',
    });
  } catch (error) {
    console.error(`Error in registerPatientController: ${error.message}`);
    res.status(400).json({ 
      success: false, 
      message: error.message,
      error: error.toString()
    });
  }
};

const getWaitingQueueController = async (req, res) => {
  try {
    const waitingPatients = await getWaitingPatients();
    
    res.status(200).json({ 
      success: true, 
      data: waitingPatients,
      count: waitingPatients.length,
      message: 'Waiting queue retrieved successfully'
    });
  } catch (error) {
    console.error(`Error in getWaitingQueueController: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

const getQueueByTypeController = async (req, res) => {
  try {
    const { queueType } = req.params;
    
    if (!['Critical', 'Moderate', 'Normal'].includes(queueType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid queue type. Must be Critical, Moderate, or Normal'
      });
    }
    
    const queue = await getQueueByType(queueType);
    
    res.status(200).json({ 
      success: true, 
      queueType,
      data: queue.map(p => ({
        patientId: p.id,
        contact: p.contact,
        vitals: p.vitals,
        severity: p.severity,
        queuePosition: p.queuePosition,
        queueType: p.queueType,
        status: p.status,
        additionalNotes: p.additionalNotes || ''
      })),
      count: queue.length,
      message: `Retrieved ${queueType} queue successfully`
    });
  } catch (error) {
    console.error(`Error in getQueueByTypeController: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

const getAllQueuesController = async (req, res) => {
  try {
    const queued = await getQueuedPatients();
    
    const queuesByType = {
      Critical: queued.filter(p => p.queueType === 'Critical'),
      Moderate: queued.filter(p => p.queueType === 'Moderate'),
      Normal: queued.filter(p => p.queueType === 'Normal')
    };
    
    res.status(200).json({ 
      success: true, 
      data: {
        all: queued.map(p => ({
          patientId: p.id,
          contact: p.contact,
          vitals: p.vitals,
          severity: p.severity,
          queuePosition: p.queuePosition,
          queueType: p.queueType,
          status: p.status,
          additionalNotes: p.additionalNotes || ''
        })),
        byType: {
          Critical: queuesByType.Critical.map(p => ({
            patientId: p.id,
            contact: p.contact,
            vitals: p.vitals,
            severity: p.severity,
            queuePosition: p.queuePosition,
            queueType: p.queueType,
            status: p.status,
            additionalNotes: p.additionalNotes || ''
          })),
          Moderate: queuesByType.Moderate.map(p => ({
            patientId: p.id,
            contact: p.contact,
            vitals: p.vitals,
            severity: p.severity,
            queuePosition: p.queuePosition,
            queueType: p.queueType,
            status: p.status,
            additionalNotes: p.additionalNotes || ''
          })),
          Normal: queuesByType.Normal.map(p => ({
            patientId: p.id,
            contact: p.contact,
            vitals: p.vitals,
            severity: p.severity,
            queuePosition: p.queuePosition,
            queueType: p.queueType,
            status: p.status,
            additionalNotes: p.additionalNotes || ''
          }))
        }
      },
      totalCount: queued.length,
      countByType: {
        Critical: queuesByType.Critical.length,
        Moderate: queuesByType.Moderate.length,
        Normal: queuesByType.Normal.length
      },
      message: 'All queues retrieved successfully'
    });
  } catch (error) {
    console.error(`Error in getAllQueuesController: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

const processWaitingQueueController = async (req, res) => {
  try {
    if (!req.user.role || !req.user.role.toLowerCase().includes('staff')) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Only staff can process waiting queue' 
      });
    }
    
    const result = await processWaitingQueue();
    
    if (result.processed > 0) {
      emitPublicEvent('queuesUpdated', {
        message: result.message,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(200).json({
      success: true,
      data: result,
      message: result.message
    });
  } catch (error) {
    console.error(`Error in processWaitingQueueController: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

const assignStaffController = async (req, res) => {
  try {
    if (!req.user.role || !['admin', 'supervisor'].includes(req.user.role.toLowerCase())) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Only admin or supervisor can manually assign staff' 
      });
    }
    
    const results = await assignStaffToQueues();
    
    if (results.total > 0) {
      emitPublicEvent('staffAssigned', {
        message: `Manually assigned staff to ${results.total} patients`,
        breakdown: results,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(200).json({
      success: true,
      data: results,
      message: `Manually assigned staff to ${results.total} patients`
    });
  } catch (error) {
    console.error(`Error in assignStaffController: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

const assignNextPatientController = async (req, res) => {
  try {
    const doctorId = req.params.doctorId || req.user.uid;
    
    if (!req.user.role || !req.user.role.toLowerCase().includes('doctor')) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Only doctors can request patient assignment' 
      });
    }

    const result = await assignNextPatient(doctorId);
    
    if (result.success) {
      emitPublicEvent('patientAssigned', {
        patientId: result.patientId,
        doctorId,
        severity: result.severity,
        message: result.message,
        roomNumber: result.roomNumber || 'Not Assigned',
        timestamp: new Date().toISOString()
      });
      
      res.status(200).json({
        success: true,
        data: {
          patientId: result.patientId,
          patientName: result.patientName,
          severity: result.severity,
          assignedStaff: {
            doctor: {
              id: doctorId,
              name: result.message.split('Dr. ')[1] || 'Unknown',
              roomNumber: result.roomNumber || 'Not Assigned'
            },
            nurse: null
          },
          roomNumber: result.roomNumber || 'Not Assigned'
        },
        message: `${result.message} (Note: System automatically assigns patients when queue reaches 10 or more; this is a manual override)`,
      });
    } else {
      res.status(200).json({
        success: false,
        message: `${result.message} (Note: System automatically assigns patients when queue reaches 10 or more)`,
      });
    }
  } catch (error) {
    console.error(`Error in assignNextPatientController: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

const getAssignedPatientsController = async (req, res) => {
  try {
    const doctorId = req.user.uid;

    if (!req.user.role || !req.user.role.toLowerCase().includes('doctor')) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Only doctors can view assigned patients' 
      });
    }

    const assignedPatients = await getAssignedPatients(doctorId);
    
    res.status(200).json({
      success: true,
      data: assignedPatients,
      count: assignedPatients.length,
      message: 'Assigned patients retrieved successfully'
    });
  } catch (error) {
    console.error(`Error in getAssignedPatientsController: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: `Failed to fetch assigned patients: ${error.message}` 
    });
  }
};

const updateStatusController = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status } = req.body;
    
    // Improved role validation with explicit role checking
    const authorizedRoles = ['staff', 'doctor', 'nurse', 'admin'];
    if (!req.user.role || !authorizedRoles.includes(req.user.role.toLowerCase())) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Only authorized medical staff can update patient status' 
      });
    }

    const updatedPatient = await updatePatientStatus(patientId, status);

    emitPublicEvent('patientStatusUpdated', {
      patientId,
      status,
      updatedData: {
        patientId: updatedPatient.patientId,
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
    
    // Log the status change for audit purposes
    console.log(`Patient ${patientId} status updated to ${status} by ${req.user.role} (${req.user.id})`);
    
    res.status(200).json({
      success: true,
      data: updatedPatient,
      message: 'Patient status updated successfully',
    });
  } catch (error) {
    console.error(`Error in updateStatusController: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

const getQueueStatsController = async (req, res) => {
  try {
    const stats = await getQueueStats();
    
    res.status(200).json({
      success: true,
      data: stats,
      message: 'Queue statistics retrieved successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error in getQueueStatsController: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};
// patient.controller.js - Update these controllers

const getDoctorDailyStatsController = async (req, res) => {
  try {
    const doctorId = req.user.uid;
    const { date } = req.query;

    // Check if user is a doctor
    if (!req.user.role || !req.user.role.toLowerCase().includes('doctor')) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Only doctors can view their stats' 
      });
    }

    // Validate date parameter
    const targetDate = date ? new Date(date) : new Date();
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date parameter provided',
      });
    }

    const patients = await getDoctorDailyStats(doctorId, targetDate);

    const stats = {
      totalPatients: patients.length,
      bySeverity: {
        Critical: patients.filter(p => p.severity === 'Critical').length,
        Moderate: patients.filter(p => p.severity === 'Moderate').length,
        Normal: patients.filter(p => p.severity === 'Normal').length
      },
      byStatus: {
        Assigned: patients.filter(p => p.status === 'Assigned').length,
        InProgress: patients.filter(p => p.status === 'In Progress').length,
        Completed: patients.filter(p => p.status === 'Completed').length,
        Discharged: patients.filter(p => p.status === 'Discharged').length
      },
      averageTreatmentTime: patients.filter(p => p.status === 'Completed').length > 0
        ? patients.filter(p => p.status === 'Completed')
            .reduce((acc, p) => {
              const treatmentDuration = new Date(p.completedAt || p.lastUpdated) - new Date(p.registrationTime);
              return acc + treatmentDuration;
            }, 0) / patients.filter(p => p.status === 'Completed').length / 60000 // Convert to minutes
        : 0
    };

    res.status(200).json({
      success: true,
      data: {
        doctorId,
        date: targetDate.toISOString().split('T')[0],
        patients,
        stats
      },
      message: 'Doctor daily statistics retrieved successfully'
    });
  } catch (error) {
    console.error(`Error in getDoctorDailyStatsController: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: `Failed to retrieve stats: ${error.message}` 
    });
  }
};

const getAdminReportController = async (req, res) => {
  try {
    const { startDate, endDate, exportFormat } = req.query;

    if (!req.user.role || !['admin', 'supervisor'].includes(req.user.role.toLowerCase())) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Only admin or supervisor can view reports' 
      });
    }

    const patients = await getAdminReport(startDate, endDate);
    const doctorStats = {};

    patients.forEach(patient => {
      const doctorId = patient.assignedStaff?.doctor?.id;
      if (doctorId) {
        if (!doctorStats[doctorId]) {
          doctorStats[doctorId] = {
            name: patient.assignedStaff.doctor.name || 'Unknown',
            totalPatients: 0,
            completed: 0,
            critical: 0,
            averageTime: 0
          };
        }
        doctorStats[doctorId].totalPatients++;
        if (patient.status === 'Completed') {
          doctorStats[doctorId].completed++;
          const treatmentTime = new Date(patient.completedAt || patient.lastUpdated) - new Date(patient.registrationTime);
          doctorStats[doctorId].averageTime += treatmentTime;
        }
        if (patient.severity === 'Critical') doctorStats[doctorId].critical++;
      }
    });

    Object.values(doctorStats).forEach(stats => {
      stats.averageTime = stats.completed > 0 ? (stats.averageTime / stats.completed / 60000) : 0;
    });

    const report = {
      period: {
        start: (startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).toISOString(),
        end: (endDate || new Date()).toISOString()
      },
      totalPatients: patients.length,
      statusBreakdown: {
        Waiting: patients.filter(p => p.status === 'Waiting').length,
        Queued: patients.filter(p => p.status === 'Queued').length,
        Assigned: patients.filter(p => p.status === 'Assigned').length,
        InProgress: patients.filter(p => p.status === 'In Progress').length,
        Completed: patients.filter(p => p.status === 'Completed').length,
        Discharged: patients.filter(p => p.status === 'Discharged').length
      },
      severityBreakdown: {
        Critical: patients.filter(p => p.severity === 'Critical').length,
        Moderate: patients.filter(p => p.severity === 'Moderate').length,
        Normal: patients.filter(p => p.severity === 'Normal').length
      },
      doctorStats,
      queueStats: await getQueueStats()
    };

    if (exportFormat) {
      const filename = `report_${report.period.start.split('T')[0]}_${report.period.end.split('T')[0]}`;
      if (exportFormat.toLowerCase() === 'csv') {
        const csv = [
          'Report Period,Patients,Waiting,Queued,Assigned,In Progress,Completed,Discharged,Critical,Moderate,Normal',
          `${report.period.start.split('T')[0]} to ${report.period.end.split('T')[0]},${report.totalPatients},${report.statusBreakdown.Waiting},${report.statusBreakdown.Queued},${report.statusBreakdown.Assigned},${report.statusBreakdown.InProgress},${report.statusBreakdown.Completed},${report.statusBreakdown.Discharged},${report.severityBreakdown.Critical},${report.severityBreakdown.Moderate},${report.severityBreakdown.Normal}`,
          '\nDoctor Statistics',
          'Doctor ID,Name,Total Patients,Completed,Critical Cases,Average Treatment Time (min)',
          ...Object.entries(doctorStats).map(([id, stats]) => 
            `${id},${stats.name},${stats.totalPatients},${stats.completed},${stats.critical},${stats.averageTime.toFixed(2)}`
          )
        ].join('\n');

        res.header('Content-Type', 'text/csv');
        res.attachment(`${filename}.csv`);
        return res.send(csv);
      } else if (exportFormat.toLowerCase() === 'json') {
        res.header('Content-Type', 'application/json');
        res.attachment(`${filename}.json`);
        return res.send(JSON.stringify(report, null, 2));
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid export format. Use "csv" or "json"'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: report,
      message: 'Admin report retrieved successfully'
    });
  } catch (error) {
    console.error(`Error in getAdminReportController: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};
const getAllDoctorPatientsController = async (req, res) => {
  try {
    const doctorId = req.user.uid;

    if (!req.user.role || !req.user.role.toLowerCase().includes('doctor')) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Only doctors can view their patient history' 
      });
    }

    const patients = await getAllDoctorPatients(doctorId);

    res.status(200).json({
      success: true,
      data: {
        doctorId,
        patients,
        totalCount: patients.length
      },
      message: 'All assigned patients retrieved successfully'
    });
  } catch (error) {
    console.error(`Error in getAllDoctorPatientsController: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: `Failed to fetch all doctor patients: ${error.message}` 
    });
  }
};

// Fetch all patients in the system (admin only)
const getAllPatientsController = async (req, res) => {
  try {
    if (!req.user.role || !['admin', 'supervisor','staff','nurse',].includes(req.user.role.toLowerCase())) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Only admin or supervisor can view all patients' 
      });
    }

    const patients = await getAllPatients();

    res.status(200).json({
      success: true,
      data: {
        patients,
        totalCount: patients.length
      },
      message: 'All patients retrieved successfully'
    });
  } catch (error) {
    console.error(`Error in getAllPatientsController: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: `Failed to fetch all patients: ${error.message}` 
    });
  }
};

const getPatientByIdController = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Role-based access control
    const authorizedRoles = ['staff', 'doctor', 'nurse', 'admin', 'supervisor'];
    if (!req.user.role || !authorizedRoles.includes(req.user.role.toLowerCase())) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Only authorized medical staff can view patient details' 
      });
    }

    const patient = await getPatientById(patientId);
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: `Patient with ID ${patientId} not found`
      });
    }

    res.status(200).json({
      success: true,
      data: {
        patientId: patient.id,
        contact: patient.contact,
        vitals: patient.vitals,
        severity: patient.severity,
        status: patient.status,
        queueType: patient.queueType,
        queuePosition: patient.queuePosition,
        assignedStaff: patient.assignedStaff,
        registrationTime: patient.registrationTime,
        lastUpdated: patient.lastUpdated,
        completedAt: patient.completedAt || null,
        additionalNotes: patient.additionalNotes || ''
      },
      message: 'Patient details retrieved successfully'
    });
  } catch (error) {
    console.error(`Error in getPatientByIdController: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: `Failed to fetch patient: ${error.message}` 
    });
  }
};
const updatePatientController = async (req, res) => {
  try {
    const { patientId } = req.params;
    const {
      name,
      contactNumber,
      email,
      address,
      gender,
      height,
      weight,
      bloodPressure,
      heartRate,
      bodyTemperature,
      age,
      additionalNotes,
      status
    } = req.body;

    const authorizedRoles = ['staff', 'doctor', 'nurse', 'admin', 'supervisor'];
    if (!req.user.role || !authorizedRoles.includes(req.user.role.toLowerCase())) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Only authorized medical staff can update patient details' 
      });
    }

    // Fetch existing patient
    const existingPatient = await getPatientById(patientId);
    if (!existingPatient) {
      return res.status(404).json({
        success: false,
        message: `Patient with ID ${patientId} not found`
      });
    }

    // Prepare update data
    const updateData = {};

    if (name || contactNumber || email || address || gender) {
      updateData.contact = {
        name: name || existingPatient.contact.name,
        contactNumber: contactNumber || existingPatient.contact.contactNumber,
        email: email || existingPatient.contact.email,
        address: address || existingPatient.contact.address,
        gender: gender || existingPatient.contact.gender
      };
    }

    if (height || weight || bloodPressure || heartRate || bodyTemperature || age) {
      updateData.vitals = {
        height: height ?? existingPatient.vitals.height,
        weight: weight ?? existingPatient.vitals.weight,
        bloodPressure: bloodPressure ?? existingPatient.vitals.bloodPressure,
        heartRate: heartRate ?? existingPatient.vitals.heartRate,
        bodyTemperature: bodyTemperature ?? existingPatient.vitals.bodyTemperature,
        age: age ?? existingPatient.vitals.age
      };
    }

    if (additionalNotes) updateData.additionalNotes = additionalNotes;
    if (status) updateData.status = status;

    // Update patient in database
    await updatePatient(patientId, updateData);

    // If vitals changed, re-evaluate severity and queue
    if (updateData.vitals) {
      const queueInfo = await patientQueue.addPatient({
        id: patientId,
        vitals: updateData.vitals,
        contact: updateData.contact || existingPatient.contact,
        additionalNotes: updateData.additionalNotes || existingPatient.additionalNotes
      });

      await updatePatient(patientId, {
        severity: queueInfo.severity,
        queueType: queueInfo.severity,
        queuePosition: queueInfo.queuePosition
      });
    }

    const updatedPatient = await getPatientById(patientId);

    emitPublicEvent('patientUpdated', {
      patientId,
      updatedData: {
        contact: updatedPatient.contact,
        vitals: updatedPatient.vitals,
        severity: updatedPatient.severity,
        status: updatedPatient.status,
        queueType: updatedPatient.queueType,
        queuePosition: updatedPatient.queuePosition
      },
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      data: {
        patientId: updatedPatient.id,
        contact: updatedPatient.contact,
        vitals: updatedPatient.vitals,
        severity: updatedPatient.severity,
        status: updatedPatient.status,
        queueType: updatedPatient.queueType,
        queuePosition: updatedPatient.queuePosition,
        assignedStaff: updatedPatient.assignedStaff,
        registrationTime: updatedPatient.registrationTime,
        lastUpdated: updatedPatient.lastUpdated,
        completedAt: updatedPatient.completedAt || null,
        additionalNotes: updatedPatient.additionalNotes || ''
      },
      message: 'Patient details updated successfully'
    });
  } catch (error) {
    console.error(`Error in updatePatientController: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: `Failed to update patient: ${error.message}` 
    });
  }
};

export { 
  registerPatientController, 
  getWaitingQueueController,
  getQueueByTypeController,
  getAllQueuesController,
  processWaitingQueueController,
  assignStaffController,
  assignNextPatientController,
  getAssignedPatientsController,
  updateStatusController,
  getQueueStatsController,
  getAdminReportController,
  getDoctorDailyStatsController,
  getAllDoctorPatientsController,
  getAllPatientsController,
  getPatientByIdController,
  updatePatientController
};