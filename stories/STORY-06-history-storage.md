# Story 6: History & Meal Storage

**Status:** 🔴 Not Started  
**Priority:** P1 (High)  
**Estimated Time:** 4-5 hours

---

## 📋 Overview

Implement comprehensive meal history view with calendar navigation, filtering, search, and detailed meal view. Users can browse their historical food logs and manage past entries.

---

## 🎯 Acceptance Criteria

- [ ] History screen displays meals grouped by date
- [ ] Calendar view for date navigation
- [ ] Filter by date range
- [ ] Search meals by name
- [ ] View detailed meal information
- [ ] Edit historical meals
- [ ] Delete historical meals with confirmation
- [ ] Infinite scroll for older meals
- [ ] Empty states for no data
- [ ] Pull-to-refresh updates history

---

## 🛠️ Technical Tasks

### Backend Implementation

#### 6.1 Extend Meals Service with History Features
`src/meals/meals.service.ts` (add methods):
```typescript
async findByDateRange(
  userId: string,
  startDate: Date,
  endDate: Date,
) {
  return this.prisma.meal.findMany({
    where: {
      userId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

async searchMeals(userId: string, query: string) {
  return this.prisma.meal.findMany({
    where: {
      userId,
      name: {
        contains: query,
        mode: 'insensitive',
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
  });
}

async getHistory(
  userId: string,
  page: number = 1,
  limit: number = 20,
) {
  const skip = (page - 1) * limit;

  const [meals, total] = await Promise.all([
    this.prisma.meal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    this.prisma.meal.count({
      where: { userId },
    }),
  ]);

  return {
    meals,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}
```

#### 6.2 Update Meals Controller
`src/meals/meals.controller.ts` (add endpoints):
```typescript
@Get('history')
getHistory(
  @Request() req,
  @Query('page') page?: string,
  @Query('limit') limit?: string,
) {
  return this.mealsService.getHistory(
    req.user.userId,
    page ? parseInt(page) : 1,
    limit ? parseInt(limit) : 20,
  );
}

@Get('search')
searchMeals(@Request() req, @Query('q') query: string) {
  return this.mealsService.searchMeals(req.user.userId, query);
}

@Get('range')
findByDateRange(
  @Request() req,
  @Query('start') start: string,
  @Query('end') end: string,
) {
  return this.mealsService.findByDateRange(
    req.user.userId,
    new Date(start),
    new Date(end),
  );
}
```

---

### Mobile App Implementation

#### 6.3 Create History API Service
`src/services/api/history.api.ts`:
```typescript
import apiService from './api.service';
import { Meal } from '../../types/meal.types';

export interface HistoryResponse {
  meals: Meal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export const historyApi = {
  getHistory: async (page: number = 1, limit: number = 20): Promise<HistoryResponse> => {
    const response = await apiService.get<HistoryResponse>('/meals/history', {
      params: { page, limit },
    });
    return response.data;
  },

  getMealsByDateRange: async (startDate: string, endDate: string): Promise<Meal[]> => {
    const response = await apiService.get<Meal[]>('/meals/range', {
      params: { start: startDate, end: endDate },
    });
    return response.data;
  },

  searchMeals: async (query: string): Promise<Meal[]> => {
    const response = await apiService.get<Meal[]>('/meals/search', {
      params: { q: query },
    });
    return response.data;
  },
};
```

#### 6.4 Create History Store
`src/store/history.store.ts`:
```typescript
import { create } from 'zustand';
import { Meal } from '../types/meal.types';
import { historyApi, HistoryResponse } from '../services/api/history.api';

interface HistoryState {
  meals: Meal[];
  mealsByDate: { [date: string]: Meal[] };
  currentPage: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  
  loadHistory: () => Promise<void>;
  loadMore: () => Promise<void>;
  searchMeals: (query: string) => Promise<void>;
  getMealsByDateRange: (startDate: string, endDate: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  meals: [],
  mealsByDate: {},
  currentPage: 1,
  hasMore: true,
  isLoading: false,
  isLoadingMore: false,
  error: null,

  loadHistory: async () => {
    try {
      set({ isLoading: true, error: null, currentPage: 1 });
      const response = await historyApi.getHistory(1);
      
      const grouped = groupMealsByDate(response.meals);
      
      set({
        meals: response.meals,
        mealsByDate: grouped,
        hasMore: response.pagination.hasMore,
        currentPage: 1,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to load history',
        isLoading: false,
      });
    }
  },

  loadMore: async () => {
    const { currentPage, hasMore, isLoadingMore } = get();
    
    if (!hasMore || isLoadingMore) return;

    try {
      set({ isLoadingMore: true, error: null });
      const nextPage = currentPage + 1;
      const response = await historyApi.getHistory(nextPage);
      
      const existingMeals = get().meals;
      const allMeals = [...existingMeals, ...response.meals];
      const grouped = groupMealsByDate(allMeals);
      
      set({
        meals: allMeals,
        mealsByDate: grouped,
        hasMore: response.pagination.hasMore,
        currentPage: nextPage,
        isLoadingMore: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to load more',
        isLoadingMore: false,
      });
    }
  },

  searchMeals: async (query: string) => {
    try {
      set({ isLoading: true, error: null });
      const meals = await historyApi.searchMeals(query);
      const grouped = groupMealsByDate(meals);
      
      set({
        meals,
        mealsByDate: grouped,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Search failed',
        isLoading: false,
      });
    }
  },

  getMealsByDateRange: async (startDate: string, endDate: string) => {
    try {
      set({ isLoading: true, error: null });
      const meals = await historyApi.getMealsByDateRange(startDate, endDate);
      const grouped = groupMealsByDate(meals);
      
      set({
        meals,
        mealsByDate: grouped,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to load date range',
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
  
  reset: () => set({
    meals: [],
    mealsByDate: {},
    currentPage: 1,
    hasMore: true,
    error: null,
  }),
}));

function groupMealsByDate(meals: Meal[]): { [date: string]: Meal[] } {
  return meals.reduce((acc, meal) => {
    const date = new Date(meal.createdAt).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(meal);
    return acc;
  }, {} as { [date: string]: Meal[] });
}
```

#### 6.5 Create History Screen
`src/screens/History/HistoryScreen.tsx`:
```typescript
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, SectionList } from 'react-native';
import { Searchbar, Text, ActivityIndicator } from 'react-native-paper';
import { useHistoryStore } from '../../store/history.store';
import { MealListItem } from '../../components/features/MealListItem';
import { format } from 'date-fns';

export const HistoryScreen = ({ navigation }: any) => {
  const {
    mealsByDate,
    isLoading,
    isLoadingMore,
    hasMore,
    loadHistory,
    loadMore,
    searchMeals,
  } = useHistoryStore();

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length > 0) {
      searchMeals(query);
    } else {
      loadHistory();
    }
  };

  const sections = Object.entries(mealsByDate).map(([date, meals]) => ({
    title: formatSectionTitle(date),
    data: meals,
  }));

  const renderSectionHeader = ({ section }: any) => (
    <View style={styles.sectionHeader}>
      <Text variant="titleMedium">{section.title}</Text>
    </View>
  );

  const renderItem = ({ item }: any) => (
    <MealListItem
      meal={item}
      onPress={() => navigation.navigate('MealDetails', { mealId: item.id })}
    />
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <Text variant="bodyLarge">
          {searchQuery ? 'No meals found' : 'No meal history yet'}
        </Text>
        <Text variant="bodySmall" style={styles.emptySubtext}>
          {searchQuery
            ? 'Try a different search term'
            : 'Start logging meals to see your history'}
        </Text>
      </View>
    );
  };

  if (isLoading && sections.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search meals..."
        onChangeText={handleSearch}
        value={searchQuery}
        style={styles.searchBar}
      />

      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={() => {
          if (hasMore && !isLoadingMore && !searchQuery) {
            loadMore();
          }
        }}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
};

function formatSectionTitle(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateString === today.toISOString().split('T')[0]) {
    return 'Today';
  } else if (dateString === yesterday.toISOString().split('T')[0]) {
    return 'Yesterday';
  } else {
    return format(date, 'EEEE, MMMM d');
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    margin: 16,
    marginBottom: 8,
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  sectionHeader: {
    paddingVertical: 12,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptySubtext: {
    opacity: 0.6,
    marginTop: 8,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
```

#### 6.6 Create Meal Details Screen
`src/screens/History/MealDetailsScreen.tsx`:
```typescript
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { Button, Text, Card, IconButton } from 'react-native-paper';
import { mealsApi } from '../../services/api/meals.api';
import { useMealsStore } from '../../store/meals.store';
import { Meal } from '../../types/meal.types';
import { format } from 'date-fns';

export const MealDetailsScreen = ({ route, navigation }: any) => {
  const { mealId } = route.params;
  const [meal, setMeal] = useState<Meal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { deleteMeal } = useMealsStore();

  useEffect(() => {
    loadMeal();
  }, [mealId]);

  const loadMeal = async () => {
    try {
      const data = await mealsApi.getOne(mealId);
      setMeal(data);
    } catch (error) {
      console.error('Error loading meal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Meal',
      'Are you sure you want to delete this meal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMeal(mealId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete meal');
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    navigation.navigate('EditMeal', { meal });
  };

  if (isLoading || !meal) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {meal.imageUrl && (
          <Image
            source={{ uri: meal.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        )}

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.header}>
              <View style={styles.headerInfo}>
                <Text variant="headlineSmall">{meal.name}</Text>
                <Text variant="bodySmall" style={styles.date}>
                  {format(new Date(meal.createdAt), 'EEEE, MMM d, h:mm a')}
                </Text>
              </View>
              <View style={styles.actions}>
                <IconButton icon="pencil" onPress={handleEdit} />
                <IconButton icon="delete" onPress={handleDelete} />
              </View>
            </View>

            {meal.category && (
              <Text variant="bodyMedium" style={styles.category}>
                {meal.category}
              </Text>
            )}

            {meal.ingredients && meal.ingredients.length > 0 && (
              <View style={styles.section}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  Ingredients
                </Text>
                <Text variant="bodyMedium">{meal.ingredients.join(', ')}</Text>
              </View>
            )}

            <View style={styles.section}>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Nutritional Information
              </Text>
              
              <View style={styles.nutritionGrid}>
                <View style={styles.nutritionItem}>
                  <Text variant="displaySmall" style={styles.calorieValue}>
                    {meal.calories}
                  </Text>
                  <Text variant="bodySmall">kcal</Text>
                </View>
                
                <View style={styles.macrosContainer}>
                  <View style={styles.macroItem}>
                    <Text variant="titleLarge">{meal.protein}g</Text>
                    <Text variant="bodySmall">Protein</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text variant="titleLarge">{meal.fat}g</Text>
                    <Text variant="bodySmall">Fat</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text variant="titleLarge">{meal.carbs}g</Text>
                    <Text variant="bodySmall">Carbs</Text>
                  </View>
                </View>
              </View>

              <Text variant="bodySmall" style={styles.portionText}>
                Per {meal.portionSize}g serving
              </Text>
            </View>

            <View style={styles.metaSection}>
              <Text variant="bodySmall" style={styles.metaText}>
                Source: {meal.source === 'ai' ? 'AI Scan' : 'Manual Entry'}
              </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerInfo: {
    flex: 1,
  },
  date: {
    opacity: 0.6,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
  },
  category: {
    opacity: 0.6,
    marginBottom: 16,
  },
  section: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  nutritionGrid: {
    flexDirection: 'row',
    paddingVertical: 16,
  },
  nutritionItem: {
    flex: 1,
    alignItems: 'center',
  },
  calorieValue: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  macrosContainer: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  portionText: {
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 8,
  },
  metaSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  metaText: {
    opacity: 0.6,
  },
});
```

---

## ✅ Testing Checklist

### Backend Tests
- [ ] Get history with pagination
- [ ] Search meals by name
- [ ] Filter meals by date range
- [ ] Pagination works correctly (hasMore, page numbers)
- [ ] Large datasets load efficiently

### Mobile App Tests
- [ ] History loads on screen mount
- [ ] Meals grouped by date correctly
- [ ] Section headers show "Today", "Yesterday", dates
- [ ] Search filters meals in real-time
- [ ] Clear search shows all meals again
- [ ] Infinite scroll loads more meals
- [ ] Pull-to-refresh updates data
- [ ] Tap meal opens details
- [ ] Edit meal from details works
- [ ] Delete meal with confirmation
- [ ] Empty state shows when no meals

---

## 🔗 Dependencies Between Stories

**Blocks:**
- Story 7: Statistics (uses historical data)

**Depends On:**
- Story 1: Project Setup ✅
- Story 2: Authentication ✅
- Story 4: Daily Tracking ✅

---

## ✅ Definition of Done

- [ ] History screen displays all meals
- [ ] Search functionality works
- [ ] Date grouping implemented
- [ ] Infinite scroll/pagination works
- [ ] Meal details screen complete
- [ ] Edit and delete work from history
- [ ] Loading and empty states
- [ ] Performance tested with 100+ meals
- [ ] Code reviewed and tested

---

**Completion Date:** _________________  
**Completed By:** _________________  
**Notes:** _________________