const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const aiController = require('../controllers/ai.controller');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// Authentication routes
router.post('/signup', patientController.signup);
router.post('/login', patientController.login);
router.get('/check-aadhar/:aadhar', patientController.checkAadhar);
router.post('/check-email', patientController.checkEmail);

// Protected routes (require authentication)
router.use(auth.verifyPatient);

// Symptom checker
router.post('/symptoms', patientController.analyzeSymptoms);
router.post('/predict-symptom', aiController.predictSymptom);

// Lab reports
router.post('/upload-report', upload.single('report'), patientController.uploadReport);
router.post('/analyze-report', upload.single('report'), aiController.analyzeReport);
router.get('/reports/:patient_id', patientController.getReports);

// Doctors
router.get('/doctors', patientController.getAllDoctors);

// Appointments
router.post('/book-appointment', patientController.bookAppointment);
router.get('/appointments', patientController.getAppointments);
router.post('/payment/:appointment_id', patientController.processPayment);

// Prescriptions
router.get('/prescriptions/:patient_id', patientController.getPrescriptions);

// Notifications
router.get('/notifications', patientController.getNotifications);
router.put('/notifications/:notification_id/read', patientController.markNotificationRead);

// Specific Records (Accessible by any authorized role to allow sharing)
router.get('/prescription/:id', auth.verifyToken, patientController.getPrescriptionById);
router.get('/report/:id', auth.verifyToken, patientController.getReportById);

module.exports = router;
