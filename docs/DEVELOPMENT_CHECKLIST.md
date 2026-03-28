# 🎯 FoodCourt Development Checklist

Complete checklist for setting up, testing, and deploying FoodCourt.

---

## ✅ Pre-Installation Requirements

- [ ] Node.js v16+ installed (`node --version`)
- [ ] npm v8+ installed (`npm --version`)
- [ ] MongoDB installed locally OR Atlas account created
- [ ] Git installed and configured
- [ ] Code editor (VS Code recommended)
- [ ] At least 2GB free disk space
- [ ] Internet connection

---

## 📦 Backend Setup

### Installation
- [ ] Navigate to `backend` directory
- [ ] Run `npm install`
- [ ] Create `.env` file in `backend/` root
- [ ] Copy `.env.example` to `.env`
- [ ] Configure MongoDB URI in `.env`
- [ ] Configure JWT_SECRET in `.env`
- [ ] Verify `package.json` has all scripts

### Verification
- [ ] `npm list` shows all dependencies installed
- [ ] No security vulnerabilities (`npm audit`)
- [ ] `.env` file exists with all required variables
- [ ] `.env` is in `.gitignore`
- [ ] `src/` folder has all subdirectories:
  - [ ] `config/`
  - [ ] `models/`
  - [ ] `controllers/`
  - [ ] `routes/`
  - [ ] `middleware/`
  - [ ] `utils/`
- [ ] `server.js` exists in `src/`

### Test Run
- [ ] Run `npm run dev`
- [ ] See "Server running on http://localhost:5000" in console
- [ ] No errors in console
- [ ] Stop server with Ctrl+C

---

## ⚛️ Frontend Setup

### Installation
- [ ] Navigate to `frontend` directory
- [ ] Run `npm install`
- [ ] Verify `.env.local` is created or create manually
- [ ] Set `VITE_API_URL=http://localhost:5000`
- [ ] Verify `package.json` has all scripts

### Verification
- [ ] `npm list` shows all dependencies installed
- [ ] No security vulnerabilities (`npm audit`)
- [ ] `src/` folder has all subdirectories:
  - [ ] `components/`
  - [ ] `pages/`
  - [ ] `context/`
  - [ ] `api/`
  - [ ] `styles/`
- [ ] `public/` folder exists with `favicon.svg`
- [ ] Configuration files exist:
  - [ ] `vite.config.js`
  - [ ] `tailwind.config.js`
  - [ ] `postcss.config.js`
- [ ] `App.jsx` contains all routes

### Test Run
- [ ] Run `npm run dev`
- [ ] See "Local: http://localhost:3000" in console
- [ ] Open http://localhost:3000 in browser
- [ ] Page loads without errors
- [ ] Styles are applied (see orange color)
- [ ] No console errors
- [ ] Stop server with Ctrl+C

---

## 🗄️ Database Setup

### Local MongoDB
- [ ] MongoDB service is running (`mongod`)
- [ ] Default connection string: `mongodb://localhost:27017/foodcourt`
- [ ] Test connection: `mongo mongodb://localhost:27017`
- [ ] Database name is `foodcourt`

### MongoDB Atlas (Cloud)
- [ ] Account created at mongodb.com
- [ ] Cluster created
- [ ] Connection string obtained
- [ ] Connection string added to `.env` as MONGODB_URI
- [ ] IP whitelist includes your machine
- [ ] Database name in connection string: `foodcourt`

### Database Collections Verification
Start both servers and create a test user:
- [ ] `users` collection created
- [ ] `restaurants` collection accessible
- [ ] `menuitems` collection accessible
- [ ] `carts` collection accessible
- [ ] `orders` collection accessible
- [ ] All collections have proper indexes

---

## 🔌 API Endpoints Testing

### Health Check
- [ ] GET `/api/restaurants` returns `[]` or restaurants list
- [ ] No CORS errors in browser console

### Authentication Endpoints
- [ ] POST `/api/auth/signup` - Creates new user ✅
- [ ] POST `/api/auth/signin` - Returns token ✅
- [ ] GET `/api/auth/profile` - Returns user data ✅
- [ ] PUT `/api/auth/profile` - Updates user ✅
- [ ] POST `/api/auth/address` - Adds address ✅
- [ ] GET `/api/auth/profile` - Shows new address ✅

### Restaurant Endpoints
- [ ] GET `/api/restaurants` - Returns list ✅
- [ ] GET `/api/restaurants/:id` - Returns details ✅

### Cart Endpoints (Authenticated)
- [ ] POST `/api/cart/add` - Adds item to cart ✅
- [ ] GET `/api/cart` - Returns cart ✅
- [ ] PUT `/api/cart/update` - Updates item ✅
- [ ] DELETE `/api/cart/:id` - Removes item ✅

### Order Endpoints (Authenticated)
- [ ] POST `/api/orders/create` - Creates order ✅
- [ ] GET `/api/orders/history` - Returns orders ✅
- [ ] GET `/api/orders/:id` - Returns details ✅

---

## 🖥️ Frontend Pages Testing

### Public Pages
- [ ] **Home** - Loads, shows restaurants, no errors
- [ ] **Sign Up** - Form loads, validation works
- [ ] **Sign In** - Form loads, login possible
- [ ] **Restaurant Detail** - Shows menu when clicked

### Authentication Flow
- [ ] Can create new account
- [ ] Redirects to home after signup
- [ ] Can sign in with email
- [ ] Can sign in with phone
- [ ] Token stored in localStorage
- [ ] Can sign out
- [ ] Redirects to signin after logout

### Shopping Flow
- [ ] Can browse restaurants
- [ ] Can view restaurant details
- [ ] Can add items to cart
- [ ] Cart icon shows item count
- [ ] Can view cart page
- [ ] Cart shows correct total
- [ ] Can apply coupon (if available)
- [ ] Can proceed to checkout

### Checkout Flow
- [ ] Can select address from list
- [ ] Can select payment method
- [ ] Can place order
- [ ] Redirects to order detail
- [ ] Cart clears after order

### User Pages
- [ ] **Profile** - Shows user info and addresses
- [ ] **Order History** - Shows past orders
- [ ] **Order Detail** - Shows order info and timeline

### Role-Based Dashboards
- [ ] **Admin Dashboard** - Accessible with admin role
- [ ] **Restaurant Dashboard** - Accessible with restaurant role
- [ ] **Rider Dashboard** - Accessible with rider role
- [ ] Each dashboard shows relevant stats

---

## 🎨 UI/UX Testing

### Visual Elements
- [ ] Logo displays correctly
- [ ] Navigation bar is sticky
- [ ] Hover effects work on buttons
- [ ] Animations are smooth
- [ ] Toast notifications appear
- [ ] Loading spinners display

### Responsive Design
- [ ] Mobile (375px) - Single column layout
- [ ] Tablet (768px) - Two columns
- [ ] Desktop (1024px) - Three columns
- [ ] No horizontal scroll
- [ ] Text is readable on all sizes
- [ ] Touch targets are >= 44px

### Color Scheme
- [ ] Orange primary (#FF6B35) appears
- [ ] Red secondary (#F7931E) appears
- [ ] Dark text on light backgrounds
- [ ] Proper contrast ratio (WCAG AA)
- [ ] Consistent styling throughout

---

## 🔐 Security Testing

### Authentication
- [ ] Passwords are hashed in database
- [ ] JWT tokens are issued on login
- [ ] Tokens are stored in localStorage
- [ ] Auth header is sent with requests
- [ ] Invalid tokens return 401
- [ ] Expired tokens trigger re-login

### Authorization
- [ ] Non-authenticated users can't access protected routes
- [ ] Role-based routes enforce permissions
- [ ] Admin can't use customer routes (vice versa)
- [ ] API validates permissions server-side

### Data Protection
- [ ] API doesn't return passwords
- [ ] Sensitive data is not in localStorage
- [ ] CORS is configured properly
- [ ] Environment variables are not exposed

---

## 🚀 Performance Testing

### Load Times
- [ ] Home page loads < 3 seconds
- [ ] Restaurant detail loads < 2 seconds
- [ ] Cart page loads instantly
- [ ] No significant lag on interactions

### Bundle Size
- [ ] Frontend production build is < 500KB
- [ ] No unused dependencies
- [ ] Images are optimized

### Database
- [ ] Queries complete < 200ms
- [ ] No N+1 queries
- [ ] Indexes are used properly

---

## 📱 Browser Compatibility

### Desktop Browsers
- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] Chrome Mobile
- [ ] Safari iOS
- [ ] Firefox Mobile

### Features
- [ ] Touch events work
- [ ] Viewport meta tag set correctly
- [ ] No console errors in any browser

---

## 📚 Documentation

### README Files
- [ ] README.md explains project purpose
- [ ] QUICK_START.md provides 5-min setup
- [ ] INSTALLATION.md has detailed setup
- [ ] API_REFERENCE.md documents all endpoints
- [ ] CONTRIBUTING.md explains development
- [ ] PROJECT_SUMMARY.md lists all files

### Code Documentation
- [ ] Important functions have comments
- [ ] Complex logic is explained
- [ ] Components have prop documentation
- [ ] Error handling is clear

### .env Files
- [ ] .env.example exists with all variables
- [ ] .env.example is never committed
- [ ] .env file is in .gitignore
- [ ] All required variables are documented

---

## 🧪 Testing Scenarios

### User Journey 1: First-Time Customer
- [ ] Sign up as customer
- [ ] Browse restaurants
- [ ] Add items to cart
- [ ] Checkout
- [ ] Place order
- [ ] View order history

### User Journey 2: Restaurant Partner
- [ ] Sign up as restaurant
- [ ] Access restaurant dashboard
- [ ] View orders
- [ ] Manage menu (if implemented)

### User Journey 3: Delivery Partner
- [ ] Sign up as rider
- [ ] Access rider dashboard
- [ ] See available deliveries
- [ ] Track earnings

### User Journey 4: Admin
- [ ] Sign up as admin
- [ ] Access admin dashboard
- [ ] View platform statistics
- [ ] Manage users (if implemented)

---

## 🐛 Error Handling

### Error Scenarios to Test
- [ ] Invalid email format in signup
- [ ] Password too short
- [ ] Email already exists
- [ ] Wrong password on signin
- [ ] Network error on API call
- [ ] Server error (HTTP 500)
- [ ] Not found error (HTTP 404)
- [ ] Unauthorized error (HTTP 401)
- [ ] Forbidden error (HTTP 403)

### Error Messages
- [ ] Clear, user-friendly error messages
- [ ] Toast notifications for errors
- [ ] Console shows detailed errors for debugging
- [ ] No sensitive info in error messages

---

## 🔄 Deployment Preparation

### Code Quality
- [ ] No console.log in production code
- [ ] No unused variables
- [ ] No commented-out code blocks
- [ ] Consistent code style
- [ ] No hardcoded URLs/secrets

### Environment Variables
- [ ] All secrets in .env
- [ ] .env is in .gitignore
- [ ] Production .env created
- [ ] Database URI is production verified

### Frontend Build
- [ ] `npm run build` completes without errors
- [ ] Build output is < 500KB
- [ ] No 404s in build output
- [ ] All assets load correctly

### Backend Production
- [ ] Error logging is configured
- [ ] CORS is restricted to frontend domain
- [ ] Rate limiting is enabled (if needed)
- [ ] Database backups are configured
- [ ] HTTPS is enforced (on server)

---

## 📊 Final Checklist

### Code Quality
- [ ] No syntax errors
- [ ] No ESLint warnings
- [ ] No console errors
- [ ] Proper error handling
- [ ] Input validation
- [ ] Clean code standards

### Functionality
- [ ] All features work as expected
- [ ] All API endpoints respond correctly
- [ ] Database operations succeed
- [ ] Authentication/Authorization works
- [ ] No data loss scenarios
- [ ] Edge cases handled

### User Experience
- [ ] Intuitive navigation
- [ ] Clear feedback to users
- [ ] No confusing workflows
- [ ] Responsive on all devices
- [ ] Accessible for all users
- [ ] Fast loading times

### Documentation
- [ ] README is complete
- [ ] API docs are accurate
- [ ] Setup guide works
- [ ] Code is commented
- [ ] Error messages are helpful
- [ ] Contributing guide explains process

### Security
- [ ] No hardcoded secrets
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] CORS properly configured
- [ ] Passwords are hashed
- [ ] Sensitive data encrypted

### Performance
- [ ] Response times < 200ms
- [ ] Load times < 3 seconds
- [ ] Bundle size optimized
- [ ] Database indexes created
- [ ] No memory leaks
- [ ] Smooth animations

---

## 🎉 Deployment Ready?

### Before Production
- [ ] All above checklists completed
- [ ] Team reviewed code
- [ ] Database backups configured
- [ ] Monitoring setup
- [ ] Alerts configured
- [ ] Rollback plan in place
- [ ] Support documentation ready
- [ ] User docs completed

### After Deployment
- [ ] Monitor error rates
- [ ] Track performance metrics
- [ ] Respond to support issues
- [ ] Plan feature updates
- [ ] Regular security audits
- [ ] Database optimization
- [ ] Code refactoring sprints

---

## 📝 Sign-Off

Print and complete this checklist:

```
Project Name: FoodCourt
Version: 1.0.0
Date: _______________

Backend Setup:        ☐ Complete
Frontend Setup:       ☐ Complete
Database Setup:       ☐ Complete
API Testing:          ☐ Complete
UI/UX Testing:        ☐ Complete
Security Testing:     ☐ Complete
Documentation:        ☐ Complete
Performance Testing:  ☐ Complete
Browser Testing:      ☐ Complete

Ready for Deployment: ☐ YES / ☐ NO

Developer Name: __________________________
Date: ____________________________________
```

---

## 📞 Support

If you get stuck:
1. Check [QUICK_START.md](./QUICK_START.md)
2. Review [INSTALLATION.md](./INSTALLATION.md)
3. See [API_REFERENCE.md](./API_REFERENCE.md)
4. Read [CONTRIBUTING.md](./CONTRIBUTING.md)

Happy coding! 🚀
