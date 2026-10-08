/**
 * Aufex Enterprise - Shopping Cart Engine
 * Handles persistent shopping cart with localStorage, real-time navigation badge updates,
 * slide-out drawer, quantity management, and WhatsApp checkout integration.
 */

const CART_STORAGE_KEY = 'aufex_cart';
let cart = [];

/**
 * Extracts numeric value from price strings like "1,699 Rs", "800 Rs", etc.
 * @param {string|number} priceStr
 * @returns {number}
 */
function parsePrice(priceStr) {
    if (typeof priceStr === 'number') return priceStr;
    if (!priceStr) return 0;
    const cleaned = String(priceStr).replace(/,/g, '').replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

/**
 * Formats a number to Indian Rupees format, e.g., 1699 -> "1,699 Rs"
 * @param {number} amount
 * @returns {string}
 */
function formatPrice(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) amount = 0;
    return Math.round(amount).toLocaleString('en-IN') + ' Rs';
}

/**
 * Loads the cart items from localStorage
 */
function loadCartFromStorage() {
    try {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                cart = parsed.map(item => {
                    const unitPrice = item.unitPrice || parsePrice(item.price);
                    return {
                        title: item.title || 'Product',
                        price: item.price || formatPrice(unitPrice),
                        unitPrice: unitPrice,
                        image: item.image || 'hublot-premium-watch.jpg',
                        quantity: Math.max(1, parseInt(item.quantity, 10) || 1)
                    };
                });
                return;
            }
        }
    } catch (e) {
        console.warn('Could not parse cart from localStorage:', e);
    }
    cart = [];
}

/**
 * Saves current cart state to localStorage
 */
function saveCartToStorage() {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
        console.error('Failed to save cart to localStorage:', e);
    }
}

/**
 * Calculates total count of all items (sum of quantities)
 * @returns {number}
 */
function getTotalCartCount() {
    return cart.reduce((total, item) => total + (item.quantity || 1), 0);
}

/**
 * Calculates grand total price across all items
 * @returns {number}
 */
function getTotalCartPrice() {
    return cart.reduce((total, item) => {
        const price = item.unitPrice || parsePrice(item.price);
        return total + (price * (item.quantity || 1));
    }, 0);
}

/**
 * Adds a product to the shopping cart
 * @param {string} title - Product title
 * @param {string} price - Price string (e.g. "1,699 Rs")
 * @param {string} image - Image filename or URL
 * @param {HTMLElement} [btnElement] - Optional clicked button element for visual feedback
 */
function addToCart(title, price, image, btnElement) {
    const numericPrice = parsePrice(price);
    const existingIndex = cart.findIndex(item => item.title.trim().toLowerCase() === title.trim().toLowerCase());

    if (existingIndex > -1) {
        cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + 1;
    } else {
        cart.push({
            title: title,
            price: price,
            unitPrice: numericPrice,
            image: image,
            quantity: 1
        });
    }

    saveCartToStorage();
    updateCartUI();
    triggerBadgeBump();
    showToast(`Added "${title}" to your cart!`);

    // Detect button for button micro-animation
    if (!btnElement && window.event) {
        const evt = window.event;
        btnElement = evt.currentTarget || (evt.target ? evt.target.closest('button') : null);
    }

    if (btnElement && btnElement instanceof HTMLElement) {
        triggerButtonFeedback(btnElement);
    }
}

/**
 * Updates item quantity in the cart
 * @param {number} index
 * @param {number} delta - Usually +1 or -1
 */
function updateCartQuantity(index, delta) {
    if (index < 0 || index >= cart.length) return;

    cart[index].quantity = (cart[index].quantity || 1) + delta;

    if (cart[index].quantity <= 0) {
        const removedTitle = cart[index].title;
        cart.splice(index, 1);
        showToast(`Removed "${removedTitle}" from cart`);
    }

    saveCartToStorage();
    updateCartUI();
    triggerBadgeBump();
}

/**
 * Removes an item entirely from the cart
 * @param {number} index
 */
function removeFromCart(index) {
    if (index < 0 || index >= cart.length) return;

    const removedTitle = cart[index].title;
    cart.splice(index, 1);

    saveCartToStorage();
    updateCartUI();
    triggerBadgeBump();
    showToast(`Removed "${removedTitle}" from cart`);
}

/**
 * Clears all items in the cart
 */
function clearCart() {
    if (cart.length === 0) return;
    if (confirm("Are you sure you want to clear your shopping cart?")) {
        cart = [];
        saveCartToStorage();
        updateCartUI();
        triggerBadgeBump();
        showToast("Cart has been cleared");
    }
}

/**
 * Triggers interactive button feedback ("Added ✓")
 * @param {HTMLElement} btn
 */
function triggerButtonFeedback(btn) {
    if (btn.dataset.isAnimating === 'true') return;
    btn.dataset.isAnimating = 'true';

    const originalContent = btn.innerHTML;
    btn.classList.add('added');
    btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Added ✓</span>
    `;

    setTimeout(() => {
        btn.innerHTML = originalContent;
        btn.classList.remove('added');
        btn.dataset.isAnimating = 'false';
    }, 1200);
}

/**
 * Triggers bump/pulse animation on all cart badges
 */
function triggerBadgeBump() {
    const badges = document.querySelectorAll('.cart-count, #cartCount');
    badges.forEach(badge => {
        badge.classList.remove('bump');
        // Force reflow
        void badge.offsetWidth;
        badge.classList.add('bump');
    });
}

/**
 * Controls the visibility of the slide-out cart drawer
 * @param {boolean} open
 */
function toggleCartDrawer(open) {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');

    if (open) {
        if (drawer) drawer.classList.add('active');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        if (drawer) drawer.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Re-renders the shopping cart UI, counts, and items list
 */
function updateCartUI() {
    const totalCount = getTotalCartCount();
    const totalPrice = getTotalCartPrice();

    // 1. Update Cart Badge Count in header navigation
    const badges = document.querySelectorAll('.cart-count, #cartCount');
    badges.forEach(badge => {
        badge.textContent = totalCount;
        if (totalCount > 0) {
            badge.style.display = 'inline-flex';
        }
    });

    // 2. Update Drawer Total Items count
    const cartTotalItems = document.getElementById('cartTotalItems');
    if (cartTotalItems) {
        cartTotalItems.textContent = totalCount;
    }

    // 3. Update Drawer Grand Total Price
    const cartTotalPrice = document.getElementById('cartTotalPrice');
    if (cartTotalPrice) {
        cartTotalPrice.textContent = formatPrice(totalPrice);
    }

    // 4. Update Header Drawer Badge
    const cartHeaderCount = document.getElementById('cartHeaderCount');
    if (cartHeaderCount) {
        cartHeaderCount.textContent = `${totalCount} item${totalCount === 1 ? '' : 's'}`;
    }

    // 5. Update Cart Items List inside Drawer
    const cartItemsList = document.getElementById('cartItemsList');
    if (!cartItemsList) return;

    if (cart.length === 0) {
        cartItemsList.innerHTML = `
            <div class="cart-empty" id="cartEmptyMsg">
                <div class="cart-empty-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                </div>
                <p>Your shopping cart is currently empty.</p>
                <a href="products.html" class="btn-browse-products" onclick="toggleCartDrawer(false)">
                    <span>Explore Products</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </a>
            </div>
        `;
        return;
    }

    let itemsHtml = '';
    cart.forEach((item, idx) => {
        const itemUnitPrice = item.unitPrice || parsePrice(item.price);
        const itemTotal = itemUnitPrice * (item.quantity || 1);

        itemsHtml += `
            <div class="cart-item" data-index="${idx}">
                <img src="${item.image}" alt="${item.title}" class="cart-item-img" onerror="this.src='hublot-premium-watch.jpg'">
                <div class="cart-item-info">
                    <div class="cart-item-title" title="${item.title}">${item.title}</div>
                    <div class="cart-item-meta">
                        <span class="cart-item-price">${formatPrice(itemUnitPrice)} each</span>
                    </div>
                    <div class="cart-qty-control">
                        <button class="cart-qty-btn" onclick="updateCartQuantity(${idx}, -1)" title="Decrease Quantity" aria-label="Decrease quantity">−</button>
                        <span class="cart-qty-val">${item.quantity || 1}</span>
                        <button class="cart-qty-btn" onclick="updateCartQuantity(${idx}, 1)" title="Increase Quantity" aria-label="Increase quantity">+</button>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem;">
                    <button class="cart-item-remove" onclick="removeFromCart(${idx})" title="Remove item" aria-label="Remove item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                    <div style="font-size: 0.85rem; font-weight: 700; color: #f8fafc;">${formatPrice(itemTotal)}</div>
                </div>
            </div>
        `;
    });

    cartItemsList.innerHTML = itemsHtml;
}

/**
 * Formats cart order details and redirects to WhatsApp for immediate fulfillment
 */
function checkoutViaWhatsApp() {
    if (cart.length === 0) {
        showToast("Your cart is empty! Please add products first.");
        return;
    }

    let message = "Hi Aufex Enterprise! 🛍️\n";
    message += "I would like to place an order for the following items from the Aufex Catalog:\n\n";

    cart.forEach((item, index) => {
        const itemUnitPrice = item.unitPrice || parsePrice(item.price);
        const itemSubtotal = itemUnitPrice * (item.quantity || 1);
        message += `${index + 1}. *${item.title}*\n`;
        message += `   • Quantity: ${item.quantity || 1}\n`;
        message += `   • Unit Price: ${formatPrice(itemUnitPrice)}\n`;
        message += `   • Subtotal: ${formatPrice(itemSubtotal)}\n\n`;
    });

    const grandTotal = formatPrice(getTotalCartPrice());
    const totalCount = getTotalCartCount();

    message += `─────────────────────────\n`;
    message += `📦 *Total Items:* ${totalCount}\n`;
    message += `💰 *Grand Total:* ${grandTotal}\n`;
    message += `─────────────────────────\n\n`;
    message += `Please confirm availability, delivery timeframe, and payment details. Thank you!`;

    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/917034815356?text=${encoded}`;
    window.open(waUrl, '_blank');
}

/**
 * Universal toast notification system
 * @param {string} message
 */
function showToast(message) {
    let toast = document.getElementById('toast');
    let toastText = document.getElementById('toastText');

    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        toast.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span id="toastText"></span>
        `;
        document.body.appendChild(toast);
        toastText = document.getElementById('toastText');
    }

    if (toastText) {
        toastText.textContent = message;
    }

    toast.classList.add('show');
    clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
        toast.classList.remove('show');
    }, 3200);
}

// Multi-tab real-time sync with localStorage storage events
window.addEventListener('storage', (event) => {
    if (event.key === CART_STORAGE_KEY) {
        loadCartFromStorage();
        updateCartUI();
        triggerBadgeBump();
    }
});

// ESC key to close cart drawer
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        toggleCartDrawer(false);
    }
});

// Initial boot
document.addEventListener('DOMContentLoaded', () => {
    loadCartFromStorage();
    updateCartUI();
});

// Pre-init in case DOM is already ready
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    loadCartFromStorage();
    updateCartUI();
}
