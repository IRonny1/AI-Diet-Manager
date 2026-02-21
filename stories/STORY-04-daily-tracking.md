# Story 4: Daily Tracking & Meal Logging

**Status:** 🔴 Not Started  
**Priority:** P0 (Critical)  
**Estimated Time:** 6-8 hours

---

## 📋 Overview

Implement daily meal tracking functionality where users can save scanned or manually added meals, view their daily progress toward calorie goals, and see a comprehensive dashboard of today's consumption.

---

## 🎯 Acceptance Criteria

- [ ] Users can save AI-scanned meals to their daily log
- [ ] Users can manually add meals with custom nutritional data
- [ ] Dashboard displays today's meals in chronological order
- [ ] Daily calorie progress indicator shows consumed vs. goal
- [ ] Macros (protein, fat, carbs) progress bars displayed
- [ ] Users can edit saved meals
- [ ] Users can delete meals from daily log
- [ ] Real-time updates when adding/editing/deleting meals
- [ ] Guest users see temporary daily tracking (localStorage)
- [ ] Registered users have persistent daily tracking (database)
- [ ] "Add Food" floating action button for quick access

---

## 🛠️ Technical Tasks

### Backend Implementation

#### 4.1 Create Meals DTOs
`src/meals/dto/create-meal.dto.ts`:
```typescript
import { IsString, IsNumber, IsArray, IsOptional, IsEnum } from 'class-validator';

export class CreateMealDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @IsOptional()
  ingredients?: string[];

  @IsNumber()
  calories: number;

  @IsNumber()
  protein: number;

  @IsNumber()
  fat: number;

  @IsNumber()
  carbs: number;

  @IsNumber()
  portionSize: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsEnum(['ai', 'manual'])
  source: 'ai' | 'manual';
}

export class UpdateMealDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  calories?: number;

  @IsNumber()
  @IsOptional()
  protein?: number;

  @IsNumber()
  @IsOptional()
  fat?: number;

  @IsNumber()
  @IsOptional()
  carbs?: number;

  @IsNumber()
  @IsOptional()
  portionSize?: number;
}
```

#### 4.2 Create Meals Service
`src/meals/meals.service.ts`:
```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMealDto, UpdateMealDto } from './dto/create-meal.dto';

@Injectable()
export class MealsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createMealDto: CreateMealDto) {
    return this.prisma.meal.create({
      data: {
        ...createMealDto,
        userId,
      },
    });
  }

  async findAll(userId: string, date?: Date) {
    const startOfDay = date ? new Date(date.setHours(0, 0, 0, 0)) : new Date(new Date().setHours(0, 0, 0, 0));
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.meal.findMany({
      where: {
        userId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const meal = await this.prisma.meal.findUnique({
      where: { id },
    });

    if (!meal) {
      throw new NotFoundException('Meal not found');
    }

    if (meal.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return meal;
  }

  async update(id: string, userId: string, updateMealDto: UpdateMealDto) {
    const meal = await this.findOne(id, userId);

    return this.prisma.meal.update({
      where: { id: meal.id },
      data: updateMealDto,
    });
  }

  async remove(id: string, userId: string) {
    const meal = await this.findOne(id, userId);

    return this.prisma.meal.delete({
      where: { id: meal.id },
    });
  }

  async getDailyStats(userId: string, date?: Date) {
    const meals = await this.findAll(userId, date);

    const totals = meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        fat: acc.fat + meal.fat,
        carbs: acc.carbs + meal.carbs,
        meals: acc.meals + 1,
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0, meals: 0 }
    );

    return {
      date: date || new Date(),
      totals,
      meals,
    };
  }
}
```

#### 4.3 Create Meals Controller
`src/meals/meals.controller.ts`:
```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { MealsService } from './meals.service';
import { CreateMealDto, UpdateMealDto } from './dto/create-meal.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('meals')
@UseGuards(JwtAuthGuard)
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  @Post()
  create(@Request() req, @Body() createMealDto: CreateMealDto) {
    return this.mealsService.create(req.user.userId, createMealDto);
  }

  @Get()
  findAll(@Request() req, @Query('date') date?: string) {
    const queryDate = date ? new Date(date) : undefined;
    return this.mealsService.findAll(req.user.userId, queryDate);
  }

  @Get('daily')
  getDailyStats(@Request() req, @Query('date') date?: string) {
    const queryDate = date ? new Date(date) : undefined;
    return this.mealsService.getDailyStats(req.user.userId, queryDate);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.mealsService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateMealDto: UpdateMealDto,
  ) {
    return this.mealsService.update(id, req.user.userId, updateMealDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.mealsService.remove(id, req.user.userId);
  }
}
```

#### 4.4 Create Meals Module
`src/meals/meals.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { MealsService } from './meals.service';
import { MealsController } from './meals.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MealsController],
  providers: [MealsService],
})
export class MealsModule {}
```

#### 4.5 Update App Module
Add MealsModule to imports in `src/app.module.ts`

---

### Mobile App Implementation

#### 4.6 Create Meals Types
`src/types/meal.types.ts`:
```typescript
export interface Meal {
  id: string;
  userId: string;
  name: string;
  category?: string;
  ingredients?: string[];
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  portionSize: number;
  imageUrl?: string;
  source: 'ai' | 'manual';
  createdAt: string;
}

export interface CreateMealRequest {
  name: string;
  category?: string;
  ingredients?: string[];
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  portionSize: number;
  imageUrl?: string;
  source: 'ai' | 'manual';
}

export interface DailyStats {
  date: string;
  totals: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    meals: number;
  };
  meals: Meal[];
}
```

#### 4.7 Create Meals API Service
`src/services/api/meals.api.ts`:
```typescript
import apiService from './api.service';
import { Meal, CreateMealRequest, DailyStats } from '../../types/meal.types';

export const mealsApi = {
  create: async (mealData: CreateMealRequest): Promise<Meal> => {
    const response = await apiService.post<Meal>('/meals', mealData);
    return response.data;
  },

  getAll: async (date?: string): Promise<Meal[]> => {
    const params = date ? { date } : {};
    const response = await apiService.get<Meal[]>('/meals', { params });
    return response.data;
  },

  getDailyStats: async (date?: string): Promise<DailyStats> => {
    const params = date ? { date } : {};
    const response = await apiService.get<DailyStats>('/meals/daily', { params });
    return response.data;
  },

  getOne: async (id: string): Promise<Meal> => {
    const response = await apiService.get<Meal>(`/meals/${id}`);
    return response.data;
  },

  update: async (id: string, updates: Partial<CreateMealRequest>): Promise<Meal> => {
    const response = await apiService.patch<Meal>(`/meals/${id}`, updates);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiService.delete(`/meals/${id}`);
  },
};
```

#### 4.8 Create Meals Store
`src/store/meals.store.ts`:
```typescript
import { create } from 'zustand';
import { Meal, DailyStats } from '../types/meal.types';
import { mealsApi } from '../services/api/meals.api';

interface MealsState {
  todaysMeals: Meal[];
  dailyStats: DailyStats | null;
  isLoading: boolean;
  error: string | null;
  
  loadTodaysMeals: () => Promise<void>;
  addMeal: (mealData: any) => Promise<void>;
  updateMeal: (id: string, updates: any) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useMealsStore = create<MealsState>((set, get) => ({
  todaysMeals: [],
  dailyStats: null,
  isLoading: false,
  error: null,

  loadTodaysMeals: async () => {
    try {
      set({ isLoading: true, error: null });
      const stats = await mealsApi.getDailyStats();
      set({
        dailyStats: stats,
        todaysMeals: stats.meals,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to load meals',
        isLoading: false,
      });
    }
  },

  addMeal: async (mealData: any) => {
    try {
      set({ isLoading: true, error: null });
      await mealsApi.create(mealData);
      await get().loadTodaysMeals();
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to add meal',
        isLoading: false,
      });
      throw error;
    }
  },

  updateMeal: async (id: string, updates: any) => {
    try {
      set({ isLoading: true, error: null });
      await mealsApi.update(id, updates);
      await get().loadTodaysMeals();
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update meal',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteMeal: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      await mealsApi.delete(id);
      await get().loadTodaysMeals();
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete meal',
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
```

#### 4.9 Create Dashboard Screen
`src/screens/Dashboard/DashboardScreen.tsx`:
```typescript
import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { FAB, Text } from 'react-native-paper';
import { useMealsStore } from '../../store/meals.store';
import { useAuthStore } from '../../store/auth.store';
import { DailyProgressCard } from '../../components/features/DailyProgressCard';
import { MealListItem } from '../../components/features/MealListItem';

export const DashboardScreen = ({ navigation }: any) => {
  const { todaysMeals, dailyStats, isLoading, loadTodaysMeals } = useMealsStore();
  const { user } = useAuthStore();

  useEffect(() => {
    loadTodaysMeals();
  }, []);

  const handleRefresh = async () => {
    await loadTodaysMeals();
  };

  const handleAddFood = () => {
    navigation.navigate('Scan');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <Text variant="headlineMedium">Today's Intake</Text>
          <Text variant="bodyMedium" style={styles.date}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>

        {dailyStats && (
          <DailyProgressCard
            consumed={dailyStats.totals}
            goal={user?.profile?.dailyCalorieGoal || 2000}
          />
        )}

        <View style={styles.mealsSection}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Meals
          </Text>
          
          {todaysMeals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text variant="bodyLarge" style={styles.emptyText}>
                No meals logged today
              </Text>
              <Text variant="bodySmall" style={styles.emptySubtext}>
                Tap the + button to add your first meal
              </Text>
            </View>
          ) : (
            todaysMeals.map((meal) => (
              <MealListItem
                key={meal.id}
                meal={meal}
                onPress={() => navigation.navigate('MealDetails', { mealId: meal.id })}
              />
            ))
          )}
        </View>
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddFood}
        label="Add Food"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
  },
  date: {
    opacity: 0.6,
    marginTop: 4,
  },
  mealsSection: {
    padding: 20,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginBottom: 8,
  },
  emptySubtext: {
    opacity: 0.6,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
```

#### 4.10 Create Daily Progress Card Component
`src/components/features/DailyProgressCard.tsx`:
```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, ProgressBar } from 'react-native-paper';

interface DailyProgressCardProps {
  consumed: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  goal: number;
}

export const DailyProgressCard: React.FC<DailyProgressCardProps> = ({
  consumed,
  goal,
}) => {
  const calorieProgress = consumed.calories / goal;
  const remaining = Math.max(0, goal - consumed.calories);

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.caloriesContainer}>
          <View style={styles.caloriesInfo}>
            <Text variant="displaySmall" style={styles.caloriesValue}>
              {consumed.calories}
            </Text>
            <Text variant="bodySmall">/ {goal} kcal</Text>
          </View>
          <View style={styles.remainingContainer}>
            <Text variant="titleLarge" style={styles.remainingValue}>
              {remaining}
            </Text>
            <Text variant="bodySmall">remaining</Text>
          </View>
        </View>

        <ProgressBar
          progress={Math.min(calorieProgress, 1)}
          color={calorieProgress > 1 ? '#F44336' : '#4CAF50'}
          style={styles.progressBar}
        />

        <View style={styles.macrosContainer}>
          <View style={styles.macroItem}>
            <Text variant="titleMedium">{consumed.protein}g</Text>
            <Text variant="bodySmall">Protein</Text>
          </View>
          <View style={styles.macroItem}>
            <Text variant="titleMedium">{consumed.fat}g</Text>
            <Text variant="bodySmall">Fat</Text>
          </View>
          <View style={styles.macroItem}>
            <Text variant="titleMedium">{consumed.carbs}g</Text>
            <Text variant="bodySmall">Carbs</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
  },
  caloriesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  caloriesInfo: {
    alignItems: 'flex-start',
  },
  caloriesValue: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  remainingContainer: {
    alignItems: 'flex-end',
  },
  remainingValue: {
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  macroItem: {
    alignItems: 'center',
  },
});
```

#### 4.11 Create Meal List Item Component
`src/components/features/MealListItem.tsx`:
```typescript
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { Meal } from '../../types/meal.types';
import { format } from 'date-fns';

interface MealListItemProps {
  meal: Meal;
  onPress: () => void;
}

export const MealListItem: React.FC<MealListItemProps> = ({ meal, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.info}>
              <Text variant="titleMedium">{meal.name}</Text>
              <Text variant="bodySmall" style={styles.time}>
                {format(new Date(meal.createdAt), 'h:mm a')}
              </Text>
            </View>
            <View style={styles.calories}>
              <Text variant="titleLarge" style={styles.calorieValue}>
                {meal.calories}
              </Text>
              <Text variant="bodySmall">kcal</Text>
            </View>
          </View>
          
          <View style={styles.macros}>
            <Text variant="bodySmall" style={styles.macro}>
              P: {meal.protein}g
            </Text>
            <Text variant="bodySmall" style={styles.macro}>
              F: {meal.fat}g
            </Text>
            <Text variant="bodySmall" style={styles.macro}>
              C: {meal.carbs}g
            </Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  info: {
    flex: 1,
  },
  time: {
    opacity: 0.6,
    marginTop: 2,
  },
  calories: {
    alignItems: 'flex-end',
  },
  calorieValue: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  macros: {
    flexDirection: 'row',
    gap: 16,
  },
  macro: {
    opacity: 0.7,
  },
});
```

#### 4.12 Update Scan Screen to Save Meals
Update `handleSave` in `ScanScreen.tsx`:
```typescript
const handleSave = async () => {
  if (!currentScan) return;

  try {
    const mealData = {
      name: currentScan.name,
      category: currentScan.category,
      ingredients: currentScan.ingredients,
      calories: currentScan.nutrition.calories,
      protein: currentScan.nutrition.protein,
      fat: currentScan.nutrition.fat,
      carbs: currentScan.nutrition.carbs,
      portionSize: currentScan.nutrition.portionSize,
      imageUrl: currentImage || undefined,
      source: 'ai' as const,
    };

    await useMealsStore.getState().addMeal(mealData);
    clearScan();
    navigation.navigate('Dashboard');
  } catch (error) {
    // Error handled in store
  }
};
```

---

## ✅ Testing Checklist

### Backend Tests
- [ ] Create meal via POST /meals
- [ ] Get today's meals via GET /meals
- [ ] Get daily stats via GET /meals/daily
- [ ] Update meal via PATCH /meals/:id
- [ ] Delete meal via DELETE /meals/:id
- [ ] Verify authorization (users can only access their meals)
- [ ] Test date filtering for historical data

### Mobile App Tests
- [ ] Dashboard loads today's meals on mount
- [ ] Progress card calculates totals correctly
- [ ] Add meal from scan saves to database
- [ ] Manual meal entry works
- [ ] Meal list displays all today's meals
- [ ] Tap meal item navigates to details
- [ ] Pull-to-refresh updates data
- [ ] FAB button navigates to scan screen
- [ ] Empty state shows when no meals
- [ ] Progress bar updates in real-time
- [ ] Delete meal removes from list
- [ ] Edit meal updates display

---

## 🔗 Dependencies Between Stories

**Blocks:**
- Story 6: History Storage (uses same meal data model)
- Story 7: Statistics (aggregates meal data)

**Depends On:**
- Story 1: Project Setup ✅
- Story 2: Authentication ✅
- Story 3: AI Recognition ✅

---

## ✅ Definition of Done

- [ ] Users can save AI-scanned meals
- [ ] Users can manually add meals
- [ ] Dashboard displays daily progress
- [ ] All CRUD operations work for meals
- [ ] Real-time updates after add/edit/delete
- [ ] Progress indicators work correctly
- [ ] FAB button for quick access
- [ ] Pull-to-refresh implemented
- [ ] Error handling works
- [ ] Loading states implemented
- [ ] Guest vs registered user flows work
- [ ] Code passes all checks
- [ ] Feature tested end-to-end

---

**Completion Date:** _________________  
**Completed By:** _________________  
**Notes:** _________________