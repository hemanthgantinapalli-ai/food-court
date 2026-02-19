# FoodCourt Deployment Guide

## Prerequisites
- Node.js (v18+ recommended)
- MongoDB (local or Atlas)
- Stripe account (for payments)

## 1. Environment Setup
- Copy `.env.example` to `backend/.env` and fill in secrets.
- Ensure MongoDB is running and accessible.

## 2. Install dependencies
```sh
cd backend
npm install
cd ../frontend
npm install
```

## 3. Build frontend for production
```sh
cd frontend
npm run build
```
This outputs static files to `frontend/dist/`.

## 4. Serve frontend (optional)
- Use a static server (e.g. `serve`, nginx) to serve `frontend/dist`.

## 5. Start backend
```sh
cd backend
npm run start
```

## 6. Smoke test
```sh
npm run smoke
```

## 7. Production tips
- Use process manager (pm2, systemd) for backend.
- Set secure env vars in production.
- Use HTTPS in production.
- Set CORS and security headers.

## 8. Packaging for delivery
- Zip the entire `food-court` folder (excluding `node_modules` and `.env`).
- Deliver with this structure:
  - backend/
  - frontend/
  - .env.example
  - README.md
  - DEPLOYMENT.md

## 9. CI/CD (optional)
- Add GitHub Actions or similar to run `npm install`, `npm run build`, and `npm run smoke`.
