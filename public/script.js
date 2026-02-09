// --- Product Data Management ---
let allProducts = [];

// --- WhatsApp Phone Number ---
const whatsappPhoneNumber = "919620318855";

// --- Cart State ---
let cart = [];

// --- UI Elements ---
const cartCountSpan = document.getElementById('cartCount');
const cartSidebar = document.getElementById('cartSidebar');
const cartItemsContainer = document.getElementById('cartItems');
const cartTotalSpan = document.getElementById('cartTotal');
const emptyCartMessage = document.getElementById('emptyCartMessage');
const mobileMenuSidebar = document.getElementById('mobileMenuSidebar');
const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');

// --- Backend API Base URL ---
const API_BASE_URL = '/api';

// --- LocalStorage Functions ---
function saveCartToLocalStorage() {
    localStorage.setItem('shoppingCart', JSON.stringify(cart));
}

function loadCartFromLocalStorage() {
    const storedCart = localStorage.getItem('shoppingCart');
    if (storedCart) {
        cart = JSON.parse(storedCart);
    }
}

// --- Fetch products from backend ---
async function loadAllProductsForApp() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        if (!response.ok) throw new Error("Server error");
        allProducts = await response.json();
    } catch (e) {
        console.error("Product load error:", e);
        showNotification("Error loading product data from server.", "error");
    }
}

// --- Create product cards ---
function createMedicineCards(medicineArray, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (medicineArray.length === 0) {
        container.innerHTML = '<p>No products available.</p>';
        return;
    }

    medicineArray.forEach(medicine => {
        const card = document.createElement('div');
        card.classList.add('medicine-card');

        let tagHtml = '';
        if (medicine.tag) {
            tagHtml = `<div class="medicine-tag">${medicine.tag}</div>`;
        }

        card.innerHTML = `
            ${tagHtml}
            <img src="${medicine.image}" alt="${medicine.name}" class="medicine-img">
            <h2 class="medicine-name">${medicine.name}</h2>
            <p class="medicine-price">Price: ₹${medicine.price.toFixed(2)}</p>
            <div class="quantity-container">
                <label>Quantity:</label>
                <input type="number" id="quantity-${medicine.id}" value="1" min="1">
            </div>
            <div class="action-buttons">
                <button class="add-to-cart" onclick="addToCart('${medicine.id}')">Add to Cart</button>
                <button onclick="buyNow('${medicine.id}')">Buy Now</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// --- Cart Functions ---
function addToCart(productId) {
    const quantityInput = document.getElementById(`quantity-${productId}`);
    const quantity = quantityInput ? parseInt(quantityInput.value) : 1;

    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(item => item.productId === productId);
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({ productId, quantity });
    }

    saveCartToLocalStorage();
    updateCartDisplay();
    showNotification("Added to cart", "success");
}

function updateCartDisplay() {
    if (!cartItemsContainer) return;

    cartItemsContainer.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        const product = allProducts.find(p => p.id === item.productId);
        if (!product) return;

        total += product.price * item.quantity;

        const div = document.createElement('div');
        div.innerHTML = `
            <p>${product.name} x ${item.quantity}</p>
        `;
        cartItemsContainer.appendChild(div);
    });

    if (cartTotalSpan) {
        cartTotalSpan.textContent = `₹${total.toFixed(2)}`;
    }

    if (cartCountSpan) {
        cartCountSpan.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    }
}

function toggleCart() {
    if (cartSidebar) {
        cartSidebar.classList.toggle('open');
        updateCartDisplay();
    }
}

function checkoutCart() {
    if (cart.length === 0) return;

    let message = "Hello, I'd like to order:\n\n";
    let total = 0;

    cart.forEach(item => {
        const product = allProducts.find(p => p.id === item.productId);
        if (!product) return;

        const price = item.quantity * product.price;
        total += price;

        message += `${item.quantity} x ${product.name} = ₹${price.toFixed(2)}\n`;
    });

    message += `\nTotal: ₹${total.toFixed(2)}`;

    const url = `https://wa.me/${whatsappPhoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

function buyNow(productId) {
    const quantityInput = document.getElementById(`quantity-${productId}`);
    const quantity = quantityInput ? parseInt(quantityInput.value) : 1;

    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const total = (quantity * product.price).toFixed(2);
    const message = `Hello, I want ${quantity} x ${product.name} (₹${total}).`;

    const url = `https://wa.me/${whatsappPhoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

// --- Notifications ---
function showNotification(message, type = "info") {
    const div = document.createElement("div");
    div.className = `notification ${type}`;
    div.textContent = message;
    document.body.appendChild(div);

    setTimeout(() => div.remove(), 3000);
}

// --- Mobile Menu ---
function toggleMobileMenu() {
    if (mobileMenuSidebar) mobileMenuSidebar.classList.toggle('open');
    if (mobileMenuOverlay) mobileMenuOverlay.classList.toggle('open');
}

// --- Page Load ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadAllProductsForApp();
    loadCartFromLocalStorage();

    const path = window.location.pathname;

    const popularMedicines = allProducts.filter(
        p => p.tag === 'SALE' || p.tag === 'BEST SELLER '
    );
    const newArrivals = allProducts.filter(
        p => p.tag === 'NEW'
    );

    if (path.includes('products.html')) {
        createMedicineCards(allProducts, 'allProducts');
    } else {
        createMedicineCards(popularMedicines, 'popularMedicineList');
        createMedicineCards(newArrivals, 'newMedicineList');
    }

    updateCartDisplay();
});
