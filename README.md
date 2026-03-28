# 🍴 FoodCourt - Premium Delivery Platform

[![React](https://img.shields.io/badge/Frontend-React%2018-blue.svg)](https://react.dev/)
[![Node](https://img.shields.io/badge/Backend-Node.js%2018-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-darkgreen.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**FoodCourt** is a scalable, professional-grade food delivery system built with a role-based architecture. It provides a seamless experience for Customers, Restaurant Partners, Delivery Riders, and System Administrators.

---

## 🚀 Key Features

*   **Multi-Role Dashboards**: Custom interfaces for Customers, Restaurants, Riders, and Admins.
*   **Real-time Tracking**: Live order updates and GPS status integration via WebSockets.
*   **Secure Authentication**: JWT-based session management with encrypted password storage (bcrypt).
*   **Persistent Logistics**: Shopping cart and order history persistence in MongoDB.
*   **Live Earnings Hub**: Automated revenue splits between Restaurant, Rider, and Platform Commissioner.
*   **Stripe Integration**: Production-ready payment flow (Webhook supported).
*   **Interactive Maps**: High-fidelity delivery routes using Leaflet & OpenStreetMap.

---

## 🏗️ Technical Architecture

### **Current Full-Stack State**
- **Frontend**: Vite + React 18, Zustand (State), Tailwind CSS (Premium UI).
- **Backend**: Node.js + Express, Mongoose (Models), Socket.io (Real-time).
- **Deployment**: Ready for Render/Railway with atomic environment management.

### **Internal Structure**
```text
food-court/
│
├── frontend/        (React SPA)
│   ├── src/
│   │   ├── components/ (Atomic UI elements)
│   │   ├── pages/      (Core views - Lazy Loaded)
│   │   └── context/    (Auth & Global State)
│
├── backend/         (Node API)
│   ├── src/
│   │   ├── controllers/ (Business Logic)
│   │   ├── models/      (Mongoose Schemas)
│   │   ├── routes/      (REST Endpoints)
│   │   └── server.js    (Entry Point)
│
└── docs/            (Detailed Documentation)
```

---

## 🛠️ Quick Start

### 1. Requirements
Ensure you have **Node.js (v18+)** and **MongoDB** installed.

### 2. Installation
From the root directory:
```bash
npm install        # Installs concurrently runner
cd backend && npm install
cd ../frontend && npm install
```

### 3. Setup Environment
Create `.env` files in both folders based on `.env.example` templates.
- **Backend**: `MONGODB_URI`, `JWT_SECRET`, `PORT=5000`.
- **Frontend**: `VITE_API_BASE_URL=http://localhost:5000/api`.

### 4. Run Development Range
```bash
# From root
npm run dev
```
Wait for `🚀 Server running on http://localhost:5000` and `➜ Local: http://localhost:5173`.

---

## 📡 API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/login` | `POST` | Exchange credentials for JWT access |
| `/api/restaurants` | `GET` | List available merchants with filters |
| `/api/orders` | `POST` | Process checkout & initialize logistics |
| `/api/admin/stats`| `GET` | System-wide performance overview |

*Check [API_REFERENCE.md](docs/API_REFERENCE.md) for full endpoint specifications.*

---

## 🧹 Code Clean & Optimization
- **Code Splitting**: Used `React.lazy` for atomic routing chunks.
- **Bundle Optimization**: Manual chunking for Leaflet, Recharts, and Vendor libs.
- **Error Handling**: Standardized global middleware for catch-all API errors.
- **Structure**: Clean separation of models, routes, and logic controllers.

---

**Built with ❤️ for a professional experience.**
For deep dives into features, architecture, and logistics, see the [Docs](docs/) folder.
