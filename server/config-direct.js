module.exports = {
    mongoURI: "mongodb://127.0.0.1:27017/sistem_manajemen_part",
    dbName: "sistem_manajemen_part",
    options: {
        directConnection: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    }
};
