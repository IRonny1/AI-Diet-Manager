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
```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

`src/prisma/prisma.module.ts`:
```typescript
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

#### 2.2 Create Auth DTOs
`src/auth/dto/register.dto.ts`:
```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
```

`src/auth/dto/login.dto.ts`:
```typescript
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

#### 2.3 Create JWT Strategy
`src/auth/strategies/jwt.strategy.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, email: payload.email };
  }
}
```

#### 2.4 Create JWT Guard
`src/common/guards/jwt-auth.guard.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

#### 2.5 Create Auth Service
`src/auth/auth.service.ts`:
```typescript
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash: hashedPassword,
        profile: {
          create: {
            dailyCalorieGoal: 2000, // Default goal
            calculationMethod: 'manual',
          },
        },
      },
      include: {
        profile: true,
      },
    });

    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile,
      },
      token,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: { profile: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile,
      },
      token,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      profile: user.profile,
    };
  }

  private generateToken(userId: string, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }
}
```

#### 2.6 Create Auth Controller
`src/auth/auth.controller.ts`:
```typescript
import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.userId);
  }
}
```

#### 2.7 Configure Auth Module
`src/auth/auth.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION', '7d'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

#### 2.8 Update App Module
`src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
  ],
})
export class AppModule {}
```

---

### Mobile App Implementation

#### 2.9 Create Auth Types
`src/types/auth.types.ts`:
```typescript
export interface User {
  id: string;
  email: string;
  profile: UserProfile;
}

export interface UserProfile {
  id: string;
  userId: string;
  age?: number;
  gender?: string;
  weight?: number;
  height?: number;
  activityLevel?: string;
  goalType?: string;
  dailyCalorieGoal: number;
  calculationMethod: 'auto' | 'manual';
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
}
```

#### 2.10 Create API Service
`src/services/api/api.service.ts`:
```typescript
import axios, { AxiosInstance } from 'axios';
import { getToken, saveToken, removeToken } from '../storage/storage.service';
import Config from 'react-native-config';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: Config.API_BASE_URL || 'http://localhost:3000',
      timeout: 10000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await removeToken();
          // Redirect to login or emit event
        }
        return Promise.reject(error);
      }
    );
  }

  get<T>(url: string, config = {}) {
    return this.client.get<T>(url, config);
  }

  post<T>(url: string, data: any, config = {}) {
    return this.client.post<T>(url, data, config);
  }

  patch<T>(url: string, data: any, config = {}) {
    return this.client.patch<T>(url, data, config);
  }

  delete<T>(url: string, config = {}) {
    return this.client.delete<T>(url, config);
  }
}

export default new ApiService();
```

#### 2.11 Create Auth API Service
`src/services/api/auth.api.ts`:
```typescript
import apiService from './api.service';
import {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  User,
} from '../../types/auth.types';

export const authApi = {
  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await apiService.post<AuthResponse>('/auth/register', credentials);
    return response.data;
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiService.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await apiService.get<User>('/auth/me');
    return response.data;
  },
};
```

#### 2.12 Create Storage Service
`src/services/storage/storage.service.ts`:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@calorie_tracker_token';
const USER_KEY = '@calorie_tracker_user';

export const saveToken = async (token: string): Promise<void> => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const getToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(TOKEN_KEY);
};

export const removeToken = async (): Promise<void> => {
  await AsyncStorage.removeItem(TOKEN_KEY);
};

export const saveUser = async (user: any): Promise<void> => {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = async (): Promise<any | null> => {
  const userData = await AsyncStorage.getItem(USER_KEY);
  return userData ? JSON.parse(userData) : null;
};

export const removeUser = async (): Promise<void> => {
  await AsyncStorage.removeItem(USER_KEY);
};
```

#### 2.13 Create Auth Store (Zustand)
`src/store/auth.store.ts`:
```typescript
import { create } from 'zustand';
import { User } from '../types/auth.types';
import { authApi } from '../services/api/auth.api';
import { saveToken, getToken, removeToken, saveUser, getUser, removeUser } from '../services/storage/storage.service';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.login({ email, password });
      
      await saveToken(response.token);
      await saveUser(response.user);
      
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.register({ email, password });
      
      await saveToken(response.token);
      await saveUser(response.user);
      
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Registration failed',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    await removeToken();
    await removeUser();
    set({
      user: null,
      isAuthenticated: false,
    });
  },

  loadUser: async () => {
    try {
      const token = await getToken();
      if (!token) {
        set({ isAuthenticated: false });
        return;
      }

      const user = await getUser();
      if (user) {
        set({ user, isAuthenticated: true });
      } else {
        // Try to fetch from API
        const fetchedUser = await authApi.getProfile();
        await saveUser(fetchedUser);
        set({ user: fetchedUser, isAuthenticated: true });
      }
    } catch (error) {
      await removeToken();
      await removeUser();
      set({ isAuthenticated: false, user: null });
    }
  },

  clearError: () => set({ error: null }),
}));
```

#### 2.14 Create Login Screen
`src/screens/Auth/LoginScreen.tsx`:
```typescript
import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useAuthStore } from '../../store/auth.store';

export const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    clearError();
    try {
      await login(email, password);
      // Navigation will be handled by auth state change
    } catch (err) {
      // Error is handled in store
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text variant="headlineLarge" style={styles.title}>
          Welcome Back
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Sign in to continue
        </Text>

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          mode="outlined"
        />

        {error && (
          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>
        )}

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
        >
          Sign In
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('Register')}
          style={styles.linkButton}
        >
          Don't have an account? Sign Up
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 32,
    textAlign: 'center',
    opacity: 0.6,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
    paddingVertical: 6,
  },
  linkButton: {
    marginTop: 8,
  },
});
```

#### 2.15 Create Register Screen
`src/screens/Auth/RegisterScreen.tsx`:
```typescript
import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useAuthStore } from '../../store/auth.store';

export const RegisterScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const { register, isLoading, error, clearError } = useAuthStore();

  const handleRegister = async () => {
    clearError();
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    try {
      await register(email, password);
      // Navigation will be handled by auth state change
    } catch (err) {
      // Error is handled in store
    }
  };

  const displayError = error || localError;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text variant="headlineLarge" style={styles.title}>
          Create Account
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Sign up to get started
        </Text>

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          mode="outlined"
        />

        <TextInput
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          style={styles.input}
          mode="outlined"
        />

        {displayError && (
          <HelperText type="error" visible={!!displayError}>
            {displayError}
          </HelperText>
        )}

        <Button
          mode="contained"
          onPress={handleRegister}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
        >
          Sign Up
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          style={styles.linkButton}
        >
          Already have an account? Sign In
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 32,
    textAlign: 'center',
    opacity: 0.6,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
    paddingVertical: 6,
  },
  linkButton: {
    marginTop: 8,
  },
});
```

#### 2.16 Create Auth Navigation
`src/navigation/AuthNavigator.tsx`:
```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/Auth/LoginScreen';
import { RegisterScreen } from '../screens/Auth/RegisterScreen';

const Stack = createNativeStackNavigator();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};
```

#### 2.17 Create Root Navigator
`src/navigation/RootNavigator.tsx`:
```typescript
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { useAuthStore } from '../store/auth.store';
import { View, ActivityIndicator } from 'react-native';

// MainNavigator will be created in Story 4
const MainNavigator = () => <View><Text>Main App</Text></View>;

export const RootNavigator = () => {
  const { isAuthenticated, loadUser } = useAuthStore();
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    loadUser().finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};
```

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