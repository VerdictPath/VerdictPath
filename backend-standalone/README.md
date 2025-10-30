# Verdict Path Backend API

**HIPAA-compliant REST API for civil litigation case management platform**

## Overview

This is the backend API server for Verdict Path, providing secure endpoints for user authentication, litigation progress tracking, client/patient management, and HIPAA-compliant document handling.

## Features

- 🔐 **JWT Authentication** - Secure user login and registration
- 🏥 **HIPAA Compliance** - AES-256-GCM encryption for PHI
- 👥 **Multi-Portal Support** - Individual users, law firms, and medical providers
- 📊 **Litigation Tracking** - 9-stage roadmap with 60+ substages
- 🪙 **Gamification** - Coin rewards and progress tracking
- 🔒 **RBAC** - Role-based access control with 6 roles and 23 permissions
- 📝 **Audit Logging** - Comprehensive HIPAA-compliant activity logs
- ✅ **Consent Management** - Patient consent tracking

## Technology Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL (Neon)
- **Authentication:** JWT tokens
- **Encryption:** AES-256-GCM (crypto module)
- **Template Engine:** EJS (for web portals)

## Project Structure

```
verdict-path-backend/
├── server.js                    # Main Express server
├── routes/                      # API route definitions
│   ├── authRoutes.js           # Authentication endpoints
│   ├── litigationRoutes.js     # Litigation progress
│   ├── lawfirmRoutes.js        # Law firm portal
│   └── medicalproviderRoutes.js # Medical provider portal
├── controllers/                 # Business logic
│   ├── authController.js       # Auth logic
│   ├── litigationController.js # Litigation tracking
│   ├── coinsController.js      # Gamification
│   └── ...
├── services/                    # Core services
│   ├── encryption.js           # AES-256-GCM encryption
│   ├── auditLog.js            # HIPAA audit logging
│   └── permissions.js          # RBAC permission system
├── middleware/                  # Express middleware
│   ├── auth.js                # JWT verification
│   ├── permissions.js         # Role checks
│   ├── security.js            # Security headers
│   └── audit.js               # Audit logging
├── config/                     # Configuration
│   ├── db.js                  # Database connection
│   └── database.sql           # Database schema
├── views/                      # EJS templates
│   ├── lawfirm/               # Law firm portal views
│   └── medicalprovider/       # Medical provider views
└── public/                     # Static assets
```

## Installation

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Environment secrets (DATABASE_URL, ENCRYPTION_KEY)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/verdict-path-backend.git
   cd verdict-path-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file:
   ```env
   DATABASE_URL=postgresql://username:password@host:port/database
   ENCRYPTION_KEY=your-32-byte-encryption-key-here
   PORT=5000
   JWT_SECRET=your-jwt-secret-key
   ```

4. **Initialize database**
   
   Run the SQL schema:
   ```bash
   psql $DATABASE_URL < config/database.sql
   ```
   
   Or use the database migration tool:
   ```bash
   npm run db:push
   ```

5. **Start the server**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:5000`

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `ENCRYPTION_KEY` | 32-byte key for AES-256-GCM encryption | Yes |
| `JWT_SECRET` | Secret key for JWT token signing | Yes (defaults to ENCRYPTION_KEY) |
| `PORT` | Server port (default: 5000) | No |
| `NODE_ENV` | Environment (development/production) | No |

### Generating Encryption Key

```bash
# Generate a secure 32-byte key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "userType": "individual",
  "subscriptionTier": "free"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

Response includes JWT token in cookie and response body.

#### Logout
```http
POST /api/auth/logout
Cookie: token=<jwt-token>
```

### Litigation Progress Endpoints

#### Get User Progress
```http
GET /api/litigation/progress
Cookie: token=<jwt-token>
```

Returns current stage and completed substages.

#### Complete Substage
```http
POST /api/litigation/complete-substage
Cookie: token=<jwt-token>
Content-Type: application/json

{
  "substageId": "filing-complaint"
}
```

Awards coins automatically upon completion.

#### Uncomplete Substage
```http
POST /api/litigation/uncomplete-substage
Cookie: token=<jwt-token>
Content-Type: application/json

{
  "substageId": "filing-complaint"
}
```

### Law Firm Portal Endpoints

#### Get Dashboard Data
```http
GET /api/lawfirm/dashboard
Cookie: token=<jwt-token>
```

#### Get All Clients
```http
GET /api/lawfirm/clients?search=john
Cookie: token=<jwt-token>
```

#### Get Client Details
```http
GET /api/lawfirm/client/:clientId
Cookie: token=<jwt-token>
```

### Medical Provider Portal Endpoints

#### Get Dashboard Data
```http
GET /api/medicalprovider/dashboard
Cookie: token=<jwt-token>
```

#### Get Patient Details
```http
GET /api/medicalprovider/patient/:patientId
Cookie: token=<jwt-token>
```

#### Add Billing Entry
```http
POST /api/medicalprovider/billing
Cookie: token=<jwt-token>
Content-Type: application/json

{
  "patientId": 123,
  "amount": 500.00,
  "description": "Office visit",
  "serviceDate": "2025-01-15"
}
```

### Coins & Gamification

#### Get Coin Balance
```http
GET /api/coins/balance
Cookie: token=<jwt-token>
```

#### Convert Coins to Credit
```http
POST /api/coins/convert
Cookie: token=<jwt-token>
Content-Type: application/json

{
  "coinAmount": 100
}
```

## Security Features

### Encryption
- **PHI Encryption:** AES-256-GCM for all protected health information
- **Password Hashing:** bcrypt with salt rounds
- **JWT Tokens:** Secure token-based authentication

### RBAC Permissions

| Role | Permissions |
|------|-------------|
| `individual_free` | Basic roadmap access |
| `individual_basic` | Full roadmap + audio |
| `individual_premium` | All features + video library |
| `lawfirm_*` | Client management, read-only medical records |
| `medicalprovider_*` | Patient management, billing, uploads |
| `admin` | Full system access |

### Audit Logging

All sensitive operations are logged:
- User authentication
- PHI access
- Document uploads
- Patient consent changes
- Subscription changes

Logs include: timestamp, user ID, action, resource, IP address, and result.

## Database Schema

### Key Tables

- `users` - User accounts and authentication
- `litigation_progress` - User progress through roadmap
- `substage_completions` - Individual substage completion records
- `coins_transactions` - Coin earning and spending
- `client_connections` - Law firm client relationships
- `patient_connections` - Medical provider patient relationships
- `medical_documents` - Encrypted document metadata
- `audit_logs` - HIPAA compliance audit trail
- `subscriptions` - User subscription tiers

## Development

### Running Tests
```bash
npm test
```

### Database Migrations
```bash
# Push schema changes
npm run db:push

# Force push (if warnings)
npm run db:push --force

# Open database studio
npm run db:studio
```

### Code Style
- Use consistent indentation (2 spaces)
- Follow existing patterns
- Add JSDoc comments for public functions
- Use async/await for asynchronous operations

## Deployment

### Environment Setup
1. Set all required environment variables
2. Ensure PostgreSQL database is accessible
3. Run database migrations
4. Start server with `npm start`

### Production Considerations
- Enable HTTPS/TLS
- Set `NODE_ENV=production`
- Configure CORS properly
- Set secure cookie flags
- Enable rate limiting
- Configure log rotation
- Set up monitoring and alerts

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate resource |
| 500 | Internal Server Error |

## Support

For issues or questions:
- **Email:** parsonslawfirm@gmail.com
- **GitHub Issues:** [Create an issue](https://github.com/yourusername/verdict-path-backend/issues)

## License

Copyright © 2025 Verdict Path. All rights reserved.

---

**Built with ⚓ for HIPAA-compliant legal case management**
