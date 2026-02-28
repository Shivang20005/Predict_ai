const db = require('./config/db');

async function updateSchema() {
    try {
        console.log('Updating medicine_bookings table schema...');

        // Check if cost column exists
        const [columns] = await db.query("SHOW COLUMNS FROM medicine_bookings LIKE 'cost'");

        if (columns.length === 0) {
            console.log('Adding cost column...');
            await db.query("ALTER TABLE medicine_bookings ADD COLUMN cost DECIMAL(10, 2) DEFAULT NULL AFTER delivery_date");
            console.log('✅ cost column added successfully');
        } else {
            console.log('ℹ️ cost column already exists');
        }

    } catch (err) {
        console.error('❌ Schema update error:', err.message);
    }
    process.exit();
}

updateSchema();
