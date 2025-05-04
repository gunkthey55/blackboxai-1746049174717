const { MongoClient } = require('mongodb');
const config = require('./config');

const uri = config.mongoURI;
const dbName = config.dbName;

let client;
let db;

async function connectToMongo() {
    try {
        client = new MongoClient(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        await client.connect();
        console.log('Terhubung ke MongoDB Atlas');
        
        db = client.db(dbName);
        
        // Buat collections jika belum ada
        await Promise.all([
            db.createCollection('pelanggan'),
            db.createCollection('device'),
            db.createCollection('device_images'),
            db.createCollection('peminjaman_part'),
            db.createCollection('distributor'),
            db.createCollection('klaim_garansi')
        ]);
        
        return db;
    } catch (err) {
        console.error('Error koneksi ke MongoDB:', err);
        throw err;
    }
}

function getDb() {
    if (!db) {
        throw new Error('Database belum terkoneksi. Panggil connectToMongo() terlebih dahulu.');
    }
    return db;
}

function closeConnection() {
    if (client) {
        client.close();
        console.log('Koneksi MongoDB ditutup');
    }
}

module.exports = {
    connectToMongo,
    getDb,
    closeConnection
};
