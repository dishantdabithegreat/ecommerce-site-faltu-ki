// API connector for the existing Anon frontend.
// Include this after your existing script.js:
// <script src="./assets/js/api.js"></script>

const API_BASE = "http://127.0.0.1:5000/api";

async function apiFetch(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    credentials: "include",
    headers: {"Content-Type": "application/json", ...(options.headers || {})},
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// Examples:
// apiFetch("/products?q=shirt").then(console.log);
// apiFetch("/cart", {method:"POST", body:JSON.stringify({product_id:1, quantity:1})});
// apiFetch("/wishlist/1", {method:"POST"});
// apiFetch("/orders", {method:"POST", body:JSON.stringify({
//   name:"Customer", phone:"9999999999", address:"Address",
//   city:"Jaipur", pincode:"302001", payment_method:"cod"
// })});
