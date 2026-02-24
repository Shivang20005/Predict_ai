const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctor.controller');
const auth = require('../middleware/auth');

const upload = require('../middleware/upload');

// Authentication routes
router.post('/signup', upload.single('degree'), doctorController.signup);
router.post('/login', doctorController.login);

// Protected routes (require authentication)
router.use(auth.verifyDoctor);

// Availability management
router.put('/availability', doctorController.updateAvailability);

// Appointment management
router.get('/appointments', doctorController.getAppointments);
router.put('/appointment/:id/accept', doctorController.acceptAppointment);
router.put('/appointment/:id/reject', doctorController.rejectAppointment);
router.put('/appointment/:id/share-details', doctorController.shareAppointmentDetails);

// Hospital management
router.put('/hospital', doctorController.updateHospital);

// Patient management
router.get('/patient/:patient_id', doctorController.getPatientData);
router.get('/search-patient', doctorController.searchPatient);

// Prescription management
router.post('/prescription', doctorController.addPrescription);
router.put('/prescription/:id', doctorController.updatePrescription);
router.get('/prescriptions/:patient_id', doctorController.getPatientPrescriptions);

module.exports = router;
