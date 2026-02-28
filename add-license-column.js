const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'Srishti@2006', // Your Password
    database: 'predict_ai'
};

async function addLicenseColumn() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL server.');

        // Check if column exists
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'predict_ai' 
            AND TABLE_NAME = 'doctors' 
            AND COLUMN_NAME = 'license_number'
        `);

        if (columns.length > 0) {
            console.log('⚠️ Column "license_number" already exists in "doctors" table.');
        } else {
            // Add column
            await connection.query(`
                ALTER TABLE doctors 
                ADD COLUMN license_number VARCHAR(50) AFTER is_verified
            `);
            console.log('✅ Column "license_number" added to "doctors" table successfully.');
        }

        await connection.end();

    } catch (error) {
        console.error('❌ Error updating database:', error);
    }
}

addLicenseColumn();
