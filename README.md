# 🅿️ Campus Parking Management System

A full-stack **MERN** web application designed to streamline campus parking operations — from slot booking and QR-based entry/exit verification to real-time overstay alerts and integrated online payments.

---

## 📌 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Roles & Access Control](#roles--access-control)
- [Database Models](#database-models)
- [Real-Time Features](#real-time-features)
- [Screenshots](#screenshots)

---

## Overview

The **Campus Parking Management System** is a college project that digitizes and automates the entire parking workflow on a campus. Students and staff can register, browse available slots, book in advance, and pay online via Razorpay. Security staff can verify entries and exits using QR codes, and administrators get a full analytics dashboard to monitor usage, revenue, and user activity.

---

## ✨ Features

### 👤 User
- Register / Login with email & password, or OTP-based login
- Forgot password & reset via email link
- Browse real-time parking slot availability (Car, Bike, Bus, Truck)
- Book parking slots for a specific time range
- Online payment via **Razorpay**
- View booking history and booking details
- QR code generated per booking for entry/exit verification
- Extend bookings before expiry
- Cancel bookings
- Manage vehicle profile (add/edit multiple vehicles)
- Real-time overstay alerts (Socket.IO)
- AI-powered chatbot assistant (Google Gemini)

### 🛡️ Staff
- Dedicated staff dashboard
- Scan QR codes to verify entry and exit
- View upcoming reservations
- Process exit payments for overstaying users
- View booking history of all users

### 🔧 Admin
- Full admin dashboard with analytics
- Revenue charts (3 months / 6 months / 1 year)
- Booking statistics and activity logs
- Manage parking slots (add, disable, update pricing)
- Manage users (view, block, unblock, delete)
- Export bookings as CSV
- Real-time slot status updates

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express.js | REST API server |
| MongoDB + Mongoose | Database & ODM |
| Socket.IO | Real-time slot updates & overstay alerts |
| JSON Web Tokens (JWT) | Authentication & authorization |
| bcryptjs | Password hashing |
| Nodemailer | OTP and password-reset emails |
| Razorpay | Payment gateway integration |
| Google Gemini AI | AI chatbot |
| Nodemon | Development hot-reload |

### Frontend
| Technology | Purpose |
|---|---|
| React (Vite) | UI framework & build tool |
| React Router | Client-side routing |
| Bootstrap 5 + React-Bootstrap | UI components & responsive grid |
| Chart.js + react-chartjs-2 | Analytics charts |
| Socket.IO Client | Real-time communication |
| Axios | HTTP client |
| html5-qrcode | QR code scanning |
| Lucide React | Icon library |

---

## 📁 Project Structure

```
College_Project/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js     # User auth logic
│   │   ├── bookingController.js  # Booking & analytics logic
│   │   ├── paymentController.js  # Razorpay integration
│   │   └── slotController.js     # Slot management logic
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT protect, admin, staff guards
│   ├── models/
│   │   ├── ActivityLog.js        # Admin activity log schema
│   │   ├── Booking.js            # Booking schema
│   │   ├── OTP.js                # OTP schema
│   │   ├── ParkingSlot.js        # Parking slot schema
│   │   └── User.js               # User schema
│   ├── routes/
│   │   ├── authRoutes.js         # /api/users
│   │   ├── bookingRoutes.js      # /api/bookings
│   │   ├── chatRoutes.js         # /api/chat
│   │   └── slotRoutes.js         # /api/slots
│   ├── utils/
│   ├── seedAnalytics.js          # Seed 90 days of analytics data
│   ├── seeder.js                 # Basic data seeder
│   ├── server.js                 # Express + Socket.IO entry point
│   └── package.json
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── components/
    │   │   ├── BookingModal.jsx       # Slot booking dialog
    │   │   ├── Chatbot.jsx            # AI chatbot widget
    │   │   ├── Footer.jsx
    │   │   ├── GlobalPaymentModal.jsx # Overstay payment prompt
    │   │   ├── GuestRoute.jsx         # Route guard (guests only)
    │   │   ├── Navbar.jsx
    │   │   ├── NotificationBell.jsx   # Real-time notification panel
    │   │   ├── PrivateRoute.jsx       # Route guard (logged in)
    │   │   └── StaffRoute.jsx         # Route guard (staff only)
    │   ├── context/
    │   │   └── AuthContext.jsx        # Global auth state
    │   ├── pages/
    │   │   ├── About.jsx
    │   │   ├── AdminDashboard.jsx     # Charts, user/slot management
    │   │   ├── Dashboard.jsx          # User booking dashboard
    │   │   ├── ForgotPassword.jsx
    │   │   ├── Home.jsx               # Landing page
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── ResetPassword.jsx
    │   │   ├── StaffDashboard.jsx     # QR scan, exit processing
    │   │   └── UserProfile.jsx        # Profile & vehicle management
    │   ├── api.js                     # Axios base instance
    │   ├── App.jsx                    # Routes definition
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18 or higher
- **MongoDB** (local instance or MongoDB Atlas)
- **npm** v9 or higher
- A **Razorpay** account (for payment integration)
- A **Google Gemini API** key (for chatbot)
- An **SMTP email** account (Gmail recommended, for OTP/password-reset emails)

---

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd College_Project
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory (see [Environment Variables](#environment-variables)).

```bash
# Start development server
npm run dev

# Or start production server
npm start
```

The backend will run on **http://localhost:5000**

---

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:5000
```

```bash
# Start development server
npm run dev
```

The frontend will run on **http://localhost:5173**

---

### 4. Seed Data (Optional)

```bash
# Import sample parking slots and users
cd backend
npm run data:import

# Seed 90 days of analytics data for charts
node seedAnalytics.js

# Destroy all seeded data
npm run data:destroy
```

---

## 🔐 Environment Variables

Create a `.env` file inside the `backend/` directory with the following:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb://localhost:27017/campus_parking

# Authentication
JWT_SECRET=your_super_secret_jwt_key

# Email (Nodemailer / Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key
```

> **Note:** For Gmail, use an [App Password](https://myaccount.google.com/apppasswords) instead of your real password. Enable 2FA on your Google account first.

---

## 📡 API Reference

### Auth — `/api/users`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/register` | Public | Register a new user |
| POST | `/register-otp` | Public | Send OTP for registration |
| POST | `/login` | Public | Login with email & password |
| POST | `/login-otp` | Public | Request OTP login |
| POST | `/login-verify` | Public | Verify OTP and login |
| POST | `/forgot-password` | Public | Send password reset email |
| POST | `/reset-password` | Public | Reset password with token |
| GET | `/profile` | Private | Get logged-in user's profile |
| PUT | `/profile` | Private | Update logged-in user's profile |
| GET | `/` | Admin | Get all users |
| PUT | `/:id/status` | Admin | Block / Unblock a user |
| PUT | `/:id` | Admin | Update a user |
| DELETE | `/:id` | Admin | Delete a user |

---

### Slots — `/api/slots`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Private | Get all parking slots |
| POST | `/` | Admin | Create a new slot |
| PUT | `/:id` | Admin | Update a slot |
| DELETE | `/:id` | Admin | Delete a slot |

---

### Bookings — `/api/bookings`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/` | Private | Create a booking |
| GET | `/mybookings` | Private | Get current user's bookings |
| GET | `/:id` | Private | Get booking by ID |
| PUT | `/:id/pay` | Private | Mark booking as paid |
| POST | `/create-order` | Private | Create Razorpay order |
| POST | `/verify-payment` | Private | Verify Razorpay payment |
| POST | `/extend` | Private | Extend a booking |
| POST | `/verify-extension` | Private | Verify booking extension |
| POST | `/cancel` | Private | Cancel a booking |
| POST | `/check-availability` | Private | Check slot availability |
| POST | `/verify` | Staff | Verify QR entry/exit |
| POST | `/process-exit` | Staff | Process overstay exit |
| POST | `/confirm-exit-payment` | Private | Confirm exit overstay payment |
| GET | `/staff/history` | Staff | Get all booking history |
| GET | `/analytics` | Admin | Get booking analytics |
| GET | `/export` | Admin | Export bookings as CSV |

---

### Chat — `/api/chat`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/` | Public | Send message to AI chatbot |

---

## 👥 Roles & Access Control

The app has three user roles enforced via JWT middleware:

| Role | Description | Key Access |
|------|-------------|------------|
| **User** | Regular campus member | Book slots, pay, view own bookings |
| **Staff** | Parking attendant | QR scan entry/exit, process overstay payments |
| **Admin** | Administrator | Full dashboard, user/slot management, analytics |

Role flags are stored on the `User` model (`isAdmin`, `isStaff`). A user blocked by an admin (`status: 'Blocked'`) cannot log in.

---

## 🗄️ Database Models

### User
| Field | Type | Description |
|-------|------|-------------|
| name | String | Full name |
| email | String | Unique email address |
| password | String | Bcrypt-hashed password |
| phoneNumber | String | Contact number |
| vehicles | Array | List of registered vehicles |
| isAdmin | Boolean | Admin flag |
| isStaff | Boolean | Staff flag |
| status | Enum | `Active` / `Blocked` |

### ParkingSlot
| Field | Type | Description |
|-------|------|-------------|
| slotNumber | String | Unique slot identifier (e.g., `A-01`) |
| type | Enum | `Car` / `Bike` / `Bus` / `Truck` |
| isOccupied | Boolean | Currently occupied status |
| isDisabled | Boolean | Slot disabled by admin |
| pricePerHour | Number | Booking cost per hour |
| lockedBy | ObjectId | User holding a temporary lock |
| lockExpiresAt | Date | Expiry time of the lock |

### Booking
| Field | Type | Description |
|-------|------|-------------|
| user | ObjectId | Reference to User |
| slot | ObjectId | Reference to ParkingSlot |
| startTime / endTime | Date | Booking time range |
| totalAmount | Number | Pre-paid amount |
| paymentStatus | Enum | `Pending` / `Paid` / `Failed` |
| status | Enum | `Booked` / `Active` / `Completed` / `Cancelled` / `Pending Extra Payment` |
| extraAmount | Number | Overstay charges |
| qrCode | String | Unique QR code string |
| entryTime / exitTime | Date | Actual timestamps |
| verifiedBy | ObjectId | Staff who verified |

---

## ⚡ Real-Time Features (Socket.IO)

The server broadcasts the following events via Socket.IO:

| Event | Trigger | Payload |
|-------|---------|---------|
| `slotUpdate` | Slot booked, released, or locked | `{ type, slot }` |
| `overstayAlert` | User's booking exceeds end time | `{ bookingId, userId, message }` |

**Background jobs** run every **60 seconds** to:
- Auto-complete `Booked` (no-show) bookings that are 24+ hours past their end time
- Release expired slot locks (held during the booking flow)
- Emit overstay alerts for `Active` bookings past their `endTime`

---

## 📸 Screenshots

> _Screenshots will be added here._



---
  
Campus Parking — Campus Parking Management System
