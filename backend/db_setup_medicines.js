const db = require('./config/db');

async function setup() {
    try {
        console.log('Checking medicine_bookings table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS medicine_bookings (
                order_id INT AUTO_INCREMENT PRIMARY KEY,
                medical_id INT NOT NULL,
                patient_id INT NOT NULL,
                patient_name VARCHAR(100),
                phone VARCHAR(20),
                address TEXT,
                prescription_id INT,
                report_id INT,
                notes TEXT,
                status ENUM('pending', 'accepted', 'rejected', 'confirmed', 'out_for_delivery', 'delivered') DEFAULT 'pending',
                delivery_date DATETIME,
                cost DECIMAL(10, 2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (medical_id) REFERENCES medical_shops(medical_id),
                FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
            )
        `);
        console.log('✅ medicine_bookings table ready');
    } catch (err) {
        console.error('❌ Setup error:', err.message);
    }
    process.exit();
}

setup();
