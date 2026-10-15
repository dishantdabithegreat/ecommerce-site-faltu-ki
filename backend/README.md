# Anon eCommerce Backend

This backend was created to match the uploaded `index(1).html` frontend.

## What is included
- Python Flask REST API
- SQLite database (created automatically as `store.db`)
- Product listing + product search/filter
- User registration/login/logout with hashed passwords
- Session authentication
- Cart add/update/delete
- Wishlist toggle
- Checkout/order creation
- User order history
- Newsletter subscriptions
- Admin product CRUD APIs
- Admin order status API

The uploaded frontend contains a newsletter form, product catalog, product search UI, wishlist/cart buttons and product "add to cart" buttons, so these backend APIs are ready for those frontend actions. fileciteturn1file6L616-L626 fileciteturn1file5L565-L582

## Run

1. Install Python 3.10+.
2. Open terminal in this folder.
3. Create virtual environment:
   - Windows: `python -m venv venv`
   - Windows: `venv\\Scripts\\activate`
4. Install:
   `pip install -r requirements.txt`
5. Start:
   `python app.py`

API runs at:
`http://127.0.0.1:5000`

## Important
Change `SECRET_KEY` before deploying online.

## Main API endpoints

GET `/api/health`
GET `/api/products`
GET `/api/products?q=shirt`
GET `/api/products?category=jacket`
GET `/api/products/1`

POST `/api/auth/register`
POST `/api/auth/login`
POST `/api/auth/logout`
GET `/api/auth/me`

POST `/api/newsletter`

GET `/api/cart`
POST `/api/cart`
PATCH `/api/cart/<product_id>`
DELETE `/api/cart/<product_id>`

GET `/api/wishlist`
POST `/api/wishlist/<product_id>`

POST `/api/orders`
GET `/api/orders`

Admin:
GET `/api/admin/orders`
PATCH `/api/admin/orders/<order_id>`
POST `/api/admin/products`
PATCH `/api/admin/products/<product_id>`
DELETE `/api/admin/products/<product_id>`

## Example login JSON
```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

## Example add-to-cart JSON
```json
{
  "product_id": 1,
  "quantity": 2
}
```

## Next step
The backend is separate from the existing visual frontend. To make every button actually talk to this backend, connect your `assets/js/script.js` to these API endpoints using `fetch()`.
