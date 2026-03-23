const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- Session Setup (Improved) ---
app.use(session({
    secret: process.env.SESSION_SECRET || 'pharmacy_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // true only for HTTPS
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24,
        sameSite: 'lax'
    }
}));

// --- File paths ---
const productsFilePath = path.join(__dirname, 'data', 'products.json');
const usersFilePath = path.join(__dirname, 'data', 'users.json');

// --- Helper Functions ---
function readJSONFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) return [];
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data || '[]');
    } catch (err) {
        console.error("Read error:", err);
        return [];
    }
}

function writeJSONFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
    } catch (err) {
        console.error("Write error:", err);
    }
}

// --- Auth Middleware ---
function isAuthenticated(req, res, next) {
    if (req.session.userId) return next();
    return res.status(401).json({ message: 'Unauthorized' });
}

// ================= IMAGE UPLOAD =================
const uploadDir = path.join(__dirname, '..', 'public', 'image');

// Ensure folder exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

// Upload image
app.post('/api/upload', isAuthenticated, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    res.json({
        imageUrl: `/image/${req.file.filename}`
    });
});

// ================= AUTH =================

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = readJSONFile(usersFilePath);

    const user = users.find(u => u.username === username);

    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);

    if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    req.session.userId = user.username;

    res.json({ message: 'Login successful', username: user.username });
});

// Logout
app.post('/api/logout', isAuthenticated, (req, res) => {
    req.session.destroy(() => {
        res.json({ message: 'Logged out' });
    });
});

// Check auth
app.get('/api/check-auth', (req, res) => {
    res.json({
        authenticated: !!req.session.userId,
        username: req.session.userId || null
    });
});

// ================= PRODUCTS =================

// Get all products
app.get('/api/products', (req, res) => {
    const products = readJSONFile(productsFilePath);
    res.json(products);
});

// Add product
app.post('/api/products', isAuthenticated, (req, res) => {
    const newProduct = req.body;
    const products = readJSONFile(productsFilePath);

    if (!newProduct.id || !newProduct.name || !newProduct.image || !newProduct.price) {
        return res.status(400).json({ message: 'Invalid product data' });
    }

    if (products.some(p => p.id === newProduct.id)) {
        return res.status(409).json({ message: 'Product already exists' });
    }

    products.push(newProduct);
    writeJSONFile(productsFilePath, products);

    res.json({ message: 'Product added', product: newProduct });
});

// Update product
app.put('/api/products/:id', isAuthenticated, (req, res) => {
    const id = req.params.id;
    const updatedData = req.body;

    let products = readJSONFile(productsFilePath);

    const index = products.findIndex(p => p.id === id);

    if (index === -1) {
        return res.status(404).json({ message: 'Product not found' });
    }

    products[index] = { ...products[index], ...updatedData, id };

    writeJSONFile(productsFilePath, products);

    res.json({ message: 'Updated', product: products[index] });
});

// Delete product
app.delete('/api/products/:id', isAuthenticated, (req, res) => {
    const id = req.params.id;

    let products = readJSONFile(productsFilePath);

    const filtered = products.filter(p => p.id !== id);

    if (filtered.length === products.length) {
        return res.status(404).json({ message: 'Product not found' });
    }

    writeJSONFile(productsFilePath, filtered);

    res.json({ message: 'Deleted successfully' });
});

// ================= START SERVER =================
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});