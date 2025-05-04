const sqlite3 = require('sqlite3').verbose();
const { MongoClient } = require('mongodb');
const config = require('./config');

async function migrateData() {
    console.log('Memulai migrasi data...');
    
    try {
        // Connect to MongoDB
        const client = new MongoClient(config.mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        await client.connect();
        const db = client.db(config.dbName);
        
        // Connect to SQLite
        const sqliteDb = new sqlite3.Database('./customers.db', sqlite3.OPEN_READONLY);

        // Migrate customers
        const customers = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM pelanggan', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        if (customers.length > 0) {
            await db.collection('pelanggan').insertMany(customers);
            console.log(`${customers.length} pelanggan berhasil dimigrasi`);
        }

        // Migrate devices
        const devices = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM device', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        if (devices.length > 0) {
            await db.collection('device').insertMany(devices);
            console.log(`${devices.length} device berhasil dimigrasi`);
        }

        // Migrate device images
        const deviceImages = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM device_images', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        if (deviceImages.length > 0) {
            await db.collection('device_images').insertMany(deviceImages);
            console.log(`${deviceImages.length} gambar device berhasil dimigrasi`);
        }

        // Close connections
        sqliteDb.close();
        await client.close();
        
        console.log('Migrasi data selesai!');
    } catch (error) {
        console.error('Error selama migrasi:', error);
    }
}

migrateData();
