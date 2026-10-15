/*--------------------------------------------------------------
  CLOUDY MOOD / RAINY SKY E-COMMERCE ENGINE - APP.JS
--------------------------------------------------------------*/
(() => {
  const API = (window.location.origin && window.location.origin.startsWith("http")) 
    ? window.location.origin + "/api" 
    : "http://127.0.0.1:5000/api";

  let products = [];
  let me = null;
  let activeCategory = "all";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Toast notification
  function toast(msg, isError = false) {
    let el = document.getElementById("toast-cloud");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast-cloud";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.borderColor = isError ? "var(--danger-coral)" : "var(--sky-primary)";
    el.style.display = "block";
    clearTimeout(el._t);
    el._t = setTimeout(() => el.style.display = "none", 3000);
  }

  // Unified API fetch helper
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
      if (err.message.includes("Failed to fetch")) {
        throw new Error("Cannot connect to Flask server. Please run app.py!");
      }
      throw err;
    }
  }

  // Load product catalog from API
  async function loadProducts(query = "", category = "") {
    try {
      let url = "/products?limit=200";
      if (query) url += `&q=${encodeURIComponent(query)}`;
      if (category && category !== "all") url += `&category=${encodeURIComponent(category)}`;

      products = await api(url);
      renderProductGrid(products);
      return products;
    } catch (err) {
      toast(err.message, true);
    }
  }

  // Render product grid
  function renderProductGrid(items) {
    const grid = $("#product-grid");
    if (!grid) return;

    if (!items || items.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding: 60px 20px; background:var(--bg-card); border-radius:var(--radius-xl); border:1px solid var(--glass-border);">
          <div style="font-size:48px; margin-bottom:12px;">🌧️</div>
          <h3 style="color:var(--mist-white); font-family:var(--font-title); font-size:22px;">No Items Found</h3>
          <p style="color:var(--mist-silver); margin-top:6px;">Try clearing filters or searching for another rainy day essential.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map(p => {
      const img = p.image || `./assets/images/products/jacket-1.jpg`;
      const badgeText = p.old_price ? `SALE • -$${(p.old_price - p.price).toFixed(0)}` : 'POPULAR';
      const stars = '★'.repeat(Math.round(p.rating || 5)) + '☆'.repeat(5 - Math.round(p.rating || 5));

      return `
        <div class="product-card" data-id="${p.id}">
          <div class="img-container">
            <img src="${img}" alt="${p.name}" class="product-thumb" onerror="this.src='https://images.unsplash.com/photo-1544441893-675973e31985?w=500&auto=format&fit=crop&q=60'">
            <span class="badge-tag">${badgeText}</span>
            <div class="card-actions-quick">
              <button class="quick-btn action-wishlist-btn" title="Add to Wishlist" onclick="window.toggleWishlist(${p.id})">
                <i class="ri-heart-line"></i>
              </button>
              <button class="quick-btn action-quickview-btn" title="Quick View" onclick="window.openQuickView(${p.id})">
                <i class="ri-eye-line"></i>
              </button>
            </div>
          </div>
          <div class="product-cat">${p.category}</div>
          <h3 class="product-name">${p.name}</h3>
          <div class="rating-stars">${stars}</div>
          <div class="price-row">
            <div class="product-price">$${Number(p.price).toFixed(2)}</div>
            <button class="add-to-cart-btn" onclick="window.addToCart(${p.id})">
              <i class="ri-shopping-bag-3-line"></i> Add
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  // Refresh user state & header counts
  async function refreshCounts() {
    const userBtnText = $("#user-btn-text");
    if (me && userBtnText) {
      userBtnText.textContent = me.name.split(' ')[0];
    } else if (userBtnText) {
      userBtnText.textContent = "Sign In";
    }

    try {
      if (!me) {
        $("#cart-count").textContent = "0";
        $("#wishlist-count").textContent = "0";
        return;
      }
      const [cart, wish] = await Promise.all([api("/cart"), api("/wishlist")]);
      $("#cart-count").textContent = cart.items?.reduce((n, x) => n + x.quantity, 0) || 0;
      $("#wishlist-count").textContent = wish.length || 0;
    } catch {}
  }

  // Global Helpers for Inline Handlers
  window.addToCart = async (productId) => {
    try {
      const p = products.find(x => x.id === productId);
      await api("/cart", { method: "POST", body: { product_id: productId, quantity: 1 } });
      toast(`Added "${p ? p.name : 'Item'}" to Cart 🛒`);
      await refreshCounts();
    } catch (err) {
      if (err.message.includes("Login required")) openAuthModal("login");
      else toast(err.message, true);
    }
  };

  window.toggleWishlist = async (productId) => {
    try {
      const res = await api(`/wishlist/${productId}`, { method: "POST" });
      toast(res.action === "added" ? "Added to Wishlist ❤️" : "Removed from Wishlist");
      await refreshCounts();
    } catch (err) {
      if (err.message.includes("Login required")) openAuthModal("login");
      else toast(err.message, true);
    }
  };

  // Modal Creator
  function createModal(id, title, bodyHtml) {
    let modal = document.getElementById(id);
    if (!modal) {
      modal = document.createElement("div");
      modal.id = id;
      modal.className = "modal-overlay";
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div class="modal-content-card">
        <button class="close-modal-btn" onclick="document.getElementById('${id}').classList.remove('active')">&times;</button>
        <h2 class="modal-header-title">${title}</h2>
        ${bodyHtml}
      </div>
    `;
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
    setTimeout(() => modal.classList.add("active"), 10);
    return modal;
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove("active");
  }

  // 1. Auth Modal
  function openAuthModal(mode = "login") {
    const isReg = mode === "register";
    const html = `
      <form id="auth-form">
        ${isReg ? `
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="auth-name" required placeholder="Alex Turner">
        </div>` : ''}
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" id="auth-email" required placeholder="user@sky.com">
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="auth-password" required placeholder="•••••••• (6+ chars)">
        </div>
        <button type="submit" class="btn-primary" style="width:100%; justify-content:center; margin-top:10px;">
          ${isReg ? 'Create Account 🚀' : 'Sign In 🔑'}
        </button>
      </form>
      <p style="text-align:center; margin-top:16px; font-size:14px; cursor:pointer; color:var(--sky-primary);" id="toggle-auth-btn">
        ${isReg ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
      </p>
    `;

    const m = createModal("auth-modal", isReg ? "Join Aether Sky" : "Welcome Back", html);

    $("#toggle-auth-btn", m).onclick = () => openAuthModal(isReg ? "login" : "register");

    $("#auth-form", m).onsubmit = async e => {
      e.preventDefault();
      try {
        const body = {
          email: $("#auth-email", m).value,
          password: $("#auth-password", m).value
        };
        if (isReg) body.name = $("#auth-name", m).value;

        const res = await api(isReg ? "/auth/register" : "/auth/login", { method: "POST", body });
        me = res.user;
        closeModal("auth-modal");
        toast(`Welcome, ${me.name}! ☁️`);
        await refreshCounts();
      } catch (err) { toast(err.message, true); }
    };
  }

  // 2. User Menu Modal
  function openUserMenu() {
    if (!me) return openAuthModal("login");

    const adminBtn = me.is_admin ? `<button class="btn-primary" id="btn-admin" style="background:linear-gradient(135deg,#10b981,#059669); margin-bottom:10px; width:100%;">👑 Admin Dashboard</button>` : '';

    const html = `
      <div style="background:rgba(30,41,59,0.5); padding:16px; border-radius:var(--radius-lg); border:1px solid var(--glass-border); margin-bottom:20px;">
        <p style="color:var(--mist-white); font-weight:700; font-size:16px;">${me.name}</p>
        <p style="color:var(--mist-silver); font-size:13px;">${me.email}</p>
        <p style="color:var(--sky-primary); font-size:12px; margin-top:4px;">${me.is_admin ? 'Administrator Role' : 'Customer Account'}</p>
      </div>
      ${adminBtn}
      <button class="btn-secondary" id="btn-orders" style="width:100%; margin-bottom:10px;">📦 View My Orders</button>
      <button class="btn-secondary" id="btn-logout" style="width:100%; border-color:var(--danger-coral); color:var(--danger-coral);">🚪 Sign Out</button>
    `;

    const m = createModal("user-menu-modal", "My Account ☁️", html);
    if ($("#btn-admin", m)) $("#btn-admin", m).onclick = () => { closeModal("user-menu-modal"); openAdminModal(); };
    $("#btn-orders", m).onclick = () => { closeModal("user-menu-modal"); openMyOrdersModal(); };
    $("#btn-logout", m).onclick = async () => {
      await api("/auth/logout", { method: "POST" });
      me = null;
      closeModal("user-menu-modal");
      toast("Signed out");
      await refreshCounts();
    };
  }

  // 3. Cart Modal
  async function openCartModal() {
    if (!me) return openAuthModal("login");
    try {
      const data = await api("/cart");
      const items = data.items || [];

      let listHtml = items.length ? items.map(item => `
        <div class="cart-list-item">
          <img src="${item.image || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=200&auto=format&fit=crop&q=60'}" class="cart-item-thumb">
          <div class="cart-item-info">
            <h4 class="cart-item-title">${item.name}</h4>
            <div class="cart-item-price">$${Number(item.price).toFixed(2)}</div>
            <div class="qty-btn-group">
              <button class="qty-btn" onclick="window.updateCartQty(${item.product_id}, ${item.quantity - 1})">-</button>
              <span style="color:var(--mist-white); font-weight:600;">${item.quantity}</span>
              <button class="qty-btn" onclick="window.updateCartQty(${item.product_id}, ${item.quantity + 1})">+</button>
            </div>
          </div>
          <button style="color:var(--danger-coral); font-size:20px;" onclick="window.removeCartItem(${item.product_id})">&times;</button>
        </div>
      `).join("") : `<p style="text-align:center; padding:40px; color:var(--mist-silver);">Your rainy day cart is empty 🛍️</p>`;

      const html = `
        <div style="max-height:320px; overflow-y:auto; margin-bottom:20px;">${listHtml}</div>
        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--glass-border); padding-top:16px; margin-bottom:20px; font-size:18px; font-weight:700;">
          <span style="color:var(--mist-white);">Total:</span>
          <span style="color:var(--sky-primary);">$${Number(data.total || 0).toFixed(2)}</span>
        </div>
        <button class="btn-primary" id="btn-checkout" style="width:100%; justify-content:center;" ${items.length === 0 ? 'disabled style="opacity:0.5;"' : ''}>
          Proceed to Checkout 💳
        </button>
      `;

      const m = createModal("cart-modal", "Shopping Cart 🛒", html);
      if (items.length) {
        $("#btn-checkout", m).onclick = () => {
          closeModal("cart-modal");
          openCheckoutModal(data.total);
        };
      }
    } catch (err) { toast(err.message, true); }
  }

  window.updateCartQty = async (pid, newQty) => {
    try {
      await api(`/cart/${pid}`, { method: "PATCH", body: { quantity: newQty } });
      await refreshCounts();
      openCartModal();
    } catch (err) { toast(err.message, true); }
  };

  window.removeCartItem = async (pid) => {
    try {
      await api(`/cart/${pid}`, { method: "DELETE" });
      await refreshCounts();
      openCartModal();
    } catch (err) { toast(err.message, true); }
  };

  // 4. Wishlist Modal
  async function openWishlistModal() {
    if (!me) return openAuthModal("login");
    try {
      const items = await api("/wishlist");
      let listHtml = items.length ? items.map(item => `
        <div class="cart-list-item">
          <img src="${item.image || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=200&auto=format&fit=crop&q=60'}" class="cart-item-thumb">
          <div class="cart-item-info">
            <h4 class="cart-item-title">${item.name}</h4>
            <div class="cart-item-price">$${Number(item.price).toFixed(2)}</div>
          </div>
          <button class="btn-primary" style="padding:6px 14px; font-size:12px;" onclick="window.wishlistToCart(${item.id})">Move to Cart</button>
        </div>
      `).join("") : `<p style="text-align:center; padding:40px; color:var(--mist-silver);">Wishlist is empty ❤️</p>`;

      createModal("wishlist-modal", "My Wishlist ❤️", `<div style="max-height:350px; overflow-y:auto;">${listHtml}</div>`);
    } catch (err) { toast(err.message, true); }
  }

  window.wishlistToCart = async (pid) => {
    try {
      await api("/cart", { method: "POST", body: { product_id: pid, quantity: 1 } });
      toast("Moved to cart!");
      await refreshCounts();
      closeModal("wishlist-modal");
      openCartModal();
    } catch (err) { toast(err.message, true); }
  };

  // 5. Checkout Modal
  function openCheckoutModal(total) {
    const html = `
      <form id="checkout-form">
        <div class="form-group"><label>Full Name</label><input type="text" id="co-name" required value="${me ? me.name : ''}"></div>
        <div class="form-group"><label>Phone Number</label><input type="tel" id="co-phone" required placeholder="+1 234 567 8900"></div>
        <div class="form-group"><label>Shipping Address</label><input type="text" id="co-address" required placeholder="742 Evergreen Terrace"></div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div class="form-group"><label>City</label><input type="text" id="co-city" required placeholder="Seattle"></div>
          <div class="form-group"><label>ZIP Code</label><input type="text" id="co-pincode" required placeholder="98101"></div>
        </div>
        <div class="form-group">
          <label>Payment Method</label>
          <select id="co-payment">
            <option value="cod">Cash on Delivery (COD)</option>
            <option value="online">Credit Card / Apple Pay</option>
          </select>
        </div>
        <div style="background:rgba(56,189,248,0.1); padding:14px; border-radius:var(--radius-md); border:1px solid rgba(56,189,248,0.2); margin-bottom:20px; font-weight:700; color:var(--mist-white);">
          Total Amount: <span style="color:var(--sky-primary); float:right;">$${Number(total).toFixed(2)}</span>
        </div>
        <button type="submit" class="btn-primary" style="width:100%; justify-content:center;">Place Order Now 🌧️</button>
      </form>
    `;

    const m = createModal("checkout-modal", "Checkout Details 📦", html);

    $("#checkout-form", m).onsubmit = async e => {
      e.preventDefault();
      try {
        const body = {
          name: $("#co-name", m).value,
          phone: $("#co-phone", m).value,
          address: $("#co-address", m).value,
          city: $("#co-city", m).value,
          pincode: $("#co-pincode", m).value,
          payment_method: $("#co-payment", m).value
        };

        const res = await api("/orders", { method: "POST", body });
        closeModal("checkout-modal");
        toast(`Order #${res.order_id} placed! 🎉`);
        await refreshCounts();

        createModal("order-success", "Order Confirmed! 🎉", `
          <div style="text-align:center; padding:20px;">
            <div style="font-size:54px; margin-bottom:10px;">🌧️⚡</div>
            <p style="color:var(--mist-white); font-size:16px;">Thank you for shopping with Aether Sky, <strong>${me.name}</strong>.</p>
            <p style="color:var(--sky-primary); margin:10px 0; font-size:15px;">Order ID: <strong>#${res.order_id}</strong> | Total: <strong>$${Number(res.total).toFixed(2)}</strong></p>
            <button class="btn-primary" style="margin-top:15px;" onclick="document.getElementById('order-success').classList.remove('active')">Continue Shopping</button>
          </div>
        `);
      } catch (err) { toast(err.message, true); }
    };
  }

  // 6. My Orders Modal
  async function openMyOrdersModal() {
    if (!me) return openAuthModal("login");
    try {
      const orders = await api("/orders");
      let listHtml = orders.length ? orders.map(o => `
        <div style="background:rgba(30,41,59,0.5); border:1px solid var(--glass-border); border-radius:var(--radius-lg); padding:16px; margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <strong style="color:var(--mist-white);">Order #${o.id}</strong>
            <span style="background:var(--sky-primary); color:var(--bg-deep); font-size:11px; font-weight:700; padding:2px 8px; border-radius:10px; text-transform:uppercase;">${o.status}</span>
          </div>
          <p style="font-size:12px; color:var(--mist-silver);">Date: ${new Date(o.created_at).toLocaleDateString()}</p>
          <div style="margin:10px 0; padding-top:8px; border-top:1px dashed rgba(255,255,255,0.1); font-size:13px; color:var(--mist-white);">
            ${(o.items || []).map(i => `<div>• ${i.name} × ${i.quantity} ($${(i.price * i.quantity).toFixed(2)})</div>`).join("")}
          </div>
          <div style="text-align:right; font-weight:700; color:var(--sky-primary); font-size:15px;">Total: $${Number(o.total).toFixed(2)}</div>
        </div>
      `).join("") : `<p style="text-align:center; padding:30px; color:var(--mist-silver);">No orders placed yet.</p>`;

      createModal("orders-modal", "My Order History 📦", `<div style="max-height:400px; overflow-y:auto;">${listHtml}</div>`);
    } catch (err) { toast(err.message, true); }
  }

  // 7. Quick View Modal
  window.openQuickView = (pid) => {
    const p = products.find(x => x.id === pid);
    if (!p) return;
    const html = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
        <img src="${p.image || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=500&auto=format&fit=crop&q=60'}" style="width:100%; aspect-ratio:1/1; object-fit:cover; border-radius:var(--radius-lg);" onerror="this.src='https://images.unsplash.com/photo-1544441893-675973e31985?w=500&auto=format&fit=crop&q=60'">
        <div>
          <span style="color:var(--sky-primary); font-size:12px; font-weight:700; text-transform:uppercase;">${p.category}</span>
          <h3 style="font-family:var(--font-title); font-size:22px; color:var(--mist-white); margin:6px 0 10px;">${p.name}</h3>
          <div style="font-family:var(--font-title); font-size:24px; font-weight:700; color:var(--sky-primary); margin-bottom:12px;">$${Number(p.price).toFixed(2)}</div>
          <p style="font-size:13px; color:var(--mist-silver); margin-bottom:20px;">${p.description || 'Designed for cool moody days.'}</p>
          <button class="btn-primary" style="width:100%; justify-content:center;" onclick="window.addToCart(${p.id})">Add to Cart 🛒</button>
        </div>
      </div>
    `;
    createModal("quickview-modal", "Item Details", html);
  };

  // 8. Admin Panel Modal
  async function openAdminModal() {
    if (!me || !me.is_admin) return toast("Admin access required", true);
    try {
      const orders = await api("/admin/orders");
      let tableRows = orders.map(o => `
        <tr style="border-bottom:1px solid var(--glass-border); font-size:13px; color:var(--mist-white);">
          <td style="padding:10px;">#${o.id}</td>
          <td style="padding:10px;">${o.name}<br><small style="color:var(--mist-silver);">${o.email}</small></td>
          <td style="padding:10px; color:var(--sky-primary); font-weight:700;">$${Number(o.total).toFixed(2)}</td>
          <td style="padding:10px;">
            <select onchange="window.updateAdminOrder(${o.id}, this.value)" style="background:rgba(30,41,59,0.8); color:#fff; border:1px solid var(--glass-border); padding:4px 8px; border-radius:6px; font-size:12px;">
              ${["pending", "confirmed", "shipped", "delivered", "cancelled"].map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`).join("")}
            </select>
          </td>
        </tr>
      `).join("");

      const html = `
        <div style="max-height:350px; overflow-y:auto;">
          <table style="width:100%; border-collapse:collapse; text-align:left;">
            <thead>
              <tr style="background:rgba(30,41,59,0.6); color:var(--sky-primary); font-size:12px;">
                <th style="padding:10px;">Order</th>
                <th style="padding:10px;">Customer</th>
                <th style="padding:10px;">Total</th>
                <th style="padding:10px;">Status</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      `;

      createModal("admin-modal", "Admin Order Dashboard 👑", html);
    } catch (err) { toast(err.message, true); }
  }

  window.updateAdminOrder = async (orderId, status) => {
    try {
      await api(`/admin/orders/${orderId}`, { method: "PATCH", body: { status } });
      toast(`Order #${orderId} set to ${status}`);
    } catch (err) { toast(err.message, true); }
  };

  // Bootstrapping
  async function boot() {
    try { me = (await api("/auth/me")).user; } catch {}
    await loadProducts();
    await refreshCounts();

    // Event Listeners
    $("#search-input")?.addEventListener("keydown", e => { if (e.key === "Enter") loadProducts(e.target.value, activeCategory); });
    $("#search-btn")?.addEventListener("click", () => loadProducts($("#search-input")?.value, activeCategory));

    $$(".cat-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        $$(".cat-pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        activeCategory = pill.dataset.category || "all";
        loadProducts($("#search-input")?.value, activeCategory);
      });
    });

    $("#cart-btn")?.addEventListener("click", openCartModal);
    $("#wishlist-btn")?.addEventListener("click", openWishlistModal);
    $("#user-btn")?.addEventListener("click", openUserMenu);

    $("#newsletter-form")?.addEventListener("submit", async e => {
      e.preventDefault();
      const email = $("#newsletter-email")?.value;
      if (!email) return;
      try {
        await api("/newsletter", { method: "POST", body: { email } });
        toast("Subscribed to Rainy Sky Newsletter! 📩");
        e.target.reset();
      } catch (err) { toast(err.message, true); }
    });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
