// --- Product Data Management ---
let allProducts = []; // This will hold products fetched from the Node.js backend

// --- Admin UI Elements ---
const productListContainer = document.getElementById('adminProductList');
const addProductForm = document.getElementById('addProductForm');
const editProductForm = document.getElementById('editProductForm');
const editProductIdInput = document.getElementById('editProductId');
const editProductNameInput = document.getElementById('editProductName');
const editProductImageInput = document.getElementById('editProductImage');
const editProductPriceInput = document.getElementById('editProductPrice');
const editProductTagInput = document.getElementById('editProductTag');

// --- Login UI Elements ---
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginContainer = document.getElementById('login-container');
const adminContent = document.getElementById('adminContent');
const logoutButton = document.getElementById('logoutButton'); // The Logout button

// --- Backend API Base URL ---
// CORRECTED: Added '/api' to the base URL to match the backend endpoints.
const API_BASE_URL = 'http://localhost:3000/api'; 

// --- Product Management Functions (Now communicating with Node.js Backend) ---

// Fetches all products from the backend and renders them in the admin list
async function loadAllProductsForAdmin() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`, { credentials: 'include' });
        
        if (!response.ok) {
            if (response.status === 401) {
                showAdminNotification('Session expired or not logged in. Please log in again.', 'error');
                showLoginForm();
                return;
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        allProducts = await response.json();
        renderAdminProductList();
    } catch (e) {
        console.error("Error loading products for admin:", e);
        showAdminNotification("Error loading product data from server. " + e.message, 'error');
        allProducts = [];
        renderAdminProductList();
    }
}

// Renders the products in the admin product list section
function renderAdminProductList() {
    if (!productListContainer) return;
    productListContainer.innerHTML = '';

    if (allProducts.length === 0) {
        productListContainer.innerHTML = '<p>No products available. Add a new product above.</p>';
        return;
    }

    allProducts.forEach(product => {
        const productDiv = document.createElement('div');
        productDiv.classList.add('admin-product-item');
        productDiv.innerHTML = `
            <span><strong>${product.name}</strong> (ID: ${product.id}) - ₹${product.price.toFixed(2)} ${product.tag ? `[${product.tag}]` : ''}</span>
            <div class="admin-actions">
                <button class="edit-btn" onclick="editProduct('${product.id}')">Edit</button>
                <button class="delete-btn" onclick="deleteProduct('${product.id}')">Delete</button>
            </div>
        `;
        productListContainer.appendChild(productDiv);
    });
}

// Handles adding a new product via the form
async function addProduct(event) {
    event.preventDefault();

    const id = document.getElementById('newProductId').value.trim();
    const name = document.getElementById('newProductName').value.trim();
    const image = document.getElementById('newProductImage').value.trim();
    const price = parseFloat(document.getElementById('newProductPrice').value);
    const tag = document.getElementById('newProductTag').value.trim();

    if (!id || !name || !image || isNaN(price) || price <= 0) {
        showAdminNotification('Please fill in all required fields (ID, Name, Image URL, Price). Price must be positive.', 'warning');
        return;
    }

    const newProduct = { id, name, image, price, tag: tag || undefined };

    try {
        const response = await fetch(`${API_BASE_URL}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProduct),
            credentials: 'include'
        });

        const data = await response.json();
        if (!response.ok) {
            if (response.status === 401) {
                showAdminNotification('Session expired. Please log in again.', 'error');
                showLoginForm();
                return;
            }
            throw new Error(data.message || `HTTP error! Status: ${response.status}`);
        }

        showAdminNotification(`${data.product.name} added successfully!`, 'success');
        addProductForm.reset();
        loadAllProductsForAdmin();
    } catch (e) {
        console.error("Error adding product:", e);
        showAdminNotification(`Failed to add product: ${e.message}`, 'error');
    }
}

// Handles deleting a product
async function deleteProduct(productId) {
    if (confirm(`Are you sure you want to delete product '${productId}'? This action cannot be undone.`)) {
        try {
            const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const data = await response.json();
            if (!response.ok) {
                if (response.status === 401) {
                    showAdminNotification('Session expired. Please log in again.', 'error');
                    showLoginForm();
                    return;
                }
                throw new Error(data.message || `HTTP error! Status: ${response.status}`);
            }

            showAdminNotification(`Product '${productId}' deleted.`, 'error');
            loadAllProductsForAdmin();
        } catch (e) {
            console.error("Error deleting product:", e);
            showAdminNotification(`Failed to delete product: ${e.message}`, 'error');
        }
    }
}

// Populates the edit form with selected product's data
function editProduct(productId) {
    const productToEdit = allProducts.find(p => p.id === productId);
    if (productToEdit) {
        editProductIdInput.value = productToEdit.id;
        editProductIdInput.readOnly = true;
        editProductNameInput.value = productToEdit.name;
        editProductImageInput.value = productToEdit.image;
        editProductPriceInput.value = productToEdit.price;
        editProductTagInput.value = productToEdit.tag || '';

        document.getElementById('editProductSection').style.display = 'block';
        window.scrollTo({ top: document.getElementById('editProductSection').offsetTop, behavior: 'smooth' });
    } else {
        showAdminNotification(`Product '${productId}' not found for editing.`, 'error');
    }
}

// Handles saving changes from the edit product form
async function saveEditedProduct(event) {
    event.preventDefault();

    const id = editProductIdInput.value;
    const name = editProductNameInput.value.trim();
    const image = editProductImageInput.value.trim();
    const price = parseFloat(editProductPriceInput.value);
    const tag = editProductTagInput.value.trim();

    if (!name || !image || isNaN(price) || price <= 0) {
        showAdminNotification('Please fill in all required fields (Name, Image URL, Price). Price must be positive.', 'warning');
        return;
    }

    const updatedProduct = { name, image, price, tag: tag || undefined };

    try {
        const response = await fetch(`${API_BASE_URL}/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedProduct),
            credentials: 'include'
        });

        const data = await response.json();
        if (!response.ok) {
            if (response.status === 401) {
                showAdminNotification('Session expired. Please log in again.', 'error');
                showLoginForm();
                return;
            }
            throw new Error(data.message || `HTTP error! Status: ${response.status}`);
        }

        showAdminNotification(`${data.product.name} updated successfully!`, 'success');
        document.getElementById('editProductSection').style.display = 'none';
        editProductForm.reset();
        editProductIdInput.readOnly = false;
        loadAllProductsForAdmin();
    } catch (e) {
        console.error("Error saving edited product:", e);
        showAdminNotification(`Failed to save changes: ${e.message}`, 'error');
    }
}

// Hides the edit form and clears its fields
function cancelEdit() {
    document.getElementById('editProductSection').style.display = 'none';
    editProductForm.reset();
    editProductIdInput.readOnly = false;
}

// --- Admin Notification Function ---
function showAdminNotification(message, type = 'info') {
    const notificationDiv = document.createElement('div');
    notificationDiv.classList.add('notification', type);
    notificationDiv.textContent = message;
    document.body.appendChild(notificationDiv);

    void notificationDiv.offsetWidth;

    setTimeout(() => {
        notificationDiv.style.opacity = 1;
        notificationDiv.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);

    setTimeout(() => {
        notificationDiv.style.opacity = 0;
        notificationDiv.style.transform = 'translateX(-50%) translateY(-20px)';
        notificationDiv.addEventListener('transitionend', () => notificationDiv.remove());
    }, 3000);
}

// --- Login/Logout/Authentication Functions ---

// Handles login form submission
async function handleLogin(event) {
    event.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `HTTP error! Status: ${response.status}`);
        }

        showAdminNotification('Login successful!', 'success');
        showAdminContent();
    } catch (e) {
        console.error("Login error:", e);
        showAdminNotification(`Login failed: ${e.message}`, 'error');
        passwordInput.value = '';
    }
}

// Handles logout action
async function handleLogout() {
    try {
        const response = await fetch(`${API_BASE_URL}/logout`, {
            method: 'POST',
            credentials: 'include'
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `HTTP error! Status: ${response.status}`);
        }

        showAdminNotification('Logged out successfully.', 'info');
        showLoginForm();
    } catch (e) {
        console.error("Logout error:", e);
        showAdminNotification(`Logout failed: ${e.message}`, 'error');
    }
}

// Checks the user's authentication status with the server on page load
async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/check-auth`, { credentials: 'include' });
        const data = await response.json();

        if (data.authenticated) {
            showAdminContent();
        } else {
            showLoginForm();
        }
    } catch (e) {
        console.error("Authentication check error:", e);
        showAdminNotification("Could not verify login status. Please try logging in.", 'warning');
        showLoginForm();
    }
}

// Displays the login form and hides admin content
function showLoginForm() {
    loginContainer.style.display = 'block';
    adminContent.style.display = 'none';
    if (loginForm) loginForm.reset();
}

// Displays admin content and hides the login form
function showAdminContent() {
    loginContainer.style.display = 'none';
    adminContent.style.display = 'block';
    loadAllProductsForAdmin();
}

// --- Event Listeners for Admin Page ---
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    if (addProductForm) {
        addProductForm.addEventListener('submit', addProduct);
    }
    if (editProductForm) {
        editProductForm.addEventListener('submit', saveEditedProduct);
        document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);
    }
});