# FoodCourt - API Reference Guide

Complete reference for all API endpoints with examples.

## Base URL
```
http://localhost:5000/api
```

## Authentication

All protected endpoints require JWT token in headers:
```
Authorization: Bearer <your_jwt_token>
```

Token is obtained from signup/signin response and should be stored in localStorage.

---

## 📝 Authentication Endpoints

### 1. Sign Up (Register New User)
```
POST /auth/signup

Body:
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "password": "securePassword123",
  "confirmPassword": "securePassword123",
  "role": "customer"  // or "restaurant" or "rider" or "admin"
}

Response:
{
  "user": {
    "_id": "...",
    "email": "john@example.com",
    "phone": "1234567890",
    "firstName": "John",
    "lastName": "Doe",
    "role": "customer"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 2. Sign In (Login)
```
POST /auth/signin

Body:
{
  "email": "john@example.com",  // or use phone instead
  "password": "securePassword123"
}

Response:
{
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 3. Get User Profile
```
GET /auth/profile
Headers: Authorization: Bearer <token>

Response:
{
  "_id": "...",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "role": "customer",
  "addresses": [
    {
      "_id": "...",
      "label": "Home",
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip": "10001",
      "country": "USA",
      "phone": "1234567890",
      "isDefault": true
    }
  ],
  "wallet": {
    "balance": 500
  }
}
```

### 4. Update User Profile
```
PUT /auth/profile
Headers: Authorization: Bearer <token>

Body:
{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "9876543210"
}

Response:
{ ... updated user object ... }
```

### 5. Add Address
```
POST /auth/address
Headers: Authorization: Bearer <token>

Body:
{
  "label": "Home",
  "street": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zip": "10001",
  "country": "USA",
  "phone": "1234567890",
  "isDefault": true
}

Response:
{ ... updated user with new address ... }
```

### 6. Update Address
```
PUT /auth/address/:addressId
Headers: Authorization: Bearer <token>

Body:
{
  "label": "Office",
  "street": "456 Oak Ave",
  ...
}

Response:
{ ... updated user ... }
```

### 7. Delete Address
```
DELETE /auth/address/:addressId
Headers: Authorization: Bearer <token>

Response:
{ success: true, message: "Address deleted" }
```

---

## 🍽️ Restaurant Endpoints

### 1. Get All Restaurants
```
GET /restaurants

Query Parameters (optional):
- city: "New York"        // Filter by city
- cuisine: "Italian"      // Filter by cuisine
- rating: 4               // Filter by rating (≥)
- maxPrice: "$$"          // Filter by price range
- limit: 10               // Number of results
- skip: 0                 // Pagination offset

Response:
[
  {
    "_id": "...",
    "name": "Pizza Palace",
    "cuisines": ["Italian", "Vegetarian"],
    "location": {
      "city": "New York",
      "address": "123 Main St"
    },
    "logo": "https://...",
    "rating": 4.5,
    "reviews": 120,
    "deliveryTime": "30 mins",
    "priceRange": "$$",
    "deliveryFee": 50,
    "minOrder": 200,
    "operatingHours": {
      "open": "10:00",
      "close": "23:00"
    },
    "isOpen": true,
    "isApproved": true
  }
  ...
]
```

### 2. Get Restaurant Details
```
GET /restaurants/:restaurantId

Response:
{
  "_id": "...",
  "name": "Pizza Palace",
  "description": "Best pizzas in town",
  "location": { ... },
  "cuisines": ["Italian"],
  "rating": 4.5,
  "reviews": 120,
  "deliveryTime": "30 mins",
  "priceRange": "$$",
  "deliveryFee": 50,
  "minOrder": 200,
  "operatingHours": { ... },
  "isOpen": true,
  "menu": [
    {
      "_id": "...",
      "name": "Margherita Pizza",
      "category": "Pizza",
      "price": 350,
      "description": "Classic pizza with tomato and mozzarella",
      "image": "https://...",
      "tags": ["Vegetarian", "Vegan"],
      "preparationTime": 20,
      "isActive": true,
      "addOns": [
        {
          "_id": "...",
          "name": "Extra Cheese",
          "price": 50
        }
      ]
    }
    ...
  ]
}
```

### 3. Create Restaurant (Admin/Restaurant)
```
POST /restaurants
Headers: Authorization: Bearer <token>

Body:
{
  "name": "Pizza Palace",
  "description": "Best pizzas",
  "location": {
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001"
  },
  "cuisines": ["Italian", "Vegetarian"],
  "logo": "https://...",
  "deliveryTime": "30",
  "priceRange": "$$",
  "deliveryFee": 50,
  "minOrder": 200
}

Response:
{ ... created restaurant ... }
```

### 4. Update Restaurant
```
PUT /restaurants/:restaurantId
Headers: Authorization: Bearer <token>

Body: { ... fields to update ... }

Response:
{ ... updated restaurant ... }
```

### 5. Add Menu Item
```
POST /restaurants/:restaurantId/menu
Headers: Authorization: Bearer <token>

Body:
{
  "name": "Margherita Pizza",
  "category": "Pizza",
  "price": 350,
  "description": "Classic pizza",
  "image": "https://...",
  "tags": ["Vegetarian"],
  "preparationTime": 20,
  "addOns": [
    {
      "name": "Extra Cheese",
      "price": 50
    }
  ]
}

Response:
{
  "_id": "...",
  "name": "Margherita Pizza",
  ...
}
```

### 6. Update Menu Item
```
PUT /restaurants/menu/:menuItemId
Headers: Authorization: Bearer <token>

Body: { ... fields to update ... }

Response:
{ ... updated menu item ... }
```

### 7. Delete Menu Item
```
DELETE /restaurants/menu/:menuItemId
Headers: Authorization: Bearer <token>

Response:
{ success: true, message: "Menu item deleted" }
```

### 8. Get Restaurant Orders
```
GET /restaurants/:restaurantId/orders
Headers: Authorization: Bearer <token>

Response:
[
  {
    "_id": "...",
    "orderId": "FC1234567890001",
    "customer": { "name": "John Doe" },
    "items": [ ... ],
    "total": 1000,
    "status": "preparing",
    "createdAt": "2024-01-20T10:00:00Z"
  }
  ...
]
```

---

## 🛒 Shopping Cart Endpoints

### 1. Get Cart
```
GET /cart
Headers: Authorization: Bearer <token>

Response:
{
  "_id": "...",
  "user": "...",
  "restaurant": "...",
  "items": [
    {
      "_id": "...",
      "menuItem": {
        "_id": "...",
        "name": "Margherita Pizza",
        "price": 350,
        "image": "https://..."
      },
      "quantity": 2,
      "selectedAddOns": [
        {
          "name": "Extra Cheese",
          "price": 50
        }
      ],
      "subtotal": 800  // (350 * 2) + (50 * 2)
    }
  ],
  "subtotal": 800,
  "tax": 40,        // 5% of subtotal
  "deliveryFee": 50,
  "discount": 0,
  "total": 890
}
```

### 2. Add Item to Cart
```
POST /cart/add
Headers: Authorization: Bearer <token>

Body:
{
  "restaurantId": "...",
  "menuItemId": "...",
  "quantity": 2,
  "selectedAddOns": [
    {
      "name": "Extra Cheese",
      "price": 50
    }
  ]
}

Response:
{ ... updated cart ... }
```

### 3. Update Cart Item
```
PUT /cart/update
Headers: Authorization: Bearer <token>

Body:
{
  "cartItemId": "...",
  "quantity": 3,
  "selectedAddOns": [ ... ]
}

Response:
{ ... updated cart ... }
```

### 4. Remove Item from Cart
```
DELETE /cart/:cartItemId
Headers: Authorization: Bearer <token>

Response:
{ ... updated cart ... }
```

### 5. Clear Cart
```
DELETE /cart
Headers: Authorization: Bearer <token>

Response:
{ success: true, message: "Cart cleared" }
```

### 6. Apply Coupon
```
POST /cart/coupon
Headers: Authorization: Bearer <token>

Body:
{
  "couponCode": "WELCOME20"
}

Response:
{
  "coupon": { ... coupon details ... },
  "discount": 200,
  "total": 690,
  ...cart with discount applied...
}
```

---

## 📦 Order Endpoints

### 1. Create Order
```
POST /orders/create
Headers: Authorization: Bearer <token>

Body:
{
  "deliveryAddress": "...",  // addressId from user
  "paymentMethod": "stripe", // "stripe", "upi", "wallet", "cash"
  "specialInstructions": "No onions please"
}

Response:
{
  "_id": "...",
  "orderId": "FC1234567890001",
  "customer": "...",
  "restaurant": "...",
  "items": [ ... ],
  "deliveryAddress": { ... },
  "status": "placed",
  "total": 890,
  "createdAt": "2024-01-20T10:00:00Z"
}
```

### 2. Get Order History
```
GET /orders/history
Headers: Authorization: Bearer <token>

Query Parameters (optional):
- status: "delivered"      // Filter by status
- limit: 10
- skip: 0

Response:
[
  {
    "_id": "...",
    "orderId": "FC1234567890001",
    "restaurant": { "name": "Pizza Palace" },
    "items": [ ... ],
    "total": 890,
    "status": "delivered",
    "createdAt": "2024-01-20T10:00:00Z",
    "deliveredAt": "2024-01-20T10:45:00Z"
  }
  ...
]
```

### 3. Get Order Details
```
GET /orders/:orderId
Headers: Authorization: Bearer <token>

Response:
{
  "_id": "...",
  "orderId": "FC1234567890001",
  "customer": {
    "name": "John Doe",
    "phone": "1234567890"
  },
  "restaurant": {
    "name": "Pizza Palace",
    "phone": "9876543210"
  },
  "items": [ ... ],
  "deliveryAddress": { ... },
  "status": "delivered",
  "statusHistory": [
    {
      "status": "placed",
      "timestamp": "2024-01-20T10:00:00Z"
    },
    {
      "status": "confirmed",
      "timestamp": "2024-01-20T10:05:00Z"
    },
    ...
  ],
  "rider": {
    "name": "John Smith",
    "phone": "5555555555",
    "vehicle": "Bike"
  },
  "paymentMethod": "stripe",
  "paymentStatus": "paid",
  "total": 890,
  "specialInstructions": "No onions",
  "createdAt": "2024-01-20T10:00:00Z",
  "estimatedDeliveryTime": "10:45",
  "deliveredAt": "2024-01-20T10:45:00Z"
}
```

### 4. Update Order Status (Restaurant/Rider/Admin)
```
PUT /orders/:orderId/status
Headers: Authorization: Bearer <token>

Body:
{
  "status": "preparing"  // "confirmed", "preparing", "ready", "picked_up", "delivered"
}

Response:
{ ... updated order ... }
```

### 5. Assign Rider to Order (Admin)
```
POST /orders/:orderId/assign-rider
Headers: Authorization: Bearer <token>

Body:
{
  "riderId": "..."
}

Response:
{ ... updated order with rider ... }
```

### 6. Rate Order
```
POST /orders/:orderId/rate
Headers: Authorization: Bearer <token>

Body:
{
  "rating": 5,  // 1-5
  "review": "Excellent food and fast delivery!"
}

Response:
{
  "_id": "...",
  "review": {
    "rating": 5,
    "comment": "Excellent food and fast delivery!",
    "createdAt": "2024-01-20T10:50:00Z"
  },
  ...order...
}
```

### 7. Request Refund
```
POST /orders/:orderId/refund
Headers: Authorization: Bearer <token>

Body:
{
  "reason": "Food quality was poor"
}

Response:
{
  "success": true,
  "message": "Refund request submitted",
  "order": { ... },
  "refundStatus": "pending"
}
```

---

## 👨‍💼 Admin Endpoints

### 1. Get Dashboard Stats
```
GET /admin/stats
Headers: Authorization: Bearer <token> (Admin role required)

Response:
{
  "totalUsers": 150,
  "totalOrders": 500,
  "totalRevenue": 150000,
  "totalRestaurants": 30,
  "totalRiders": 20,
  "averageOrderValue": 300
}
```

### 2. Get Users
```
GET /admin/users
Headers: Authorization: Bearer <token>

Query Parameters:
- role: "customer"      // Filter by role
- limit: 20
- skip: 0

Response:
[
  {
    "_id": "...",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "role": "customer",
    "isActive": true,
    "createdAt": "2024-01-20T10:00:00Z"
  }
  ...
]
```

### 3. Update User Status
```
PUT /admin/users/:userId/status
Headers: Authorization: Bearer <token>

Body:
{
  "isActive": false  // Ban/unban user
}

Response:
{ ... updated user ... }
```

### 4. Get Restaurants
```
GET /admin/restaurants
Headers: Authorization: Bearer <token>

Query Parameters:
- status: "pending"     // "pending", "approved", "rejected"
- limit: 20

Response:
[
  {
    "_id": "...",
    "name": "Pizza Palace",
    "owner": { "name": "Restaurant Owner" },
    "isApproved": false,
    "approvalStatus": "pending",
    "createdAt": "2024-01-20T10:00:00Z"
  }
  ...
]
```

### 5. Approve Hotel
```
PUT /admin/restaurants/:restaurantId/approve
Headers: Authorization: Bearer <token>

Body:
{
  "isApproved": true,
  "approvalNotes": "All documents verified"
}

Response:
{ ... updated restaurant ... }
```

### 6. Get Orders
```
GET /admin/orders
Headers: Authorization: Bearer <token>

Query Parameters:
- status: "delivered"
- sortBy: "createdAt"
- order: "desc"

Response:
[
  {
    "_id": "...",
    "orderId": "FC1234567890001",
    "customer": { "name": "John Doe" },
    "restaurant": { "name": "Pizza Palace" },
    "status": "delivered",
    "total": 890,
    "createdAt": "2024-01-20T10:00:00Z"
  }
  ...
]
```

### 7. Get Order Analytics
```
GET /admin/analytics/orders
Headers: Authorization: Bearer <token>

Query Parameters:
- period: "daily"       // "daily", "weekly", "monthly"
- startDate: "2024-01-01"
- endDate: "2024-01-31"

Response:
{
  "totalOrders": 500,
  "totalRevenue": 150000,
  "averageOrderValue": 300,
  "topRestaurants": [ ... ],
  "ordersByStatus": { ... },
  "dailyOrders": [ ... ],
  "conversionRate": 0.35
}
```

---

## 🔑 Status Values

### Order Status
- `placed` - Order created
- `confirmed` - Restaurant confirmed
- `preparing` - Being prepared
- `ready` - Ready for pickup
- `picked_up` - Rider picked up
- `delivered` - Successfully delivered
- `cancelled` - Order cancelled

### Payment Status
- `pending` - Awaiting payment
- `paid` - Payment successful
- `failed` - Payment failed
- `refunded` - Refund issued

### Restaurant Approval Status
- `pending` - Awaiting approval
- `approved` - Restaurant approved
- `rejected` - Application rejected

---

## 📊 Common Status Codes

```
200 - OK (Success)
201 - Created (Resource created)
400 - Bad Request (Invalid input)
401 - Unauthorized (No/invalid token)
403 - Forbidden (No permission)
404 - Not Found (Resource not found)
500 - Server Error (Internal error)
```

---

## 💾 Database Relationships

Users
├── Addresses (1:Many)
├── Cart (1:1)
│   └── CartItems (1:Many)
│       └── MenuItem (Many:1)
│           └── Restaurant (Many:1)
├── Orders (1:Many)
│   ├── OrderItems (1:Many)
│   │   └── MenuItem (Many:1)
│   ├── Review (1:1)
│   └── Transaction (1:1)
└── Reviews (1:Many)

Restaurants
├── MenuItems (1:Many)
├── Orders (1:Many)
└── Reviews (1:Many)

---

## 🧪 Testing Commands

### Sign Up
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "password": "test123456",
    "confirmPassword": "test123456",
    "role": "customer"
  }'
```

### Get Restaurants
```bash
curl -X GET http://localhost:5000/api/restaurants
```

### Get Restaurant Details
```bash
curl -X GET http://localhost:5000/api/restaurants/<restaurantId>
```

---

**FoodCourt API is fully documented and ready for integration!**
