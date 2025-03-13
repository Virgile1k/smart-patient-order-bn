 // routes/patient.routes.js
import express from 'express';
import { 
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
  getDoctorDailyStatsController,
  getAdminReportController,
  getAllDoctorPatientsController,  // New
  getAllPatientsController,
  getPatientByIdController,
  updatePatientController
           // New
} from '../controller/patient/patient.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', registerPatientController);
router.get('/queues', getAllQueuesController);

// Protected routes
router.use(authMiddleware);
router.get('/waiting', getWaitingQueueController);
router.get('/queue/:queueType', getQueueByTypeController);
router.post('/process-waiting', processWaitingQueueController);
router.post('/assign-staff', assignStaffController);
router.post('/assign-next/:doctorId?', assignNextPatientController);
router.get('/assigned', getAssignedPatientsController);
router.patch('/:patientId/status', updateStatusController);
router.get('/stats', getQueueStatsController);
router.get('/doctor-stats', getDoctorDailyStatsController);
router.get('/admin-report', getAdminReportController);
router.get('/doctor-all-patients', getAllDoctorPatientsController);  // New route
router.get('/all-patients', getAllPatientsController);              // New route
router.get('/:patientId', getPatientByIdController);
router.put('/:patientId', updatePatientController);

export default router;