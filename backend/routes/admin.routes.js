const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const auth = require('../middleware/auth');

// Admin Auth
router.post('/login', adminController.login);

// Protected routes (require admin authentication)
router.use(auth.verifyAdmin);

router.get('/dashboard-stats', adminController.getDashboardStats);
router.get('/patients', adminController.getAllPatients);
router.get('/doctors', adminController.getAllDoctors);
router.get('/hospitals', adminController.getAllHospitals);
router.get('/labs', adminController.getAllLabs);
router.get('/medical', adminController.getAllMedicalShops);
router.get('/disease-analytics', adminController.getDiseaseAnalytics);

// CRUD operations
router.delete('/patient/:id', adminController.deletePatient);
router.delete('/doctor/:id', adminController.deleteDoctor);
router.put('/doctor/:id/verify', adminController.verifyDoctor);
router.put('/hospital/:id/verify', adminController.verifyHospital);
router.put('/lab/:id/verify', adminController.verifyLab);
router.put('/medical/:id/verify', adminController.verifyMedicalShop);

module.exports = router;
