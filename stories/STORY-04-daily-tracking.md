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

#### 4.2 Create Meals Service
`src/meals/meals.service.ts`:

#### 4.3 Create Meals Controller
`src/meals/meals.controller.ts`:

#### 4.4 Create Meals Module
`src/meals/meals.module.ts`:

#### 4.5 Update App Module
Add MealsModule to imports in `src/app.module.ts`

---

### Mobile App Implementation

#### 4.6 Create Meals Types
`src/types/meal.types.ts`:

#### 4.7 Create Meals API Service
`src/services/api/meals.api.ts`:

#### 4.8 Create Meals Store
`src/store/meals.store.ts`:

#### 4.9 Create Dashboard Screen
`src/screens/Dashboard/DashboardScreen.tsx`:

#### 4.10 Create Daily Progress Card Component
`src/components/features/DailyProgressCard.tsx`:

#### 4.11 Create Meal List Item Component
`src/components/features/MealListItem.tsx`:

#### 4.12 Update Scan Screen to Save Meals
Update `handleSave` in `ScanScreen.tsx`:

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