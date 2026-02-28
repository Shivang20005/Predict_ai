const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'Shivang@2005', // Using the password found in previous files (add-license-column.js had this, setup-db.js had Srishti@2006. I should check which one worked last time. The user's system seems to use Shivang@2005 based on the successful doctor migration)
    // Actually, let me check the successful migration script `add-license-column.js` content if possible.
    // Wait, the user didn't show me that file content in the history I can see, but I wrote it in Step 42.
    // In Step 42 I used 'Shivang@2005'.
    database: 'predict_ai'
};

async function addHospitalLicenseColumn() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL.');

        // Add column if not exists
        // Note: IF NOT EXISTS for ADD COLUMN is only supported in newer MySQL/MariaDB versions.
        // A safer way is to check first.

        try {
            await connection.query(`
                ALTER TABLE hospitals
                ADD COLUMN license_number VARCHAR(50) AFTER phone;
            `);
            console.log('✅ Added "license_number" column to "hospitals" table.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ Column "license_number" already exists in "hospitals".');
            } else {
                throw err;
            }
        }

        await connection.end();
    } catch (error) {
        console.error('❌ Error updating database:', error);
    }
}

addHospitalLicenseColumn();
