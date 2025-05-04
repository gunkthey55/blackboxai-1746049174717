const sqlite3 = require('sqlite3').verbose();
const { MongoClient } = require('mongodb');
const config = require('./config-new');

async function migrateData() {
    console.log('Memulai migrasi data...');
    let client;
    let sqliteDb;
    
    try {
        // Connect to MongoDB
        console.log('Menghubungkan ke MongoDB Atlas...');
        client = new MongoClient(config.mongoURI, config.options);
        await client.connect();
        console.log('Berhasil terhubung ke MongoDB Atlas');
        
        const db = client.db(config.dbName);
        
        // Connect to SQLite
        console.log('Membuka database SQLite...');
        sqliteDb = new sqlite3.Database('./customers.db', sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                throw new Error(`Error membuka SQLite database: ${err.message}`);
            }
        });
        console.log('Berhasil membuka database SQLite');

        // Migrate customers
        console.log('Migrasi data pelanggan...');
        const customers = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM pelanggan', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
        
        if (customers.length > 0) {
            await db.collection('pelanggan').deleteMany({}); // Clear existing data
            await db.collection('pelanggan').insertMany(customers);
            console.log(`${customers.length} pelanggan berhasil dimigrasi`);
        } else {
            console.log('Tidak ada data pelanggan untuk dimigrasi');
        }

        // Migrate devices
        console.log('Migrasi data device...');
        const devices = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM device', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
        
        if (devices.length > 0) {
            await db.collection('device').deleteMany({});
            await db.collection('device').insertMany(devices);
            console.log(`${devices.length} device berhasil dimigrasi`);
        } else {
            console.log('Tidak ada data device untuk dimigrasi');
        }

        // Migrate device images
        console.log('Migrasi data gambar device...');
        const deviceImages = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM device_images', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
        
        if (deviceImages.length > 0) {
            await db.collection('device_images').deleteMany({});
            await db.collection('device_images').insertMany(deviceImages);
            console.log(`${deviceImages.length} gambar device berhasil dimigrasi`);
        } else {
            console.log('Tidak ada data gambar device untuk dimigrasi');
        }

        console.log('Migrasi data selesai!');
    } catch (error) {
        console.error('Error selama migrasi:', error);
        throw error;
    } finally {
        // Close connections
        if (sqliteDb) {
            sqliteDb.close((err) => {
                if (err) {
                    console.error('Error menutup koneksi SQLite:', err);
                } else {
                    console.log('Koneksi SQLite ditutup');
                }
            });
        }
        
        if (client) {
            try {
                await client.close();
                console.log('Koneksi MongoDB ditutup');
            } catch (err) {
                console.error('Error menutup koneksi MongoDB:', err);
            }
        }
    }
}

// Run migration
migrateData()
    .then(() => {
        console.log('Proses migrasi selesai');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Proses migrasi gagal:', error);
        process.exit(1);
    });
