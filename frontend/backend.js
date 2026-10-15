/**
 * ANON LUXURY E-COMMERCE - FRONTEND CORE ENGINE (backend.js)
 * Full-Stack Integration with Flask REST API & Resilient Offline Fallback
 */
(() => {
  const getApiUrl = () => {
    if (window.SHOP_API_URL) return window.SHOP_API_URL + "/api";
    if (window.location.origin && window.location.origin.startsWith("http")) {
      return window.location.origin + "/api";
    }
    return "http://127.0.0.1:5000/api";
  };

  const API = getApiUrl();
  let products = [];
  let currentUser = null;
  let activeCategory = "all";
  let activeSort = "default";
  let appliedCoupon = null;
  let selectedVariant = "S";
  let buyNowAfterSelection = false;

  // Selectors
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Toast Notification
  function toast(message, isError = false) {
    let el = document.getElementById("backend-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "backend-toast";
      document.body.appendChild(el);
    }
    el.innerHTML = `
      <span style="font-size:18px;">${isError ? '⚠️' : '✨'}</span>
      <span>${message}</span>
    `;
    el.style.background = isError ? "#ef4444" : "#0f172a";
    el.style.color = "#ffffff";
    el.style.display = "flex";
    clearTimeout(el._t);
    el._t = setTimeout(() => {
      el.style.display = "none";
    }, 3200);
  }

  // API Client with Credential Support
  async function api(path, options = {}) {
    const opts = {
      ...options,
      credentials: "include",
      headers: { ...(options.headers || {}) }
    };
    if (opts.body && typeof opts.body !== "string") {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(opts.body);
    }
    try {
      const res = await fetch(API + path, opts);
      let data = {};
      try { data = await res.json(); } catch {}
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    } catch (err) {
      // Re-throw for calling handler
      throw err;
    }
  }

  // Fallback Seed Data (Matches Backend Exactly)
  const FALLBACK_PRODUCTS = [
    { id: 1, name: 'Urban Techwear Waterproof Bomber', category: 'mens', price: 129.00, old_price: 169.00, image: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80', stock: 45, description: 'Precision-crafted weather-resistant bomber jacket with matte metal hardware.', rating: 4.9, badge: 'HOT' },
    { id: 2, name: 'Tailored Oxford Cotton Button-Down', category: 'mens', price: 64.00, old_price: 85.00, image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80', stock: 60, description: '100% organic combed cotton oxford shirt. Breathable, wrinkle-resistant finish.', rating: 4.7, badge: 'NEW' },
    { id: 3, name: 'Merino Wool Minimalist Crewneck', category: 'mens', price: 88.00, old_price: 115.00, image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80', stock: 35, description: 'Ultra-fine Australian merino wool sweater designed for seamless layering.', rating: 4.8, badge: 'TRENDING' },
    { id: 4, name: 'Silk Satin Slip Wrap Dress', category: 'womens', price: 145.00, old_price: 195.00, image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80', stock: 30, description: 'Lustrous mulberry silk slip dress with an adjustable wrap waist.', rating: 4.9, badge: 'BESTSELLER' },
    { id: 5, name: 'Cashmere Ribbed Knit Cardigan', category: 'womens', price: 119.00, old_price: 159.00, image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80', stock: 42, description: 'Cloud-soft Mongolian cashmere knit with shell button details.', rating: 4.8, badge: 'POPULAR' },
    { id: 6, name: 'Monochrome Leather Court Sneakers', category: 'footwear', price: 135.00, old_price: 175.00, image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80', stock: 50, description: 'Handcrafted Italian nappa leather sneakers with memory foam cupsole.', rating: 4.9, badge: 'TOP RATED' },
    { id: 7, name: 'Handcrafted Suede Chelsea Boots', category: 'footwear', price: 189.00, old_price: 249.00, image: 'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&w=800&q=80', stock: 32, description: 'Velvety water-repellent suede ankle boots with Goodyear welted sole.', rating: 4.8, badge: 'POPULAR' },
    { id: 8, name: 'Chronograph Eclipse Matte Black Watch', category: 'watches', price: 245.00, old_price: 320.00, image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80', stock: 20, description: '42mm aerospace titanium casing, sapphire crystal, and Japanese movement.', rating: 5.0, badge: 'BESTSELLER' },
    { id: 9, name: 'Minimalist Rose Gold Mesh Watch', category: 'watches', price: 165.00, old_price: 215.00, image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80', stock: 35, description: 'Ultra-slim 7mm profile watch featuring an iridescent sunray dial.', rating: 4.8, badge: 'ELEGANT' },
    { id: 10, name: '18K Gold Vermeil Herringbone Chain', category: 'jewelry', price: 125.00, old_price: 165.00, image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80', stock: 45, description: 'Silky fluid herringbone necklace plated in 18-karat gold over 925 silver.', rating: 4.9, badge: 'HOT' },
    { id: 11, name: 'Solitaire Pavé Diamond Studs', category: 'jewelry', price: 290.00, old_price: 390.00, image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80', stock: 18, description: 'Conflict-free brilliant-cut lab diamonds set in 14k white gold.', rating: 5.0, badge: 'LUXURY' },
    { id: 12, name: 'Studio Spatial ANC Wireless Headphones', category: 'electronics', price: 279.00, old_price: 349.00, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80', stock: 25, description: 'Hi-Res Audio certified 40mm custom beryllium drivers with hybrid ANC.', rating: 5.0, badge: 'FLAGSHIP' },
    { id: 13, name: 'Acoustic Mini Bluetooth Spatial Speaker', category: 'electronics', price: 99.00, old_price: 139.00, image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80', stock: 65, description: '360-degree immersive acoustic soundstage in an IP67 waterproof enclosure.', rating: 4.7, badge: 'TRENDING' },
    { id: 14, name: 'Woodland Noir Eau De Parfum (100ml)', category: 'fragrance', price: 110.00, old_price: 145.00, image: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=80', stock: 30, description: 'Deep smoky cedarwood, vetiver, and cardamom blended with bourbon vanilla.', rating: 4.9, badge: 'BESTSELLER' }
  ];

  // Load Products from Backend
  async function loadProducts() {
    try {
      let query = `/products?limit=200`;
      if (activeCategory !== "all") query += `&category=${encodeURIComponent(activeCategory)}`;
      if (activeSort !== "default") query += `&sort=${encodeURIComponent(activeSort)}`;

      products = await api(query);
      if (!products || !products.length) products = FALLBACK_PRODUCTS;
    } catch (e) {
      console.warn("Backend not reached, utilizing fallback catalog:", e.message);
      products = FALLBACK_PRODUCTS;
    }
    renderProductGrid();
    setupPredictiveSearch();
  }

  // Render Product Grid
  function renderProductGrid(itemsToRender = null) {
    const grid = document.getElementById("products-grid");
    if (!grid) return;

    let items = itemsToRender || products;

    if (activeCategory !== "all" && !itemsToRender) {
      items = items.filter(p => p.category.toLowerCase() === activeCategory.toLowerCase());
    }

    if (!items.length) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
          <ion-icon name="search-outline" style="font-size: 48px; color: var(--text-muted);"></ion-icon>
          <h3 style="font-size: 1.3rem; margin: 12px 0 6px;">No products found</h3>
          <p style="color: var(--text-secondary); font-size: 14px;">Try selecting another category or clearing your search filter.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map(p => {
      const discount = p.old_price && p.old_price > p.price 
        ? Math.round(((p.old_price - p.price) / p.old_price) * 100) 
        : 0;

      const badgeHtml = p.badge 
        ? `<span class="product-badge-chip">${p.badge}</span>` 
        : (discount > 0 ? `<span class="product-badge-chip discount">-${discount}% OFF</span>` : '');

      return `
        <div class="product-card" data-product-id="${p.id}">
          <div class="product-img-box">
            ${badgeHtml}
            <div class="product-card-actions">
              <button class="card-action-btn btn-wish" onclick="window.AnonStore.toggleWishlist(${p.id}, this)" title="Add to Wishlist">
                <ion-icon name="heart-outline"></ion-icon>
              </button>
              <button class="card-action-btn" onclick="window.AnonStore.openQuickView(${p.id})" title="Quick View">
                <ion-icon name="eye-outline"></ion-icon>
              </button>
            </div>
            <img class="product-img" src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80'">
          </div>
          <div class="product-card-body">
            <span class="product-cat-name">${p.category}</span>
            <h4 class="product-title" onclick="window.AnonStore.openQuickView(${p.id})" style="cursor:pointer;">${p.name}</h4>
            <div class="product-rating-row">
              <div class="stars">
                ${'★'.repeat(Math.floor(p.rating || 5))}${'☆'.repeat(5 - Math.floor(p.rating || 5))}
              </div>
              <span class="rating-score">${Number(p.rating || 4.8).toFixed(1)}</span>
              <span class="rating-count">(${Math.floor((p.id * 17) % 80 + 20)})</span>
            </div>
            <div class="product-card-footer">
              <div class="product-price-box">
                <span class="current-price">$${Number(p.price).toFixed(2)}</span>
                ${p.old_price ? `<span class="old-price">$${Number(p.old_price).toFixed(2)}</span>` : ''}
              </div>
              <div class="card-buy-actions">
                <button class="btn-card-cart" onclick="window.AnonStore.addToCart(${p.id}, 1, this)">
                  <ion-icon name="bag-handle-outline"></ion-icon> Add
                </button>
                <button class="btn-card-buy" onclick="window.AnonStore.openQuickView(${p.id}, true)">Buy now</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // Refresh Wishlist and Cart Badges
  async function refreshCounts() {
    try {
      if (!currentUser) {
        $$(".action-badge.cart-badge").forEach(b => b.textContent = "0");
        $$(".action-badge.wish-badge").forEach(b => b.textContent = "0");
        const userBtn = $("#btn-account-nav");
        if (userBtn) userBtn.innerHTML = `<ion-icon name="person-outline"></ion-icon>`;
        return;
      }

      const userBtn = $("#btn-account-nav");
      if (userBtn) {
        const initials = currentUser.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
        userBtn.innerHTML = `<span style="font-size:12px; font-weight:800; color:var(--primary);">${initials}</span>`;
        userBtn.title = `Logged in as ${currentUser.name} (${currentUser.email})`;
      }

      const [cart, wish] = await Promise.all([
        api("/cart").catch(() => ({ items: [] })),
        api("/wishlist").catch(() => [])
      ]);

      const cartCount = cart.items ? cart.items.reduce((s, x) => s + x.quantity, 0) : 0;
      const wishCount = Array.isArray(wish) ? wish.length : 0;

      $$(".action-badge.cart-badge").forEach(b => b.textContent = cartCount);
      $$(".action-badge.wish-badge").forEach(b => b.textContent = wishCount);
    } catch (e) {
      console.warn("Could not refresh counts:", e);
    }
  }

  // Add to Cart Action
  async function addToCart(productId, qty = 1, triggerBtn = null, variant = "") {
    if (!currentUser) {
      toast("Please sign in to add items to your cart", true);
      openAuthModal("login");
      return;
    }

    if (triggerBtn) {
      const origHtml = triggerBtn.innerHTML;
      triggerBtn.innerHTML = `<ion-icon name="checkmark-outline"></ion-icon> Added!`;
      triggerBtn.style.background = "var(--accent-green)";
      setTimeout(() => {
        triggerBtn.innerHTML = origHtml;
        triggerBtn.style.background = "";
      }, 1500);
    }

    try {
      await api("/cart", {
        method: "POST",
        body: { product_id: productId, quantity: qty, variant }
      });
      const p = products.find(x => x.id === productId);
      toast(`Added "${p ? p.name : 'Item'}" to your cart! 🛍️`);
      await refreshCounts();
    } catch (err) {
      toast(err.message, true);
    }
  }

  // Toggle Wishlist Action
  async function toggleWishlist(productId, btn = null) {
    if (!currentUser) {
      toast("Please sign in to manage your wishlist", true);
      openAuthModal("login");
      return;
    }

    try {
      const res = await api(`/wishlist/${productId}`, { method: "POST" });
      const isAdded = res.action === "added";
      if (btn) {
        btn.classList.toggle("active-wish", isAdded);
        const icon = btn.querySelector("ion-icon");
        if (icon) icon.setAttribute("name", isAdded ? "heart" : "heart-outline");
      }
      toast(isAdded ? "Added to your Wishlist! ❤️" : "Removed from Wishlist");
      await refreshCounts();
    } catch (err) {
      toast(err.message, true);
    }
  }

  // Cart Drawer Controller
  async function openCartDrawer() {
    if (!currentUser) {
      toast("Please sign in to access your shopping bag", true);
      openAuthModal("login");
      return;
    }

    const drawer = document.getElementById("cart-drawer");
    if (!drawer) return;
    drawer.classList.add("active");

    const scrollBox = $("#cart-items-box");
    scrollBox.innerHTML = `<div style="text-align:center; padding:40px;"><ion-icon name="sync-outline" style="font-size:32px; animation:spin 1s linear infinite;"></ion-icon><p>Loading your bag...</p></div>`;

    try {
      const data = await api("/cart");
      const items = data.items || [];

      if (!items.length) {
        scrollBox.innerHTML = `
          <div style="text-align:center; padding: 60px 20px;">
            <ion-icon name="bag-outline" style="font-size: 56px; color: var(--text-muted);"></ion-icon>
            <h4 style="font-size: 1.2rem; font-weight: 700; margin: 16px 0 8px;">Your Shopping Bag is Empty</h4>
            <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 24px;">Discover our new luxury season collection.</p>
            <button class="primary-btn" onclick="window.AnonStore.closeCartDrawer();" style="width: auto; margin: 0 auto; padding: 10px 24px;">Start Shopping</button>
          </div>
        `;
        updateDrawerTotals(0);
        return;
      }

      scrollBox.innerHTML = items.map(item => `
        <div class="cart-item-row" data-pid="${item.product_id}">
          <img class="cart-item-img" src="${item.image || 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80'}" alt="${item.name}">
          <div class="cart-item-details">
            <h5 class="cart-item-title">${item.name}</h5>
            ${item.variant ? `<div class="cart-item-variant">Size: ${item.variant}</div>` : ''}
            <div class="cart-item-price">$${Number(item.price).toFixed(2)}</div>
            <div class="cart-qty-control">
              <button class="cart-qty-btn" onclick="window.AnonStore.updateCartQty(${item.product_id}, ${item.quantity - 1})">-</button>
              <span>${item.quantity}</span>
              <button class="cart-qty-btn" onclick="window.AnonStore.updateCartQty(${item.product_id}, ${item.quantity + 1})">+</button>
            </div>
          </div>
          <button class="cart-item-del-btn" onclick="window.AnonStore.removeCartItem(${item.product_id})" title="Remove item">
            <ion-icon name="trash-outline"></ion-icon>
          </button>
        </div>
      `).join("");

      updateDrawerTotals(data.total);
    } catch (err) {
      toast(err.message, true);
    }
  }

  function closeCartDrawer() {
    const drawer = document.getElementById("cart-drawer");
    if (drawer) drawer.classList.remove("active");
  }

  function updateDrawerTotals(subtotal) {
    let discountAmount = 0;
    if (appliedCoupon && appliedCoupon.discount_percent) {
      discountAmount = (subtotal * appliedCoupon.discount_percent) / 100;
    }
    const finalTotal = Math.max(subtotal - discountAmount, 0);

    const subEl = $("#drawer-subtotal");
    const discEl = $("#drawer-discount");
    const grandEl = $("#drawer-grand-total");
    const discRow = $("#drawer-discount-row");

    if (subEl) subEl.textContent = `$${Number(subtotal).toFixed(2)}`;
    if (discEl) discEl.textContent = `-$${Number(discountAmount).toFixed(2)}`;
    if (discRow) discRow.style.display = discountAmount > 0 ? "flex" : "none";
    if (grandEl) grandEl.textContent = `$${Number(finalTotal).toFixed(2)}`;

    const chkBtn = $("#drawer-checkout-btn");
    if (chkBtn) {
      chkBtn.disabled = subtotal <= 0;
      chkBtn.style.opacity = subtotal <= 0 ? "0.5" : "1";
    }
  }

  async function updateCartQty(productId, newQty) {
    try {
      await api(`/cart/${productId}`, {
        method: "PATCH",
        body: { quantity: newQty }
      });
      await openCartDrawer();
      await refreshCounts();
    } catch (err) {
      toast(err.message, true);
    }
  }

  async function removeCartItem(productId) {
    try {
      await api(`/cart/${productId}`, { method: "DELETE" });
      toast("Item removed from your bag");
      await openCartDrawer();
      await refreshCounts();
    } catch (err) {
      toast(err.message, true);
    }
  }

  // Quick View Modal
  function openQuickView(productId, buyNow = false) {
    const p = products.find(x => x.id === productId);
    if (!p) return;

    const modal = document.getElementById("quickview-modal");
    if (!modal) return;
    selectedVariant = "S";
    buyNowAfterSelection = buyNow;

    $("#qv-img").src = p.image;
    $("#qv-cat").textContent = p.category;
    $("#qv-title").textContent = p.name;
    $("#qv-desc").textContent = p.description || "Crafted with highest quality materials and timeless minimalist craftsmanship.";
    $("#qv-price").textContent = `$${Number(p.price).toFixed(2)}`;
    if ($("#qv-oldprice")) {
      $("#qv-oldprice").textContent = p.old_price ? `$${Number(p.old_price).toFixed(2)}` : '';
    }
    $("#qv-stock").textContent = `${p.stock} units available in stock`;
    $$(".size-chip").forEach(chip => chip.classList.toggle("active", chip.dataset.size === selectedVariant));

    // Reset qty
    const qtyInput = $("#qv-qty");
    if (qtyInput) qtyInput.value = 1;

    // Add button handler
    const addBtn = $("#qv-add-btn");
    if (addBtn) {
      addBtn.onclick = () => {
        const q = parseInt(qtyInput.value) || 1;
        addToCart(p.id, q, addBtn, selectedVariant);
        closeQuickView();
        if (buyNowAfterSelection) setTimeout(openCheckout, 250);
      };
    }

    modal.classList.add("active");
  }

  function closeQuickView() {
    const modal = document.getElementById("quickview-modal");
    if (modal) modal.classList.remove("active");
  }

  function selectSize(size, chip) {
    selectedVariant = size;
    $$(".size-chip").forEach(item => item.classList.remove("active"));
    chip.classList.add("active");
  }

  // Coupon Application
  async function applyPromoCode() {
    const input = $("#cart-promo-code");
    const code = (input?.value || "").trim().toUpperCase();
    if (!code) return toast("Please enter a discount promo code", true);

    try {
      const res = await api("/coupon", { method: "POST", body: { code } });
      appliedCoupon = res;
      toast(`Coupon applied! ${res.description} 🎉`);
      openCartDrawer();
    } catch (err) {
      toast(err.message, true);
    }
  }

  // Checkout Modal
  async function openCheckout() {
    closeCartDrawer();
    if (!currentUser) return openAuthModal("login");

    const modal = document.getElementById("checkout-modal");
    if (!modal) return;

    try {
      const cart = await api("/cart");
      if (!cart.items || !cart.items.length) {
        toast("Your shopping bag is empty", true);
        return;
      }

      let discount = 0;
      if (appliedCoupon && appliedCoupon.discount_percent) {
        discount = (cart.total * appliedCoupon.discount_percent) / 100;
      }
      const payable = Math.max(cart.total - discount, 0);

      $("#chk-name").value = currentUser.name || "";
      $("#chk-payable-amount").textContent = `$${Number(payable).toFixed(2)}`;
      modal.classList.add("active");
    } catch (err) {
      toast(err.message, true);
    }
  }

  function closeCheckout() {
    const modal = document.getElementById("checkout-modal");
    if (modal) modal.classList.remove("active");
  }

  async function submitOrder(e) {
    e.preventDefault();
    const btn = $("#btn-place-order");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<ion-icon name="sync-outline" style="animation:spin 1s linear infinite;"></ion-icon> Processing Order...`;
    }

    try {
      const cart = await api("/cart");
      let discount = 0;
      if (appliedCoupon && appliedCoupon.discount_percent) {
        discount = (cart.total * appliedCoupon.discount_percent) / 100;
      }

      const body = {
        name: $("#chk-name").value.trim(),
        phone: $("#chk-phone").value.trim(),
        address: $("#chk-address").value.trim(),
        city: $("#chk-city").value.trim(),
        pincode: $("#chk-pincode").value.trim(),
        payment_method: $("#chk-payment").value,
        discount: discount
      };

      const res = await api("/orders", { method: "POST", body });
      closeCheckout();
      appliedCoupon = null;
      await refreshCounts();
      await loadProducts(); // Refresh stock

      openOrderSuccessModal(res.order_id, res.total);
    } catch (err) {
      toast(err.message, true);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `Complete Purchase 🎉`;
      }
    }
  }

  function openOrderSuccessModal(orderId, total) {
    const modal = document.getElementById("order-success-modal");
    if (!modal) {
      toast(`Order #${orderId} placed successfully! 🎉 Total: $${Number(total).toFixed(2)}`);
      return;
    }
    $("#success-order-id").textContent = `#${orderId}`;
    $("#success-order-total").textContent = `$${Number(total).toFixed(2)}`;
    modal.classList.add("active");
  }

  function closeOrderSuccessModal() {
    const modal = document.getElementById("order-success-modal");
    if (modal) modal.classList.remove("active");
  }

  // Wishlist Modal
  async function openWishlistModal() {
    if (!currentUser) return openAuthModal("login");

    const modal = document.getElementById("wishlist-modal");
    if (!modal) return;

    modal.classList.add("active");
    const container = $("#wishlist-items-box");
    container.innerHTML = `<div style="text-align:center; padding:30px;"><ion-icon name="sync-outline" style="font-size:28px; animation:spin 1s linear infinite;"></ion-icon></div>`;

    try {
      const items = await api("/wishlist");
      if (!items.length) {
        container.innerHTML = `
          <div style="text-align:center; padding: 40px 20px;">
            <ion-icon name="heart-outline" style="font-size: 48px; color: var(--text-muted);"></ion-icon>
            <h4 style="margin: 14px 0 6px;">Your Wishlist is Empty</h4>
            <p style="color: var(--text-secondary); font-size: 13px;">Save your favorite luxury pieces here for later.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = items.map(p => `
        <div style="display:flex; align-items:center; gap:16px; padding:12px 0; border-bottom:1px solid var(--border-light);">
          <img src="${p.image}" style="width:60px; height:60px; border-radius:var(--radius-sm); object-fit:cover;">
          <div style="flex:1;">
            <h5 style="font-size:14px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">${p.name}</h5>
            <span style="font-size:14px; font-weight:800; color:var(--primary);">$${Number(p.price).toFixed(2)}</span>
          </div>
          <button class="primary-btn" style="width:auto; padding:8px 16px; font-size:12px;" onclick="window.AnonStore.addToCart(${p.id}, 1); window.AnonStore.toggleWishlist(${p.id}); window.AnonStore.openWishlistModal();">Move to Bag</button>
          <button style="color:var(--text-muted); font-size:20px;" onclick="window.AnonStore.toggleWishlist(${p.id}); window.AnonStore.openWishlistModal();">&times;</button>
        </div>
      `).join("");
    } catch (err) {
      toast(err.message, true);
    }
  }

  function closeWishlistModal() {
    const modal = document.getElementById("wishlist-modal");
    if (modal) modal.classList.remove("active");
  }

  // My Orders Modal
  async function openOrdersModal() {
    if (!currentUser) return openAuthModal("login");

    const modal = document.getElementById("orders-modal");
    if (!modal) return;
    modal.classList.add("active");

    const container = $("#orders-list-box");
    container.innerHTML = `<div style="text-align:center; padding:30px;"><ion-icon name="sync-outline" style="font-size:28px; animation:spin 1s linear infinite;"></ion-icon></div>`;

    try {
      const orders = await api("/orders");
      if (!orders.length) {
        container.innerHTML = `
          <div style="text-align:center; padding: 40px 20px;">
            <ion-icon name="cube-outline" style="font-size: 48px; color: var(--text-muted);"></ion-icon>
            <h4 style="margin: 14px 0 6px;">No orders found</h4>
            <p style="color: var(--text-secondary); font-size: 13px;">You have not placed any orders with us yet.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = orders.map(o => `
        <div style="background:var(--bg-subtle); border:1px solid var(--border-light); border-radius:var(--radius-md); padding:16px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-weight:800; font-size:14px;">Order #${o.id}</span>
            <span style="background:var(--primary); color:#fff; font-size:11px; font-weight:800; padding:2px 10px; border-radius:var(--radius-full); text-transform:uppercase;">${o.status}</span>
          </div>
          <p style="font-size:12px; color:var(--text-secondary); margin-bottom:14px;">Date: ${new Date(o.created_at).toLocaleString()} | Paid: <strong>$${Number(o.total).toFixed(2)}</strong> via ${o.payment_method.toUpperCase()}</p>
          <div class="order-tracker" aria-label="Order status: ${o.status}">
            ${["pending", "confirmed", "shipped", "delivered"].map((step, index) => `<div class="tracker-step ${["pending", "confirmed", "shipped", "delivered"].indexOf(o.status) >= index ? 'complete' : ''} ${o.status === step ? 'current' : ''}"><span>${index + 1}</span><small>${step}</small></div>`).join("")}
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${(o.items || []).map(it => `
              <div style="display:flex; align-items:center; gap:10px; font-size:13px; background:#fff; padding:6px 10px; border-radius:var(--radius-sm);">
                <img src="${it.image || 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80'}" style="width:36px; height:36px; border-radius:4px; object-fit:cover;">
                <span style="flex:1; font-weight:600;">${it.name}${it.variant ? `<small style="display:block; color:var(--text-muted); font-weight:500;">Size ${it.variant}</small>` : ''}</span>
                <span style="color:var(--text-muted);">${it.quantity} × $${Number(it.price).toFixed(2)}</span>
              </div>
            `).join("")}
          </div>
        </div>
      `).join("");
    } catch (err) {
      toast(err.message, true);
    }
  }

  function closeOrdersModal() {
    const modal = document.getElementById("orders-modal");
    if (modal) modal.classList.remove("active");
  }

  // Auth Modal & User Session
  function openAuthModal(mode = "login") {
    const modal = document.getElementById("auth-modal");
    if (!modal) return;

    const title = $("#auth-title");
    const nameGroup = $("#auth-name-group");
    const switchBtn = $("#auth-toggle-btn");
    const submitBtn = $("#auth-submit-btn");

    if (mode === "register") {
      title.textContent = "Create VIP Account";
      nameGroup.style.display = "block";
      submitBtn.textContent = "Create Account ✨";
      switchBtn.textContent = "Already have an account? Sign In";
      modal.dataset.mode = "register";
    } else {
      title.textContent = "Welcome Back";
      nameGroup.style.display = "none";
      submitBtn.textContent = "Sign In ✨";
      switchBtn.textContent = "Don't have an account? Create VIP Account";
      modal.dataset.mode = "login";
    }

    modal.classList.add("active");
  }

  function closeAuthModal() {
    const modal = document.getElementById("auth-modal");
    if (modal) modal.classList.remove("active");
  }

  function toggleAuthMode() {
    const modal = document.getElementById("auth-modal");
    const currentMode = modal.dataset.mode || "login";
    openAuthModal(currentMode === "login" ? "register" : "login");
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    const modal = document.getElementById("auth-modal");
    const mode = modal.dataset.mode || "login";

    const email = $("#auth-email").value.trim();
    const password = $("#auth-password").value;
    const name = $("#auth-name") ? $("#auth-name").value.trim() : "";

    const submitBtn = $("#auth-submit-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Authenticating...";

    try {
      const endpoint = mode === "register" ? "/auth/register" : "/auth/login";
      const body = { email, password };
      if (mode === "register") body.name = name;

      const res = await api(endpoint, { method: "POST", body });
      currentUser = res.user;
      closeAuthModal();
      toast(`Welcome ${currentUser.name}! ✨`);
      await refreshCounts();
    } catch (err) {
      toast(err.message, true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = mode === "register" ? "Create Account ✨" : "Sign In ✨";
    }
  }

  async function handleUserAccountClick() {
    if (!currentUser) return openAuthModal("login");

    const modal = document.getElementById("account-menu-modal");
    if (!modal) return;

    $("#acc-name").textContent = currentUser.name;
    $("#acc-email").textContent = currentUser.email;
    $("#acc-role").textContent = currentUser.is_admin ? "👑 Store Administrator" : "🛍️ VIP Customer";

    const adminBtn = $("#acc-admin-btn");
    if (adminBtn) adminBtn.style.display = currentUser.is_admin ? "flex" : "none";

    modal.classList.add("active");
  }

  function closeAccountMenu() {
    const modal = document.getElementById("account-menu-modal");
    if (modal) modal.classList.remove("active");
  }

  async function handleSignOut() {
    try {
      await api("/auth/logout", { method: "POST" });
      currentUser = null;
      closeAccountMenu();
      toast("Successfully signed out. See you soon! 👋");
      await refreshCounts();
    } catch (e) {
      currentUser = null;
      closeAccountMenu();
      refreshCounts();
    }
  }

  // Predictive Live Search
  function setupPredictiveSearch() {
    const input = $("#main-search-input");
    const dropdown = $("#search-dropdown");
    if (!input || !dropdown) return;

    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        dropdown.classList.remove("active");
        renderProductGrid();
        return;
      }

      const matches = products.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.category.toLowerCase().includes(q) || 
        (p.description && p.description.toLowerCase().includes(q))
      );

      if (!matches.length) {
        dropdown.innerHTML = `<div style="padding:16px; font-size:13px; color:var(--text-muted); text-align:center;">No matching items found for "${q}"</div>`;
      } else {
        dropdown.innerHTML = matches.slice(0, 6).map(p => `
          <div class="search-result-item" onclick="window.AnonStore.openQuickView(${p.id}); document.getElementById('search-dropdown').classList.remove('active');">
            <img class="search-result-img" src="${p.image}">
            <div class="search-result-info">
              <div class="search-result-title">${p.name}</div>
              <span class="search-result-price">$${Number(p.price).toFixed(2)}</span>
            </div>
            <ion-icon name="arrow-forward-outline" style="color:var(--text-muted);"></ion-icon>
          </div>
        `).join("");
      }
      dropdown.classList.add("active");
      renderProductGrid(matches);
    });

    document.addEventListener("click", e => {
      if (!dropdown.contains(e.target) && e.target !== input) {
        dropdown.classList.remove("active");
      }
    });

    // Keyboard shortcut '/' to focus search
    document.addEventListener("keydown", e => {
      if (e.key === "/" && document.activeElement !== input) {
        e.preventDefault();
        input.focus();
      }
    });
  }

  // Newsletter Subscription
  function setupNewsletterForm() {
    $$(".newsletter-form").forEach(form => {
      form.addEventListener("submit", async e => {
        e.preventDefault();
        const input = form.querySelector('input[type="email"]');
        const email = (input?.value || "").trim();
        if (!email) return;

        try {
          const res = await api("/newsletter", { method: "POST", body: { email } });
          toast(res.message || "Thank you for subscribing to Anon VIP! ✨");
          form.reset();
        } catch (err) {
          toast(err.message, true);
        }
      });
    });
  }

  // Live Flash Deal Countdown Timer
  function startCountdownTimer() {
    let target = new Date();
    target.setHours(23, 59, 59, 999);

    function update() {
      const now = new Date();
      const diff = Math.max(target - now, 0);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const hEl = $("#timer-hours");
      const mEl = $("#timer-minutes");
      const sEl = $("#timer-seconds");

      if (hEl) hEl.textContent = String(hours).padStart(2, "0");
      if (mEl) mEl.textContent = String(minutes).padStart(2, "0");
      if (sEl) sEl.textContent = String(seconds).padStart(2, "0");
    }

    update();
    setInterval(update, 1000);
  }

  // Hero Slider
  function setupHeroSlider() {
    const slides = [
      {
        tag: 'Autumn / Winter 2026 Collection',
        title: 'Modern Elegance Redefined.',
        desc: 'Experience pure architectural silhouettes and handcrafted Italian craftsmanship.',
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80'
      },
      {
        tag: 'High-Fidelity Sound & Tech',
        title: 'Next-Gen Acoustic Mastery.',
        desc: 'Spatial audio studio wireless headphones engineered with custom beryllium drivers.',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1600&q=80'
      },
      {
        tag: 'Fine Jewelry & Luxury Watches',
        title: 'Timeless Precision & Radiance.',
        desc: 'Conflict-free brilliant lab diamonds and 42mm titanium aerospace timepieces.',
        image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1600&q=80'
      }
    ];

    let current = 0;
    const heroBox = document.getElementById("hero-slide-item");
    if (!heroBox) return;

    function applySlide(index) {
      const s = slides[index];
      heroBox.style.backgroundImage = `url('${s.image}')`;
      const badge = heroBox.querySelector(".hero-badge-tag");
      const title = heroBox.querySelector(".hero-title");
      const desc = heroBox.querySelector(".hero-subtitle");
      if (badge) badge.textContent = s.tag;
      if (title) title.innerHTML = s.title.replace(/\./g, '<span>.</span>');
      if (desc) desc.textContent = s.desc;
    }

    applySlide(0);

    const prevBtn = document.getElementById("hero-prev-btn");
    const nextBtn = document.getElementById("hero-next-btn");

    if (prevBtn) {
      prevBtn.onclick = () => {
        current = (current - 1 + slides.length) % slides.length;
        applySlide(current);
      };
    }
    if (nextBtn) {
      nextBtn.onclick = () => {
        current = (current + 1) % slides.length;
        applySlide(current);
      };
    }

    // Auto rotate every 6 seconds
    setInterval(() => {
      current = (current + 1) % slides.length;
      applySlide(current);
    }, 6000);
  }

  // Category Filter Pill Click Handlers
  function setupCategoryPills() {
    $$(".cat-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        $$(".cat-pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        activeCategory = pill.dataset.category || "all";
        loadProducts();
      });
    });

    const sortSelect = document.getElementById("catalog-sort-select");
    if (sortSelect) {
      sortSelect.addEventListener("change", () => {
        activeSort = sortSelect.value;
        loadProducts();
      });
    }
  }

  // Boot Application
  async function boot() {
    try {
      const meData = await api("/auth/me");
      currentUser = meData.user;
    } catch (e) {
      console.log("No active session detected.");
    }

    await loadProducts();
    await refreshCounts();

    setupCategoryPills();
    setupHeroSlider();
    startCountdownTimer();
    setupNewsletterForm();

    // Event Listeners for Nav Actions
    $("#btn-account-nav")?.addEventListener("click", handleUserAccountClick);
    $("#btn-wishlist-nav")?.addEventListener("click", openWishlistModal);
    $("#btn-cart-nav")?.addEventListener("click", openCartDrawer);
    $("#btn-close-cart")?.addEventListener("click", closeCartDrawer);
    $("#drawer-checkout-btn")?.addEventListener("click", openCheckout);
    $("#btn-apply-promo")?.addEventListener("click", applyPromoCode);

    // Form Submits
    $("#auth-form")?.addEventListener("submit", handleAuthSubmit);
    $("#checkout-form")?.addEventListener("submit", submitOrder);
    $$(".size-chip").forEach(chip => chip.addEventListener("click", () => selectSize(chip.dataset.size, chip)));

    // Global Key Listener for Esc Modal Close
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        closeCartDrawer();
        closeQuickView();
        closeAuthModal();
        closeAccountMenu();
        closeWishlistModal();
        closeCheckout();
        closeOrdersModal();
        closeOrderSuccessModal();
      }
    });
  }

  // Expose Global Public Controller for Inline Handlers
  window.AnonStore = {
    addToCart,
    selectSize,
    toggleWishlist,
    openQuickView,
    closeQuickView,
    openCartDrawer,
    closeCartDrawer,
    updateCartQty,
    removeCartItem,
    applyPromoCode,
    openCheckout,
    closeCheckout,
    openWishlistModal,
    closeWishlistModal,
    openOrdersModal,
    closeOrdersModal,
    openAuthModal,
    closeAuthModal,
    toggleAuthMode,
    handleUserAccountClick,
    closeAccountMenu,
    handleSignOut,
    closeOrderSuccessModal
  };

  document.addEventListener("DOMContentLoaded", boot);
})();
