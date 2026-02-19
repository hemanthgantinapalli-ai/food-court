# FoodCourt - Full-Stack Food Delivery & Grocery Platform

A premium, scalable, production-ready food delivery and grocery web application with multi-role dashboards, secure authentication, database integration, and modern UI/UX.

## 🌟 Features

### 🔐 Authentication & Security
- **Sign Up / Sign In** with email/password
- Mobile number authentication with OTP (ready to integrate)
- JWT token-based authentication
- Encrypted password storage with bcryptjs
- Session management
- Multi-role support: Customer, Restaurant, Rider, Admin

### 📍 Location & Services
- Delivery location selection and saving
- Service types: Food Delivery, Grocery Shopping, Dine-In
- Geolocation-based restaurant discovery
- Address book management

### 🏠 Homepage & Discovery
- Sticky navigation with logo, location selector, search, cart, and profile
- Hero section with promotional banners
- Category-based filtering (Pizza, Burger, Chinese, Indian, etc.)
- Restaurant listings with ratings, delivery time, price range
- Premium animations and hover effects

### 🍽 Restaurant Features
- Restaurant discovery with filters
- Detailed restaurant pages with menu categorization
- Menu items with add-ons and customization
- Ingredient/allergy information
- Popular items highlighting
- Restaurant ratings and reviews

### 🛒 Shopping Cart
- **Persistent cart** stored in MongoDB
- Add/remove items with quantity control
- Price calculations (subtotal, tax, delivery fee)
- Coupon/promo code system
- Auto-saves to database

### 💳 Payments & Orders
- Multiple payment methods:
  - UPI
  - Credit/Debit Cards
  - Digital Wallets
  - Cash on Delivery
- Stripe integration ready
- Order tracking with status updates:
  - Placed → Confirmed → Preparing → Ready → Picked Up → Delivered
- Order history with re-order functionality
- Invoice generation
- Refund request system

### 👤 User Dashboard
- Profile management with photo upload
- Saved addresses management
- Order history with details
- Re-order with one click
- Wallet balance and transaction history
- Help & support section
- Preferences management

### 🏪 Restaurant Partner Dashboard
- Secure login for restaurant owners
- Live order management
- Order status updates in real-time
- Menu management (Add/Edit/Delete items)
- Price and availability updates
- Revenue and payout reports
- Restaurant analytics

### 🚴 Delivery Rider Dashboard
- Rider authentication and profile
- Live order assignments
- Accept/reject orders
- Pickup and drop navigation
- Earnings tracking
- Online/offline availability toggle
- Delivery analytics

### 🛠 Admin Dashboard
- Super admin controls
- User management (Customer, Restaurant, Rider)
- Restaurant approval system
- Live order monitoring
- Payment and payout management
- Offer and coupon control
- Comprehensive analytics:
  - Total users, orders, revenue
  - Order distribution
  - Peak usage times
  - Restaurant performance metrics

### 🗄 Database Schema
Fully structured MongoDB database with collections for:
- Users (all roles with encrypted passwords)
- Restaurants (with menus and operations)
- MenuItems (with pricing and customization)
- Cart (persistent, per-user)
- Orders (all transaction details)
- Payments & Transactions
- Riders (delivery personnel)
- Reviews & Ratings
- Coupons & Offers

### 🎨 UI/UX Design
- **Modern & Elegant**: Clean, contemporary design
- **Mobile-First**: Fully responsive on all devices
- **Premium Colors**: Orange (#FF6B35) & Red primary, white background
- **Smooth Animations**: Fade-in, slide-up, pulse effects
- **Interactive Elements**: Hover effects, loading states, toast notifications
- **Professional Typography**: Semantic font sizes and spacing
- **Accessibility**: ARIA labels, keyboard navigation

## 🏗 Project Structure

```
food-court/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js (MongoDB connection)
│   │   │   └── stripe.js (Payment integration)
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Restaurant.js
│   │   │   ├── MenuItem.js
│   │   │   ├── Cart.js
│   │   │   ├── Order.js
│   │   │   ├── Transaction.js
│   │   │   ├── Rider.js
│   │   │   ├── Review.js
│   │   │   └── Coupon.js
│   │   ├── controllers/
│   │   │   ├── authController.js (Auth & User management)
│   │   │   ├── restaurantController.js (Restaurant operations)
│   │   │   ├── cartController.js (Shopping cart)
│   │   │   └── orderController.js (Orders)
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── restaurantRoutes.js
│   │   │   ├── cartRoutes.js
│   │   │   ├── orderRoutes.js
│   │   │   └── adminRoutes.js
│   │   ├── middleware/
│   │   │   ├── auth.js (Token verification & role-based access)
│   │   │   └── errorHandler.js (Global error handling)
│   │   ├── utils/
│   │   │   └── jwt.js (Token generation)
│   │   └── server.js (Express app initialization)
│   ├── package.json
│   ├── .env.example
│   └── vite.config.js
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Header.jsx (Navigation with user menu)
    │   │   ├── Footer.jsx (Footer with links)
    │   │   ├── Hero.jsx (Hero section)
    │   │   ├── RestaurantCard.jsx (Restaurant display)
    │   │   ├── MenuItemCard.jsx (Menu item display)
    │   │   ├── Loader.jsx (Loading indicator)
    │   │   └── Toast.jsx (Notifications)
    │   ├── pages/
    │   │   ├── Home.jsx (Homepage)
    │   │   ├── SignUp.jsx (Registration)
    │   │   ├── SignIn.jsx (Login)
    │   │   ├── RestaurantDetail.jsx (Restaurant menu)
    │   │   └── CartPage.jsx (Shopping cart)
    │   ├── context/
    │   │   ├── authStore.js (Authentication state with Zustand)
    │   │   └── cartStore.js (Cart state with Zustand)
    │   ├── hooks/ (Custom React hooks)
    │   ├── styles/
    │   │   └── globals.css (Global styles & animations)
    │   ├── api/
    │   │   └── axios.js (API client with interceptors)
    │   ├── App.jsx (Main App component with routing)
    │   └── main.jsx (React entry point)
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── postcss.config.js
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. **Navigate to backend**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URI, JWT secret, and Stripe keys
   ```

4. **Start the server**
   ```bash
   npm run dev  # Development with nodemon
   npm start    # Production
   ```

   Server runs on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

   App runs on `http://localhost:3000`

4. **Build for production**
   ```bash
   npm run build
   npm run preview
   ```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/address` - Add address
- `PUT /api/auth/address/:addressId` - Update address
- `DELETE /api/auth/address/:addressId` - Delete address

### Restaurants
- `GET /api/restaurants` - List all restaurants
- `GET /api/restaurants/:restaurantId` - Restaurant details
- `POST /api/restaurants` - Create restaurant (Restaurant)
- `PUT /api/restaurants/:restaurantId` - Update restaurant
- `POST /api/restaurants/:restaurantId/menu` - Add menu item
- `PUT /api/restaurants/menu/:menuItemId` - Update menu item
- `DELETE /api/restaurants/menu/:menuItemId` - Delete menu item
- `GET /api/restaurants/:restaurantId/orders` - Restaurant orders

### Cart
- `GET /api/cart` - Get cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update` - Update cart item
- `DELETE /api/cart/:menuItemId` - Remove from cart
- `DELETE /api/cart` - Clear cart
- `POST /api/cart/coupon` - Apply coupon

### Orders
- `POST /api/orders/create` - Create order
- `GET /api/orders/history` - Order history
- `GET /api/orders/:orderId` - Order details
- `PUT /api/orders/:orderId/status` - Update status
- `POST /api/orders/:orderId/assign-rider` - Assign rider
- `POST /api/orders/:orderId/rate` - Rate order
- `POST /api/orders/:orderId/refund` - Request refund

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - Manage users
- `PUT /api/admin/users/:userId/status` - User status
- `GET /api/admin/restaurants` - Manage restaurants
- `PUT /api/admin/restaurants/:restaurantId/approve` - Approve restaurant
- `GET /api/admin/orders` - Monitor orders
- `GET /api/admin/analytics/orders` - Order analytics

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + bcryptjs
- **Payments**: Stripe API
- **Validation**: Custom middleware
- **CORS**: Enabled for frontend

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: Zustand
- **HTTP Client**: Axios with interceptors
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Post-processing**: PostCSS + Autoprefixer

## 🔑 Key Technologies
- **ES6+ Module Syntax**: Both frontend and backend
- **Async/Await**: Promise-based API calls
- **RESTful API**: Standard HTTP methods
- **Token-Based Auth**: Stateless authentication
- **Responsive Design**: Mobile-first approach
- **Real-time Ready**: Can be extended with WebSocket

## 📝 Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/foodcourt
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRE=7d
BCRYPT_ROUNDS=10
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...

### Running smoke tests

From the `backend` folder you can run a lightweight smoke check that calls the `GET /api/restaurants` endpoint:

```powershell
cd backend
npm run smoke
```

This is useful for quick local verification that the API responds.
```

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:3000/api
```

## 🎯 Usage Examples

### Signup
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "password": "password123",
    "role": "customer"
  }'
```

### Add to Cart
```bash
curl -X POST http://localhost:5000/api/cart/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "restaurantId": "63f7d8e9...",
    "menuItemId": "63f7d8f1...",
    "quantity": 2,
    "addOns": [{ "name": "Extra Cheese", "price": 50 }]
  }'
```

### Create Order
```bash
curl -X POST http://localhost:5000/api/orders/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "deliveryAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "label": "Home"
    },
    "paymentMethod": "card"
  }'
```

## 🚀 Deployment

### Backend (Node.js)
- Heroku: `git push heroku main`
- AWS EC2: Deploy with PM2
- Railway: Connect GitHub repo
- Render: Deploy from GitHub

### Frontend (React)
- Vercel: Connect GitHub repo (Recommended)
- Netlify: Connect GitHub repo
- AWS S3 + CloudFront
- GitHub Pages

## 📈 Scaling Considerations
- Database indexing on frequently queried fields
- Redis caching for popular restaurants/items
- CDN for image delivery
- Load balancing for API servers
- Microservices architecture for different domains
- Message queues (RabbitMQ) for async operations
- Blockchain integration for payment transparency

## 🔒 Security Features
- JWT token expiration
- Password hashing with bcryptjs
- CORS protection
- Rate limiting ready
- Input validation
- SQL Injection prevention (MongoDB)
- Role-based access control (RBAC)
- Secure payment gateway integration

## 📄 License
MIT License - Feel free to use this project for personal and commercial purposes.

## 👥 Support
For issues or questions, please create an issue or contact support@foodcourt.com

---

**Built with ❤️ for food lovers**
