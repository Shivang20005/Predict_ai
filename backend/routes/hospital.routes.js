const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospital.controller');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// Authentication routes
router.post('/signup', hospitalController.signup);
router.post('/login', hospitalController.login);

// Lab Staff routes
router.post('/lab-staff/signup', hospitalController.labStaffSignup);
router.post('/lab-staff/login', hospitalController.labStaffLogin);

// Protected routes
router.use(auth.verifyHospital);

// Lab Staff - Upload reports
router.post('/lab-staff/upload-report', upload.single('report'), hospitalController.uploadReport);

// Hospital Staff Management
router.get('/staff', hospitalController.getAllStaff);
router.post('/staff', hospitalController.addStaff);
router.put('/staff/:id', hospitalController.updateStaff);
router.delete('/staff/:id', hospitalController.deleteStaff);

module.exports = router;
