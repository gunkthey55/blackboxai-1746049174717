const sqlite3 = require('sqlite3').verbose();

// Create a new database instance
const db = new sqlite3.Database('./server/customers.db');

// Initialize the database
db.serialize(() => {
    // Create customers table if it doesn't exist
    db.run(`
        CREATE TABLE IF NOT EXISTS pelanggan (
            id TEXT PRIMARY KEY,
            nama TEXT NOT NULL,
            email TEXT,
            telepon TEXT
        )
    `);

    // Create devices table if it doesn't exist
    db.run(`
        CREATE TABLE IF NOT EXISTS device (
            id TEXT PRIMARY KEY,
            id_pelanggan TEXT NOT NULL,
            nama_device TEXT NOT NULL,
            tipe_device TEXT,
            nomor_seri TEXT,
            catatan TEXT,
            FOREIGN KEY (id_pelanggan) REFERENCES pelanggan(id)
        )
    `);

    // Create device images table if it doesn't exist
    db.run(`
        CREATE TABLE IF NOT EXISTS device_images (
            id TEXT PRIMARY KEY,
            id_device TEXT NOT NULL,
            foto_path TEXT NOT NULL,
            urutan INTEGER NOT NULL,
            FOREIGN KEY (id_device) REFERENCES device(id)
        )
    `);

    // Create warranty info table if it doesn't exist
    db.run(`
        CREATE TABLE IF NOT EXISTS distributor (
            id TEXT PRIMARY KEY,
            nama TEXT NOT NULL,
            alamat TEXT,
            telepon TEXT,
            email TEXT
        )
    `);

    // Add warranty fields to device table if they don't exist
    db.run(`
        ALTER TABLE device ADD COLUMN tanggal_beli DATE;
        ALTER TABLE device ADD COLUMN masa_garansi INTEGER;
        ALTER TABLE device ADD COLUMN id_distributor TEXT REFERENCES distributor(id);
    `);

    // Create warranty claims table if it doesn't exist
    db.run(`
        CREATE TABLE IF NOT EXISTS klaim_garansi (
            id TEXT PRIMARY KEY,
            id_device TEXT NOT NULL,
            id_pelanggan TEXT NOT NULL,
            id_distributor TEXT NOT NULL,
            tanggal_klaim DATETIME NOT NULL,
            tanggal_kirim_distributor DATETIME,
            tanggal_terima_kembali DATETIME,
            deskripsi_masalah TEXT NOT NULL,
            status TEXT NOT NULL,
            resolusi TEXT,
            catatan TEXT,
            FOREIGN KEY (id_device) REFERENCES device(id),
            FOREIGN KEY (id_pelanggan) REFERENCES pelanggan(id),
            FOREIGN KEY (id_distributor) REFERENCES distributor(id)
        )
    `);

    // Create part loans table if it doesn't exist
    db.run(`
        CREATE TABLE IF NOT EXISTS peminjaman_part (
            id TEXT PRIMARY KEY,
            id_pelanggan TEXT NOT NULL,
            id_device TEXT NOT NULL,
            nama_part_normal TEXT NOT NULL,
            nama_part_rusak TEXT NOT NULL,
            tanggal_pinjam DATETIME NOT NULL,
            perkiraan_tanggal_kembali DATETIME NOT NULL,
            tanggal_kembali_aktual DATETIME,
            status TEXT NOT NULL,
            catatan TEXT,
            FOREIGN KEY (id_pelanggan) REFERENCES pelanggan(id),
            FOREIGN KEY (id_device) REFERENCES device(id)
        )
    `);
});

module.exports = db;
