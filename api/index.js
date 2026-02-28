let app;
try {
    app = require('../backend/server');
} catch (error) {
    console.error('FATAL ERROR DURING SERVER INITIALIZATION:', error);
    // Export a dummy app that just returns 500 with the error to the client
    app = (req, res) => {
        res.status(500).json({ error: 'Server Initialization Error', details: error.message, stack: error.stack });
    };
}

module.exports = app;
