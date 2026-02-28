const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'predict_ai_secret_key_2026';

// Verify Patient Token
exports.verifyPatient = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.role !== 'patient') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        req.patient = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

// Verify Doctor Token
exports.verifyDoctor = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.role !== 'doctor') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        req.doctor = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

// Verify Hospital Token
exports.verifyHospital = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.role !== 'hospital' && decoded.role !== 'lab_staff' && decoded.role !== 'medical') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        req.hospital = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

// Verify Admin Token
exports.verifyAdmin = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'predict_ai_admin_secret_2026');

        if (decoded.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        req.admin = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};
// Verify Any Token
exports.verifyToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

        const decoded = jwt.verify(token, JWT_SECRET);

        // Attach to appropriate request property based on role
        if (decoded.role === 'patient') req.patient = decoded;
        else if (decoded.role === 'doctor') req.doctor = decoded;
        else if (decoded.role === 'hospital' || decoded.role === 'lab_staff' || decoded.role === 'medical') req.hospital = decoded;

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};
