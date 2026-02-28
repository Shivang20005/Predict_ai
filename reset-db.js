const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'Shivang@2005',
};

async function resetDatabase() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL.');

        console.log('⚠️ Dropping database "predict_ai"...');
        await connection.query('DROP DATABASE IF EXISTS predict_ai');
        console.log('✅ Database dropped successfully.');

        await connection.end();
    } catch (error) {
        console.error('❌ Error resetting database:', error);
    }
}

resetDatabase();
