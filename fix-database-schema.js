const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'Srishti@2006',
    database: 'predict_ai'
};

async function fixSchema() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL.');

        // Fix Hospitals table
        try {
            await connection.query('ALTER TABLE hospitals ADD COLUMN is_verified BOOLEAN DEFAULT FALSE AFTER phone');
            console.log('✅ Added "is_verified" to hospitals.');
        } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') console.error(e.message); }

        try {
            await connection.query('ALTER TABLE hospitals ADD COLUMN license_number VARCHAR(50) AFTER phone');
            console.log('✅ Added "license_number" to hospitals.');
        } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') console.error(e.message); }

        // Fix Lab Staff table
        try {
            await connection.query('ALTER TABLE lab_staff ADD COLUMN license_number VARCHAR(50) AFTER phone');
            console.log('✅ Added "license_number" to lab_staff.');
        } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') console.error(e.message); }

        try {
            await connection.query('ALTER TABLE lab_staff ADD COLUMN is_verified BOOLEAN DEFAULT FALSE AFTER license_number');
            console.log('✅ Added "is_verified" to lab_staff.');
        } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') console.error(e.message); }

        await connection.end();
        console.log('✨ Schema fix complete!');
    } catch (error) {
        console.error('❌ Error updating database:', error.message);
    }
}

fixSchema();
