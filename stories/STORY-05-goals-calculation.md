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

#### 5.2 Create Calorie Calculation Service
`src/users/calorie-calculator.service.ts`:

#### 5.3 Create Users Service
`src/users/users.service.ts`:

#### 5.4 Create Users Controller
`src/users/users.controller.ts`:

#### 5.5 Create Users Module
`src/users/users.module.ts`:

---

### Mobile App Implementation

#### 5.6 Create Profile Types
`src/types/profile.types.ts`:

#### 5.7 Create Users API Service
`src/services/api/users.api.ts`:

#### 5.8 Create Onboarding Wizard Screen
`src/screens/Onboarding/OnboardingScreen.tsx`:

#### 5.9 Create Goal Edit Screen
`src/screens/Profile/EditGoalsScreen.tsx`:

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