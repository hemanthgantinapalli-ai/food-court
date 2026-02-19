# FoodCourt - Quick Start Guide

Get FoodCourt running in 5 minutes!

## Prerequisites

Make sure you have installed:
- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **MongoDB** - Either:
  - Local: [Install MongoDB Community](https://www.mongodb.com/try/download/community)
  - Cloud: [Create MongoDB Atlas account](https://www.mongodb.com/cloud/atlas) (recommended for beginners)

Verify installation:
```bash
node --version    # Should show v16+
npm --version     # Should show 8+
mongod --version  # Should show version (if local)
```

## 🚀 5-Minute Setup

### Step 1: Start MongoDB (30 seconds)

**Option A - Local MongoDB:**
```bash
# Windows
mongod

# macOS/Linux
brew services start mongodb-community
```

**Option B - MongoDB Atlas (Cloud):**
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free account
3. Create a cluster
4. Get connection string
5. Keep it ready for .env file

### Step 2: Setup Backend (2 minutes)

```bash
cd backend
npm install
```

Create `.env` file in `backend/` folder:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/foodcourt
# For Atlas, use: mongodb+srv://username:password@cluster.mongodb.net/foodcourt?retryWrites=true&w=majority

JWT_SECRET=your_super_secret_jwt_key_12345
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
NODE_ENV=development
```

Start backend:
```bash
npm run dev
# Should see: "Server running on http://localhost:5000"
```

### Step 3: Setup Frontend (2 minutes)

Open new terminal:
```bash
cd frontend
npm install
npm run dev
# Should see: "Local: http://localhost:3000"
```

### Step 4: Open in Browser

Visit: **http://localhost:3000**

## ✅ Test the App (1 minute)

1. **Sign Up**
   - Click "Sign Up"
   - Fill in: Name, Email, Phone, Password
   - Select Role: "Customer"
   - Click "Create Account"

2. **Browse Restaurants**
   - Should see Home page with restaurants
   - Click any restaurant

3. **Add to Cart**
   - Click on a menu item
   - Add quantity
   - Click "Add to Cart"

4. **Checkout**
   - Click cart icon (top right)
   - Click "Proceed to Checkout"
   - Select an address
   - Choose payment method
   - Click "Place Order"

5. **Track Order**
   - Should redirect to order tracking page
   - See order status and timeline

## 🎯 What's Included

```
✅ User Authentication (Sign up, Sign in, Logout)
✅ Restaurant Discovery (Browse, Filter, View Details)
✅ Menu & Items (Categories, Prices, Customization)
✅ Shopping Cart (Add, Update, Remove, Persist)
✅ Checkout Flow (Address Selection, Payment Method)
✅ Order Management (Create, Track, History, Cancel)
✅ User Profile (Edit, Save Addresses, Wallet)
✅ Admin Dashboard (Stats, User Management)
✅ Restaurant Dashboard (Orders, Menu Management)
✅ Delivery Dashboard (Order Assignments, Tracking)
✅ Premium UI/UX (Modern Design, Animations)
```

## 🐛 If Something Goes Wrong

### Backend won't start?
```bash
# Check if port 5000 is in use
# Kill process on port 5000 or change PORT in .env

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### MongoDB connection error?
```bash
# If using local MongoDB
mongod  # Make sure this is running

# If using Atlas
# Check connection string in .env
# Make sure IP is whitelisted
# Test connection: mongo "your_connection_string"
```

### Frontend won't load?
```bash
# Check if port 3000 is in use
# Try different port: 
npm run dev -- --port 3001

# Or clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## 📚 File Structure Reference

```
food-court/
├── backend/               # Express.js API
│   ├── src/
│   │   ├── models/       # Database schemas
│   │   ├── controllers/  # Business logic
│   │   ├── routes/       # API endpoints
│   │   ├── middleware/   # Auth & error handling
│   │   ├── config/       # Database & Stripe
│   │   └── utils/        # Helper functions
│   ├── .env              # Configuration (create this)
│   └── package.json      # Dependencies
│
├── frontend/             # React.js UI
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Full pages
│   │   ├── context/      # State management
│   │   ├── api/          # API client
│   │   └── styles/       # Global styles
│   ├── vite.config.js    # Build config
│   └── package.json      # Dependencies
│
├── README.md             # Full documentation
├── INSTALLATION.md       # Detailed setup
├── CONTRIBUTING.md       # Contribution guide
└── PROJECT_SUMMARY.md    # This file
```

## 🔑 Default Test Credentials

After signup, use these for testing:

**User Roles Available:**
- `customer` - Browse, order food
- `restaurant` - Manage restaurant & menu
- `rider` - Manage deliveries
- `admin` - Manage platform

## 📱 Responsive Design

Works perfectly on:
- 📱 Mobile (iPhone, Android)
- 💻 Tablet (iPad, tablets)
- 🖥️ Desktop (1920px+)

## 🎨 Theme Colors

- 🟠 Primary: Orange (#FF6B35)
- 🟥 Secondary: Red (#F7931E)
- ⬛ Dark: #1a1a1a
- ⬜ Light: #f5f5f5

## 🚀 Next Steps After Setup

1. **Explore the App**
   - Sign up as customer
   - Browse restaurants
   - Add items to cart
   - Place an order

2. **Check Admin Panel**
   - Sign up as `admin` role
   - Visit `/admin` dashboard
   - View platform stats

3. **Try Restaurant Dashboard**
   - Sign up as `restaurant` role
   - Visit `/restaurant` dashboard
   - Manage menu items

4. **Explore Code**
   - Check `backend/src/models/` for database schema
   - Check `frontend/src/pages/` for page components
   - Check `frontend/src/context/` for state management

## 📖 Full Documentation

For detailed information, see:
- [README.md](./README.md) - Project overview & features
- [INSTALLATION.md](./INSTALLATION.md) - Detailed setup guide
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guidelines
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - Complete file listing

## 💡 Common Tasks

### Add a new page
1. Create file in `frontend/src/pages/MyPage.jsx`
2. Import in `frontend/src/App.jsx`
3. Add route in App.jsx

### Add an API endpoint
1. Create controller method
2. Add route in `backend/src/routes/`
3. Call from component using axios

### Change colors
1. Edit `frontend/src/styles/globals.css`
2. Edit `frontend/tailwind.config.js`
3. Refresh browser

## 🆘 Getting Help

1. **Check INSTALLATION.md** for common issues
2. **Review console errors** (Browser Dev Tools: F12)
3. **Check backend logs** in terminal
4. **Verify .env files** are properly configured

---

**Ready to build amazing features on top of FoodCourt!** 🚀

Questions? Check the full documentation or review the code comments.
