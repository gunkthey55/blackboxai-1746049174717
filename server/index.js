const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

const dataFile = path.join(__dirname, 'customers.json');

// Helper function to read customers data
function readCustomers() {
    if (!fs.existsSync(dataFile)) {
        fs.writeFileSync(dataFile, JSON.stringify([]));
    }
    const data = fs.readFileSync(dataFile);
    return JSON.parse(data);
}

// Helper function to write customers data
function writeCustomers(customers) {
    fs.writeFileSync(dataFile, JSON.stringify(customers, null, 2));
}

// Get all customers
app.get('/api/customers', (req, res) => {
    const customers = readCustomers();
    res.json(customers);
});

// Add new customer
app.post('/api/customers', (req, res) => {
    const customers = readCustomers();
    const newCustomer = req.body;
    newCustomer.id = Date.now().toString();
    customers.push(newCustomer);
    writeCustomers(customers);
    res.status(201).json(newCustomer);
});

// Update customer
app.put('/api/customers/:id', (req, res) => {
    const customers = readCustomers();
    const id = req.params.id;
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) {
        return res.status(404).json({ message: 'Customer not found' });
    }
    customers[index] = { ...customers[index], ...req.body };
    writeCustomers(customers);
    res.json(customers[index]);
});

// Delete customer
app.delete('/api/customers/:id', (req, res) => {
    let customers = readCustomers();
    const id = req.params.id;
    customers = customers.filter(c => c.id !== id);
    writeCustomers(customers);
    res.status(204).send();
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
