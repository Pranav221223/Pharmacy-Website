// --- Product Data Management ---
let allProducts = []; // Will be loaded from the Node.js backend

// --- WhatsApp Phone Number ---
const whatsappPhoneNumber = "919620318855"; // Your WhatsApp number

// --- Cart State (remains client-side for simplicity) ---
let cart = []; // This will be initialized from localStorage

// --- UI Elements ---
const cartCountSpan = document.getElementById('cartCount');
const cartSidebar = document.getElementById('cartSidebar');
const cartItemsContainer = document.getElementById('cartItems');
const cartTotalSpan = document.getElementById('cartTotal');
const emptyCartMessage = document.getElementById('emptyCartMessage');
const mobileMenuSidebar = document.getElementById('mobileMenuSidebar');
const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');

// --- Backend API Base URL ---
const API_BASE_URL = 'http://localhost:3000/api'; // Match your Node.js backend URL

// --- Functions to interact with localStorage (Cart Data) ---
function saveCartToLocalStorage() {
    try {
        localStorage.setItem('shoppingCart', JSON.stringify(cart));
    } catch (e) {
        console.error("Error saving cart to localStorage:", e);
        showNotification("Could not save cart data. Please check browser settings.", 'error');
    }
}

function loadCartFromLocalStorage() {
    try {
        const storedCart = localStorage.getItem('shoppingCart');
        if (storedCart) {
            cart = JSON.parse(storedCart);
        }
    } catch (e) {
        console.error("Error loading cart from localStorage:", e);
        cart = []; // Reset cart if data is corrupted
        showNotification("Corrupted cart data found. Your cart has been reset.", 'error');
    }
}

// --- Fetch all products from Node.js backend ---
async function loadAllProductsForApp() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`); // No credentials needed for public product list
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allProducts = await response.json();
        console.log("Products loaded from backend:", allProducts);
    } catch (e) {
        console.error("Error loading products from backend:", e);
        allProducts = []; // Fallback to empty array if backend is unreachable or error
        showNotification("Error loading product data from server. Please try again later.", 'error');
    }
}

// --- Helper Function for Quantity Controls HTML ---
function generateQuantityControlsHtml(productId, currentQuantity, isCartItem) {
    if (isCartItem) {
        return `
            <div class="quantity-controls cart-item-quantity-controls">
                <button onclick="updateCartItemQuantity('${productId}', 1)">+</button>
                <span>${currentQuantity}</span>
                <button onclick="updateCartItemQuantity('${productId}', -1)">-</button>
            </div>
        `;
    } else {
        return `
            <div class="quantity-controls product-card-quantity-controls">
                <button class="quantity-btn" onclick="updateCardQuantity('${productId}', -1)">-</button>
                <input type="number" id="quantity-${productId}" value="${currentQuantity}" min="1" onchange="validateQuantityInput('${productId}')">
                <button class="quantity-btn" onclick="updateCardQuantity('${productId}', 1)">+</button>
            </div>
        `;
    }
}

// --- Dynamic Card Creation Function ---
function createMedicineCards(medicineArray, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = ''; // Clear existing content

    if (medicineArray.length === 0) {
        container.innerHTML = '<p>No products available in this category.</p>';
        return;
    }

    medicineArray.forEach(medicine => {
        const card = document.createElement('div');
        card.classList.add('medicine-card');

        let tagHtml = '';
        if (medicine.tag) {
            tagHtml = `<div class="medicine-tag ${medicine.tag.toLowerCase()}">${medicine.tag}</div>`;
        }

        card.innerHTML = `
            ${tagHtml}
            <img src="${medicine.image}" alt="${medicine.name}" class="medicine-img">
            <h2 class="medicine-name">${medicine.name}</h2>
            <p class="medicine-price">Price: ₹${medicine.price.toFixed(2)}</p>
            <div class="quantity-container">
                <label for="quantity-${medicine.id}">Quantity:</label>
                ${generateQuantityControlsHtml(medicine.id, 1, false)}
            </div>
            <div class="action-buttons">
                <button class="add-to-cart" onclick="addToCart('${medicine.id}')">Add to Cart</button>
                <button onclick="buyNow('${medicine.id}')">Buy Now</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// --- Helper Functions for Quantity Control on Product Cards ---
function updateCardQuantity(productId, change) {
    const quantityInput = document.getElementById(`quantity-${productId}`);
    if (quantityInput) {
        let currentQuantity = parseInt(quantityInput.value);
        if (isNaN(currentQuantity)) {
            currentQuantity = 1;
        }
        let newQuantity = currentQuantity + change;

        if (newQuantity < 1) {
            newQuantity = 1;
        }
        quantityInput.value = newQuantity;
    }
}

function validateQuantityInput(productId) {
    const quantityInput = document.getElementById(`quantity-${productId}`);
    if (quantityInput) {
        let value = parseInt(quantityInput.value);
        if (isNaN(value) || value < 1) {
            quantityInput.value = 1;
            showNotification('Quantity must be at least 1.', 'warning');
        }
    }
}

// --- Cart Functions ---
function addToCart(productId) {
    const quantityInput = document.getElementById(`quantity-${productId}`);
    const quantity = quantityInput ? parseInt(quantityInput.value) : 1;

    if (isNaN(quantity) || quantity < 1) {
        showNotification('Please enter a valid quantity (1 or more).', 'warning');
        return;
    }

    const productDetails = getProductDetails(productId);
    if (!productDetails) {
        showNotification('Product not found in catalog.', 'error');
        return;
    }

    const existingItemIndex = cart.findIndex(item => item.productId === productId);
    if (existingItemIndex > -1) {
        cart[existingItemIndex].quantity += quantity;
    } else {
        cart.push({ productId: productId, quantity: quantity });
    }

    saveCartToLocalStorage();
    updateCartDisplay();
    showNotification(`${quantity}x ${productDetails.name} added to cart!`, 'success');
}

function removeFromCart(productId) {
    const productDetails = getProductDetails(productId);
    cart = cart.filter(item => item.productId !== productId);
    saveCartToLocalStorage();
    updateCartDisplay();
    showNotification(`${productDetails ? productDetails.name : 'Item'} removed from cart.`, 'error');
}

function updateCartItemQuantity(productId, change) {
    const item = cart.find(item => item.productId === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCartToLocalStorage();
            updateCartDisplay();
        }
    }
}

function updateCartDisplay() {
    cartItemsContainer.innerHTML = '';
    let totalCartPrice = 0;

    if (cart.length === 0) {
        emptyCartMessage.style.display = 'block';
    } else {
        emptyCartMessage.style.display = 'none';
        cart.forEach(item => {
            const product = getProductDetails(item.productId);
            if (product) {
                const itemTotal = item.quantity * product.price;
                totalCartPrice += itemTotal;

                const cartItemDiv = document.createElement('div');
                cartItemDiv.classList.add('cart-item');
                cartItemDiv.innerHTML = `
                    <img src="${product.image}" alt="${product.name}">
                    <div class="cart-item-details-and-actions">
                        <div class="cart-item-info">
                            <div class="cart-item-name">${product.name}</div>
                            <div class="cart-item-price">₹${product.price.toFixed(2)} / item</div>
                        </div>
                        <div class="cart-item-actions">
                            ${generateQuantityControlsHtml(item.productId, item.quantity, true)}
                            <button class="remove-item" onclick="removeFromCart('${item.productId}')">X</button>
                        </div>
                    </div>
                `;
                cartItemsContainer.appendChild(cartItemDiv);
            }
        });
    }

    cartTotalSpan.textContent = `₹${totalCartPrice.toFixed(2)}`;
    cartCountSpan.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
}

function getProductDetails(productId) {
    return allProducts.find(p => p.id === productId);
}

function toggleCart() {
    cartSidebar.classList.toggle('open');
    if (cartSidebar.classList.contains('open')) {
        updateCartDisplay();
    }
    // Prevent/allow scrolling on body when cart is open/closed
    document.body.style.overflow = cartSidebar.classList.contains('open') ? 'hidden' : 'auto';
}

function checkoutCart() {
    if (cart.length === 0) {
        showNotification("Your cart is empty. Please add items before checking out.", 'warning');
        return;
    }

    let message = "Hello, I'd like to place an order for the following items:\n\n";
    let overallTotalPrice = 0;

    cart.forEach((item, index) => {
        const product = getProductDetails(item.productId);
        if (product) {
            const itemTotalPrice = item.quantity * product.price;
            overallTotalPrice += itemTotalPrice;
            message += `${index + 1}. ${item.quantity} x ${product.name} (₹${product.price.toFixed(2)} each) = ₹${itemTotalPrice.toFixed(2)}\n`;
        }
    });

    message += `\nTotal Estimated Price: ₹${overallTotalPrice.toFixed(2)}`;
    message += "\n\nPlease confirm availability and details.";

    const url = `https://wa.me/${whatsappPhoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank'); // Open WhatsApp in a new tab

    // Clear cart after checkout attempt
    cart = [];
    saveCartToLocalStorage();
    updateCartDisplay();
    toggleCart(); // Close cart sidebar
    showNotification("Your order request has been sent to WhatsApp!", 'success');
}

function buyNow(productId) {
    const quantityInput = document.getElementById(`quantity-${productId}`);
    const quantity = quantityInput ? parseInt(quantityInput.value) : 1;

    if (isNaN(quantity) || quantity < 1) {
        showNotification('Please enter a valid quantity (1 or more).', 'warning');
        return;
    }

    const product = getProductDetails(productId);
    if (!product) {
        showNotification("Product not found in catalog.", 'error');
        return;
    }

    const totalPrice = (quantity * product.price).toFixed(2);
    const message = `Hello, I'm interested in buying ${quantity} of ${product.name} for a total of ₹${totalPrice}. Please share the details.`;
    const url = `https://wa.me/${whatsappPhoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

function showNotification(message, type = 'info') {
    const notificationDiv = document.createElement('div');
    notificationDiv.classList.add('notification', type);
    notificationDiv.textContent = message;
    document.body.appendChild(notificationDiv);

    // Trigger reflow to ensure transition works
    void notificationDiv.offsetWidth;

    setTimeout(() => {
        notificationDiv.style.opacity = 1;
        notificationDiv.style.transform = 'translateX(-50%) translateY(0)';
    }, 10); // Small delay to allow element to render before transition

    setTimeout(() => {
        notificationDiv.style.opacity = 0;
        notificationDiv.style.transform = 'translateX(-50%) translateY(-20px)';
        // Remove the element after the transition ends
        notificationDiv.addEventListener('transitionend', () => notificationDiv.remove());
    }, 3000); // Notification disappears after 3 seconds
}

function toggleMobileMenu() {
    mobileMenuSidebar.classList.toggle('open');
    mobileMenuOverlay.classList.toggle('open');
    // Prevent/allow scrolling on body when menu is open/closed
    document.body.style.overflow = mobileMenuSidebar.classList.contains('open') ? 'hidden' : 'auto';
}

// --- Event Listener for DOM Content Loaded ---
document.addEventListener('DOMContentLoaded', async () => {
    // Load products from backend first
    await loadAllProductsForApp();
    loadCartFromLocalStorage();

    const path = window.location.pathname;

    // Filter products for specific sections based on the loaded `allProducts` array
    
    const popularMedicines = allProducts.filter(product => product.tag === 'SALE'| product.tag === 'BESTSELLER');
    const newArrivals = allProducts.filter(product => product.tag === 'NEW');

    // Render products based on the current page
    if (path.includes('products.html')) {
        createMedicineCards(allProducts, 'allProducts');
    } else if (path.includes('index.html') || path === '/') { // Check for home page
        createMedicineCards(popularMedicines, 'popularMedicineList');
        createMedicineCards(newArrivals, 'newMedicineList');
    }
    // No rendering needed for about_us.html

    updateCartDisplay(); // Always update cart display on page load
});