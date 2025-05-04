const { MongoClient } = require('mongodb');

// Connection URI (akan diganti dengan URI MongoDB Atlas)
const uri = process.env.MONGODB_URI || "mongodb+srv://[username]:[password]@[cluster-url]/[database]?retryWrites=true&w=majority";

// Database Name
const dbName = 'sistem_manajemen_part';

let client;
let db;

async function connectToMongo() {
    try {
        client = new MongoClient(uri);
        await client.connect();
        console.log('Terhubung ke MongoDB Atlas');
        
        db = client.db(dbName);
        
        // Buat collections jika belum ada
        await db.createCollection('pelanggan');
        await db.createCollection('device');
        await db.createCollection('device_images');
        await db.createCollection('peminjaman_part');
        await db.createCollection('distributor');
        await db.createCollection('klaim_garansi');
        
        return db;
    } catch (err) {
        console.error('Error koneksi ke MongoDB:', err);
        throw err;
    }
}

function getDb() {
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
