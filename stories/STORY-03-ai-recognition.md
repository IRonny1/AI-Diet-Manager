# Story 3: AI Food Recognition

**Status:** 🔴 Not Started  
**Priority:** P0 (Critical)  
**Estimated Time:** 8-10 hours

---

## 📋 Overview

Implement AI-powered food recognition system using Claude API. Users can capture or upload food images, which are analyzed by AI to identify the food category, ingredients, and nutritional information.

---

## 🎯 Acceptance Criteria

- [ ] User can capture photo using camera
- [ ] User can select photo from gallery
- [ ] Photo is uploaded to backend
- [ ] Backend sends photo to Claude API for analysis
- [ ] AI returns structured food data (category, ingredients, nutrition)
- [ ] Results are displayed in user-friendly format
- [ ] User can edit AI results before saving
- [ ] Loading states during AI analysis
- [ ] Error handling for failed recognition
- [ ] Option to retry with different photo
- [ ] Guest users can use scan feature (without saving)

---

## 🛠️ Technical Tasks

### Backend Implementation

#### 3.1 Configure File Upload
`src/main.ts`:

#### 3.2 Create Food Recognition DTOs
`src/scan/dto/analyze-food.dto.ts`:

#### 3.3 Create Claude API Service
`src/scan/claude-api.service.ts`:

Install Anthropic SDK:
```bash
npm install @anthropic-ai/sdk
```

#### 3.4 Create Scan Service
`src/scan/scan.service.ts`:

#### 3.5 Create Scan Controller
`src/scan/scan.controller.ts`:

Note: No guard on analyze endpoint to allow guest users

#### 3.6 Create Scan Module
`src/scan/scan.module.ts`:

#### 3.7 Update App Module
`src/app.module.ts`:

---

### Mobile App Implementation

#### 3.8 Setup Camera Permissions
Already configured in Story 1, but verify:

**Android AndroidManifest.xml:**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

#### 3.9 Create Food Recognition Types
`src/types/food.types.ts`:

#### 3.10 Create Scan API Service
`src/services/api/scan.api.ts`:

#### 3.11 Create Image Utility
`src/utils/image.utils.ts`:

Install RNFS:
```bash
npm install react-native-fs
```

#### 3.12 Create Scan Store
`src/store/scan.store.ts`:

#### 3.13 Create Camera Hook
`src/hooks/useCamera.ts`:

#### 3.14 Create Scan Screen
`src/screens/Scan/ScanScreen.tsx`:

#### 3.15 Create Scan Result Card Component
`src/components/features/ScanResultCard.tsx`:

---

## ✅ Testing Checklist

### Backend Tests
- [ ] Test image upload (base64) to /scan/analyze
- [ ] Verify Claude API integration works
- [ ] Test with various food images (pizza, salad, sandwich, etc.)
- [ ] Test with non-food images (should handle gracefully)
- [ ] Test with very large images (should handle or reject)
- [ ] Verify JSON response structure matches FoodAnalysisResult
- [ ] Test error handling when Claude API fails
- [ ] Test confidence levels (high/medium/low)

### Mobile App Tests
- [ ] Request and verify camera permissions
- [ ] Select image from gallery
- [ ] Display selected image correctly
- [ ] Analyze button triggers AI analysis
- [ ] Loading indicator shows during analysis
- [ ] Results display correctly with all fields
- [ ] Confidence badge shows correct color
- [ ] Macros display in readable format
- [ ] Edit button navigates to edit screen
- [ ] Save button works (will be fully tested in Story 4)
- [ ] Retry with different image clears previous results
- [ ] Error messages display appropriately
- [ ] Works for both guest and registered users

---

## 📝 Sample Test Images

Test with these types of food:
1. Simple items: apple, banana, bread
2. Plated meals: pasta, chicken with vegetables
3. Fast food: burger, pizza, fries
4. Beverages: coffee, juice
5. Mixed dishes: salad, stir-fry
6. Edge cases: empty plate, multiple items

---

## 🔗 Dependencies Between Stories

**Blocks:**
- Story 4: Daily Tracking (needs scan results to save meals)

**Depends On:**
- Story 1: Project Setup ✅
- Story 2: Authentication ✅ (optional, works for guests too)

---

## 💡 Future Enhancements (Not in MVP)
- Batch scanning (multiple foods at once)
- Barcode scanning for packaged foods
- Custom food database for improved accuracy
- Portion size adjustment with visual comparison
- Save favorite foods for quick logging

---

## ✅ Definition of Done

- [ ] Camera integration working on Android
- [ ] Image selection from gallery works
- [ ] Backend successfully communicates with Claude API
- [ ] AI returns structured food data
- [ ] Results display beautifully in UI
- [ ] Confidence levels shown appropriately
- [ ] Loading states implemented
- [ ] Error handling works correctly
- [ ] Users can retry analysis
- [ ] Guest users can scan without registration
- [ ] Code passes TypeScript checks
- [ ] Tested with 10+ different food images
- [ ] Documentation updated
- [ ] Screenshots/videos of feature working

---

**Completion Date:** _________________  
**Completed By:** _________________  
**Notes:** _________________