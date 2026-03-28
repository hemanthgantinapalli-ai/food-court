# FoodCourt - Installation & Setup Guide

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (v16.0 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **MongoDB** (v4.4 or higher) - [Install locally](https://docs.mongodb.com/manual/installation/) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- **Git** - [Download](https://git-scm.com/)
- **A code editor** (VS Code recommended) - [Download](https://code.visualstudio.com/)

## 🚀 Quick Start (5 minutes)

### 1. Clone the Repository
```bash
cd food-court
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```
The backend will start on `http://localhost:5000`

### 3. Frontend Setup (New Terminal)
```bash
cd frontend
npm install
npm run dev
```
The frontend will start on `http://localhost:3000`

## 📦 Detailed Backend Setup

### Step 1: Navigate to Backend Directory
```bash
cd backend
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install all required Node.js packages including:
- express.js (Web framework)
- mongoose (MongoDB ODM)
- jsonwebtoken (Authentication)
- bcryptjs (Password hashing)
- cors (Cross-Origin Resource Sharing)
- dotenv (Environment configuration)

### Step 3: Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Edit the `.env` file and set your variables:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/foodcourt
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/foodcourt

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here_min_32_chars
JWT_EXPIRE=7d
BCRYPT_ROUNDS=10

# CORS
CORS_ORIGIN=http://localhost:3000

# Payment Gateway (Optional)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key
```

### Step 4: Setup MongoDB

#### Option A: Local MongoDB
1. Install MongoDB: [docs.mongodb.com/manual/installation](https://docs.mongodb.com/manual/installation/)
2. Start MongoDB service:
   - **Windows**: `mongod`
   - **Mac/Linux**: `brew services start mongodb-community`
3. Verify: `mongo` or `mongosh`

#### Option B: MongoDB Atlas (Cloud - Recommended)
1. Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get connection string (looks like):
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/foodcourt
   ```
4. Replace `MONGODB_URI` in `.env`

### Step 5: Start Backend Server
```bash
npm run dev
```

You should see:
```
Server is running on port 5000
MongoDB Connected: localhost
```

### Testing Backend
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running"
}
```

## 🎨 Detailed Frontend Setup

### Step 1: Navigate to Frontend Directory
```bash
cd frontend
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install:
- react & react-dom (UI library)
- react-router-dom (Navigation)
- axios (HTTP client)
- zustand (State management)
- tailwindcss (Styling)
- vite (Build tool)

### Step 3: Start Development Server
```bash
npm run dev
```

You should see:
```
  VITE v4.x.x ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  press h to show help
```

### Step 4: Build for Production
```bash
npm run build
npm run preview
```

## 🔌 API Connection Setup

The frontend automatically connects to the backend via proxy settings in `vite.config.js`:

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    },
  },
},
```

This means all API calls to `/api/*` are proxied to `http://localhost:5000/api/*`

## 📱 Testing the Application

### 1. Create a Test Account
- Go to `http://localhost:3000/signup`
- Fill in the form:
  - First Name: John
  - Last Name: Doe
  - Email: john@example.com
  - Phone: +1234567890
  - Password: password123
  - Role: Customer
- Click "Create Account"

### 2. Sign In
- Go to `http://localhost:3000/signin`
- Email: john@example.com
- Password: password123

### 3. Create a Test Restaurant (Optional)
- Sign up as a restaurant partner
- Role: Restaurant Partner
- Access restaurant dashboard at `/restaurant`

### 4. Test Features
- Browse restaurants on home page
- Add items to cart
- Proceed to checkout
- Place test order

## 🐛 Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** 
- Check if MongoDB is running
- Verify `MONGODB_URI` in `.env`
- Try MongoDB Atlas if local MongoDB won't start

### Port Already in Use
```
Error: Port 5000 is already used
```
**Solution:**
- Change PORT in `.env` to 5001, 5002, etc.
- Or kill the process using the port

### Module Not Found
```
Error: Cannot find module 'express'
```
**Solution:**
- Re-run `npm install` in both frontend and backend
- Delete `node_modules` and `package-lock.json`, then reinstall

### CORS Errors
```
Access to XMLHttpRequest at 'http://localhost:5000/api/...' from origin 'http://localhost:3000'
```
**Solution:**
- Ensure `CORS_ORIGIN=http://localhost:3000` in backend `.env`
- Restart both servers

### API Calls Not Working
- Check browser console for errors (F12)
- Verify both servers are running
- Check network tab to see response status codes
- Verify token is stored in localStorage

## 🚀 Deployment Guide

### Backend Deployment (Heroku Example)
```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create app
heroku create foodcourt-api

# Set environment variables
heroku config:set JWT_SECRET=your_secret_key
heroku config:set MONGODB_URI=your_mongodb_uri

# Deploy
git push heroku main

# Check logs
heroku logs --tail
```

### Frontend Deployment (Vercel Example)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

## 📞 Support & Help

- Check logs: Look at browser console (F12) and terminal output
- Read error messages carefully - they usually indicate the problem
- Search GitHub issues for similar problems
- Check MongoDB connection string format
- Ensure all environment variables are set correctly

## 🔐 Security Notes

1. **Never commit `.env`** - Add to `.gitignore`
2. **Use strong JWT secret** - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
3. **Always hash passwords** - Already implemented with bcryptjs
4. **Enable HTTPS in production** - Use proper SSL certificates
5. **Validate all inputs** - Check backend validation middleware
6. **Rate limiting** - Add rate limiting middleware for production
7. **CORS security** - Only allow specific origins in production

## 📚 Additional Resources

- [Node.js Documentation](https://nodejs.org/en/docs/)
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

## ✅ Checklist Before Deployment

- [ ] All environment variables configured
- [ ] MongoDB connection working
- [ ] Both servers running without errors
- [ ] Frontend can sign up/sign in
- [ ] Cart functionality working
- [ ] Orders can be placed
- [ ] Dashboard pages loading correctly
- [ ] No console errors in browser
- [ ] No error messages in terminal
- [ ] All database models created
- [ ] Authentication tokens working

---

**Congratulations! Your FoodCourt application is ready to use!** 🎉
