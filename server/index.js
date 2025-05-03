const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const PDFDocument = require('pdfkit');
const db = require('./db');

const app = express();
const PORT = 3001;

// Configure storage for multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './server/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Configure CORS and body parser
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware to log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length) {
        console.log('Request body:', JSON.stringify(req.body, null, 2));
    }
    next();
});

// Get all devices with their images
app.get('/api/device', (req, res) => {
    db.all(`
        SELECT 
            d.*,
            GROUP_CONCAT(di.foto_path) as foto_paths,
            GROUP_CONCAT(di.urutan) as foto_urutans
        FROM device d
        LEFT JOIN device_images di ON d.id = di.id_device
        GROUP BY d.id
    `, [], (err, rows) => {
        if (err) {
            console.error('Error membaca data device:', err);
            return res.status(500).json({ error: 'Gagal membaca data device' });
        }
        
        // Process the results to create proper arrays of images
        const devices = rows.map(row => {
            const foto_paths = row.foto_paths ? row.foto_paths.split(',') : [];
            const foto_urutans = row.foto_urutans ? row.foto_urutans.split(',').map(Number) : [];
            
            // Create sorted array of images
            const images = foto_paths.map((path, i) => ({
                path,
                urutan: foto_urutans[i]
            })).sort((a, b) => a.urutan - b.urutan);

            return {
                ...row,
                foto_paths: images.map(img => img.path),
                foto_urutans: undefined
            };
        });

        res.json(devices);
    });
});

// Get devices by customer
app.get('/api/device/pelanggan/:id', (req, res) => {
    const { id } = req.params;
    db.all('SELECT * FROM device WHERE id_pelanggan = ?', [id], (err, rows) => {
        if (err) {
            console.error('Error membaca data device:', err);
            return res.status(500).json({ error: 'Gagal membaca data device' });
        }
        res.json(rows);
    });
});

// Add new device with multiple photos
app.post('/api/device', upload.array('fotos', 5), (req, res) => {
    const { id_pelanggan, nama_device, tipe_device, nomor_seri, catatan } = req.body;
    const id = Date.now().toString();
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.run(
            'INSERT INTO device (id, id_pelanggan, nama_device, tipe_device, nomor_seri, catatan) VALUES (?, ?, ?, ?, ?, ?)',
            [id, id_pelanggan, nama_device, tipe_device, nomor_seri, catatan],
            function(err) {
                if (err) {
                    console.error('Error menambah device:', err);
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Gagal menambah device' });
                }

                // Insert images if any
                if (req.files && req.files.length > 0) {
                    const imageValues = req.files.map((file, index) => {
                        const imageId = Date.now().toString() + index;
                        const foto_path = `/uploads/${file.filename}`;
                        return [imageId, id, foto_path, index];
                    });

                    const placeholders = imageValues.map(() => '(?, ?, ?, ?)').join(',');
                    const flatValues = imageValues.flat();

                    db.run(
                        `INSERT INTO device_images (id, id_device, foto_path, urutan) VALUES ${placeholders}`,
                        flatValues,
                        function(err) {
                            if (err) {
                                console.error('Error menambah foto device:', err);
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: 'Gagal menambah foto device' });
                            }

                            db.run('COMMIT');
                            
                            const newDevice = {
                                id,
                                id_pelanggan,
                                nama_device,
                                tipe_device,
                                nomor_seri,
                                catatan,
                                foto_paths: req.files.map(file => `/uploads/${file.filename}`)
                            };
                            res.status(201).json(newDevice);
                        }
                    );
                } else {
                    db.run('COMMIT');
                    const newDevice = {
                        id,
                        id_pelanggan,
                        nama_device,
                        tipe_device,
                        nomor_seri,
                        catatan,
                        foto_paths: []
                    };
                    res.status(201).json(newDevice);
                }
            }
        );
    });
});

// Update device with multiple photos
app.put('/api/device/:id', upload.array('fotos', 5), (req, res) => {
    const { nama_device, tipe_device, nomor_seri, catatan, hapus_foto } = req.body;
    const { id } = req.params;
    const hapusFotoArray = hapus_foto ? JSON.parse(hapus_foto) : [];
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Update device info
        db.run(
            'UPDATE device SET nama_device = ?, tipe_device = ?, nomor_seri = ?, catatan = ? WHERE id = ?',
            [nama_device, tipe_device, nomor_seri, catatan, id],
            function(err) {
                if (err) {
                    console.error('Error mengupdate device:', err);
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Gagal mengupdate device' });
                }

                if (this.changes === 0) {
                    db.run('ROLLBACK');
                    return res.status(404).json({ error: 'Device tidak ditemukan' });
                }

                // Delete removed images
                if (hapusFotoArray.length > 0) {
                    const placeholders = hapusFotoArray.map(() => '?').join(',');
                    db.run(
                        `DELETE FROM device_images WHERE id_device = ? AND foto_path IN (${placeholders})`,
                        [id, ...hapusFotoArray],
                        function(err) {
                            if (err) {
                                console.error('Error menghapus foto:', err);
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: 'Gagal menghapus foto' });
                            }
                        }
                    );
                }

                // Add new images if any
                if (req.files && req.files.length > 0) {
                    // Get current max urutan
                    db.get(
                        'SELECT MAX(urutan) as max_urutan FROM device_images WHERE id_device = ?',
                        [id],
                        (err, row) => {
                            if (err) {
                                console.error('Error mendapatkan max urutan:', err);
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: 'Gagal mendapatkan urutan foto' });
                            }

                            const startUrutan = (row.max_urutan || -1) + 1;
                            const imageValues = req.files.map((file, index) => {
                                const imageId = Date.now().toString() + index;
                                const foto_path = `/uploads/${file.filename}`;
                                return [imageId, id, foto_path, startUrutan + index];
                            });

                            const placeholders = imageValues.map(() => '(?, ?, ?, ?)').join(',');
                            const flatValues = imageValues.flat();

                            db.run(
                                `INSERT INTO device_images (id, id_device, foto_path, urutan) VALUES ${placeholders}`,
                                flatValues,
                                function(err) {
                                    if (err) {
                                        console.error('Error menambah foto baru:', err);
                                        db.run('ROLLBACK');
                                        return res.status(500).json({ error: 'Gagal menambah foto baru' });
                                    }

                                    db.run('COMMIT');
                                    
                                    // Get updated device data
                                    db.all(
                                        `SELECT d.*, GROUP_CONCAT(di.foto_path) as foto_paths
                                        FROM device d
                                        LEFT JOIN device_images di ON d.id = di.id_device
                                        WHERE d.id = ?
                                        GROUP BY d.id`,
                                        [id],
                                        (err, rows) => {
                                            if (err) {
                                                console.error('Error mengambil data updated:', err);
                                                return res.status(500).json({ error: 'Gagal mengambil data updated' });
                                            }
                                            
                                            const device = rows[0];
                                            device.foto_paths = device.foto_paths ? device.foto_paths.split(',') : [];
                                            res.json(device);
                                        }
                                    );
                                }
                            );
                        }
                    );
                } else {
                    db.run('COMMIT');
                    
                    // Get updated device data
                    db.all(
                        `SELECT d.*, GROUP_CONCAT(di.foto_path) as foto_paths
                        FROM device d
                        LEFT JOIN device_images di ON d.id = di.id_device
                        WHERE d.id = ?
                        GROUP BY d.id`,
                        [id],
                        (err, rows) => {
                            if (err) {
                                console.error('Error mengambil data updated:', err);
                                return res.status(500).json({ error: 'Gagal mengambil data updated' });
                            }
                            
                            const device = rows[0];
                            device.foto_paths = device.foto_paths ? device.foto_paths.split(',') : [];
                            res.json(device);
                        }
                    );
                }
            }
        );
    });
});

// Delete device and its images
app.delete('/api/device/:id', (req, res) => {
    const { id } = req.params;
    
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Delete device images first
        db.run('DELETE FROM device_images WHERE id_device = ?', [id], function(err) {
            if (err) {
                console.error('Error menghapus foto device:', err);
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Gagal menghapus foto device' });
            }

            // Then delete the device
            db.run('DELETE FROM device WHERE id = ?', [id], function(err) {
                if (err) {
                    console.error('Error menghapus device:', err);
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Gagal menghapus device' });
                }

                if (this.changes === 0) {
                    db.run('ROLLBACK');
                    return res.status(404).json({ error: 'Device tidak ditemukan' });
                }

                db.run('COMMIT');
                res.status(204).send();
            });
        });
    });
});

// Get all customers
app.get('/api/pelanggan', (req, res) => {
    db.all('SELECT * FROM pelanggan', [], (err, rows) => {
        if (err) {
            console.error('Error membaca data pelanggan:', err);
            return res.status(500).json({ error: 'Gagal membaca data pelanggan' });
        }
        res.json(rows);
    });
});

// Add new customer
app.post('/api/pelanggan', (req, res) => {
    const { nama, email, telepon } = req.body;
    const id = Date.now().toString();
    
    db.run(
        'INSERT INTO pelanggan (id, nama, email, telepon) VALUES (?, ?, ?, ?)',
        [id, nama, email, telepon],
        function(err) {
            if (err) {
                console.error('Error menambah pelanggan:', err);
                return res.status(500).json({ error: 'Gagal menambah pelanggan' });
            }
            
            const newCustomer = { id, nama, email, telepon };
            res.status(201).json(newCustomer);
        }
    );
});

// Update customer
app.put('/api/pelanggan/:id', (req, res) => {
    const { nama, email, telepon } = req.body;
    const { id } = req.params;
    
    db.run(
        'UPDATE pelanggan SET nama = ?, email = ?, telepon = ? WHERE id = ?',
        [nama, email, telepon, id],
        function(err) {
            if (err) {
                console.error('Error mengupdate pelanggan:', err);
                return res.status(500).json({ error: 'Gagal mengupdate pelanggan' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Pelanggan tidak ditemukan' });
            }
            
            res.json({ id, nama, email, telepon });
        }
    );
});

// Delete customer
app.delete('/api/pelanggan/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM pelanggan WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Error menghapus pelanggan:', err);
            return res.status(500).json({ error: 'Gagal menghapus pelanggan' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Pelanggan tidak ditemukan' });
        }
        
        res.status(204).send();
    });
});

// Get all part loans
app.get('/api/peminjaman-part', (req, res) => {
    db.all(`
        SELECT 
            pp.*,
            p.nama as nama_pelanggan,
            d.nama_device,
            d.nomor_seri
        FROM peminjaman_part pp
        JOIN pelanggan p ON pp.id_pelanggan = p.id
        JOIN device d ON pp.id_device = d.id
    `, [], (err, rows) => {
        if (err) {
            console.error('Error membaca data peminjaman:', err);
            return res.status(500).json({ error: 'Gagal membaca data peminjaman' });
        }
        res.json(rows);
    });
});

// Add new part loan
app.post('/api/peminjaman-part', (req, res) => {
    const {
        id_pelanggan,
        id_device,
        nama_part_normal,
        nama_part_rusak,
        tanggal_pinjam,
        perkiraan_tanggal_kembali,
        catatan
    } = req.body;
    
    const id = Date.now().toString();
    const status = 'DIPINJAM';
    
    db.run(
        `INSERT INTO peminjaman_part (
            id, id_pelanggan, id_device, nama_part_normal, nama_part_rusak,
            tanggal_pinjam, perkiraan_tanggal_kembali, status, catatan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, id_pelanggan, id_device, nama_part_normal, nama_part_rusak,
         tanggal_pinjam, perkiraan_tanggal_kembali, status, catatan],
        function(err) {
            if (err) {
                console.error('Error menambah peminjaman:', err);
                return res.status(500).json({ error: 'Gagal menambah peminjaman' });
            }
            
            // Get the complete data including device info
            db.get(`
                SELECT 
                    pp.*,
                    p.nama as nama_pelanggan,
                    d.nama_device,
                    d.nomor_seri
                FROM peminjaman_part pp
                JOIN pelanggan p ON pp.id_pelanggan = p.id
                JOIN device d ON pp.id_device = d.id
                WHERE pp.id = ?
            `, [id], (err, row) => {
                if (err) {
                    console.error('Error mengambil data peminjaman:', err);
                    return res.status(500).json({ error: 'Gagal mengambil data peminjaman' });
                }
                res.status(201).json(row);
            });
        }
    );
});

// Update part loan
app.put('/api/peminjaman-part/:id', (req, res) => {
    const { id } = req.params;
    const { status, tanggal_kembali_aktual, catatan } = req.body;
    
    db.run(
        'UPDATE peminjaman_part SET status = ?, tanggal_kembali_aktual = ?, catatan = ? WHERE id = ?',
        [status, tanggal_kembali_aktual, catatan, id],
        function(err) {
            if (err) {
                console.error('Error mengupdate peminjaman:', err);
                return res.status(500).json({ error: 'Gagal mengupdate peminjaman' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Peminjaman tidak ditemukan' });
            }
            
            // Get the complete data including device info
            db.get(`
                SELECT 
                    pp.*,
                    p.nama as nama_pelanggan,
                    d.nama_device,
                    d.nomor_seri
                FROM peminjaman_part pp
                JOIN pelanggan p ON pp.id_pelanggan = p.id
                JOIN device d ON pp.id_device = d.id
                WHERE pp.id = ?
            `, [id], (err, row) => {
                if (err) {
                    console.error('Error mengambil data peminjaman:', err);
                    return res.status(500).json({ error: 'Gagal mengambil data peminjaman' });
                }
                res.json(row);
            });
        }
    );
});

// Generate receipt for device
app.get('/api/device/:id/receipt', (req, res) => {
    const { id } = req.params;
    
    db.get(`
        SELECT d.*, p.nama as nama_pelanggan, p.email, p.telepon,
               GROUP_CONCAT(di.foto_path) as foto_paths
        FROM device d
        LEFT JOIN pelanggan p ON d.id_pelanggan = p.id
        LEFT JOIN device_images di ON d.id = di.id_device
        WHERE d.id = ?
        GROUP BY d.id
    `, [id], (err, device) => {
        if (err) {
            console.error('Error mengambil data device:', err);
            return res.status(500).json({ error: 'Gagal mengambil data device' });
        }

        if (!device) {
            return res.status(404).json({ error: 'Device tidak ditemukan' });
        }

        // Create PDF document
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50
        });

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=tanda-terima-${device.nama_device}.pdf`);

        // Pipe the PDF to the response
        doc.pipe(res);

        // Add content to PDF
        doc.fontSize(20).text('Tanda Terima Device', { align: 'center' });
        doc.moveDown();

        // Add company logo/header if needed
        doc.fontSize(12).text('Detail Device:', { underline: true });
        doc.moveDown();

        // Device details
        doc.fontSize(10);
        doc.text(`Nama Device: ${device.nama_device}`);
        doc.text(`Tipe: ${device.tipe_device}`);
        doc.text(`Nomor Seri: ${device.nomor_seri}`);
        doc.moveDown();

        // Customer details
        doc.fontSize(12).text('Detail Pelanggan:', { underline: true });
        doc.moveDown();
        doc.fontSize(10);
        doc.text(`Nama: ${device.nama_pelanggan}`);
        doc.text(`Email: ${device.email}`);
        doc.text(`Telepon: ${device.telepon}`);
        doc.moveDown();

        // Notes
        if (device.catatan) {
            doc.fontSize(12).text('Catatan:', { underline: true });
            doc.moveDown();
            doc.fontSize(10).text(device.catatan);
            doc.moveDown();
        }

        // Add timestamp
        doc.fontSize(10).text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, { align: 'right' });

        // Signature fields
        doc.moveDown(2);
        doc.fontSize(10);
        doc.text('Tanda Tangan Petugas:', 50, doc.y);
        doc.text('Tanda Tangan Pelanggan:', 300, doc.y);
        
        doc.moveDown(3);
        doc.text('_________________', 50, doc.y);
        doc.text('_________________', 300, doc.y);

        // Finalize PDF
        doc.end();
    });
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ status: 'Server berjalan' });
});

// Distributor endpoints
app.get('/api/distributor', (req, res) => {
    db.all('SELECT * FROM distributor ORDER BY nama', [], (err, rows) => {
        if (err) {
            console.error('Error membaca data distributor:', err);
            return res.status(500).json({ error: 'Gagal membaca data distributor' });
        }
        res.json(rows);
    });
});

app.post('/api/distributor', (req, res) => {
    const { nama, alamat, telepon, email } = req.body;
    const id = Date.now().toString();
    
    db.run(
        'INSERT INTO distributor (id, nama, alamat, telepon, email) VALUES (?, ?, ?, ?, ?)',
        [id, nama, alamat, telepon, email],
        function(err) {
            if (err) {
                console.error('Error menambah distributor:', err);
                return res.status(500).json({ error: 'Gagal menambah distributor' });
            }
            res.status(201).json({ id, nama, alamat, telepon, email });
        }
    );
});

app.put('/api/distributor/:id', (req, res) => {
    const { nama, alamat, telepon, email } = req.body;
    const { id } = req.params;
    
    db.run(
        'UPDATE distributor SET nama = ?, alamat = ?, telepon = ?, email = ? WHERE id = ?',
        [nama, alamat, telepon, email, id],
        function(err) {
            if (err) {
                console.error('Error mengupdate distributor:', err);
                return res.status(500).json({ error: 'Gagal mengupdate distributor' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Distributor tidak ditemukan' });
            }
            res.json({ id, nama, alamat, telepon, email });
        }
    );
});

// Warranty claim endpoints
app.get('/api/klaim-garansi', (req, res) => {
    db.all(`
        SELECT 
            kg.*,
            d.nama_device,
            d.nomor_seri,
            p.nama as nama_pelanggan,
            dist.nama as nama_distributor
        FROM klaim_garansi kg
        JOIN device d ON kg.id_device = d.id
        JOIN pelanggan p ON kg.id_pelanggan = p.id
        JOIN distributor dist ON kg.id_distributor = dist.id
        ORDER BY kg.tanggal_klaim DESC
    `, [], (err, rows) => {
        if (err) {
            console.error('Error membaca data klaim garansi:', err);
            return res.status(500).json({ error: 'Gagal membaca data klaim garansi' });
        }
        res.json(rows);
    });
});

app.post('/api/klaim-garansi', (req, res) => {
    const {
        id_device,
        id_pelanggan,
        id_distributor,
        deskripsi_masalah,
        catatan
    } = req.body;
    
    const id = Date.now().toString();
    const tanggal_klaim = new Date().toISOString();
    const status = 'PENDING';
    
    db.run(
        `INSERT INTO klaim_garansi (
            id, id_device, id_pelanggan, id_distributor,
            tanggal_klaim, deskripsi_masalah, status, catatan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, id_device, id_pelanggan, id_distributor, tanggal_klaim, deskripsi_masalah, status, catatan],
        function(err) {
            if (err) {
                console.error('Error menambah klaim garansi:', err);
                return res.status(500).json({ error: 'Gagal menambah klaim garansi' });
            }
            
            // Get complete data including related info
            db.get(`
                SELECT 
                    kg.*,
                    d.nama_device,
                    d.nomor_seri,
                    p.nama as nama_pelanggan,
                    dist.nama as nama_distributor
                FROM klaim_garansi kg
                JOIN device d ON kg.id_device = d.id
                JOIN pelanggan p ON kg.id_pelanggan = p.id
                JOIN distributor dist ON kg.id_distributor = dist.id
                WHERE kg.id = ?
            `, [id], (err, row) => {
                if (err) {
                    console.error('Error mengambil data klaim:', err);
                    return res.status(500).json({ error: 'Gagal mengambil data klaim' });
                }
                res.status(201).json(row);
            });
        }
    );
});

app.put('/api/klaim-garansi/:id', (req, res) => {
    const {
        tanggal_kirim_distributor,
        tanggal_terima_kembali,
        status,
        resolusi,
        catatan
    } = req.body;
    const { id } = req.params;
    
    const updates = [];
    const values = [];
    
    if (tanggal_kirim_distributor) {
        updates.push('tanggal_kirim_distributor = ?');
        values.push(tanggal_kirim_distributor);
    }
    if (tanggal_terima_kembali) {
        updates.push('tanggal_terima_kembali = ?');
        values.push(tanggal_terima_kembali);
    }
    if (status) {
        updates.push('status = ?');
        values.push(status);
    }
    if (resolusi) {
        updates.push('resolusi = ?');
        values.push(resolusi);
    }
    if (catatan) {
        updates.push('catatan = ?');
        values.push(catatan);
    }
    
    values.push(id);
    
    db.run(
        `UPDATE klaim_garansi SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
            if (err) {
                console.error('Error mengupdate klaim garansi:', err);
                return res.status(500).json({ error: 'Gagal mengupdate klaim garansi' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Klaim garansi tidak ditemukan' });
            }
            
            // Get updated data including related info
            db.get(`
                SELECT 
                    kg.*,
                    d.nama_device,
                    d.nomor_seri,
                    p.nama as nama_pelanggan,
                    dist.nama as nama_distributor
                FROM klaim_garansi kg
                JOIN device d ON kg.id_device = d.id
                JOIN pelanggan p ON kg.id_pelanggan = p.id
                JOIN distributor dist ON kg.id_distributor = dist.id
                WHERE kg.id = ?
            `, [id], (err, row) => {
                if (err) {
                    console.error('Error mengambil data klaim:', err);
                    return res.status(500).json({ error: 'Gagal mengambil data klaim' });
                }
                res.json(row);
            });
        }
    );
});

// Start server
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});
