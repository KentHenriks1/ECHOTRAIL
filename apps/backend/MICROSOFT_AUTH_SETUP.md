# Microsoft Azure AD Authentication Setup Guide

## ✅ **Completed Steps**

### 1. **Azure CLI Installation**
- ✅ Azure CLI installed via winget
- ✅ Authenticated as Kent@Zentric.no
- ✅ Connected to tenant: 3a25bf61-9abb-4b4c-b63b-15101151b584

### 2. **Azure App Registration Configuration**
- ✅ App ID: `61393d5f-8784-4521-b92b-33a88a3e927d`
- ✅ Client Secret: `[REDACTED]`
- ✅ Redirect URIs added:
  - `http://localhost:3001/auth/microsoft/callback` (EchoTrail dev)
  - `http://localhost:3000/auth/microsoft/callback` (Zentric dev)
  - `https://api.echotrail.com/auth/microsoft/callback` (EchoTrail prod)
  - `https://api.zentric.no/auth/microsoft/callback` (Zentric prod)

### 3. **API Permissions**
- ✅ `openid` scope
- ✅ `profile` scope
- ✅ `email` scope  
- ✅ `User.Read` scope
- ✅ Admin consent granted

### 4. **Database Schema**
- ✅ Updated User model with:
  ```prisma
  microsoftId  String?      @unique
  provider     Provider     @default(LOCAL) 
  appContext   String?      @default("echotrail")
  lastLoginAt  DateTime?
  ```
- ✅ Database schema pushed to production

### 5. **Backend Code**
- ✅ Microsoft auth middleware created (`microsoftAuth.ts.disabled`)
- ✅ Microsoft auth routes created (`microsoft.ts.disabled`) 
- ✅ App context service created (`appContext.ts`)
- ✅ Environment variables configured in `.env`

---

## 🚧 **Remaining Steps to Complete Setup**

### Step 1: Install Missing Node.js Packages

The following packages need to be installed (workspace issue needs resolution):

```bash
# In the root directory, fix workspace issues first
cd "C:\Users\Kenth\Desktop\echotrail-project\echotrail"

# Then install packages
npm install passport@^0.7.0 passport-azure-ad@^4.3.5 express-session@^1.18.0
npm install --save-dev @types/passport@^1.0.16 @types/express-session@^1.18.0
```

### Step 2: Enable Microsoft Authentication Files

```bash
cd "C:\Users\Kenth\Desktop\echotrail-project\echotrail\apps\backend\src"

# Restore the disabled files
mv middleware/microsoftAuth.ts.disabled middleware/microsoftAuth.ts
mv routes/microsoft.ts.disabled routes/microsoft.ts
```

### Step 3: Activate Microsoft Authentication in app.ts

Uncomment the following lines in `src/app.ts`:

```typescript
// Line 11: 
import session from 'express-session';

// Line 15:
import { passport } from './middleware/microsoftAuth';

// Line 19:
import microsoftRoutes from './routes/microsoft';

// Lines 103-116: Session and Passport middleware
app.use(session({
  secret: env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// Line 170:
app.use(`${API_PREFIX}/auth/microsoft`, microsoftRoutes);
```

### Step 4: Build and Test

```bash
cd "C:\Users\Kenth\Desktop\echotrail-project\echotrail\apps\backend"

# Build the application
npm run build

# Start development server
npm run dev
```

---

## 🧪 **Testing the Microsoft Authentication Flow**

### For EchoTrail Users:
1. **Initiate Login:**
   ```
   GET http://localhost:3001/api/v1/auth/microsoft/login?app=echotrail
   ```

2. **User will be redirected to Microsoft login**

3. **After successful authentication, user gets redirected to:**
   ```
   http://localhost:8081/auth/success?access_token=...&refresh_token=...&provider=microsoft
   ```

### For Zentric Users:
1. **Initiate Login:**
   ```
   GET http://localhost:3001/api/v1/auth/microsoft/login?app=zentric
   ```

2. **After successful authentication, user gets redirected to:**
   ```
   http://localhost:3000/auth/success?access_token=...&refresh_token=...&provider=microsoft
   ```

### API Endpoints Available:
- `GET /api/v1/auth/microsoft/login` - Start OAuth flow
- `POST /api/v1/auth/microsoft/callback` - OAuth callback
- `GET /api/v1/auth/microsoft/me` - Get current Microsoft user
- `POST /api/v1/auth/microsoft/logout` - Logout Microsoft user

---

## 🔧 **Environment Variables**

The following variables are already configured in `.env`:

```bash
# Microsoft Azure AD Configuration
MICROSOFT_CLIENT_ID="61393d5f-8784-4521-b92b-33a88a3e927d"
MICROSOFT_CLIENT_SECRET="[REDACTED]"  
MICROSOFT_TENANT_ID="3a25bf61-9abb-4b4c-b63b-15101151b584"
MICROSOFT_REDIRECT_URI="http://localhost:3001/auth/microsoft/callback"
```

---

## 🌟 **Features**

### ✅ **Multi-App Support**
- Same Azure app registration works for both EchoTrail and Zentric
- Smart app context detection based on `?app=` parameter
- Automatic user routing to correct frontend application

### ✅ **User Management**  
- Automatic user creation for new Microsoft users
- User linking for existing email addresses
- App context tracking (echotrail/zentric)
- Last login timestamp

### ✅ **Security**
- JWT token integration with existing auth system
- Refresh token database storage
- CORS protection for allowed origins
- Session-based OAuth state management

### ✅ **Production Ready**
- Environment-based redirect URLs
- Admin consent granted for all scopes
- Proper error handling and logging
- Database schema with unique constraints

---

## 🚨 **Current Status**

**Server Status:** ✅ Running on http://localhost:3001
**Database:** ✅ Connected and updated with Microsoft auth schema
**Azure Configuration:** ✅ Complete and ready
**Backend Code:** ✅ Complete but temporarily disabled due to missing packages

**Next Action:** Install the missing Node.js packages and enable the Microsoft authentication files.

---

## 🤝 **Integration with Frontend Applications**

### EchoTrail (React Native)
The authentication flow will redirect users to `http://localhost:8081/auth/success` with tokens in the URL parameters.

### Zentric (Next.js)  
The authentication flow will redirect users to `http://localhost:3000/auth/success` with tokens in the URL parameters.

Both applications can extract the tokens from the URL and store them for API authentication.

---

**🎯 Ready to complete the setup whenever the workspace/package management issues are resolved!**