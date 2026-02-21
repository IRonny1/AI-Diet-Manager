# Story 1: Project Setup & Foundation

**Status:** 🔴 Not Started  
**Priority:** P0 (Critical)  
**Estimated Time:** 4-6 hours

---

## 📋 Overview

Initialize the mobile app (React Native) and backend (NestJS) projects with proper structure, dependencies, and development environment configuration.

---

## 🎯 Acceptance Criteria

- [ ] React Native project (via Expo) initialized with TypeScript
- [ ] NestJS backend project initialized with TypeScript
- [ ] PostgreSQL database configured
- [ ] Development environment working on both platforms (iOS/Android)
- [ ] Basic project structure established
- [ ] Essential dependencies installed
- [ ] Environment variables configured

---

## 🛠️ Technical Tasks

### Mobile App Setup

#### 1.1 Initialize React Native Project
#### 1.2 Install Core Dependencies
#### 1.3 Install Dev Dependencies

#### 1.4 Configure TypeScript
Create `tsconfig.json`:
```json
{
  "extends": "@react-native/typescript-config/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@components/*": ["components/*"],
      "@screens/*": ["screens/*"],
      "@services/*": ["services/*"],
      "@utils/*": ["utils/*"],
      "@types/*": ["types/*"],
      "@store/*": ["store/*"]
    }
  }
}
```

#### 1.5 Setup Project Structure
```
src/
├── components/
│   ├── common/
│   └── features/
├── screens/
│   ├── Auth/
│   ├── Dashboard/
│   ├── Scan/
│   ├── History/
│   ├── Statistics/
│   └── Profile/
├── navigation/
├── services/
│   ├── api/
│   └── storage/
├── store/
├── utils/
├── types/
├── constants/
├── hooks/
└── assets/
```

#### 1.6 Configure ESLint & Prettier
Create `.eslintrc.js`:
```javascript
module.exports = {
  root: true,
  extends: '@react-native',
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    'react-native/no-inline-styles': 'warn',
    '@typescript-eslint/no-unused-vars': 'error',
  },
};
```

Create `.prettierrc`:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

#### 1.7 Environment Configuration
Create `.env.example`:
```
API_BASE_URL=http://localhost:3000
CLAUDE_API_KEY=your_api_key_here
```

Install env library:
```bash
npm install react-native-config
```

---

### Backend Setup

#### 1.8 Initialize NestJS Project
```bash
npm i -g @nestjs/cli
nest new diet-manager-backend
cd diet-manager-backend
```

#### 1.9 Install Core Dependencies
```bash
# Database & ORM
npm install @prisma/client
npm install -D prisma

# Authentication
npm install @nestjs/passport passport passport-local
npm install @nestjs/jwt passport-jwt
npm install bcrypt
npm install -D @types/bcrypt @types/passport-jwt

# Validation
npm install class-validator class-transformer

# Configuration
npm install @nestjs/config

# HTTP
npm install @nestjs/axios axios

# File Upload
npm install @nestjs/platform-express multer
npm install -D @types/multer

# API Documentation
npm install @nestjs/swagger swagger-ui-express
```

#### 1.10 Initialize Prisma
```bash
npx prisma init
```

#### 1.11 Configure PostgreSQL
Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id           String      @id @default(uuid())
  email        String      @unique
  passwordHash String
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  profile      UserProfile?
  meals        Meal[]
}

model UserProfile {
  id                 String   @id @default(uuid())
  userId             String   @unique
  age                Int?
  gender             String?
  weight             Float?
  height             Float?
  activityLevel      String?
  goalType           String?
  dailyCalorieGoal   Int
  calculationMethod  String   @default("manual")
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  user               User     @relation(fields: [userId], references: [id])
}

model Meal {
  id          String   @id @default(uuid())
  userId      String
  name        String
  category    String?
  ingredients String[]
  calories    Int
  protein     Float
  fat         Float
  carbs       Float
  portionSize Float
  imageUrl    String?
  source      String   @default("manual")
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id])
}
```

#### 1.12 Setup Backend Project Structure
```
src/
├── auth/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   └── strategies/
├── users/
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── meals/
│   ├── meals.controller.ts
│   ├── meals.service.ts
│   └── meals.module.ts
├── scan/
│   ├── scan.controller.ts
│   ├── scan.service.ts
│   └── scan.module.ts
├── stats/
│   ├── stats.controller.ts
│   ├── stats.service.ts
│   └── stats.module.ts
├── common/
│   ├── decorators/
│   ├── guards/
│   ├── interceptors/
│   └── pipes/
└── prisma/
    ├── prisma.service.ts
    └── prisma.module.ts
```

#### 1.13 Configure Environment Variables
Create `.env.example`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/calorie_tracker"
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRATION=7d
CLAUDE_API_KEY=your_claude_api_key
PORT=3000
```

#### 1.14 Setup Docker for PostgreSQL
Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: calorie_tracker
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### 1.15 Run Initial Migration
```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## ✅ Validation Steps

### Mobile App
1. Run on Android emulator: `npm run android`
2. Verify hot reload works
3. Check TypeScript compilation: `npm run tsc`
4. Run linter: `npm run lint`

### Backend
1. Start server: `npm run start:dev`
2. Verify server runs on http://localhost:3000
3. Check database connection
4. Run Prisma Studio: `npx prisma studio`
5. Verify Swagger docs at http://localhost:3000/api

---

## 📝 Implementation Notes

### Critical Setup Items
- Configure Android AndroidManifest.xml for camera permissions
- Setup absolute imports with babel-plugin-module-resolver
- Configure native module linking for camera and image picker

### Camera Permissions Setup

**Android (android/app/src/main/AndroidManifest.xml):**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### Common Issues & Solutions

**Issue:** Metro bundler cache issues
**Solution:** `npm start -- --reset-cache`

**Issue:** Gradle build failures on Android
**Solution:** Clean build: `cd android && ./gradlew clean`

**Issue:** Database connection fails
**Solution:** Verify PostgreSQL is running and DATABASE_URL is correct

---

## 🔗 Dependencies Between Stories

**Blocks:**
- Story 2: Authentication (needs basic project structure)
- Story 3: AI Recognition (needs project structure)
- All other stories (foundation for everything)

**Depends On:**
- None (this is the first story)

---

## ✅ Definition of Done

- [ ] Mobile app runs on Android
- [ ] Backend server starts without errors
- [ ] Database is accessible and migrations run successfully
- [ ] All dependencies installed and working
- [ ] Project structure matches specification
- [ ] Environment variables configured
- [ ] Basic "Hello World" screens render
- [ ] Git repository initialized with proper .gitignore
- [ ] Documentation updated in README
- [ ] Code passes linting and TypeScript checks

---

**Completion Date:** _________________  
**Completed By:** _________________  
**Notes:** _________________