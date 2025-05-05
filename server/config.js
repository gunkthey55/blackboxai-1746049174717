const config = {
    mongoURI: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB || "sistem_manajemen_part",
    port: process.env.PORT || 3001
};

if (!config.mongoURI) {
    console.error('MONGODB_URI environment variable is not set');
    process.exit(1);
}

module.exports = config;
