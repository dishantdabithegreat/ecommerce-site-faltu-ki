/**
 * ANON E-COMMERCE - EXPANDABLE MEGA NAVBAR CONTROLLER (navbar.js)
 * Enables mega menu slide-down expansion and interactive product subcategory browsing
 */
document.addEventListener("DOMContentLoaded", () => {
  const desktopCategories = document.querySelectorAll(".desktop-menu-category-list > .menu-category");

  desktopCategories.forEach(category => {
    const title = category.querySelector(".menu-title");
    if (!title) return;

    // Check if category has an expanded panel; if not, construct dynamic mega-menu panel
    let dropdown = category.querySelector(".dropdown-panel, .mega-menu");
    if (!dropdown && !title.textContent.toLowerCase().includes("home")) {
      dropdown = document.createElement("div");
      dropdown.className = "dropdown-panel mega-menu-expandable";
      const catName = title.textContent.trim().toLowerCase();
      
      dropdown.innerHTML = `
        <div class="dropdown-content-grid" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:20px; padding:20px;">
          <div class="dropdown-col">
            <h4 style="font-size:13px; font-weight:700; color:var(--eerie-black); margin-bottom:10px; border-bottom:2px solid var(--salmon-pink); padding-bottom:4px;">Popular ${catName}</h4>
            <ul style="display:flex; flex-direction:column; gap:8px; font-size:13px; color:var(--sonic-silver);">
              <li><a href="#" class="nav-sub-link">Trending Top Picks</a></li>
              <li><a href="#" class="nav-sub-link">New Arrivals 2026</a></li>
              <li><a href="#" class="nav-sub-link">Best Sellers</a></li>
              <li><a href="#" class="nav-sub-link">Discounted Clearance</a></li>
            </ul>
          </div>
          <div class="dropdown-col">
            <h4 style="font-size:13px; font-weight:700; color:var(--eerie-black); margin-bottom:10px; border-bottom:2px solid var(--salmon-pink); padding-bottom:4px;">Subcategories</h4>
            <ul style="display:flex; flex-direction:column; gap:8px; font-size:13px; color:var(--sonic-silver);">
              <li><a href="#" class="nav-sub-link">Casual Collection</a></li>
              <li><a href="#" class="nav-sub-link">Formal Essentials</a></li>
              <li><a href="#" class="nav-sub-link">Seasonal Favorites</a></li>
              <li><a href="#" class="nav-sub-link">Luxury Edition</a></li>
            </ul>
          </div>
          <div class="dropdown-col" style="grid-column: span 2;">
            <div style="background:var(--cultured); border-radius:8px; padding:15px; display:flex; align-items:center; gap:15px;">
              <img src="./assets/images/products/jacket-3.jpg" style="width:80px; height:80px; object-fit:cover; border-radius:6px;" onerror="this.src='./assets/images/products/shirt-1.jpg'">
              <div>
                <span style="font-size:11px; font-weight:700; color:var(--salmon-pink); text-transform:uppercase;">FEATURED PROMO</span>
                <h5 style="font-size:14px; font-weight:700; color:var(--eerie-black);">Explore 2026 Catalog</h5>
                <p style="font-size:12px; color:var(--sonic-silver);">Up to 40% OFF on all items today!</p>
              </div>
            </div>
          </div>
        </div>
      `;
      category.appendChild(dropdown);
    }

    if (dropdown) {
      category.addEventListener("mouseenter", () => {
        dropdown.classList.add("active");
      });
      category.addEventListener("mouseleave", () => {
        dropdown.classList.remove("active");
      });
    }
  });
});
