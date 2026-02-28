const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'Srishti@2006',
    database: 'predict_ai'
};

async function createMissingTables() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL.');

        const tables = [
            `CREATE TABLE IF NOT EXISTS medical_shops (
                medical_id INT AUTO_INCREMENT PRIMARY KEY,
                shop_name VARCHAR(150) NOT NULL,
                owner_name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(15),
                address TEXT,
                license_number VARCHAR(50),
                is_verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS medicine_bookings (
                order_id INT AUTO_INCREMENT PRIMARY KEY,
                medical_id INT NOT NULL,
                patient_id INT NOT NULL,
                patient_name VARCHAR(100) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                address TEXT NOT NULL,
                prescription_id INT,
                report_id INT,
                status ENUM('pending', 'accepted', 'rejected', 'confirmed', 'out_for_delivery', 'delivered') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (medical_id) REFERENCES medical_shops(medical_id) ON DELETE CASCADE,
                FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
            )`
        ];

        for (const sql of tables) {
            await connection.query(sql);
        }

        console.log('✅ Missing tables created successfully!');
        await connection.end();
    } catch (error) {
        console.error('❌ Error creating tables:', error.message);
    }
}

createMissingTables();
