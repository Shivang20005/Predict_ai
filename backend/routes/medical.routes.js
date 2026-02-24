const express = require('express');
const router = express.Router();
const medicalController = require('../controllers/medical.controller');
const auth = require('../middleware/auth');

// Public Routes
router.post('/register', medicalController.register);
router.post('/login', medicalController.login);

// Patient Protected Routes
router.get('/list', auth.verifyPatient, medicalController.getAllMedicals);
router.post('/book', auth.verifyPatient, medicalController.bookMedicine);
router.get('/my-bookings', auth.verifyPatient, medicalController.getPatientBookings);
router.put('/respond/:order_id', auth.verifyPatient, medicalController.respondToDeliveryDate);

// Medical Shop Protected Routes (using hospital verify for now as it handles medical role)
router.get('/bookings', auth.verifyHospital, medicalController.getShopBookings);
router.put('/update-status/:order_id', auth.verifyHospital, medicalController.updateBookingStatus);

module.exports = router;
