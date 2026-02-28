const db = require('../config/db');

// Get notifications for any logged in user
exports.getNotifications = async (req, res) => {
    try {
        let user_id;
        let user_type;

        // Identify user from token (req.patient, req.doctor, req.hospital/medical)
        if (req.patient) {
            user_id = req.patient.patient_id;
            user_type = 'patient';
        } else if (req.doctor) {
            user_id = req.doctor.doctor_id;
            user_type = 'doctor';
        } else if (req.hospital) {
            // This handles hospital, lab_staff, and medical shops (due to our auth fix)
            user_id = req.hospital.hospital_id || req.hospital.medical_id || req.hospital.staff_id;
            user_type = req.hospital.role;
        }

        if (!user_id || !user_type) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { rows: notifications } = await db.query(
            'SELECT * FROM notifications WHERE user_type = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 20',
            [user_type, user_id]
        );

        res.json({ success: true, notifications });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
};

// Mark notification as read
exports.markNotificationRead = async (req, res) => {
    try {
        const { notification_id } = req.params;
        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE notification_id = $1',
            [notification_id]
        );
        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update notification' });
    }
};
