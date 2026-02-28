const db = require('../config/db');
const mlHelper = require('../utils/ml-placeholder');

// Get All Labs (Hospitals with Lab facilities)
exports.getAllLabs = async (req, res) => {
    try {
        const [labs] = await db.query(
            'SELECT hospital_id, hospital_name, address, phone FROM hospitals'
        );

        res.json({
            success: true,
            labs
        });
    } catch (error) {
        console.error('Get all labs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch labs',
            error: error.message
        });
    }
};

// Create Booking
exports.createBooking = async (req, res) => {
    try {
        const { lab_id, patient_name, phone, address, test_type } = req.body;
        const patient_id = req.patient.patient_id; // From auth middleware

        if (!lab_id || !patient_name || !phone || !address || !test_type) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        const { rows: [result] } = await db.query(
            'INSERT INTO lab_bookings (lab_id, patient_id, patient_name, phone, address, test_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING booking_id',
            [lab_id, patient_id, patient_name, phone, address, test_type]
        );

        res.status(201).json({
            success: true,
            message: 'Lab test booked successfully',
            booking_id: result.booking_id
        });

        await db.query(
            'INSERT INTO notifications (user_type, user_id, message) VALUES (?, ?, ?)',
            ['hospital', lab_id, `New Lab Booking Request from ${patient_name} for ${test_type}`]
        );
    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Booking failed',
            error: error.message
        });
    }
};

// Get Bookings for a Lab (Hospital)
exports.getLabBookings = async (req, res) => {
    try {
        const lab_id = req.hospital.hospital_id;

        const { rows: bookings } = await db.query(
            'SELECT * FROM lab_bookings WHERE lab_id = $1 ORDER BY created_at DESC',
            [lab_id]
        );

        res.json({
            success: true,
            bookings
        });
    } catch (error) {
        console.error('Get lab bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings',
            error: error.message
        });
    }
};

// Update Booking Status (Accept/Collect/Complete)
exports.updateBookingStatus = async (req, res) => {
    try {
        const { booking_id } = req.params;
        const { status, collection_date, report_eta } = req.body;
        const lab_id = req.hospital.hospital_id;

        const [bookingCheck] = await db.query(
            'SELECT * FROM lab_bookings WHERE booking_id = ? AND lab_id = ?',
            [booking_id, lab_id]
        );

        if (bookingCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found or unauthorized'
            });
        }

        await db.query(
            'UPDATE lab_bookings SET status = $1, collection_date = $2, report_eta = $3 WHERE booking_id = $4 AND lab_id = $5',
            [status, collection_date || null, report_eta || null, booking_id, lab_id]
        );

        const patient_id = bookingCheck[0].patient_id;
        let message = `Your lab booking status has been updated to: ${status}`;
        // The original code had conditional messages, but the instruction simplifies it.
        // if (status === 'confirmed' && collection_date) {
        //     message = `Your lab booking is Confirmed. Sample collection scheduled for: ${new Date(collection_date).toLocaleString()}`;
        // } else if (status === 'collected') {
        //     message = `Sample collected. Report expected by: ${new Date(report_eta).toLocaleString()}`;
        // }

        await db.query(
            'INSERT INTO notifications (user_type, user_id, message) VALUES ($1, $2, $3)',
            ['patient', patient_id, `Your lab booking status has been updated to: ${status}`]
        );

        res.json({
            success: true,
            message: 'Booking updated successfully'
        });
    } catch (error) {
        console.error('Update booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update booking',
            error: error.message
        });
    }
};

// Complete Booking & Upload Report
exports.completeBooking = async (req, res) => {
    try {
        const { booking_id } = req.params;
        const { doctor_id } = req.body;
        const lab_id = req.hospital.hospital_id;
        const staff_id = req.hospital.staff_id || null; // Might be null if hospital admin logs in directly

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Report file is required'
            });
        }

        // 1. Verify Booking
        const [bookingCheck] = await db.query(
            'SELECT * FROM lab_bookings WHERE booking_id = ? AND lab_id = ?',
            [booking_id, lab_id]
        );

        if (bookingCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found or unauthorized'
            });
        }

        const booking = bookingCheck[0];
        const file_path = req.file.path.replace(/\\/g, '/').split('backend/')[1];
        const file_type = req.file.mimetype.includes('pdf') ? 'pdf' : 'image';

        // 2. Placeholder Analysis
        // Checking if mlHelper exists and has analyzeLabReport
        let analysis = { summary: 'Analysis pending' };
        try {
            if (mlHelper && mlHelper.analyzeLabReport) {
                analysis = mlHelper.analyzeLabReport(file_path, file_type);
            }
        } catch (e) {
            console.log("ML Analysis skipped or failed", e);
        }

        // 3. Save to Lab Reports
        await db.query(
            'INSERT INTO lab_reports (patient_id, doctor_id, uploaded_by_staff_id, report_type, file_path, file_type, analysis_result) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [booking.patient_id, doctor_id || null, staff_id, booking.test_type, file_path, file_type, JSON.stringify(analysis)]
        );

        // 4. Update Booking Status
        await db.query(
            'UPDATE lab_bookings SET status = ?, report_eta = NOW() WHERE booking_id = ?',
            ['completed', booking_id]
        );

        // 5. Notify Patient
        await db.query(
            'INSERT INTO notifications (user_type, user_id, message) VALUES (?, ?, ?)',
            ['patient', booking.patient_id, `Your Lab Report for ${booking.test_type} is ready! Check My Reports.`]
        );

        // Notify doctor if provided
        if (doctor_id) {
            await db.query(
                'INSERT INTO notifications (user_type, user_id, message) VALUES (?, ?, ?)',
                ['doctor', doctor_id, `A new lab report has been uploaded for your patient ${booking.patient_name} (ID: ${booking.patient_id})`]
            );
        }

        res.json({
            success: true,
            message: 'Report sent and booking completed'
        });

    } catch (error) {
        console.error('Complete booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete booking',
            error: error.message
        });
    }
};

// Get Patient Bookings
exports.getPatientBookings = async (req, res) => {
    try {
        const patient_id = req.patient.patient_id;

        const { rows: bookings } = await db.query(
            `SELECT b.*, h.hospital_name as lab_name 
             FROM lab_bookings b 
             JOIN hospitals h ON b.lab_id = h.hospital_id 
             WHERE b.patient_id = $1 
             ORDER BY b.created_at DESC`,
            [patient_id]
        );

        res.json({
            success: true,
            bookings
        });
    } catch (error) {
        console.error('Get patient bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings',
            error: error.message
        });
    }
};
