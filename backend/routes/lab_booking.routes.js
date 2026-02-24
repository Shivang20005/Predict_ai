const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/lab_booking.controller');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// Patient Routes
router.get('/labs', auth.verifyPatient, bookingController.getAllLabs);
router.post('/book', auth.verifyPatient, bookingController.createBooking);
router.get('/my-bookings', auth.verifyPatient, bookingController.getPatientBookings);

// Lab/Hospital Routes (Using Hospital Auth)
router.get('/lab/bookings', auth.verifyHospital, bookingController.getLabBookings); // Assuming hospital login middleware adds req.hospital or req.user with role
router.put('/lab/update-status/:booking_id', auth.verifyHospital, bookingController.updateBookingStatus);
router.post('/lab/complete-booking/:booking_id', auth.verifyHospital, upload.single('report'), bookingController.completeBooking);

module.exports = router;
