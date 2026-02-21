# Story 5: Personal Goals & Calorie Calculations

**Status:** 🔴 Not Started  
**Priority:** P1 (High)  
**Estimated Time:** 4-6 hours

---

## 📋 Overview

Implement personal goal setting system with automatic calorie calculation using the Mifflin-St Jeor formula, or manual goal entry. Users complete an onboarding wizard after registration and can update their goals anytime.

---

## 🎯 Acceptance Criteria

- [ ] Onboarding wizard appears after registration
- [ ] User can choose between auto-calculation and manual entry
- [ ] Auto-calculation uses Mifflin-St Jeor formula
- [ ] Formula considers: age, gender, weight, height, activity level, goal type
- [ ] Manual entry allows direct calorie goal input
- [ ] Users can edit goals from profile screen
- [ ] Goals persist across sessions
- [ ] Default goal (2000 kcal) set for users who skip onboarding
- [ ] Calculated goals are editable (user can adjust)
- [ ] UI shows explanation of activity levels and goal types

---

## 🛠️ Technical Tasks

### Backend Implementation

#### 5.1 Update User Profile DTOs
`src/users/dto/update-profile.dto.ts`:
```typescript
import { IsNumber, IsString, IsEnum, IsOptional, Min, Max } from 'class-validator';

export class UpdateProfileDto {
  @IsNumber()
  @IsOptional()
  @Min(10)
  @Max(120)
  age?: number;

  @IsEnum(['male', 'female', 'other'])
  @IsOptional()
  gender?: 'male' | 'female' | 'other';

  @IsNumber()
  @IsOptional()
  @Min(20)
  @Max(300)
  weight?: number; // kg

  @IsNumber()
  @IsOptional()
  @Min(100)
  @Max(250)
  height?: number; // cm

  @IsEnum(['sedentary', 'light', 'moderate', 'active', 'very_active'])
  @IsOptional()
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

  @IsEnum(['lose_weight', 'maintain', 'gain_weight'])
  @IsOptional()
  goalType?: 'lose_weight' | 'maintain' | 'gain_weight';

  @IsEnum(['auto', 'manual'])
  @IsOptional()
  calculationMethod?: 'auto' | 'manual';

  @IsNumber()
  @IsOptional()
  @Min(1000)
  @Max(5000)
  dailyCalorieGoal?: number;
}
```

#### 5.2 Create Calorie Calculation Service
`src/users/calorie-calculator.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';

interface CalculationParams {
  age: number;
  gender: 'male' | 'female' | 'other';
  weight: number; // kg
  height: number; // cm
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goalType: 'lose_weight' | 'maintain' | 'gain_weight';
}

@Injectable()
export class CalorieCalculatorService {
  private activityMultipliers = {
    sedentary: 1.2, // Little or no exercise
    light: 1.375, // Light exercise 1-3 days/week
    moderate: 1.55, // Moderate exercise 3-5 days/week
    active: 1.725, // Heavy exercise 6-7 days/week
    very_active: 1.9, // Very heavy exercise & physical job
  };

  private goalAdjustments = {
    lose_weight: -500, // 500 kcal deficit per day (~0.5 kg/week)
    maintain: 0,
    gain_weight: 300, // 300 kcal surplus per day (~0.25 kg/week)
  };

  calculateDailyCalories(params: CalculationParams): number {
    // Mifflin-St Jeor Equation
    let bmr: number;

    if (params.gender === 'male') {
      bmr = 10 * params.weight + 6.25 * params.height - 5 * params.age + 5;
    } else {
      // female or other
      bmr = 10 * params.weight + 6.25 * params.height - 5 * params.age - 161;
    }

    // Apply activity multiplier to get TDEE (Total Daily Energy Expenditure)
    const tdee = bmr * this.activityMultipliers[params.activityLevel];

    // Apply goal adjustment
    const dailyGoal = tdee + this.goalAdjustments[params.goalType];

    // Round to nearest 50
    return Math.round(dailyGoal / 50) * 50;
  }

  validateParams(params: Partial<CalculationParams>): boolean {
    return !!(
      params.age &&
      params.gender &&
      params.weight &&
      params.height &&
      params.activityLevel &&
      params.goalType
    );
  }
}
```

#### 5.3 Create Users Service
`src/users/users.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CalorieCalculatorService } from './calorie-calculator.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private calorieCalculator: CalorieCalculatorService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      profile: user.profile,
    };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    // If auto-calculation, calculate calorie goal
    if (updateProfileDto.calculationMethod === 'auto') {
      const profile = await this.prisma.userProfile.findUnique({
        where: { userId },
      });

      const params = {
        age: updateProfileDto.age ?? profile?.age,
        gender: updateProfileDto.gender ?? profile?.gender,
        weight: updateProfileDto.weight ?? profile?.weight,
        height: updateProfileDto.height ?? profile?.height,
        activityLevel: updateProfileDto.activityLevel ?? profile?.activityLevel,
        goalType: updateProfileDto.goalType ?? profile?.goalType,
      };

      if (this.calorieCalculator.validateParams(params)) {
        updateProfileDto.dailyCalorieGoal = this.calorieCalculator.calculateDailyCalories(
          params as any,
        );
      }
    }

    const updatedProfile = await this.prisma.userProfile.update({
      where: { userId },
      data: updateProfileDto,
    });

    return this.getProfile(userId);
  }

  async updateGoals(userId: string, updates: Partial<UpdateProfileDto>) {
    return this.updateProfile(userId, updates);
  }
}
```

#### 5.4 Create Users Controller
`src/users/users.controller.ts`:
```typescript
import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  getProfile(@Request() req) {
    return this.usersService.getProfile(req.user.userId);
  }

  @Patch('profile')
  updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, updateProfileDto);
  }

  @Patch('goals')
  updateGoals(@Request() req, @Body() updates: Partial<UpdateProfileDto>) {
    return this.usersService.updateGoals(req.user.userId, updates);
  }
}
```

#### 5.5 Create Users Module
`src/users/users.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CalorieCalculatorService } from './calorie-calculator.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UsersService, CalorieCalculatorService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
```

---

### Mobile App Implementation

#### 5.6 Create Profile Types
`src/types/profile.types.ts`:
```typescript
export type Gender = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type GoalType = 'lose_weight' | 'maintain' | 'gain_weight';
export type CalculationMethod = 'auto' | 'manual';

export interface ProfileUpdateRequest {
  age?: number;
  gender?: Gender;
  weight?: number;
  height?: number;
  activityLevel?: ActivityLevel;
  goalType?: GoalType;
  calculationMethod?: CalculationMethod;
  dailyCalorieGoal?: number;
}

export const ACTIVITY_LEVELS = {
  sedentary: {
    label: 'Sedentary',
    description: 'Little or no exercise',
  },
  light: {
    label: 'Lightly Active',
    description: 'Light exercise 1-3 days/week',
  },
  moderate: {
    label: 'Moderately Active',
    description: 'Moderate exercise 3-5 days/week',
  },
  active: {
    label: 'Very Active',
    description: 'Heavy exercise 6-7 days/week',
  },
  very_active: {
    label: 'Extremely Active',
    description: 'Very heavy exercise & physical job',
  },
};

export const GOAL_TYPES = {
  lose_weight: {
    label: 'Lose Weight',
    description: 'Create calorie deficit',
  },
  maintain: {
    label: 'Maintain Weight',
    description: 'Keep current weight',
  },
  gain_weight: {
    label: 'Gain Weight',
    description: 'Create calorie surplus',
  },
};
```

#### 5.7 Create Users API Service
`src/services/api/users.api.ts`:
```typescript
import apiService from './api.service';
import { User } from '../../types/auth.types';
import { ProfileUpdateRequest } from '../../types/profile.types';

export const usersApi = {
  getProfile: async (): Promise<User> => {
    const response = await apiService.get<User>('/users/profile');
    return response.data;
  },

  updateProfile: async (updates: ProfileUpdateRequest): Promise<User> => {
    const response = await apiService.patch<User>('/users/profile', updates);
    return response.data;
  },

  updateGoals: async (updates: Partial<ProfileUpdateRequest>): Promise<User> => {
    const response = await apiService.patch<User>('/users/goals', updates);
    return response.data;
  },
};
```

#### 5.8 Create Onboarding Wizard Screen
`src/screens/Onboarding/OnboardingScreen.tsx`:
```typescript
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Text, SegmentedButtons, TextInput, RadioButton } from 'react-native-paper';
import { usersApi } from '../../services/api/users.api';
import { useAuthStore } from '../../store/auth.store';
import { ACTIVITY_LEVELS, GOAL_TYPES, ActivityLevel, GoalType } from '../../types/profile.types';

export const OnboardingScreen = ({ navigation }: any) => {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<'auto' | 'manual'>('auto');
  
  // Auto calculation fields
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goalType, setGoalType] = useState<GoalType>('maintain');
  
  // Manual entry
  const [manualGoal, setManualGoal] = useState('2000');
  
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2 && method === 'auto') {
      setStep(3);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const updates = {
        calculationMethod: method,
        ...(method === 'auto' ? {
          age: parseInt(age),
          gender,
          weight: parseFloat(weight),
          height: parseFloat(height),
          activityLevel,
          goalType,
        } : {
          dailyCalorieGoal: parseInt(manualGoal),
        }),
      };

      const updatedUser = await usersApi.updateProfile(updates);
      useAuthStore.getState().user = updatedUser;
      
      navigation.replace('Main');
    } catch (error) {
      console.error('Onboarding error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return true;
    if (step === 2) {
      if (method === 'manual') {
        return manualGoal && parseInt(manualGoal) >= 1000;
      }
      return age && gender && weight && height;
    }
    return true;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Step 1: Choose Method */}
        {step === 1 && (
          <>
            <Text variant="headlineMedium" style={styles.title}>
              Set Your Daily Goal
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              How would you like to set your calorie goal?
            </Text>

            <SegmentedButtons
              value={method}
              onValueChange={(value) => setMethod(value as 'auto' | 'manual')}
              buttons={[
                { value: 'auto', label: 'Calculate for me' },
                { value: 'manual', label: 'Enter manually' },
              ]}
              style={styles.segmentedButtons}
            />

            {method === 'auto' && (
              <Text variant="bodySmall" style={styles.info}>
                We'll calculate your ideal calorie goal based on your personal data
              </Text>
            )}
            {method === 'manual' && (
              <Text variant="bodySmall" style={styles.info}>
                Enter your daily calorie goal directly
              </Text>
            )}
          </>
        )}

        {/* Step 2a: Auto - Basic Info */}
        {step === 2 && method === 'auto' && (
          <>
            <Text variant="headlineMedium" style={styles.title}>
              About You
            </Text>

            <TextInput
              label="Age"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />

            <Text variant="titleSmall" style={styles.label}>
              Gender
            </Text>
            <RadioButton.Group
              onValueChange={(value) => setGender(value as 'male' | 'female')}
              value={gender}
            >
              <View style={styles.radioContainer}>
                <RadioButton.Item label="Male" value="male" />
                <RadioButton.Item label="Female" value="female" />
              </View>
            </RadioButton.Group>

            <TextInput
              label="Weight (kg)"
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Height (cm)"
              value={height}
              onChangeText={setHeight}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />
          </>
        )}

        {/* Step 2b: Manual Entry */}
        {step === 2 && method === 'manual' && (
          <>
            <Text variant="headlineMedium" style={styles.title}>
              Daily Calorie Goal
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Enter your target daily calories
            </Text>

            <TextInput
              label="Daily Calories (kcal)"
              value={manualGoal}
              onChangeText={setManualGoal}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />

            <Text variant="bodySmall" style={styles.info}>
              Typical range: 1500-2500 kcal/day
            </Text>
          </>
        )}

        {/* Step 3: Activity & Goal (Auto only) */}
        {step === 3 && (
          <>
            <Text variant="headlineMedium" style={styles.title}>
              Activity & Goals
            </Text>

            <Text variant="titleSmall" style={styles.label}>
              Activity Level
            </Text>
            <RadioButton.Group
              onValueChange={(value) => setActivityLevel(value as ActivityLevel)}
              value={activityLevel}
            >
              {Object.entries(ACTIVITY_LEVELS).map(([key, { label, description }]) => (
                <RadioButton.Item
                  key={key}
                  label={`${label} - ${description}`}
                  value={key}
                />
              ))}
            </RadioButton.Group>

            <Text variant="titleSmall" style={[styles.label, styles.topMargin]}>
              Your Goal
            </Text>
            <RadioButton.Group
              onValueChange={(value) => setGoalType(value as GoalType)}
              value={goalType}
            >
              {Object.entries(GOAL_TYPES).map(([key, { label, description }]) => (
                <RadioButton.Item
                  key={key}
                  label={`${label} - ${description}`}
                  value={key}
                />
              ))}
            </RadioButton.Group>
          </>
        )}

        <View style={styles.actions}>
          {step > 1 && (
            <Button
              mode="outlined"
              onPress={() => setStep(step - 1)}
              style={styles.button}
            >
              Back
            </Button>
          )}
          <Button
            mode="contained"
            onPress={handleNext}
            disabled={!canProceed() || isLoading}
            loading={isLoading && step === (method === 'auto' ? 3 : 2)}
            style={[styles.button, styles.primaryButton]}
          >
            {step === 1 ? 'Next' : step === 3 || (step === 2 && method === 'manual') ? 'Complete' : 'Next'}
          </Button>
        </View>

        <Button
          mode="text"
          onPress={() => navigation.replace('Main')}
          style={styles.skipButton}
        >
          Skip for now
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
    opacity: 0.6,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  info: {
    opacity: 0.6,
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  label: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  topMargin: {
    marginTop: 24,
  },
  radioContainer: {
    flexDirection: 'column',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  button: {
    flex: 1,
  },
  primaryButton: {
    flex: 2,
  },
  skipButton: {
    marginTop: 16,
  },
});
```

#### 5.9 Create Goal Edit Screen
`src/screens/Profile/EditGoalsScreen.tsx`:
```typescript
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Text, TextInput, RadioButton, Switch } from 'react-native-paper';
import { useAuthStore } from '../../store/auth.store';
import { usersApi } from '../../services/api/users.api';
import { ACTIVITY_LEVELS, GOAL_TYPES } from '../../types/profile.types';

export const EditGoalsScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const profile = user?.profile;

  const [isAuto, setIsAuto] = useState(profile?.calculationMethod === 'auto');
  const [age, setAge] = useState(profile?.age?.toString() || '');
  const [weight, setWeight] = useState(profile?.weight?.toString() || '');
  const [height, setHeight] = useState(profile?.height?.toString() || '');
  const [activityLevel, setActivityLevel] = useState(profile?.activityLevel || 'moderate');
  const [goalType, setGoalType] = useState(profile?.goalType || 'maintain');
  const [manualGoal, setManualGoal] = useState(profile?.dailyCalorieGoal?.toString() || '2000');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updates = {
        calculationMethod: isAuto ? ('auto' as const) : ('manual' as const),
        ...(isAuto ? {
          age: parseInt(age),
          weight: parseFloat(weight),
          height: parseFloat(height),
          activityLevel,
          goalType,
        } : {
          dailyCalorieGoal: parseInt(manualGoal),
        }),
      };

      const updatedUser = await usersApi.updateGoals(updates);
      useAuthStore.setState({ user: updatedUser });
      
      navigation.goBack();
    } catch (error) {
      console.error('Update error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.switchContainer}>
          <View>
            <Text variant="titleMedium">Auto-calculate goal</Text>
            <Text variant="bodySmall" style={styles.switchSubtext}>
              Calculate based on your personal data
            </Text>
          </View>
          <Switch value={isAuto} onValueChange={setIsAuto} />
        </View>

        {isAuto ? (
          <>
            <TextInput
              label="Age"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Weight (kg)"
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Height (cm)"
              value={height}
              onChangeText={setHeight}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />

            <Text variant="titleSmall" style={styles.label}>
              Activity Level
            </Text>
            <RadioButton.Group
              onValueChange={setActivityLevel}
              value={activityLevel}
            >
              {Object.entries(ACTIVITY_LEVELS).map(([key, { label }]) => (
                <RadioButton.Item key={key} label={label} value={key} />
              ))}
            </RadioButton.Group>

            <Text variant="titleSmall" style={styles.label}>
              Goal
            </Text>
            <RadioButton.Group onValueChange={setGoalType} value={goalType}>
              {Object.entries(GOAL_TYPES).map(([key, { label }]) => (
                <RadioButton.Item key={key} label={label} value={key} />
              ))}
            </RadioButton.Group>
          </>
        ) : (
          <TextInput
            label="Daily Calorie Goal (kcal)"
            value={manualGoal}
            onChangeText={setManualGoal}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
          />
        )}

        <Button
          mode="contained"
          onPress={handleSave}
          loading={isLoading}
          disabled={isLoading}
          style={styles.saveButton}
        >
          Save Changes
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  switchSubtext: {
    opacity: 0.6,
    marginTop: 4,
  },
  input: {
    marginBottom: 16,
  },
  label: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  saveButton: {
    marginTop: 32,
  },
});
```

---

## ✅ Testing Checklist

### Backend Tests
- [ ] Mifflin-St Jeor calculation is accurate
- [ ] Activity multipliers apply correctly
- [ ] Goal adjustments (deficit/surplus) work
- [ ] Manual goal entry persists
- [ ] Auto-calculation updates when profile changes
- [ ] Validation prevents invalid inputs

### Mobile App Tests
- [ ] Onboarding wizard appears after registration
- [ ] Auto-calculation collects all required data
- [ ] Manual entry works
- [ ] Can skip onboarding (gets default goal)
- [ ] Edit goals screen loads current values
- [ ] Switch between auto/manual modes
- [ ] Saved goals reflect in dashboard immediately
- [ ] Calculated goals are reasonable

---

## 🔗 Dependencies Between Stories

**Blocks:**
- None (other stories can use default goals)

**Depends On:**
- Story 1: Project Setup ✅
- Story 2: Authentication ✅

---

## ✅ Definition of Done

- [ ] Onboarding wizard completed
- [ ] Calorie calculation formula implemented
- [ ] Manual goal entry works
- [ ] Goal editing functional
- [ ] All validations in place
- [ ] UI is intuitive
- [ ] Tested with various inputs
- [ ] Documentation updated

---

**Completion Date:** _________________  
**Completed By:** _________________  
**Notes:** _________________