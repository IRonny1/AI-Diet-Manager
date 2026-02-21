# Story 2: Authentication System

**Status:** 🔴 Not Started  
**Priority:** P0 (Critical)  
**Estimated Time:** 6-8 hours

---

## 📋 Overview

Implement complete user authentication system including registration, login, JWT token management, and basic profile management for both mobile app and backend.

---

## 🎯 Acceptance Criteria

- [ ] User can register with email and password
- [ ] User can login with credentials
- [ ] JWT tokens are generated and validated
- [ ] Protected routes work correctly
- [ ] User can logout
- [ ] Basic profile information is stored and retrievable
- [ ] Password is securely hashed
- [ ] Token refresh mechanism works
- [ ] Error handling for invalid credentials
- [ ] Loading states implemented in UI

---

## 🛠️ Technical Tasks

### Backend Implementation

#### 2.1 Create Prisma Service
`src/prisma/prisma.service.ts`:

`src/prisma/prisma.module.ts`:

#### 2.2 Create Auth DTOs
`src/auth/dto/register.dto.ts`:

`src/auth/dto/login.dto.ts`:

#### 2.3 Create JWT Strategy
`src/auth/strategies/jwt.strategy.ts`:

#### 2.4 Create JWT Guard
`src/common/guards/jwt-auth.guard.ts`:

#### 2.5 Create Auth Service
`src/auth/auth.service.ts`:

#### 2.6 Create Auth Controller
`src/auth/auth.controller.ts`:

#### 2.7 Configure Auth Module
`src/auth/auth.module.ts`:

#### 2.8 Update App Module
`src/app.module.ts`:

---

### Mobile App Implementation

#### 2.9 Create Auth Types
`src/types/auth.types.ts`:

#### 2.10 Create API Service
`src/services/api/api.service.ts`:

#### 2.11 Create Auth API Service
`src/services/api/auth.api.ts`:

#### 2.12 Create Storage Service
`src/services/storage/storage.service.ts`:

#### 2.13 Create Auth Store (Zustand)
`src/store/auth.store.ts`:

#### 2.14 Create Login Screen
`src/screens/Auth/LoginScreen.tsx`:

#### 2.15 Create Register Screen
`src/screens/Auth/RegisterScreen.tsx`:

#### 2.16 Create Auth Navigation
`src/navigation/AuthNavigator.tsx`:

#### 2.17 Create Root Navigator
`src/navigation/RootNavigator.tsx`:

---

## ✅ Testing Checklist

### Backend Tests
- [ ] Test registration with valid email/password
- [ ] Test registration with duplicate email (should fail)
- [ ] Test login with valid credentials
- [ ] Test login with invalid credentials (should fail)
- [ ] Test JWT token generation
- [ ] Test protected route with valid token
- [ ] Test protected route without token (should fail)
- [ ] Test protected route with invalid token (should fail)
- [ ] Test password hashing (password not stored in plain text)

### Mobile App Tests
- [ ] Navigate to Register screen
- [ ] Register new user successfully
- [ ] See validation error for passwords mismatch
- [ ] See error for duplicate email
- [ ] Navigate to Login screen
- [ ] Login successfully
- [ ] See error for invalid credentials
- [ ] Token persists after app restart
- [ ] User data persists after app restart
- [ ] Logout successfully clears token and data
- [ ] Automatic redirect to main app after login

---

## 📝 API Endpoints to Test

Use Postman or curl:

```bash
# Register
POST http://localhost:3000/auth/register
Content-Type: application/json
{
  "email": "test@example.com",
  "password": "password123"
}

# Login
POST http://localhost:3000/auth/login
Content-Type: application/json
{
  "email": "test@example.com",
  "password": "password123"
}

# Get Profile (Protected)
GET http://localhost:3000/auth/me
Authorization: Bearer <your_token_here>
```

---

## 🔗 Dependencies Between Stories

**Blocks:**
- Story 3: AI Recognition (needs auth for user-specific data)
- Story 4: Daily Tracking (needs auth)
- All other stories requiring user context

**Depends On:**
- Story 1: Project Setup ✅

---

## ✅ Definition of Done

- [ ] User can register with email/password
- [ ] User can login and receive JWT token
- [ ] Token is stored securely on mobile device
- [ ] Protected API routes verify token correctly
- [ ] User can logout (token removed)
- [ ] Profile data is retrieved on login
- [ ] Navigation switches between auth and main app based on auth state
- [ ] Error messages are displayed for invalid inputs
- [ ] Loading states work correctly
- [ ] Token persists across app restarts
- [ ] All backend endpoints tested via Postman
- [ ] All frontend flows tested on emulator/simulator
- [ ] Code passes TypeScript and ESLint checks
- [ ] Documentation updated

---

**Completion Date:** _________________  
**Completed By:** _________________  
**Notes:** _________________