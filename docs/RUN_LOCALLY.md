# Run FoodCourt Locally

## Quick Start (Automated)
Run this PowerShell script from the project root:
```powershell
.\start-app.ps1
```
This opens two terminals:
1. **Backend** (http://localhost:5000) — API server
2. **Frontend** (http://localhost:3000) — React app

Then open your browser to **http://localhost:3000**.

---

## Manual Start (Step-by-Step)

### Prerequisites
- Node.js 16+ installed
- MongoDB 4.4+ running locally or Atlas connection available
- Port 5000 and 3000 must be free

### Step 1: Start Backend
Open PowerShell and run:
```powershell
cd backend
$env:MONGODB_URI = 'mongodb://127.0.0.1:27017/foodcourt'
$env:JWT_SECRET = 'your_jwt_secret_key_change_in_production'
npm install
npm run dev
```
Expected output:
```
🚀 Server is running on port 5000
Using Mongo URI: mongodb://127.0.0.1:27017/foodcourt
MongoDB Connected: 127.0.0.1
```

### Step 2: Start Frontend (New Terminal)
Open a **new** PowerShell and run:
```powershell
cd frontend
npm install
npm run dev
```
Expected output:
```
➜  Local:   http://localhost:3000/
```

### Step 3: Open App
Open your browser to **http://localhost:3000**

---

## Troubleshooting

### Backend won't start
- **Error: "MongoDB connection failed"** — Ensure MongoDB is running locally or update `MONGODB_URI` to your Atlas cluster.
- **Error: "Port 5000 already in use"** — Kill the process or use a different port:
  ```powershell
  $env:PORT = 5001
  npm run dev
  ```
- **Error: "Cannot find module"** — Run `npm install` in the backend folder.

### Frontend won't connect to backend
- **Errors: "ECONNREFUSED"** — Backend isn't running. Ensure Step 1 completed successfully.
- **Proxy not working** — Make sure you're using `npm run dev` (dev server), not `npm run preview` (build preview).
- Frontend needs the dev proxy to forward `/api` requests to `http://localhost:5000` (configured in `vite.config.js`).

### Sign-up/Sign-in not working
- **"Sign up failed"** → Check backend logs for errors.
- **Database errors** → Verify MongoDB is running: `mongosh` or check MongoDB service.
- Test API directly:
  ```powershell
  Invoke-RestMethod -Uri 'http://localhost:5000/api/health' -Method GET
  ```
  Should return: `{"success": true, "message": "Server is running"}`

### Port already in use
```powershell
# Find what's using port 5000
netstat -ano | findstr :5000
# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

---

## Environment Variables

Create `backend/.env` with:
```
MONGODB_URI=mongodb://127.0.0.1:27017/foodcourt
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRE=7d
PORT=5000
CORS_ORIGIN=http://localhost:3000
BCRYPT_ROUNDS=10
```

Create `frontend/.env.local` with (optional):
```
VITE_API_BASE=http://localhost:5000
```

---

## Testing Auth Endpoints
Once backend is running:
```powershell
# Sign up
Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/signup' -Method POST -ContentType 'application/json' -Body (@{
  firstName = 'Test'
  lastName  = 'User'
  email     = 'test@example.com'
  phone     = '1234567890'
  password  = 'password123'
} | ConvertTo-Json)

# Sign in
Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/signin' -Method POST -ContentType 'application/json' -Body (@{
  email    = 'test@example.com'
  password = 'password123'
} | ConvertTo-Json)
```

---

## Next Steps
- Create restaurants and menu items (→ Implement restaurants & menu endpoints)
- Build cart and checkout flow
- Set up admin dashboard
- Deploy to production
