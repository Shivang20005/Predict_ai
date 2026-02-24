const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'Srishti@2006', // Your Password
    multipleStatements: true
};

async function initDatabase() {
    try {
        // 1. Connect without database selected
        const connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL server.');

        // 2. Create Database
        await connection.query(`CREATE DATABASE IF NOT EXISTS predict_ai`);
        console.log('✅ Database "predict_ai" created or already exists.');

        // 3. Select Database
        await connection.changeUser({ database: 'predict_ai' });

        // 4. Read Schema File
        // Note: We'll embed the schema here to ensure it runs correctly even if the file path is tricky
        const schemaSQL = `
            CREATE TABLE IF NOT EXISTS patients (
                patient_id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                age INT NOT NULL,
                phone VARCHAR(15) NOT NULL,
                aadhar_number VARCHAR(12) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS doctors (
                doctor_id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                specialization VARCHAR(100) NOT NULL,
                hospital_name VARCHAR(100) NOT NULL,
                phone VARCHAR(15) NOT NULL,
                age INT NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                fees DECIMAL(10,2) NOT NULL,
                availability_status ENUM('available', 'not_available') DEFAULT 'not_available',
                degree_file VARCHAR(255) DEFAULT NULL,
                is_verified BOOLEAN DEFAULT FALSE,
                license_number VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS admins (
                admin_id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS hospitals (
                hospital_id INT AUTO_INCREMENT PRIMARY KEY,
                hospital_name VARCHAR(150) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                address TEXT,
                phone VARCHAR(15),
                license_number VARCHAR(50),
                is_verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS hospital_staff (
                staff_id INT AUTO_INCREMENT PRIMARY KEY,
                hospital_id INT,
                name VARCHAR(100) NOT NULL,
                age INT,
                gender VARCHAR(10),
                salary DECIMAL(10,2),
                date_of_joining DATE,
                aadhar_number VARCHAR(12),
                work_type VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS lab_staff (
                staff_id INT AUTO_INCREMENT PRIMARY KEY,
                hospital_id INT,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(15),
                license_number VARCHAR(50),
                is_verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS appointments (
                appointment_id INT AUTO_INCREMENT PRIMARY KEY,
                patient_id INT,
                doctor_id INT,
                status ENUM('pending', 'accepted', 'rejected', 'completed') DEFAULT 'pending',
                payment_status ENUM('pending', 'completed') DEFAULT 'pending',
                payment_amount DECIMAL(10,2),
                meet_link VARCHAR(255),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
                FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS prescriptions (
                prescription_id INT AUTO_INCREMENT PRIMARY KEY,
                patient_id INT,
                doctor_id INT,
                disease VARCHAR(100),
                prescription TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
                FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS lab_reports (
                report_id INT AUTO_INCREMENT PRIMARY KEY,
                patient_id INT,
                doctor_id INT,
                uploaded_by_staff_id INT,
                report_type VARCHAR(50),
                file_path VARCHAR(255),
                file_type VARCHAR(20),
                analysis_result JSON,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
                FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE SET NULL,
                FOREIGN KEY (uploaded_by_staff_id) REFERENCES lab_staff(staff_id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS symptoms_analysis (
                analysis_id INT AUTO_INCREMENT PRIMARY KEY,
                patient_id INT,
                symptoms JSON,
                predicted_disease VARCHAR(100),
                recommendation TEXT,
                severity VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS notifications (
                notification_id INT AUTO_INCREMENT PRIMARY KEY,
                user_type ENUM('patient', 'doctor', 'hospital', 'lab_staff', 'medical'),
                user_id INT,
                message TEXT,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS lab_bookings (
                booking_id INT AUTO_INCREMENT PRIMARY KEY,
                lab_id INT NOT NULL,
                patient_id INT NOT NULL,
                patient_name VARCHAR(100) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                address TEXT NOT NULL,
                test_type VARCHAR(100),
                status ENUM('pending', 'confirmed', 'collected', 'completed') DEFAULT 'pending',
                collection_date DATETIME,
                report_eta DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (lab_id) REFERENCES hospitals(hospital_id),
                FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
            );

            CREATE TABLE IF NOT EXISTS medical_shops (
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
            );

            CREATE TABLE IF NOT EXISTS medicine_bookings (
                order_id INT AUTO_INCREMENT PRIMARY KEY,
                medical_id INT NOT NULL,
                patient_id INT NOT NULL,
                patient_name VARCHAR(100) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                address TEXT NOT NULL,
                prescription_id INT,
                report_id INT,
                status ENUM('pending', 'accepted', 'rejected', 'confirmed', 'out_for_delivery', 'delivered') DEFAULT 'pending',
                delivery_date DATETIME,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (medical_id) REFERENCES medical_shops(medical_id),
                FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
                FOREIGN KEY (prescription_id) REFERENCES prescriptions(prescription_id) ON DELETE SET NULL,
                FOREIGN KEY (report_id) REFERENCES lab_reports(report_id) ON DELETE SET NULL
            );
        `;

        // 5. Execute Schema
        await connection.query(schemaSQL);
        console.log('✅ Tables created successfully!');

        await connection.end();
        console.log('✨ Setup Complete! You can now run "npm start".');

    } catch (error) {
        console.error('❌ Error initializing database:', error);
    }
}

initDatabase();
