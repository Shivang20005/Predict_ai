const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mlHelper = require('../utils/ml-placeholder');

const JWT_SECRET = process.env.JWT_SECRET || 'predict_ai_secret_key_2026';

// Patient Signup
exports.signup = async (req, res) => {
    try {
        const { name, age, phone, aadhar_number, email, password } = req.body;

        // Validate required fields (aadhar_number is now optional)
        if (!name || !age || !phone || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Check if email already exists
        const { rows: existingEmail } = await db.query(
            'SELECT * FROM patients WHERE email = $1',
            [email]
        );

        if (existingEmail.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Check if Aadhar already exists (only if provided)
        if (aadhar_number) {
            const { rows: existingAadhar } = await db.query(
                'SELECT * FROM patients WHERE aadhar_number = $1',
                [aadhar_number]
            );

            if (existingAadhar.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Aadhar number already registered'
                });
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert patient (aadhar_number can be null)
        const { rows: [result] } = await db.query(
            'INSERT INTO patients (name, age, phone, aadhar_number, email, password, address) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING patient_id',
            [name, age, phone, aadhar_number || null, email, hashedPassword, req.body.address || null]
        );

        res.status(201).json({
            success: true,
            message: 'Patient registered successfully',
            patient_id: result.patient_id
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
};

// Check if Aadhar exists
exports.checkAadhar = async (req, res) => {
    try {
        const { aadhar } = req.params;
        const { rows: existing } = await db.query('SELECT patient_id FROM patients WHERE aadhar_number = $1', [aadhar]);

        if (existing.length > 0) {
            return res.json({ exists: true, message: 'This Aadhar number is already inserted.' });
        }
        res.json({ exists: false });
    } catch (error) {
        console.error('Check Aadhar error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Check if Email exists
exports.checkEmail = async (req, res) => {
    try {
        const { email } = req.body; // Using body for email to avoid URL encoding issues with dots/at-signs
        const { rows: existing } = await db.query('SELECT patient_id FROM patients WHERE email = $1', [email]);

        if (existing.length > 0) {
            return res.json({ exists: true, message: 'This Email is already registered.' });
        }
        res.json({ exists: false });
    } catch (error) {
        console.error('Check Email error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Patient Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find patient
        const { rows: patients } = await db.query(
            'SELECT * FROM patients WHERE email = $1',
            [email]
        );

        if (patients.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const patient = patients[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, patient.password);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { patient_id: patient.patient_id, email: patient.email, role: 'patient' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            patient: {
                patient_id: patient.patient_id,
                name: patient.name,
                email: patient.email,
                age: patient.age,
                phone: patient.phone,
                address: patient.address
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
};

// Analyze Symptoms
exports.analyzeSymptoms = async (req, res) => {
    try {
        const { symptoms } = req.body;
        const patient_id = req.patient.patient_id;

        if (!symptoms || symptoms.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Symptoms are required'
            });
        }

        // Use ML helper to predict disease
        const analysis = mlHelper.predictDiseaseFromSymptoms(symptoms);

        // Save analysis to database
        await db.query(
            'INSERT INTO symptoms_analysis (patient_id, symptoms, predicted_disease, recommendation, severity) VALUES ($1, $2, $3, $4, $5)',
            [patient_id, JSON.stringify(symptoms), analysis.disease, analysis.recommendation, analysis.severity]
        );

        res.json({
            success: true,
            analysis
        });
    } catch (error) {
        console.error('Symptom analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Analysis failed',
            error: error.message
        });
    }
};

// Upload Lab Report
exports.uploadReport = async (req, res) => {
    try {
        const patient_id = req.patient.patient_id;
        const { report_type } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const file_path = req.file.path.replace(/\\/g, '/');
        const relative_path = file_path.includes('backend/uploads') ? 'uploads' + file_path.split('backend/uploads')[1] : file_path;
        const file_type = req.file.mimetype.includes('pdf') ? 'pdf' : 'image';

        // Analyze report using ML
        const analysis = mlHelper.analyzeLabReport(file_path, file_type);

        // Save report to database
        const { rows: [result] } = await db.query(
            'INSERT INTO lab_reports (patient_id, report_type, file_path, file_type, analysis_result) VALUES ($1, $2, $3, $4, $5) RETURNING report_id',
            [patient_id, report_type, relative_path, file_type, JSON.stringify(analysis)]
        );

        res.json({
            success: true,
            message: 'Report uploaded successfully',
            report_id: result.report_id,
            analysis
        });
    } catch (error) {
        console.error('Upload report error:', error);
        res.status(500).json({
            success: false,
            message: 'Upload failed',
            error: error.message
        });
    }
};

// Get Patient Reports
exports.getReports = async (req, res) => {
    try {
        const { patient_id } = req.params;

        const { rows: reports } = await db.query(
            'SELECT * FROM lab_reports WHERE patient_id = $1 ORDER BY uploaded_at DESC',
            [patient_id]
        );

        res.json({
            success: true,
            reports
        });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reports',
            error: error.message
        });
    }
};

// Get All Doctors
exports.getAllDoctors = async (req, res) => {
    try {
        const { rows: doctors } = await db.query(
            'SELECT doctor_id, name, specialization, hospital_name, availability_status, fees, is_verified FROM doctors ORDER BY name'
        );

        res.json({
            success: true,
            doctors
        });
    } catch (error) {
        console.error('Get doctors error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch doctors',
            error: error.message
        });
    }
};

// Book Appointment
exports.bookAppointment = async (req, res) => {
    try {
        const patient_id = req.patient.patient_id;
        const { doctor_id, notes } = req.body;

        // Check if doctor is available
        const { rows: doctors } = await db.query(
            'SELECT * FROM doctors WHERE doctor_id = $1 AND availability_status = $2',
            [doctor_id, "available"]
        );

        if (doctors.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Doctor is not available'
            });
        }

        const doctor = doctors[0];

        // Create appointment
        const { rows: [result] } = await db.query(
            'INSERT INTO appointments (patient_id, doctor_id, payment_amount, notes) VALUES ($1, $2, $3, $4) RETURNING appointment_id',
            [patient_id, doctor_id, doctor.fees, notes]
        );

        // Create notification for doctor
        await db.query(
            'INSERT INTO notifications (user_type, user_id, message) VALUES ($1, $2, $3)',
            ['doctor', doctor_id, `New appointment request from Patient ID: ${patient_id}`]
        );

        res.json({
            success: true,
            message: 'Appointment request sent',
            appointment_id: result.appointment_id
        });
    } catch (error) {
        console.error('Book appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Booking failed',
            error: error.message
        });
    }
};

// Get Patient Appointments
exports.getAppointments = async (req, res) => {
    try {
        const patient_id = req.patient.patient_id;

        const { rows: appointments } = await db.query(
            `SELECT a.*, d.name as doctor_name, d.specialization, d.hospital_name 
             FROM appointments a 
             JOIN doctors d ON a.doctor_id = d.doctor_id 
             WHERE a.patient_id = $1 
             ORDER BY a.created_at DESC`,
            [patient_id]
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

// Process Payment
exports.processPayment = async (req, res) => {
    try {
        const { appointment_id } = req.params;
        const { payment_method } = req.body;

        // Update payment status
        await db.query(
            'UPDATE appointments SET payment_status = $1 WHERE appointment_id = $2',
            ["completed", appointment_id]
        );

        res.json({
            success: true,
            message: 'Payment processed successfully'
        });
    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment failed',
            error: error.message
        });
    }
};

// Get Prescriptions
exports.getPrescriptions = async (req, res) => {
    try {
        const { patient_id } = req.params;

        const { rows: prescriptions } = await db.query(
            `SELECT p.*, d.name as doctor_name, d.specialization 
             FROM prescriptions p 
             JOIN doctors d ON p.doctor_id = d.doctor_id 
             WHERE p.patient_id = $1 
             ORDER BY p.created_at DESC`,
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

// Get Notifications
exports.getNotifications = async (req, res) => {
    try {
        const patient_id = req.patient.patient_id;

        const { rows: notifications } = await db.query(
            'SELECT * FROM notifications WHERE user_type = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 20',
            ["patient", patient_id]
        );

        res.json({
            success: true,
            notifications
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            error: error.message
        });
    }
};

// Mark Notification as Read
exports.markNotificationRead = async (req, res) => {
    try {
        const { notification_id } = req.params;

        await db.query(
            'UPDATE notifications SET is_read = $1 WHERE notification_id = $2',
            [true, notification_id]
        );

        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        console.error('Mark notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update notification',
            error: error.message
        });
    }
};

// Get Single Prescription By ID
exports.getPrescriptionById = async (req, res) => {
    try {
        const { id } = req.params;
        const { rows: prescriptions } = await db.query(
            `SELECT p.*, d.name as doctor_name, d.specialization 
             FROM prescriptions p 
             JOIN doctors d ON p.doctor_id = d.doctor_id 
             WHERE p.prescription_id = $1`,
            [id]
        );

        if (prescriptions.length === 0) {
            return res.status(404).json({ success: false, message: 'Prescription not found' });
        }

        res.json({ success: true, prescription: prescriptions[0] });
    } catch (error) {
        console.error('Get prescription by ID error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch prescription' });
    }
};

// Get Single Lab Report By ID
exports.getReportById = async (req, res) => {
    try {
        const { id } = req.params;
        const { rows: reports } = await db.query('SELECT * FROM lab_reports WHERE report_id = $1', [id]);

        if (reports.length === 0) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }

        res.json({ success: true, report: reports[0] });
    } catch (error) {
        console.error('Get report by ID error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch report' });
    }
};
