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
app.use(express.static(path.join(__dirname, '../')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const apiRouter = express.Router();
apiRouter.use('/patient', require('./routes/patient.routes'));
apiRouter.use('/doctor', require('./routes/doctor.routes'));
apiRouter.use('/hospital', require('./routes/hospital.routes'));
apiRouter.use('/admin', require('./routes/admin.routes'));
apiRouter.use('/bookings', require('./routes/lab_booking.routes'));
apiRouter.use('/medical', require('./routes/medical.routes'));
apiRouter.use('/notifications', require('./routes/notification.routes'));

app.use('/api', apiRouter);


// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
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

// Start server only if running directly (local development)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
