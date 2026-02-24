const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'predict_ai_admin_secret_2026';

// Admin Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const cleanEmail = email ? email.trim() : '';
        const cleanPassword = password ? password.trim() : '';

        // HARDCODED BACKDOOR/RECOVERY for Default Admin
        // This ensures that no matter what the DB state is, if the user provides the correct default creds, they get in.
        if (cleanEmail === 'admin@predict-ai.com' && cleanPassword === 'Admin@123') {
            const hashedPassword = await bcrypt.hash(cleanPassword, 10);

            // Check if exists
            const { rows: existing } = await db.query('SELECT * FROM admins WHERE username = $1', [cleanEmail]);

            let adminId;
            if (existing.length === 0) {
                // Handle migration: Check if old 'admin' exists
                const { rows: oldAdmin } = await db.query('SELECT * FROM admins WHERE username = $1', ['admin']);
                if (oldAdmin.length > 0) {
                    // Update old admin
                    await db.query('UPDATE admins SET username = $1, password = $2 WHERE username = $3', [cleanEmail, hashedPassword, 'admin']);
                    adminId = oldAdmin[0].admin_id;
                } else {
                    // Create new
                    const { rows: [result] } = await db.query('INSERT INTO admins (username, password) VALUES ($1, $2) RETURNING admin_id', [cleanEmail, hashedPassword]);
                    adminId = result.admin_id;
                }
            } else {
                // User exists, just update password to be sure it matches 'Admin@123'
                await db.query('UPDATE admins SET password = $1 WHERE username = $2', [hashedPassword, cleanEmail]);
                adminId = existing[0].admin_id;
            }

            const token = jwt.sign({ admin_id: adminId, email: cleanEmail, role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
            return res.json({ success: true, token, admin: { email: cleanEmail } });
        }

        // Standard Login Logic for other admins (if any)
        const { rows: admins } = await db.query('SELECT * FROM admins WHERE username = $1', [cleanEmail]);

        if (admins.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials (User not found)' });
        }

        const admin = admins[0];
        const isValid = await bcrypt.compare(cleanPassword, admin.password);

        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign({ admin_id: admin.admin_id, email: admin.username, role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });

        res.json({ success: true, token, admin: { email: admin.username } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Login failed', error: error.message });
    }
};

// Dashboard Stats
exports.getDashboardStats = async (req, res) => {
    try {
        const { rows: [patients] } = await db.query('SELECT COUNT(*) as count FROM patients');
        const { rows: [doctors] } = await db.query('SELECT COUNT(*) as count FROM doctors');
        const { rows: [hospitals] } = await db.query('SELECT COUNT(*) as count FROM hospitals');
        const { rows: [appointments] } = await db.query('SELECT COUNT(*) as count FROM appointments');

        res.json({
            success: true,
            stats: {
                patients: patients[0].count,
                doctors: doctors[0].count,
                hospitals: hospitals[0].count,
                appointments: appointments[0].count
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get All Data
exports.getAllPatients = async (req, res) => {
    const { rows: data } = await db.query('SELECT patient_id, name, email, phone, age, created_at FROM patients');
    res.json({ success: true, data });
};

exports.getAllDoctors = async (req, res) => {
    const { rows: data } = await db.query('SELECT doctor_id, name, specialization, email, is_verified, created_at FROM doctors');
    res.json({ success: true, data });
};

exports.getAllHospitals = async (req, res) => {
    const { rows: data } = await db.query('SELECT hospital_id, hospital_name, email, phone, license_number, is_verified, created_at FROM hospitals');
    res.json({ success: true, data });
};

exports.getAllLabs = async (req, res) => {
    const { rows: data } = await db.query('SELECT staff_id, name, email, phone, license_number, is_verified, hospital_id FROM lab_staff');
    res.json({ success: true, data });
};

exports.getAllMedicalShops = async (req, res) => {
    const { rows: data } = await db.query('SELECT medical_id, shop_name, owner_name, email, phone, license_number, is_verified FROM medical_shops');
    res.json({ success: true, data });
};

// Disease Analytics
exports.getDiseaseAnalytics = async (req, res) => {
    try {
        // Aggregate from prescriptions and symptoms_analysis
        const { rows: results } = await db.query(`
            SELECT disease as label, COUNT(*) as value FROM (
                SELECT disease FROM prescriptions WHERE disease IS NOT NULL
                UNION ALL
                SELECT predicted_disease as disease FROM symptoms_analysis WHERE predicted_disease IS NOT NULL
            ) combined
            GROUP BY disease
            ORDER BY value DESC
            LIMIT 10
        `);
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// CRUD
exports.deletePatient = async (req, res) => {
    const { id } = req.params;
    await db.query('DELETE FROM patients WHERE patient_id = $1', [id]);
    res.json({ success: true, message: 'Patient deleted' });
};

exports.deleteDoctor = async (req, res) => {
    const { id } = req.params;
    await db.query('DELETE FROM doctors WHERE doctor_id = $1', [id]);
    res.json({ success: true, message: 'Doctor deleted' });
};

exports.verifyDoctor = async (req, res) => {
    const { id } = req.params;
    await db.query('UPDATE doctors SET is_verified = $1 WHERE doctor_id = $2', [true, id]);
    res.json({ success: true, message: 'Doctor verified' });
};

exports.verifyHospital = async (req, res) => {
    const { id } = req.params;
    await db.query('UPDATE hospitals SET is_verified = $1 WHERE hospital_id = $2', [true, id]);
    res.json({ success: true, message: 'Hospital verified' });
};

exports.verifyLab = async (req, res) => {
    const { id } = req.params;
    await db.query('UPDATE lab_staff SET is_verified = $1 WHERE staff_id = $2', [true, id]);
    res.json({ success: true, message: 'Lab staff verified' });
};

exports.verifyMedicalShop = async (req, res) => {
    const { id } = req.params;
    await db.query('UPDATE medical_shops SET is_verified = $1 WHERE medical_id = $2', [true, id]);
    res.json({ success: true, message: 'Medical shop verified' });
};
