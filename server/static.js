const express = require('express');
const path = require('path');
const app = express();
const PORT = 8000;

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '..')));

app.listen(PORT, () => {
    console.log(`Frontend server berjalan di http://localhost:${PORT}`);
});
