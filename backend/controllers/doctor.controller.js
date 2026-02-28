const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'predict_ai_secret_key_2026';

// Doctor Signup
exports.signup = async (req, res) => {
    try {
        const { name, specialization, hospital_name, phone, age, email, password, fees, license_number } = req.body;

        if (!name || !specialization || !hospital_name || !phone || !age || !email || !password || !fees || !license_number) {
            return res.status(400).json({
                success: false,
                message: 'All fields including license number are required'
            });
        }

        // Check if email already exists
        const { rows: existingDoctor } = await db.query(
            'SELECT * FROM doctors WHERE email = $1',
            [email]
        );

        if (existingDoctor.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Handle file upload
        const degree_file = req.file ? req.file.path.replace(/\\/g, '/') : null;
        const is_verified = degree_file ? 1 : 0;

        // Insert doctor
        const { rows: [result] } = await db.query(
            'INSERT INTO doctors (name, specialization, hospital_name, phone, age, email, password, fees, degree_file, is_verified, license_number) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING doctor_id',
            [name, specialization, hospital_name, phone, age, email, hashedPassword, fees, degree_file, is_verified, license_number]
        );

        res.status(201).json({
            success: true,
            message: 'Doctor registered successfully',
            doctor_id: result.doctor_id
        });
    } catch (error) {
        console.error('Doctor signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
};

// Doctor Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const { rows: doctors } = await db.query(
            'SELECT * FROM doctors WHERE email = $1',
            [email]
        );

        if (doctors.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const doctor = doctors[0];
        const isValidPassword = await bcrypt.compare(password, doctor.password);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const token = jwt.sign(
            { doctor_id: doctor.doctor_id, email: doctor.email, role: 'doctor' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            doctor: {
                doctor_id: doctor.doctor_id,
                name: doctor.name,
                email: doctor.email,
                specialization: doctor.specialization,
                hospital_name: doctor.hospital_name,
                availability_status: doctor.availability_status,
                is_verified: doctor.is_verified
            }
        });
    } catch (error) {
        console.error('Doctor login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
};

// Update Availability Status
exports.updateAvailability = async (req, res) => {
    try {
        const doctor_id = req.doctor.doctor_id;
        const { availability_status } = req.body;

        if (!['available', 'not_available'].includes(availability_status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid availability status'
            });
        }

        await db.query(
            'UPDATE doctors SET availability_status = $1 WHERE doctor_id = $2',
            [availability_status, doctor_id]
        );

        res.json({
            success: true,
            message: 'Availability status updated',
            availability_status
        });
    } catch (error) {
        console.error('Update availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Update failed',
            error: error.message
        });
    }
};

// Get Doctor's Appointments
exports.getAppointments = async (req, res) => {
    try {
        const doctor_id = req.doctor.doctor_id;

        const { rows: appointments } = await db.query(
            `SELECT a.*, p.name as patient_name, p.age, p.phone 
             FROM appointments a 
             JOIN patients p ON a.patient_id = p.patient_id 
             WHERE a.doctor_id = $1 
             ORDER BY a.created_at DESC`,
            [doctor_id]
        );

        res.json({
            success: true,
            appointments
        });
    } catch (error) {
        console.error('Get appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch appointments',
            error: error.message
        });
    }
};

// Accept Appointment
exports.acceptAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const doctor_id = req.doctor.doctor_id;

        await db.query(
            'UPDATE appointments SET status = $1 WHERE appointment_id = $2 AND doctor_id = $3',
            ["accepted", id, doctor_id]
        );

        // Get patient_id for notification
        const [appointment] = await db.query(
            'SELECT patient_id FROM appointments WHERE appointment_id = ?',
            [id]
        );

        if (appointment.length > 0) {
            await db.query(
                'INSERT INTO notifications (user_type, user_id, message) VALUES ($1, $2, $3)',
                ['patient', appointment[0].patient_id, `Your appointment has been accepted by the doctor`]
            );
        }

        res.json({
            success: true,
            message: 'Appointment accepted'
        });
    } catch (error) {
        console.error('Accept appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to accept appointment',
            error: error.message
        });
    }
};

// Reject Appointment
exports.rejectAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const doctor_id = req.doctor.doctor_id;

        await db.query(
            'UPDATE appointments SET status = $1 WHERE appointment_id = $2 AND doctor_id = $3',
            ["rejected", id, doctor_id]
        );

        // Get patient_id for notification
        const [appointment] = await db.query(
            'SELECT patient_id FROM appointments WHERE appointment_id = ?',
            [id]
        );

        if (appointment.length > 0) {
            await db.query(
                'INSERT INTO notifications (user_type, user_id, message) VALUES ($1, $2, $3)',
                ['patient', appointment[0].patient_id, `Your appointment has been rejected. Please try booking with another doctor.`]
            );
        }

        res.json({
            success: true,
            message: 'Appointment rejected'
        });
    } catch (error) {
        console.error('Reject appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject appointment',
            error: error.message
        });
    }
};

// Share Appointment Details
exports.shareAppointmentDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const doctor_id = req.doctor.doctor_id;
        const { meet_link, notes, meeting_time } = req.body;

        await db.query(
            'UPDATE appointments SET meet_link = $1, notes = $2, meeting_time = $3 WHERE appointment_id = $4 AND doctor_id = $5',
            [meet_link, notes, meeting_time || null, id, doctor_id]
        );

        // Get patient_id for notification
        const [appointment] = await db.query(
            'SELECT patient_id FROM appointments WHERE appointment_id = ?',
            [id]
        );

        if (appointment.length > 0) {
            const timeStr = meeting_time ? ` at ${new Date(meeting_time).toLocaleString()}` : '';
            await db.query(
                'INSERT INTO notifications (user_type, user_id, message) VALUES ($1, $2, $3)',
                ['patient', appointment[0].patient_id, `Doctor has shared meeting details for your appointment${timeStr}`]
            );
        }

        res.json({
            success: true,
            message: 'Appointment details shared'
        });
    } catch (error) {
        console.error('Share details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to share details',
            error: error.message
        });
    }
};

// Update Hospital
exports.updateHospital = async (req, res) => {
    try {
        const doctor_id = req.doctor.doctor_id;
        const { hospital_name } = req.body;

        if (!hospital_name) {
            return res.status(400).json({
                success: false,
                message: 'Hospital name is required'
            });
        }

        await db.query(
            'UPDATE doctors SET hospital_name = $1 WHERE doctor_id = $2',
            [hospital_name, doctor_id]
        );

        res.json({
            success: true,
            message: 'Hospital updated successfully'
        });
    } catch (error) {
        console.error('Update hospital error:', error);
        res.status(500).json({
            success: false,
            message: 'Update failed',
            error: error.message
        });
    }
};

// Get Patient Data
exports.getPatientData = async (req, res) => {
    try {
        const { patient_id } = req.params;

        const { rows: patients } = await db.query(
            'SELECT patient_id, name, age, phone, email FROM patients WHERE patient_id = $1',
            [patient_id]
        );

        if (patients.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // Get prescriptions
        const { rows: prescriptions } = await db.query(
            'SELECT * FROM prescriptions WHERE patient_id = $1 ORDER BY created_at DESC',
            [patient_id]
        );

        // Get lab reports
        const { rows: reports } = await db.query(
            'SELECT * FROM lab_reports WHERE patient_id = $1 ORDER BY uploaded_at DESC',
            [patient_id]
        );

        res.json({
            success: true,
            patient: patients[0],
            prescriptions,
            reports
        });
    } catch (error) {
        console.error('Get patient data error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch patient data',
            error: error.message
        });
    }
};

// Search Patient
exports.searchPatient = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const { rows: patients } = await db.query(
            'SELECT patient_id, name, age, phone, email FROM patients WHERE patient_id::text = $1 OR name ILIKE $2',
            [query, `%${query}%`]
        );

        res.json({
            success: true,
            patients
        });
    } catch (error) {
        console.error('Search patient error:', error);
        res.status(500).json({
            success: false,
            message: 'Search failed',
            error: error.message
        });
    }
};

// Add Prescription
exports.addPrescription = async (req, res) => {
    try {
        const doctor_id = req.doctor.doctor_id;
        const { patient_id, disease, prescription, notes } = req.body;

        if (!patient_id || !prescription) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID and prescription are required'
            });
        }

        const { rows: [result] } = await db.query(
            'INSERT INTO prescriptions (patient_id, doctor_id, disease, prescription, notes) VALUES ($1, $2, $3, $4, $5) RETURNING prescription_id',
            [patient_id, doctor_id, disease, prescription, notes]
        );

        res.json({
            success: true,
            message: 'Prescription added successfully',
            prescription_id: result.prescription_id
        });
    } catch (error) {
        console.error('Add prescription error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add prescription',
            error: error.message
        });
    }
};

// Update Prescription
exports.updatePrescription = async (req, res) => {
    try {
        const { id } = req.params;
        const doctor_id = req.doctor.doctor_id;
        const { disease, prescription, notes } = req.body;

        await db.query(
            'UPDATE prescriptions SET disease = $1, prescription = $2, notes = $3 WHERE prescription_id = $4 AND doctor_id = $5',
            [disease, prescription, notes, id, doctor_id]
        );

        res.json({
            success: true,
            message: 'Prescription updated successfully'
        });
    } catch (error) {
        console.error('Update prescription error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update prescription',
            error: error.message
        });
    }
};

// Get Patient Prescriptions
exports.getPatientPrescriptions = async (req, res) => {
    try {
        const { patient_id } = req.params;

        const { rows: prescriptions } = await db.query(
            'SELECT * FROM prescriptions WHERE patient_id = $1 ORDER BY created_at DESC',
            [patient_id]
        );

        res.json({
            success: true,
            prescriptions
        });
    } catch (error) {
        console.error('Get prescriptions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch prescriptions',
            error: error.message
        });
    }
};
