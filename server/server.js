const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// --- Middleware ---

// CORS (simple setup)
app.use(cors());

// Body Parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// Session configuration
app.use(session({
    secret: 'pharmacy_secret_key_123',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        httpOnly: true
    }
}));

// --- File Paths ---
const productsFilePath = path.join(__dirname, 'data', 'products.json');
const usersFilePath = path.join(__dirname, 'data', 'users.json');

// --- Helper Functions ---
function readJSONFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

function writeJSONFile(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
}

// --- Auth Middleware ---
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized. Please log in.' });
    }
}

// --- Authentication Routes ---

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = readJSONFile(usersFilePath);
    const user = users.find(u => u.username === username);

    if (user && bcrypt.compareSync(password, user.passwordHash)) {
        req.session.userId = user.username;
        res.json({ message: 'Login successful', username: user.username });
    } else {
        res.status(401).json({ message: 'Invalid username or password' });
    }
});

app.post('/api/logout', isAuthenticated, (req, res) => {
    req.session.destroy(() => {
        res.json({ message: 'Logged out successfully' });
    });
});

app.get('/api/check-auth', (req, res) => {
    if (req.session.userId) {
        res.json({ authenticated: true, username: req.session.userId });
    } else {
        res.json({ authenticated: false });
    }
});

// --- Product Routes ---

// Get all products (public)
app.get('/api/products', (req, res) => {
    const products = readJSONFile(productsFilePath);
    res.json(products);
});

// Add product (admin only)
app.post('/api/products', isAuthenticated, (req, res) => {
    const newProduct = req.body;
    const products = readJSONFile(productsFilePath);

    if (!newProduct.id || !newProduct.name || !newProduct.image || !newProduct.price) {
        return res.status(400).json({ message: 'Invalid product data' });
    }

    if (products.some(p => p.id === newProduct.id)) {
        return res.status(409).json({ message: 'Product ID already exists' });
    }

    products.push(newProduct);
    writeJSONFile(productsFilePath, products);

    res.json({ message: 'Product added successfully' });
});

// Update product
app.put('/api/products/:id', isAuthenticated, (req, res) => {
    const productId = req.params.id;
    const updatedData = req.body;
    let products = readJSONFile(productsFilePath);

    const index = products.findIndex(p => p.id === productId);
    if (index === -1) {
        return res.status(404).json({ message: 'Product not found' });
    }

    products[index] = { ...products[index], ...updatedData, id: productId };
    writeJSONFile(productsFilePath, products);

    res.json({ message: 'Product updated successfully' });
});

// Delete product
app.delete('/api/products/:id', isAuthenticated, (req, res) => {
    const productId = req.params.id;
    let products = readJSONFile(productsFilePath);

    const newProducts = products.filter(p => p.id !== productId);
    if (newProducts.length === products.length) {
        return res.status(404).json({ message: 'Product not found' });
    }

    writeJSONFile(productsFilePath, newProducts);
    res.json({ message: 'Product deleted successfully' });
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server running at: http://localhost:${PORT}`);
    console.log(`Website: http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
    console.log(`API: http://localhost:${PORT}/api/products`);
});
