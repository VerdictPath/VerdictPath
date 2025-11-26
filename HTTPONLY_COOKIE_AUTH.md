# HttpOnly Cookie Authentication Implementation

## Overview

This document describes the secure httpOnly cookie authentication system implemented for Verdict Path. The system provides enhanced XSS protection while maintaining backward compatibility with existing Bearer token authentication.

## Security Benefits

### Why HttpOnly Cookies?

1. **XSS Protection**: HttpOnly cookies cannot be accessed by JavaScript, preventing token theft via XSS attacks
2. **Automatic Transmission**: Cookies are sent automatically with every request - no manual header management
3. **Tamper Resistance**: Cookies are cryptographically signed to prevent tampering
4. **CSRF Protection**: SameSite attribute prevents cross-site request forgery
5. **Secure Transport**: Cookies are HTTPS-only in production environments

### Cookie Configuration

```javascript
{
  httpOnly: true,           // Cannot be accessed by JavaScript
  signed: true,             // Cryptographically signed for integrity
  sameSite: 'lax',         // CSRF protection
  secure: true,            // HTTPS only (production)
  maxAge: 30 days          // Automatic expiration
}
```

## Implementation Details

### 1. Backend Authentication Controller

**File**: `backend/controllers/authController.js`

#### Cookie Helper Function

```javascript
const setAuthCookie = (res, token) => {
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    signed: true
  });
};
```

#### Updated Endpoints

All authentication endpoints now set httpOnly cookies:

- `POST /api/auth/register` - Individual user registration
- `POST /api/auth/lawfirm/register` - Law firm registration
- `POST /api/auth/medicalprovider/register` - Medical provider registration
- `POST /api/auth/login` - Individual user login
- `POST /api/auth/lawfirm/login` - Law firm login
- `POST /api/auth/medicalprovider/login` - Medical provider login

**Example Response** (backward compatible):

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "userType": "individual"
  }
}
```

**Note**: The `token` field is temporarily included for backward compatibility and will be removed in a future release.

### 2. Authentication Middleware

**File**: `backend/middleware/auth.js`

The middleware now supports multiple authentication methods with the following priority:

1. **Signed httpOnly cookie** (`req.signedCookies.authToken`) - Primary method
2. **Bearer token header** (`Authorization: Bearer <token>`) - Backward compatibility
3. **Legacy unsigned cookie** (`req.cookies.token`) - Portal compatibility

```javascript
exports.authenticateToken = (req, res, next) => {
  // Priority: Signed httpOnly cookie > Bearer token header > Legacy unsigned cookie
  let token = req.signedCookies?.authToken;
  
  if (!token) {
    const authHeader = req.header('Authorization');
    token = authHeader?.replace('Bearer ', '');
  }
  
  if (!token) {
    token = req.cookies?.token;
  }
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid token.' });
  }
};
```

### 3. Frontend API Configuration

**File**: `src/config/api.js`

#### Fetch API Configuration

All fetch requests now include credentials:

```javascript
export async function apiRequest(url, options = {}) {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',  // Always send httpOnly cookies with requests
  };

  const config = { ...defaultOptions, ...options };
  const response = await fetch(url, config);
  // ... error handling
}
```

#### XMLHttpRequest Configuration

File uploads also send cookies:

```javascript
export async function uploadFileWithProgress(file, token, onProgress, fileType, category) {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', API_ENDPOINTS.UPLOADS.DOCUMENT);
  xhr.withCredentials = true;  // Send httpOnly cookies with XHR
  xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  xhr.send(formData);
}
```

### 4. CORS Configuration

**File**: `backend/server.js`

CORS is configured to support credentials:

```javascript
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5000',
      'http://localhost:19006',
      'http://localhost:3000',
      /\.railway\.app$/,
      /\.replit\.dev$/,
      /\.repl\.co$/
    ];
    // ... origin validation
  },
  credentials: true  // Allow cookies to be sent cross-origin
};
```

Cookie parser is configured with a secret:

```javascript
const COOKIE_SECRET = process.env.COOKIE_SECRET || process.env.JWT_SECRET;
app.use(cookieParser(COOKIE_SECRET));
```

### 5. Logout Implementation

**File**: `backend/controllers/authController.js`

The logout endpoint clears all authentication cookies:

```javascript
exports.logout = async (req, res) => {
  try {
    // Clear the new httpOnly authentication cookie
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      signed: true
    });
    
    // Also clear the legacy portal cookie for full session termination
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      signed: true
    });
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ message: 'Error logging out', error: error.message });
  }
};
```

## Migration Strategy

The implementation uses a dual-authentication approach to ensure zero disruption:

### Phase 1: Dual Authentication (Current)

- ✅ HttpOnly cookies set on all login/register endpoints
- ✅ Tokens still included in JSON responses
- ✅ Middleware accepts both cookies and Bearer tokens
- ✅ Both mobile app and web portal work seamlessly

### Phase 2: Frontend Migration (Future)

1. Remove AsyncStorage token handling from mobile app
2. Update web portal to rely solely on cookies
3. Remove token from login/register JSON responses
4. Update API documentation

### Phase 3: Cleanup (Future)

1. Remove Bearer token fallback from middleware
2. Remove legacy cookie support
3. Update security documentation

## Testing

### Manual Testing

#### 1. Test Login with Cookie Authentication

```bash
# Login and capture cookies
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# Use cookie for authenticated request
curl http://localhost:5000/api/coins/balance \
  -b cookies.txt
```

#### 2. Test Logout

```bash
# Logout (clears cookies)
curl -X POST http://localhost:5000/api/auth/logout \
  -b cookies.txt \
  -c cookies.txt

# Verify cookie is cleared
curl http://localhost:5000/api/coins/balance \
  -b cookies.txt
# Should return 401 Unauthorized
```

#### 3. Browser DevTools Testing

1. Open browser DevTools (F12)
2. Go to Application → Cookies
3. Login to the app
4. Verify `authToken` cookie appears with:
   - HttpOnly: ✓
   - Secure: ✓ (production only)
   - SameSite: Lax
5. Try accessing cookie via console:
   ```javascript
   document.cookie // Should not show authToken (httpOnly protection)
   ```
6. Make an API call and verify cookie is sent in request headers
7. Logout and verify cookie is removed

### Automated Testing

```javascript
// Example integration test
describe('HttpOnly Cookie Authentication', () => {
  it('should set httpOnly cookie on login', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    
    expect(response.headers['set-cookie']).toBeDefined();
    expect(response.headers['set-cookie'][0]).toContain('authToken');
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
  });

  it('should accept httpOnly cookie for authenticated requests', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    
    const cookies = loginRes.headers['set-cookie'];
    
    const balanceRes = await request(app)
      .get('/api/coins/balance')
      .set('Cookie', cookies);
    
    expect(balanceRes.status).toBe(200);
  });

  it('should clear cookies on logout', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies);
    
    expect(response.headers['set-cookie'][0]).toContain('authToken=;');
    expect(response.headers['set-cookie'][1]).toContain('token=;');
  });
});
```

## Environment Variables

### Required Secrets

```bash
# JWT signing secret (required)
JWT_SECRET=your-secret-key-here

# Cookie signing secret (optional, defaults to JWT_SECRET)
COOKIE_SECRET=your-cookie-secret-here
```

### Production Considerations

In production, ensure:

1. `NODE_ENV=production` - Enables secure (HTTPS-only) cookies
2. Valid SSL certificate installed
3. Strong JWT_SECRET and COOKIE_SECRET values
4. CORS origins properly configured

## Security Checklist

- ✅ HttpOnly flag prevents XSS token theft
- ✅ Signed cookies prevent tampering
- ✅ SameSite attribute prevents CSRF
- ✅ Secure flag in production (HTTPS only)
- ✅ 30-day expiration (automatic cleanup)
- ✅ CORS credentials properly configured
- ✅ Multiple authentication methods during migration
- ✅ Logout clears all authentication cookies
- ✅ Strong secrets for JWT and cookie signing

## Troubleshooting

### Cookies Not Being Set

**Symptom**: Login succeeds but cookie not visible in browser

**Solutions**:
1. Check CORS configuration - must have `credentials: true`
2. Verify frontend sends `credentials: 'include'`
3. Check domain mismatch (localhost vs 127.0.0.1)
4. Verify cookie secret is configured

### Cookies Not Being Sent

**Symptom**: API calls return 401 even after login

**Solutions**:
1. Verify `credentials: 'include'` in fetch config
2. Check SameSite cookie restrictions
3. Verify CORS origin matches request origin
4. Check if cookies are being blocked by browser

### Logout Not Clearing Cookies

**Symptom**: User still authenticated after logout

**Solutions**:
1. Verify clearCookie options match cookie options exactly
2. Check cookie name spelling
3. Ensure both `authToken` and legacy `token` are cleared

## API Reference

### Authentication Endpoints

#### POST /api/auth/login

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "message": "Login successful",
  "token": "eyJhbGci...",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "userType": "individual"
  }
}
```

**Headers**:
```
Set-Cookie: authToken=eyJhbGci...; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax
```

#### POST /api/auth/logout

**Request**: No body required

**Response**:
```json
{
  "message": "Logged out successfully"
}
```

**Headers**:
```
Set-Cookie: authToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT
Set-Cookie: token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT
```

## Best Practices

### Frontend Development

1. **Never manually manage JWT tokens** - Let cookies handle it automatically
2. **Always use `credentials: 'include'`** - For all authenticated API calls
3. **Don't store tokens in localStorage** - Use cookies exclusively
4. **Handle 401 errors gracefully** - Redirect to login on authentication failure

### Backend Development

1. **Use signed cookies** - Prevent tampering
2. **Set appropriate maxAge** - Balance security and UX
3. **Clear all cookies on logout** - Ensure complete session termination
4. **Validate cookie options** - Ensure consistency across set/clear operations

### Security

1. **Use strong secrets** - For JWT_SECRET and COOKIE_SECRET
2. **Enable HTTPS in production** - Required for secure cookies
3. **Configure CORS carefully** - Only allow trusted origins
4. **Rotate secrets periodically** - Invalidate old tokens
5. **Monitor authentication logs** - Detect suspicious activity

## Future Enhancements

1. **Refresh Token System**: Implement short-lived access tokens with long-lived refresh tokens
2. **Device Fingerprinting**: Tie cookies to specific devices for additional security
3. **Session Management**: Allow users to view and revoke active sessions
4. **Rate Limiting**: Implement stricter rate limits on authentication endpoints
5. **2FA Integration**: Add two-factor authentication for enhanced security

## References

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [MDN: HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [Express Cookie Parser Documentation](https://github.com/expressjs/cookie-parser)

---

**Last Updated**: November 22, 2025  
**Version**: 1.0.0  
**Status**: Production Ready
