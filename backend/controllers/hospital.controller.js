const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mlHelper = require('../utils/ml-placeholder');

const JWT_SECRET = process.env.JWT_SECRET || 'predict_ai_secret_key_2026';

// Hospital Signup
exports.signup = async (req, res) => {
    try {
        const { hospital_name, email, password, address, phone, license_number } = req.body;

        if (!hospital_name || !email || !password || !license_number) {
            return res.status(400).json({
                success: false,
                message: 'Hospital name, email, password, and license number are required'
            });
        }

        const { rows: existing } = await db.query(
            'SELECT * FROM hospitals WHERE email = $1',
            [email]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const { rows: [result] } = await db.query(
            'INSERT INTO hospitals (hospital_name, email, password, address, phone, license_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING hospital_id',
            [hospital_name, email, hashedPassword, address, phone, license_number]
        );

        res.status(201).json({
            success: true,
            message: 'Hospital registered successfully',
            hospital_id: result.hospital_id
        });
    } catch (error) {
        console.error('Hospital signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
};

// Hospital Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const { rows: hospitals } = await db.query(
            'SELECT * FROM hospitals WHERE email = $1',
            [email]
        );

        if (hospitals.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const hospital = hospitals[0];
        const isValidPassword = await bcrypt.compare(password, hospital.password);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const token = jwt.sign(
            { hospital_id: hospital.hospital_id, email: hospital.email, role: 'hospital' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            hospital: {
                hospital_id: hospital.hospital_id,
                hospital_name: hospital.hospital_name,
                email: hospital.email
            }
        });
    } catch (error) {
        console.error('Hospital login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
};

// Lab Staff Signup
exports.labStaffSignup = async (req, res) => {
    try {
        const { hospital_id, name, email, password, phone, license_number } = req.body;

        if (!hospital_id || !name || !email || !password || !license_number) {
            return res.status(400).json({
                success: false,
                message: 'All fields including license number are required'
            });
        }

        const { rows: existing } = await db.query(
            'SELECT * FROM lab_staff WHERE email = $1',
            [email]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const { rows: [result] } = await db.query(
            'INSERT INTO lab_staff (hospital_id, name, email, password, phone, license_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING staff_id',
            [hospital_id, name, email, hashedPassword, phone, license_number]
        );

        res.status(201).json({
            success: true,
            message: 'Lab staff registered successfully',
            staff_id: result.staff_id
        });
    } catch (error) {
        console.error('Lab staff signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
};

// Lab Staff Login
exports.labStaffLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const { rows: staff } = await db.query(
            'SELECT * FROM lab_staff WHERE email = $1',
            [email]
        );

        if (staff.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const labStaff = staff[0];
        const isValidPassword = await bcrypt.compare(password, labStaff.password);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const token = jwt.sign(
            { staff_id: labStaff.staff_id, hospital_id: labStaff.hospital_id, email: labStaff.email, role: 'lab_staff' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            staff: {
                staff_id: labStaff.staff_id,
                name: labStaff.name,
                email: labStaff.email,
                hospital_id: labStaff.hospital_id
            }
        });
    } catch (error) {
        console.error('Lab staff login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
};

// Upload Report (Lab Staff)
exports.uploadReport = async (req, res) => {
    try {
        const staff_id = req.hospital.staff_id;
        const { patient_id, report_type, doctor_id } = req.body;

        if (!patient_id || !req.file) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID and report file are required'
            });
        }

        const file_path = req.file.path.replace(/\\/g, '/').split('backend/')[1];
        const file_type = req.file.mimetype.includes('pdf') ? 'pdf' : 'image';

        // Analyze report
        const analysis = mlHelper.analyzeLabReport(file_path, file_type);

        const { rows: [result] } = await db.query(
            'INSERT INTO lab_reports (patient_id, doctor_id, uploaded_by_staff_id, report_type, file_path, file_type, analysis_result) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING report_id',
            [patient_id, doctor_id || null, staff_id, report_type, file_path, file_type, JSON.stringify(analysis)]
        );

        // Notify patient
        await db.query(
            'INSERT INTO notifications (user_type, user_id, message) VALUES ($1, $2, $3)',
            ['patient', patient_id, 'Your lab report has been uploaded and is ready to view']
        );

        // Notify doctor if provided
        if (doctor_id) {
            await db.query(
                'INSERT INTO notifications (user_type, user_id, message) VALUES ($1, $2, $3)',
                ['doctor', doctor_id, `A new lab report has been uploaded for your patient (ID: ${patient_id})`]
            );
        }

        res.json({
            success: true,
            message: 'Report uploaded successfully',
            report_id: result.report_id
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

// Get All Hospital Staff
exports.getAllStaff = async (req, res) => {
    try {
        const hospital_id = req.hospital.hospital_id;

        const { rows: staff } = await db.query(
            'SELECT * FROM hospital_staff WHERE hospital_id = $1 ORDER BY name',
            [hospital_id]
        );

        res.json({
            success: true,
            staff
        });
    } catch (error) {
        console.error('Get staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch staff',
            error: error.message
        });
    }
};

// Add Hospital Staff
exports.addStaff = async (req, res) => {
    try {
        const hospital_id = req.hospital.hospital_id;
        const { name, age, gender, salary, date_of_joining, aadhar_number, work_type } = req.body;

        if (!name || !age || !gender || !salary || !date_of_joining || !aadhar_number) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be provided'
            });
        }

        const { rows: [result] } = await db.query(
            'INSERT INTO hospital_staff (hospital_id, name, age, gender, salary, date_of_joining, aadhar_number, work_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING staff_id',
            [hospital_id, name, age, gender, salary, date_of_joining, aadhar_number, work_type]
        );

        res.status(201).json({
            success: true,
            message: 'Staff added successfully',
            staff_id: result.staff_id
        });
    } catch (error) {
        console.error('Add staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add staff',
            error: error.message
        });
    }
};

// Update Hospital Staff
exports.updateStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const hospital_id = req.hospital.hospital_id;
        const { name, age, gender, salary, date_of_joining, aadhar_number, work_type } = req.body;

        await db.query(
            'UPDATE hospital_staff SET name = $1, age = $2, gender = $3, salary = $4, date_of_joining = $5, aadhar_number = $6, work_type = $7 WHERE staff_id = $8 AND hospital_id = $9',
            [name, age, gender, salary, date_of_joining, aadhar_number, work_type, id, hospital_id]
        );

        res.json({
            success: true,
            message: 'Staff updated successfully'
        });
    } catch (error) {
        console.error('Update staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update staff',
            error: error.message
        });
    }
};

// Delete Hospital Staff
exports.deleteStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const hospital_id = req.hospital.hospital_id;

        await db.query(
            'DELETE FROM hospital_staff WHERE staff_id = $1 AND hospital_id = $2',
            [id, hospital_id]
        );

        res.json({
            success: true,
            message: 'Staff deleted successfully'
        });
    } catch (error) {
        console.error('Delete staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete staff',
            error: error.message
        });
    }
};
