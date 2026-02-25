const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/patient', require('./routes/patient.routes'));
app.use('/api/doctor', require('./routes/doctor.routes'));
app.use('/api/hospital', require('./routes/hospital.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/bookings', require('./routes/lab_booking.routes'));
app.use('/api/medical', require('./routes/medical.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));


// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

module.exports = app;
