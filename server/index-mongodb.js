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
