# StudiesMasters 🎓

A complete online tutoring platform with admin, teacher, student, and tutor-manager dashboards.

## 🚀 Features

### Core Platform
- **Student Management** - Registration, enrollment, subscription management
- **Teacher Management** - Teacher profiles, subject assignments, class management
- **Admin Dashboard** - Full CRUD for users, payments, broadcasts, class groups
- **Tutor Manager (QAO)** - Quality assurance oversight
- **Real-time Communication** - Socket.io powered broadcasts and notifications
- **Payment Integration** - Paystack payment processing
- **Email Service** - Resend integration for OTPs and credentials

### Security Features
- **System Guard** - Custom firewall + self-diagnosis + self-healing engine
- **Input Validation** - Zod schema validation on all API endpoints
- **Rate Limiting** - Global and auth-specific rate limiters
- **Audit Logging** - All admin actions tracked in database
- **Security Headers** - Helmet with HSTS, XSS protection, MIME sniffing prevention
- **CORS Protection** - Whitelist-based origin control
- **JWT Authentication** - Token-based auth with OTP verification

### Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Radix UI, Framer Motion, Recharts
- **Backend**: Node.js, Express, MongoDB (Mongoose), Socket.io
- **Security**: Zod, Helmet, express-rate-limit, bcryptjs
- **Email**: Resend
- **Payments**: Paystack

## 📦 Installation

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Resend account (for emails)
- Paystack account (for payments)

### Backend Setup
```bash
cd Studiesmasters-backend
npm install
```

Create `.env` file:
```env
MONGO_USER=your_mongo_user
MONGO_PASSWORD=your_mongo_password
MONGO_HOST=your_mongo_host
MONGO_DB_NAME=Studiesmasters
JWT_SECRET=your_jwt_secret_min_32_chars
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@yourdomain.com
PAYSTACK_SECRET_KEY=your_paystack_secret
PORT=5000
```

Start the server:
```bash
npm run dev  # or node server.js
```

### Frontend Setup
```bash
cd studiesmasters-frontend
npm install
```

Create `.env` file:
```env
VITE_API_URL=http://localhost:5000
```

Start the dev server:
```bash
npm run dev
```

## 🔑 Default Admin Credentials
```
Email: elgranddios@gmail.com
Password: Admin@123
```

## 📚 API Documentation

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Admin login (sends OTP) |
| POST | `/api/admin/verify-otp` | Verify OTP and get JWT token |
| POST | `/api/students/auth/register` | Student registration |
| POST | `/api/students/auth/login` | Student login |
| POST | `/api/teachers/auth/register` | Teacher registration |
| POST | `/api/teachers/auth/login` | Teacher login |

### Admin Routes (Requires JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Dashboard statistics |
| GET | `/api/admin/users` | All users (unified) |
| POST | `/api/admin/users/create` | Create new user |
| DELETE | `/api/admin/users/:id/:role` | Delete user |
| GET | `/api/admin/payments` | All payments |
| PUT | `/api/admin/payments/:id/confirm` | Confirm payment |
| POST | `/api/admin/broadcast` | Send broadcast |
| GET | `/api/admin/audit-logs` | View audit logs |

### System Guard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/system-guard/status` | System status |
| POST | `/api/system-guard/diagnosis` | Run diagnosis |
| POST | `/api/system-guard/healing` | Run healing |
| GET | `/api/system-guard/blocked-ips` | List blocked IPs |
| GET | `/system-guard.html` | System Guard Dashboard |

## 🏗️ Project Structure

```
Studiesmasters-backend/
├── config/          # Database configuration
├── Controllers/     # Route controllers
├── middleware/      # Auth, validation, audit logging
├── models/          # Mongoose models
├── routes/          # Express routes
├── services/        # System Guard, class groups
├── utils/           # Email utilities
└── server.js        # Main server file

studiesmasters-frontend/
├── src/
│   ├── components/  # React components
│   ├── utils/       # API client, helpers
│   └── App.jsx      # Main app with routing
└── package.json
```

## 🛡️ Security Features

### System Guard
The built-in System Guard provides:
- **Firewall** - Rate limiting, suspicious pattern detection, IP blocking
- **Self-Diagnosis** - Memory, CPU, event loop, database health monitoring
- **Self-Healing** - Automatic database reconnection, memory cleanup
- **Dashboard** - Real-time monitoring at `/system-guard.html`

### Audit Logging
All admin actions are logged:
- Login attempts (success/failure)
- User creation/deletion
- Payment confirmations
- Broadcasts sent
- Class group operations

Access via: `GET /api/admin/audit-logs`

## 📝 License
Private project - All rights reserved.

## 🤝 Contributing
1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request