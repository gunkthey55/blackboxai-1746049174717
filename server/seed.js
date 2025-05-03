const db = require('./db');

// Delete existing data
db.serialize(() => {
    db.run('DELETE FROM peminjaman_part');
    db.run('DELETE FROM device');
    db.run('DELETE FROM pelanggan');
});

// Insert dummy data
db.serialize(() => {
    // Insert sample customers
    db.run(`
        INSERT OR IGNORE INTO pelanggan (id, nama, email, telepon) VALUES 
        ('1', 'Budi Santoso', 'budi@email.com', '081234567890'),
        ('2', 'Ani Wijaya', 'ani@email.com', '081234567891'),
        ('3', 'Citra Dewi', 'citra@email.com', '081234567892')
    `);

    // Insert sample devices
    db.run(`
        INSERT OR IGNORE INTO device (id, id_pelanggan, nama_device, tipe_device, nomor_seri, catatan) VALUES 
        ('1', '1', 'Laptop Lenovo', 'ThinkPad X1', 'LNV123456', 'Laptop kantor'),
        ('2', '1', 'Printer HP', 'LaserJet Pro', 'HP789012', 'Printer departemen'),
        ('3', '2', 'Laptop Dell', 'Latitude 5420', 'DLL345678', 'Laptop pribadi'),
        ('4', '3', 'Scanner Epson', 'WorkForce', 'EPS901234', 'Scanner dokumen')
    `);

    // Insert sample part loans
    db.run(`
        INSERT OR IGNORE INTO peminjaman_part (
            id, id_pelanggan, id_device, nama_part_normal, nama_part_rusak,
            tanggal_pinjam, perkiraan_tanggal_kembali, status, catatan
        ) VALUES 
        (
            '1', '1', '1', 'Keyboard Baru', 'Keyboard Rusak',
            '2024-01-15 10:00:00', '2024-01-22 10:00:00', 'DIPINJAM',
            'Tombol spacebar macet'
        ),
        (
            '2', '2', '3', 'LCD Panel Baru', 'LCD Panel Retak',
            '2024-01-16 14:30:00', '2024-01-23 14:30:00', 'DIPINJAM',
            'Layar retak bagian kiri'
        )
    `);
});

console.log('Dummy data has been inserted successfully!');
