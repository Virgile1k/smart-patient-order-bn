 // src/routes/index.routes.js
import { Router } from 'express';
import authRoute from './auth.routes.js';
import patientRoutes from './patient.routes.js';
 

const router = Router();

router.use('/user', authRoute);
router.use('/patients', patientRoutes);
 

export default router;