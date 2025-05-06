const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const PDFDocument = require('pdfkit');
const { MongoClient, ObjectId } = require('mongodb');
const config = require('./config');

const app = express();
const PORT = config.port;

// MongoDB Connection
let db;

let cachedClient = null;
let cachedDb = null;

async function connectToMongo() {
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    try {
        console.log('Attempting to connect to MongoDB...');
        const client = new MongoClient(config.mongoURI, {
            maxPoolSize: 1,
            serverSelectionTimeoutMS: 5000
        });
        
        await client.connect();
        console.log('Connected to MongoDB Atlas');
        
        const db = client.db(config.dbName);
        
        cachedClient = client;
        cachedDb = db;
        
        return { client, db };
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

// Configure storage for multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'uploads'));
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

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: err.message 
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        mongodb: db ? 'connected' : 'disconnected'
    });
});

// API Routes
// Warranty claim endpoints
app.get('/api/klaim-garansi', async (req, res) => {
    try {
        const klaimGaransi = await db.collection('klaim_garansi').aggregate([
            {
                $lookup: {
                    from: 'device',
                    localField: 'id_device',
                    foreignField: '_id',
                    as: 'device'
                }
            },
            {
                $lookup: {
                    from: 'pelanggan',
                    localField: 'id_pelanggan',
                    foreignField: '_id',
                    as: 'pelanggan'
                }
            },
            {
                $lookup: {
                    from: 'distributor',
                    localField: 'id_distributor',
                    foreignField: '_id',
                    as: 'distributor'
                }
            },
            {
                $unwind: '$device'
            },
            {
                $unwind: '$pelanggan'
            },
            {
                $unwind: '$distributor'
            },
            {
                $project: {
                    _id: 1,
                    id_device: 1,
                    id_pelanggan: 1,
                    id_distributor: 1,
                    tanggal_klaim: 1,
                    deskripsi_masalah: 1,
                    status: 1,
                    tanggal_kirim_distributor: 1,
                    tanggal_terima_kembali: 1,
                    resolusi: 1,
                    catatan: 1,
                    foto_paths: 1,
                    nama_device: '$device.nama_device',
                    nomor_seri: '$device.nomor_seri',
                    nama_pelanggan: '$pelanggan.nama',
                    nama_distributor: '$distributor.nama'
                }
            },
            {
                $sort: { tanggal_klaim: -1 }
            }
        ]).toArray();
        res.json(klaimGaransi);
    } catch (error) {
        console.error('Error membaca data klaim garansi:', error);
        res.status(500).json({ error: 'Gagal membaca data klaim garansi' });
    }
});

app.post('/api/klaim-garansi', upload.array('fotos', 5), async (req, res) => {
    try {
        const {
            id_device,
            id_pelanggan,
            id_distributor,
            deskripsi_masalah,
            catatan
        } = req.body;

        const klaim = {
            id_device: new ObjectId(id_device),
            id_pelanggan: new ObjectId(id_pelanggan),
            id_distributor: new ObjectId(id_distributor),
            tanggal_klaim: new Date(),
            deskripsi_masalah,
            status: 'PENDING',
            catatan,
            foto_paths: req.files ? req.files.map(file => `/uploads/${file.filename}`) : []
        };

        const result = await db.collection('klaim_garansi').insertOne(klaim);
        const insertedKlaim = await db.collection('klaim_garansi').aggregate([
            {
                $match: { _id: result.insertedId }
            },
            {
                $lookup: {
                    from: 'device',
                    localField: 'id_device',
                    foreignField: '_id',
                    as: 'device'
                }
            },
            {
                $lookup: {
                    from: 'pelanggan',
                    localField: 'id_pelanggan',
                    foreignField: '_id',
                    as: 'pelanggan'
                }
            },
            {
                $lookup: {
                    from: 'distributor',
                    localField: 'id_distributor',
                    foreignField: '_id',
                    as: 'distributor'
                }
            },
            {
                $unwind: '$device'
            },
            {
                $unwind: '$pelanggan'
            },
            {
                $unwind: '$distributor'
            },
            {
                $project: {
                    _id: 1,
                    id_device: 1,
                    id_pelanggan: 1,
                    id_distributor: 1,
                    tanggal_klaim: 1,
                    deskripsi_masalah: 1,
                    status: 1,
                    catatan: 1,
                    foto_paths: 1,
                    nama_device: '$device.nama_device',
                    nomor_seri: '$device.nomor_seri',
                    nama_pelanggan: '$pelanggan.nama',
                    nama_distributor: '$distributor.nama'
                }
            }
        ]).toArray();

        res.status(201).json(insertedKlaim[0]);
    } catch (error) {
        console.error('Error menambah klaim garansi:', error);
        res.status(500).json({ error: 'Gagal menambah klaim garansi' });
    }
});

app.put('/api/klaim-garansi/:id', upload.array('fotos', 5), async (req, res) => {
    try {
        const {
            tanggal_kirim_distributor,
            tanggal_terima_kembali,
            status,
            resolusi,
            catatan,
            hapus_foto
        } = req.body;

        const updateData = {};
        if (tanggal_kirim_distributor) updateData.tanggal_kirim_distributor = new Date(tanggal_kirim_distributor);
        if (tanggal_terima_kembali) updateData.tanggal_terima_kembali = new Date(tanggal_terima_kembali);
        if (status) updateData.status = status;
        if (resolusi) updateData.resolusi = resolusi;
        if (catatan) updateData.catatan = catatan;

        const currentKlaim = await db.collection('klaim_garansi').findOne({ _id: new ObjectId(req.params.id) });
        let foto_paths = currentKlaim.foto_paths || [];

        // Handle deleted photos
        if (hapus_foto) {
            const deletedPaths = JSON.parse(hapus_foto);
            foto_paths = foto_paths.filter(path => !deletedPaths.includes(path));
        }

        // Add new photos
        if (req.files && req.files.length > 0) {
            const newPaths = req.files.map(file => `/uploads/${file.filename}`);
            foto_paths = [...foto_paths, ...newPaths];
        }

        updateData.foto_paths = foto_paths;

        await db.collection('klaim_garansi').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateData }
        );

        const updatedKlaim = await db.collection('klaim_garansi').aggregate([
            {
                $match: { _id: new ObjectId(req.params.id) }
            },
            {
                $lookup: {
                    from: 'device',
                    localField: 'id_device',
                    foreignField: '_id',
                    as: 'device'
                }
            },
            {
                $lookup: {
                    from: 'pelanggan',
                    localField: 'id_pelanggan',
                    foreignField: '_id',
                    as: 'pelanggan'
                }
            },
            {
                $lookup: {
                    from: 'distributor',
                    localField: 'id_distributor',
                    foreignField: '_id',
                    as: 'distributor'
                }
            },
            {
                $unwind: '$device'
            },
            {
                $unwind: '$pelanggan'
            },
            {
                $unwind: '$distributor'
            },
            {
                $project: {
                    _id: 1,
                    id_device: 1,
                    id_pelanggan: 1,
                    id_distributor: 1,
                    tanggal_klaim: 1,
                    deskripsi_masalah: 1,
                    status: 1,
                    tanggal_kirim_distributor: 1,
                    tanggal_terima_kembali: 1,
                    resolusi: 1,
                    catatan: 1,
                    foto_paths: 1,
                    nama_device: '$device.nama_device',
                    nomor_seri: '$device.nomor_seri',
                    nama_pelanggan: '$pelanggan.nama',
                    nama_distributor: '$distributor.nama'
                }
            }
        ]).toArray();

        if (!updatedKlaim[0]) {
            return res.status(404).json({ error: 'Klaim garansi tidak ditemukan' });
        }

        res.json(updatedKlaim[0]);
    } catch (error) {
        console.error('Error mengupdate klaim garansi:', error);
        res.status(500).json({ error: 'Gagal mengupdate klaim garansi' });
    }
});

app.get('/api/pelanggan', async (req, res) => {
    try {
        const pelanggan = await db.collection('pelanggan').find({}).toArray();
        res.json(pelanggan);
    } catch (error) {
        console.error('Error membaca data pelanggan:', error);
        res.status(500).json({ error: 'Gagal membaca data pelanggan' });
    }
});

app.post('/api/pelanggan', async (req, res) => {
    try {
        const { nama, email, telepon } = req.body;
        const result = await db.collection('pelanggan').insertOne({
            nama,
            email,
            telepon,
            created_at: new Date()
        });
        res.status(201).json({ 
            id: result.insertedId,
            nama,
            email,
            telepon
        });
    } catch (error) {
        console.error('Error menambah pelanggan:', error);
        res.status(500).json({ error: 'Gagal menambah pelanggan' });
    }
});

app.put('/api/pelanggan/:id', async (req, res) => {
    try {
        const { nama, email, telepon } = req.body;
        const result = await db.collection('pelanggan').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { nama, email, telepon, updated_at: new Date() } }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Pelanggan tidak ditemukan' });
        }
        
        res.json({ id: req.params.id, nama, email, telepon });
    } catch (error) {
        console.error('Error mengupdate pelanggan:', error);
        res.status(500).json({ error: 'Gagal mengupdate pelanggan' });
    }
});

app.delete('/api/pelanggan/:id', async (req, res) => {
    try {
        const result = await db.collection('pelanggan').deleteOne({
            _id: new ObjectId(req.params.id)
        });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Pelanggan tidak ditemukan' });
        }
        
        res.status(204).send();
    } catch (error) {
        console.error('Error menghapus pelanggan:', error);
        res.status(500).json({ error: 'Gagal menghapus pelanggan' });
    }
});

app.get('/api/device', async (req, res) => {
    try {
        const devices = await db.collection('device').find({}).toArray();
        res.json(devices);
    } catch (error) {
        console.error('Error membaca data device:', error);
        res.status(500).json({ error: 'Gagal membaca data device' });
    }
});

app.post('/api/device', upload.array('fotos', 5), async (req, res) => {
    try {
        const { id_pelanggan, nama_device, tipe_device, nomor_seri, catatan } = req.body;
        
        const device = {
            id_pelanggan,
            nama_device,
            tipe_device,
            nomor_seri,
            catatan,
            created_at: new Date(),
            foto_paths: req.files ? req.files.map(file => `/uploads/${file.filename}`) : []
        };
        
        const result = await db.collection('device').insertOne(device);
        res.status(201).json({ 
            id: result.insertedId,
            ...device
        });
    } catch (error) {
        console.error('Error menambah device:', error);
        res.status(500).json({ error: 'Gagal menambah device' });
    }
});

// Distributor endpoints
app.get('/api/distributor', async (req, res) => {
    try {
        const distributor = await db.collection('distributor').find({}).sort({ nama: 1 }).toArray();
        res.json(distributor);
    } catch (error) {
        console.error('Error membaca data distributor:', error);
        res.status(500).json({ error: 'Gagal membaca data distributor' });
    }
});

app.post('/api/distributor', async (req, res) => {
    try {
        const { nama, alamat, telepon, email } = req.body;
        const result = await db.collection('distributor').insertOne({
            nama,
            alamat,
            telepon,
            email,
            created_at: new Date()
        });
        res.status(201).json({
            id: result.insertedId,
            nama,
            alamat,
            telepon,
            email
        });
    } catch (error) {
        console.error('Error menambah distributor:', error);
        res.status(500).json({ error: 'Gagal menambah distributor' });
    }
});

app.put('/api/distributor/:id', async (req, res) => {
    try {
        const { nama, alamat, telepon, email } = req.body;
        const result = await db.collection('distributor').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { nama, alamat, telepon, email, updated_at: new Date() } }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Distributor tidak ditemukan' });
        }
        
        res.json({ id: req.params.id, nama, alamat, telepon, email });
    } catch (error) {
        console.error('Error mengupdate distributor:', error);
        res.status(500).json({ error: 'Gagal mengupdate distributor' });
    }
});

app.get('/api/peminjaman-part', async (req, res) => {
    try {
        const peminjaman = await db.collection('peminjaman_part')
            .aggregate([
                {
                    $lookup: {
                        from: 'pelanggan',
                        localField: 'id_pelanggan',
                        foreignField: '_id',
                        as: 'pelanggan'
                    }
                },
                {
                    $lookup: {
                        from: 'device',
                        localField: 'id_device',
                        foreignField: '_id',
                        as: 'device'
                    }
                },
                {
                    $unwind: '$pelanggan'
                },
                {
                    $unwind: '$device'
                }
            ]).toArray();
            
        res.json(peminjaman);
    } catch (error) {
        console.error('Error membaca data peminjaman:', error);
        res.status(500).json({ error: 'Gagal membaca data peminjaman' });
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// Catch-all route for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Initialize database connection
connectToMongo().then(({ db: database }) => {
    db = database;
}).catch(error => {
    console.error('Failed to initialize database connection:', error);
    process.exit(1);
});

// Start server
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`);
    });
}

// Export app for Vercel
module.exports = app;

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});
