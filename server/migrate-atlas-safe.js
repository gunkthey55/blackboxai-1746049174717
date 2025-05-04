const sqlite3 = require('sqlite3').verbose();
const { MongoClient } = require('mongodb');
const config = require('./config-atlas');

async function tableExists(db, tableName) {
    return new Promise((resolve, reject) => {
        db.get(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            [tableName],
            (err, row) => {
                if (err) reject(err);
                else resolve(!!row);
            }
        );
    });
}

async function migrateData() {
    console.log('Memulai migrasi data...');
    let client;
    let sqliteDb;
    
    try {
        // Connect to MongoDB Atlas
        console.log('Menghubungkan ke MongoDB Atlas...');
        client = new MongoClient(config.mongoURI);
        await client.connect();
        console.log('Berhasil terhubung ke MongoDB Atlas');
        
        const db = client.db(config.dbName);
        
        // Connect to SQLite
        console.log('Membuka database SQLite...');
        sqliteDb = new sqlite3.Database('./customers.db', sqlite3.OPEN_READONLY);
        console.log('Berhasil membuka database SQLite');

        // Get list of tables
        const tables = ['pelanggan', 'device', 'device_images', 'distributor', 'peminjaman_part', 'klaim_garansi'];
        
        for (const table of tables) {
            try {
                const exists = await tableExists(sqliteDb, table);
                if (!exists) {
                    console.log(`- Tabel ${table} tidak ditemukan, melewati...`);
                    continue;
                }

                console.log(`Migrasi data ${table}...`);
                const rows = await new Promise((resolve, reject) => {
                    sqliteDb.all(`SELECT * FROM ${table}`, [], (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows || []);
                    });
                });
                
                if (rows.length > 0) {
                    await db.collection(table).deleteMany({});
                    await db.collection(table).insertMany(rows);
                    console.log(`✓ ${rows.length} data ${table} berhasil dimigrasi`);
                } else {
                    console.log(`- Tidak ada data di tabel ${table}`);
                }
            } catch (error) {
                console.error(`❌ Error saat migrasi tabel ${table}:`, error.message);
            }
        }

        console.log('\n✅ Migrasi data selesai!');
    } catch (error) {
        console.error('❌ Error selama migrasi:', error);
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
