/**
 * ANON LUXURY E-COMMERCE - MASTER ADMIN COMMAND CONTROLLER (admin.js)
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
  let adminUser = null;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  function toast(message, isError = false) {
    let el = document.getElementById("backend-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "backend-toast";
      document.body.appendChild(el);
    }
    el.innerHTML = `<span>${isError ? '⚠️' : '✨'}</span> <span>${message}</span>`;
    el.style.background = isError ? "#ef4444" : "#0f172a";
    el.style.color = "#ffffff";
    el.style.display = "flex";
    clearTimeout(el._t);
    el._t = setTimeout(() => el.style.display = "none", 3000);
  }

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
    const res = await fetch(API + path, opts);
    let data = {};
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  // 1. Authenticate Admin
  async function checkAdminAuth() {
    try {
      const res = await api("/auth/me");
      adminUser = res.user;
      if (!adminUser || !adminUser.is_admin) {
        showAuthModal();
        return false;
      }
      $("#admin-user-tag").textContent = `${adminUser.name} (${adminUser.email})`;
      return true;
    } catch (e) {
      showAuthModal();
      return false;
    }
  }

  function showAuthModal() {
    const modal = document.getElementById("admin-auth-modal");
    if (modal) modal.classList.add("active");
  }

  async function handleAdminLogin(e) {
    e.preventDefault();
    const email = $("#adm-email").value.trim();
    const password = $("#adm-pwd").value;

    try {
      const res = await api("/auth/login", {
        method: "POST",
        body: { email, password }
      });
      if (!res.user.is_admin) {
        throw new Error("This account does not have administrator privileges.");
      }
      adminUser = res.user;
      document.getElementById("admin-auth-modal").classList.remove("active");
      $("#admin-user-tag").textContent = `${adminUser.name} (${adminUser.email})`;
      toast("Admin authentication verified! 👑");
      loadDashboard();
    } catch (err) {
      toast(err.message, true);
    }
  }

  // 2. Load Dashboard Data
  async function loadDashboard() {
    try {
      const [metrics, orders, products, subscribers] = await Promise.all([
        api("/admin/metrics").catch(() => ({ total_sales: 0, total_orders: 0, total_products: 0, total_subscribers: 0 })),
        api("/admin/orders").catch(() => []),
        api("/products?limit=200").catch(() => []),
        api("/admin/subscribers").catch(() => [])
      ]);

      // Update KPI counters
      $("#stat-revenue").textContent = `$${Number(metrics.total_sales || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      $("#stat-orders").textContent = metrics.total_orders || orders.length;
      $("#stat-products").textContent = metrics.total_products || products.length;
      $("#stat-subscribers").textContent = metrics.total_subscribers || subscribers.length;

      // Render Orders
      renderOrders(orders);

      // Render Products
      renderProducts(products);

      // Render Subscribers
      renderSubscribers(subscribers);

    } catch (err) {
      toast("Error loading dashboard data: " + err.message, true);
    }
  }

  function renderOrders(orders) {
    const tbody = document.getElementById("orders-tbody");
    if (!tbody) return;

    if (!orders.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#94a3b8;">No customer orders placed yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(o => `
      <tr>
        <td><strong>#${o.id}</strong></td>
        <td>
          <div style="font-weight:700; color:#fff;">${o.name}</div>
          <div style="font-size:12px; color:#94a3b8;">${o.phone || ''}</div>
        </td>
        <td>
          <div style="font-size:12px;">${o.city}, ${o.pincode}</div>
          <div style="font-size:11px; color:#94a3b8;">${o.address}</div>
        </td>
        <td>
          <span style="font-weight:800; color:var(--primary);">$${Number(o.total).toFixed(2)}</span>
          <div style="font-size:11px; color:#94a3b8;">${(o.items || []).length} items</div>
        </td>
        <td>
          <span style="background:rgba(255,255,255,0.06); padding:3px 8px; border-radius:4px; font-size:11px; font-weight:700;">
            ${(o.payment_method || 'cod').toUpperCase()}
          </span>
        </td>
        <td>
          <select class="status-select-pill" onchange="window.AdminEngine.updateOrderStatus(${o.id}, this.value)">
            ${["pending", "confirmed", "shipped", "delivered", "cancelled"].map(s => `
              <option value="${s}" ${o.status === s ? 'selected' : ''}>${s.toUpperCase()}</option>
            `).join("")}
          </select>
        </td>
        <td style="font-size:12px; color:#94a3b8;">
          ${new Date(o.created_at).toLocaleDateString()}
        </td>
      </tr>
    `).join("");
  }

  async function updateOrderStatus(orderId, status) {
    try {
      await api(`/admin/orders/${orderId}`, {
        method: "PATCH",
        body: { status }
      });
      toast(`Order #${orderId} status set to ${status.toUpperCase()}!`);
    } catch (err) {
      toast(err.message, true);
    }
  }

  function renderProducts(products) {
    const tbody = document.getElementById("products-tbody");
    if (!tbody) return;

    if (!products.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#94a3b8;">No products in catalog.</td></tr>`;
      return;
    }

    tbody.innerHTML = products.map(p => `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:12px;">
            <img src="${p.image}" style="width:40px; height:40px; border-radius:6px; object-fit:cover;">
            <div>
              <div style="font-weight:700; color:#fff;">${p.name}</div>
              <div style="font-size:11px; color:#94a3b8;">ID: #${p.id}</div>
            </div>
          </div>
        </td>
        <td><span style="background:rgba(255,255,255,0.06); padding:2px 8px; border-radius:4px; font-size:11px; text-transform:uppercase;">${p.category}</span></td>
        <td style="font-weight:800; color:var(--primary);">$${Number(p.price).toFixed(2)}</td>
        <td>${p.stock}</td>
        <td>★ ${Number(p.rating || 4.8).toFixed(1)}</td>
        <td>${p.badge ? `<span style="background:var(--primary); color:#fff; font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px;">${p.badge}</span>` : '—'}</td>
        <td>
          <button class="btn-admin-action danger" onclick="window.AdminEngine.deleteProduct(${p.id})">
            <ion-icon name="trash-outline"></ion-icon> Delete
          </button>
        </td>
      </tr>
    `).join("");
  }

  function renderSubscribers(subscribers) {
    const tbody = document.getElementById("subscribers-tbody");
    if (!tbody) return;

    if (!subscribers.length) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px; color:#94a3b8;">No subscribers yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = subscribers.map(s => `
      <tr>
        <td>#${s.id}</td>
        <td style="font-weight:600; color:#fff;">${s.email}</td>
        <td style="color:#94a3b8; font-size:12px;">${new Date(s.created_at).toLocaleString()}</td>
      </tr>
    `).join("");
  }

  function openAddProductModal() {
    const modal = document.getElementById("add-product-modal");
    if (modal) modal.classList.add("active");
  }

  async function handleAddProduct(e) {
    e.preventDefault();
    try {
      const body = {
        name: $("#p-name").value.trim(),
        category: $("#p-category").value,
        price: parseFloat($("#p-price").value),
        old_price: $("#p-oldprice").value ? parseFloat($("#p-oldprice").value) : null,
        stock: parseInt($("#p-stock").value) || 50,
        image: $("#p-image").value.trim() || "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80",
        badge: $("#p-badge").value.trim().toUpperCase(),
        rating: parseFloat($("#p-rating").value) || 4.8,
        description: $("#p-desc").value.trim()
      };

      await api("/admin/products", { method: "POST", body });
      document.getElementById("add-product-modal").classList.remove("active");
      document.getElementById("add-product-form").reset();
      toast("Product successfully published to catalog! 🎉");
      loadDashboard();
    } catch (err) {
      toast(err.message, true);
    }
  }

  async function deleteProduct(productId) {
    if (!confirm(`Are you sure you want to remove Product #${productId} from the catalog?`)) return;
    try {
      await api(`/admin/products/${productId}`, { method: "DELETE" });
      toast("Product removed from catalog");
      loadDashboard();
    } catch (err) {
      toast(err.message, true);
    }
  }

  async function boot() {
    $("#admin-login-form")?.addEventListener("submit", handleAdminLogin);
    $("#add-product-form")?.addEventListener("submit", handleAddProduct);

    const isAuthed = await checkAdminAuth();
    if (isAuthed) {
      loadDashboard();
    }
  }

  window.AdminEngine = {
    loadDashboard,
    updateOrderStatus,
    openAddProductModal,
    deleteProduct
  };

  document.addEventListener("DOMContentLoaded", boot);
})();
