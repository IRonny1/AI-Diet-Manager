# Story 7: Statistics & Analytics

**Status:** 🔴 Not Started  
**Priority:** P1 (High)  
**Estimated Time:** 5-7 hours

---

## 📋 Overview

Implement comprehensive statistics and analytics features with interactive charts showing weekly and monthly trends, macro distribution, calorie patterns, and goal achievement metrics.

---

## 🎯 Acceptance Criteria

- [ ] Statistics screen with period selector (week/month)
- [ ] Daily calorie trend chart (bar chart)
- [ ] Macro distribution chart (pie chart)
- [ ] Average daily consumption displayed
- [ ] Days over/under goal highlighted
- [ ] Weekly summary cards
- [ ] Monthly summary cards
- [ ] Visual indicators for goal progress
- [ ] Export statistics (bonus feature)
- [ ] Smooth chart animations

---

## 🛠️ Technical Tasks

### Backend Implementation

#### 7.1 Create Stats Service
`src/stats/stats.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getWeeklyStats(userId: string, date: Date = new Date()) {
    const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
    const end = endOfWeek(date, { weekStartsOn: 1 });

    return this.getStatsForPeriod(userId, start, end);
  }

  async getMonthlyStats(userId: string, date: Date = new Date()) {
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    return this.getStatsForPeriod(userId, start, end);
  }

  private async getStatsForPeriod(userId: string, start: Date, end: Date) {
    const meals = await this.prisma.meal.findMany({
      where: {
        userId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Get user's daily goal
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    const dailyGoal = profile?.dailyCalorieGoal || 2000;

    // Group meals by day
    const days = eachDayOfInterval({ start, end });
    const dailyData = days.map(day => {
      const dayString = format(day, 'yyyy-MM-dd');
      const dayMeals = meals.filter(meal => 
        format(new Date(meal.createdAt), 'yyyy-MM-dd') === dayString
      );

      const totals = dayMeals.reduce(
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
        date: dayString,
        ...totals,
        goalAchievement: dailyGoal > 0 ? (totals.calories / dailyGoal) * 100 : 0,
        overGoal: totals.calories > dailyGoal,
        underGoal: totals.calories < dailyGoal * 0.9, // 10% under
      };
    });

    // Calculate overall stats
    const totalCalories = dailyData.reduce((sum, day) => sum + day.calories, 0);
    const totalProtein = dailyData.reduce((sum, day) => sum + day.protein, 0);
    const totalFat = dailyData.reduce((sum, day) => sum + day.fat, 0);
    const totalCarbs = dailyData.reduce((sum, day) => sum + day.carbs, 0);
    const totalMeals = dailyData.reduce((sum, day) => sum + day.meals, 0);
    
    const daysWithMeals = dailyData.filter(day => day.meals > 0).length;
    const avgCalories = daysWithMeals > 0 ? Math.round(totalCalories / daysWithMeals) : 0;
    const avgMealsPerDay = daysWithMeals > 0 ? totalMeals / daysWithMeals : 0;

    const daysOverGoal = dailyData.filter(day => day.overGoal).length;
    const daysUnderGoal = dailyData.filter(day => day.underGoal).length;
    const daysOnTarget = daysWithMeals - daysOverGoal - daysUnderGoal;

    return {
      period: {
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
      },
      dailyGoal,
      dailyData,
      summary: {
        totalCalories,
        totalProtein: Math.round(totalProtein),
        totalFat: Math.round(totalFat),
        totalCarbs: Math.round(totalCarbs),
        totalMeals,
        avgCalories,
        avgProtein: daysWithMeals > 0 ? Math.round(totalProtein / daysWithMeals) : 0,
        avgFat: daysWithMeals > 0 ? Math.round(totalFat / daysWithMeals) : 0,
        avgCarbs: daysWithMeals > 0 ? Math.round(totalCarbs / daysWithMeals) : 0,
        avgMealsPerDay: Math.round(avgMealsPerDay * 10) / 10,
        daysWithMeals,
        daysOverGoal,
        daysUnderGoal,
        daysOnTarget,
      },
    };
  }
}
```

#### 7.2 Create Stats Controller
`src/stats/stats.controller.ts`:
```typescript
import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get('weekly')
  getWeeklyStats(@Request() req, @Query('date') date?: string) {
    const queryDate = date ? new Date(date) : new Date();
    return this.statsService.getWeeklyStats(req.user.userId, queryDate);
  }

  @Get('monthly')
  getMonthlyStats(@Request() req, @Query('date') date?: string) {
    const queryDate = date ? new Date(date) : new Date();
    return this.statsService.getMonthlyStats(req.user.userId, queryDate);
  }
}
```

#### 7.3 Create Stats Module
`src/stats/stats.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [StatsService],
  controllers: [StatsController],
})
export class StatsModule {}
```

Install date-fns:
```bash
npm install date-fns
```

---

### Mobile App Implementation

#### 7.4 Create Stats Types
`src/types/stats.types.ts`:
```typescript
export interface DailyStatsData {
  date: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  meals: number;
  goalAchievement: number;
  overGoal: boolean;
  underGoal: boolean;
}

export interface StatsSummary {
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  totalMeals: number;
  avgCalories: number;
  avgProtein: number;
  avgFat: number;
  avgCarbs: number;
  avgMealsPerDay: number;
  daysWithMeals: number;
  daysOverGoal: number;
  daysUnderGoal: number;
  daysOnTarget: number;
}

export interface StatsResponse {
  period: {
    start: string;
    end: string;
  };
  dailyGoal: number;
  dailyData: DailyStatsData[];
  summary: StatsSummary;
}
```

#### 7.5 Create Stats API Service
`src/services/api/stats.api.ts`:
```typescript
import apiService from './api.service';
import { StatsResponse } from '../../types/stats.types';

export const statsApi = {
  getWeeklyStats: async (date?: string): Promise<StatsResponse> => {
    const params = date ? { date } : {};
    const response = await apiService.get<StatsResponse>('/stats/weekly', { params });
    return response.data;
  },

  getMonthlyStats: async (date?: string): Promise<StatsResponse> => {
    const params = date ? { date } : {};
    const response = await apiService.get<StatsResponse>('/stats/monthly', { params });
    return response.data;
  },
};
```

#### 7.6 Create Stats Store
`src/store/stats.store.ts`:
```typescript
import { create } from 'zustand';
import { StatsResponse } from '../types/stats.types';
import { statsApi } from '../services/api/stats.api';

type Period = 'week' | 'month';

interface StatsState {
  weeklyStats: StatsResponse | null;
  monthlyStats: StatsResponse | null;
  currentPeriod: Period;
  isLoading: boolean;
  error: string | null;
  
  loadWeeklyStats: (date?: string) => Promise<void>;
  loadMonthlyStats: (date?: string) => Promise<void>;
  setPeriod: (period: Period) => void;
  clearError: () => void;
}

export const useStatsStore = create<StatsState>((set) => ({
  weeklyStats: null,
  monthlyStats: null,
  currentPeriod: 'week',
  isLoading: false,
  error: null,

  loadWeeklyStats: async (date?: string) => {
    try {
      set({ isLoading: true, error: null });
      const stats = await statsApi.getWeeklyStats(date);
      set({ weeklyStats: stats, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to load weekly stats',
        isLoading: false,
      });
    }
  },

  loadMonthlyStats: async (date?: string) => {
    try {
      set({ isLoading: true, error: null });
      const stats = await statsApi.getMonthlyStats(date);
      set({ monthlyStats: stats, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to load monthly stats',
        isLoading: false,
      });
    }
  },

  setPeriod: (period: Period) => set({ currentPeriod: period }),
  clearError: () => set({ error: null }),
}));
```

#### 7.7 Install Chart Library
```bash
npm install react-native-chart-kit
npm install react-native-svg
```

#### 7.8 Create Statistics Screen
`src/screens/Statistics/StatisticsScreen.tsx`:
```typescript
import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SegmentedButtons, Text, Card } from 'react-native-paper';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { useStatsStore } from '../../store/stats.store';
import { format } from 'date-fns';

const screenWidth = Dimensions.get('window').width;

export const StatisticsScreen = () => {
  const {
    weeklyStats,
    monthlyStats,
    currentPeriod,
    isLoading,
    loadWeeklyStats,
    loadMonthlyStats,
    setPeriod,
  } = useStatsStore();

  useEffect(() => {
    if (currentPeriod === 'week') {
      loadWeeklyStats();
    } else {
      loadMonthlyStats();
    }
  }, [currentPeriod]);

  const stats = currentPeriod === 'week' ? weeklyStats : monthlyStats;

  if (!stats) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const chartData = {
    labels: stats.dailyData.map(day => format(new Date(day.date), 'MMM d')),
    datasets: [{
      data: stats.dailyData.map(day => day.calories),
    }],
  };

  const macrosData = [
    {
      name: 'Protein',
      population: stats.summary.totalProtein,
      color: '#2196F3',
      legendFontColor: '#000',
    },
    {
      name: 'Fat',
      population: stats.summary.totalFat,
      color: '#FF9800',
      legendFontColor: '#000',
    },
    {
      name: 'Carbs',
      population: stats.summary.totalCarbs,
      color: '#4CAF50',
      legendFontColor: '#000',
    },
  ];

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <SegmentedButtons
          value={currentPeriod}
          onValueChange={(value) => setPeriod(value as 'week' | 'month')}
          buttons={[
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
          ]}
          style={styles.periodSelector}
        />

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <Card style={styles.summaryCard}>
            <Card.Content>
              <Text variant="bodySmall" style={styles.summaryLabel}>
                Avg Calories
              </Text>
              <Text variant="headlineMedium" style={styles.summaryValue}>
                {stats.summary.avgCalories}
              </Text>
              <Text variant="bodySmall">per day</Text>
            </Card.Content>
          </Card>

          <Card style={styles.summaryCard}>
            <Card.Content>
              <Text variant="bodySmall" style={styles.summaryLabel}>
                Total Meals
              </Text>
              <Text variant="headlineMedium" style={styles.summaryValue}>
                {stats.summary.totalMeals}
              </Text>
              <Text variant="bodySmall">
                {stats.summary.avgMealsPerDay}/day
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Daily Calories Chart */}
        <Card style={styles.chartCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.chartTitle}>
              Daily Calories
            </Text>
            <BarChart
              data={chartData}
              width={screenWidth - 64}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              showValuesOnTopOfBars
            />
          </Card.Content>
        </Card>

        {/* Macros Distribution */}
        <Card style={styles.chartCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.chartTitle}>
              Macro Distribution
            </Text>
            <PieChart
              data={macrosData}
              width={screenWidth - 64}
              height={200}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
            <View style={styles.macrosLegend}>
              <View style={styles.legendItem}>
                <Text variant="bodyMedium">Protein: {stats.summary.totalProtein}g</Text>
              </View>
              <View style={styles.legendItem}>
                <Text variant="bodyMedium">Fat: {stats.summary.totalFat}g</Text>
              </View>
              <View style={styles.legendItem}>
                <Text variant="bodyMedium">Carbs: {stats.summary.totalCarbs}g</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Goal Achievement */}
        <Card style={styles.chartCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.chartTitle}>
              Goal Achievement
            </Text>
            <View style={styles.achievementGrid}>
              <View style={styles.achievementItem}>
                <Text variant="displaySmall" style={[styles.achievementValue, { color: '#4CAF50' }]}>
                  {stats.summary.daysOnTarget}
                </Text>
                <Text variant="bodySmall">On Target</Text>
              </View>
              <View style={styles.achievementItem}>
                <Text variant="displaySmall" style={[styles.achievementValue, { color: '#FF9800' }]}>
                  {stats.summary.daysOverGoal}
                </Text>
                <Text variant="bodySmall">Over Goal</Text>
              </View>
              <View style={styles.achievementItem}>
                <Text variant="displaySmall" style={[styles.achievementValue, { color: '#F44336' }]}>
                  {stats.summary.daysUnderGoal}
                </Text>
                <Text variant="bodySmall">Under Goal</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Average Macros */}
        <Card style={styles.chartCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.chartTitle}>
              Average Daily Macros
            </Text>
            <View style={styles.macrosGrid}>
              <View style={styles.macroStat}>
                <Text variant="headlineMedium">{stats.summary.avgProtein}g</Text>
                <Text variant="bodySmall">Protein</Text>
              </View>
              <View style={styles.macroStat}>
                <Text variant="headlineMedium">{stats.summary.avgFat}g</Text>
                <Text variant="bodySmall">Fat</Text>
              </View>
              <View style={styles.macroStat}>
                <Text variant="headlineMedium">{stats.summary.avgCarbs}g</Text>
                <Text variant="bodySmall">Carbs</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  periodSelector: {
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
  },
  summaryLabel: {
    opacity: 0.6,
    marginBottom: 4,
  },
  summaryValue: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  chartCard: {
    marginBottom: 16,
  },
  chartTitle: {
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  macrosLegend: {
    marginTop: 16,
  },
  legendItem: {
    marginBottom: 8,
  },
  achievementGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  achievementItem: {
    alignItems: 'center',
  },
  achievementValue: {
    fontWeight: 'bold',
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  macroStat: {
    alignItems: 'center',
  },
});
```

---

## ✅ Testing Checklist

### Backend Tests
- [ ] Weekly stats calculation correct
- [ ] Monthly stats calculation correct
- [ ] Daily data properly grouped
- [ ] Goal achievement calculations accurate
- [ ] Average calculations correct
- [ ] Handles empty periods gracefully

### Mobile App Tests
- [ ] Statistics load on screen mount
- [ ] Toggle between week/month works
- [ ] Charts render correctly
- [ ] Summary cards display accurate data
- [ ] Goal achievement shows correct counts
- [ ] Charts handle empty data
- [ ] Smooth animations
- [ ] Performance with large datasets

---

## 🔗 Dependencies Between Stories

**Blocks:**
- None (final analytics feature)

**Depends On:**
- Story 1: Project Setup ✅
- Story 2: Authentication ✅
- Story 4: Daily Tracking ✅
- Story 6: History Storage ✅

---

## ✅ Definition of Done

- [ ] Weekly and monthly views implemented
- [ ] Bar chart shows daily calories
- [ ] Pie chart shows macro distribution
- [ ] Summary statistics displayed
- [ ] Goal achievement metrics shown
- [ ] Period selector works
- [ ] Charts animate smoothly
- [ ] Data accuracy verified
- [ ] Performance tested
- [ ] Code reviewed

---

**Completion Date:** _________________  
**Completed By:** _________________  
**Notes:** _________________