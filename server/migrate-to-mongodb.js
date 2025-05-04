const sqlite3 = require('sqlite3').verbose();
const { MongoClient } = require('mongodb');
require('dotenv').config();

// SQLite database
const sqliteDb = new sqlite3.Database('customers.db');

// MongoDB connection URI
const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('Error: MONGODB_URI tidak ditemukan di file .env');
    process.exit(1);
}
const dbName = 'sistem_manajemen_part';

async function migrateData() {
    try {
        console.log('Memulai migrasi data...');
        
        // Connect to MongoDB
        const client = new MongoClient(uri);
        await client.connect();
        console.log('Terhubung ke MongoDB Atlas');
        
        const db = client.db(dbName);

        // Migrate Pelanggan
        console.log('Migrasi data pelanggan...');
        const pelanggan = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM pelanggan', [], (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
        if (pelanggan.length > 0) {
            await db.collection('pelanggan').insertMany(pelanggan);
        }

        // Migrate Device
        console.log('Migrasi data device...');
        const devices = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM device', [], (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
        if (devices.length > 0) {
            await db.collection('device').insertMany(devices);
        }

        // Migrate Device Images
        console.log('Migrasi data gambar device...');
        const deviceImages = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM device_images', [], (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
        if (deviceImages.length > 0) {
            await db.collection('device_images').insertMany(deviceImages);
        }

        // Migrate Distributor
        console.log('Migrasi data distributor...');
        const distributors = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM distributor', [], (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
        if (distributors.length > 0) {
            await db.collection('distributor').insertMany(distributors);
        }

        // Migrate Klaim Garansi
        console.log('Migrasi data klaim garansi...');
        const klaimGaransi = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM klaim_garansi', [], (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
        if (klaimGaransi.length > 0) {
            await db.collection('klaim_garansi').insertMany(klaimGaransi);
        }

        // Migrate Peminjaman Part
        console.log('Migrasi data peminjaman part...');
        const peminjamanPart = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM peminjaman_part', [], (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
        if (peminjamanPart.length > 0) {
            await db.collection('peminjaman_part').insertMany(peminjamanPart);
        }

        console.log('Migrasi data selesai!');
        
        // Create indexes
        console.log('Membuat indexes...');
        await db.collection('device').createIndex({ id_pelanggan: 1 });
        await db.collection('device_images').createIndex({ id_device: 1 });
        await db.collection('klaim_garansi').createIndex({ id_device: 1, id_pelanggan: 1 });
        await db.collection('peminjaman_part').createIndex({ id_device: 1, id_pelanggan: 1 });

        // Close connections
        await client.close();
        sqliteDb.close();
        
        console.log('Proses migrasi selesai!');
    } catch (error) {
        console.error('Error selama migrasi:', error);
        process.exit(1);
    }
}

// Tambahkan file .env untuk menyimpan MONGODB_URI
const fs = require('fs');
if (!fs.existsSync('.env')) {
    fs.writeFileSync('.env', 'MONGODB_URI=mongodb+srv://[username]:[password]@[cluster-url]/[database]?retryWrites=true&w=majority\n');
}

// Run migration
migrateData().catch(console.error);
