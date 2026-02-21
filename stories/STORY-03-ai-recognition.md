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
```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors();
  
  // Increase payload size for images
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  
  await app.listen(3000);
}
bootstrap();
```

#### 3.2 Create Food Recognition DTOs
`src/scan/dto/analyze-food.dto.ts`:
```typescript
export class AnalyzeFoodDto {
  imageBase64: string; // Base64 encoded image
}

export class FoodAnalysisResult {
  category: string;
  name: string;
  ingredients: string[];
  nutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    portionSize: number;
  };
  confidence: 'high' | 'medium' | 'low';
}
```

#### 3.3 Create Claude API Service
`src/scan/claude-api.service.ts`:
```typescript
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class ClaudeApiService {
  private client: Anthropic;

  constructor(private configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.configService.get('CLAUDE_API_KEY'),
    });
  }

  async analyzeFood(imageBase64: string): Promise<any> {
    try {
      const prompt = `
Analyze this food image and return ONLY a JSON object with the following structure (no other text):

{
  "category": "general food category (e.g., pizza, salad, soup)",
  "name": "specific dish name",
  "ingredients": ["ingredient1", "ingredient2", "ingredient3"],
  "nutrition": {
    "calories": estimated calories as number,
    "protein": grams as number,
    "fat": grams as number,
    "carbs": grams as number,
    "portionSize": estimated portion size in grams as number
  },
  "confidence": "high, medium, or low"
}

Be realistic with estimations. If you cannot clearly identify the food, set confidence to "low" and provide best estimates.
`;

      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      const responseText = message.content[0].text;
      
      // Clean response (remove markdown code blocks if present)
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const result = JSON.parse(cleanedResponse);
      
      return result;
    } catch (error) {
      console.error('Claude API error:', error);
      throw new HttpException(
        'Failed to analyze food image',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
```

Install Anthropic SDK:
```bash
npm install @anthropic-ai/sdk
```

#### 3.4 Create Scan Service
`src/scan/scan.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { ClaudeApiService } from './claude-api.service';
import { FoodAnalysisResult } from './dto/analyze-food.dto';

@Injectable()
export class ScanService {
  constructor(private claudeApiService: ClaudeApiService) {}

  async analyzeFood(imageBase64: string): Promise<FoodAnalysisResult> {
    const result = await this.claudeApiService.analyzeFood(imageBase64);
    
    // Validate and normalize the result
    return {
      category: result.category || 'Unknown',
      name: result.name || 'Unknown Food',
      ingredients: Array.isArray(result.ingredients) ? result.ingredients : [],
      nutrition: {
        calories: Math.round(result.nutrition?.calories || 0),
        protein: Math.round((result.nutrition?.protein || 0) * 10) / 10,
        fat: Math.round((result.nutrition?.fat || 0) * 10) / 10,
        carbs: Math.round((result.nutrition?.carbs || 0) * 10) / 10,
        portionSize: Math.round(result.nutrition?.portionSize || 100),
      },
      confidence: result.confidence || 'low',
    };
  }
}
```

#### 3.5 Create Scan Controller
`src/scan/scan.controller.ts`:
```typescript
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ScanService } from './scan.service';
import { AnalyzeFoodDto, FoodAnalysisResult } from './dto/analyze-food.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('scan')
export class ScanController {
  constructor(private scanService: ScanService) {}

  @Post('analyze')
  async analyzeFood(
    @Body() analyzeFoodDto: AnalyzeFoodDto,
  ): Promise<FoodAnalysisResult> {
    return this.scanService.analyzeFood(analyzeFoodDto.imageBase64);
  }
}
```

Note: No guard on analyze endpoint to allow guest users

#### 3.6 Create Scan Module
`src/scan/scan.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ScanService } from './scan.service';
import { ScanController } from './scan.controller';
import { ClaudeApiService } from './claude-api.service';

@Module({
  providers: [ScanService, ClaudeApiService],
  controllers: [ScanController],
  exports: [ScanService],
})
export class ScanModule {}
```

#### 3.7 Update App Module
`src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ScanModule } from './scan/scan.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    ScanModule,
  ],
})
export class AppModule {}
```

---

### Mobile App Implementation

#### 3.8 Setup Camera Permissions
Already configured in Story 1, but verify:

**iOS Info.plist:**
```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to scan your food</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need photo library access to select food images</string>
```

**Android AndroidManifest.xml:**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

#### 3.9 Create Food Recognition Types
`src/types/food.types.ts`:
```typescript
export interface FoodNutrition {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  portionSize: number;
}

export interface FoodAnalysisResult {
  category: string;
  name: string;
  ingredients: string[];
  nutrition: FoodNutrition;
  confidence: 'high' | 'medium' | 'low';
}

export interface ScanRequest {
  imageBase64: string;
}
```

#### 3.10 Create Scan API Service
`src/services/api/scan.api.ts`:
```typescript
import apiService from './api.service';
import { FoodAnalysisResult, ScanRequest } from '../../types/food.types';

export const scanApi = {
  analyzeFood: async (imageBase64: string): Promise<FoodAnalysisResult> => {
    const response = await apiService.post<FoodAnalysisResult>('/scan/analyze', {
      imageBase64,
    });
    return response.data;
  },
};
```

#### 3.11 Create Image Utility
`src/utils/image.utils.ts`:
```typescript
import RNFS from 'react-native-fs';

export const convertImageToBase64 = async (uri: string): Promise<string> => {
  try {
    const base64 = await RNFS.readFile(uri, 'base64');
    return base64;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw new Error('Failed to process image');
  }
};

export const compressImage = async (uri: string): Promise<string> => {
  // Optional: Add image compression logic here
  // For now, return as-is
  return uri;
};
```

Install RNFS:
```bash
npm install react-native-fs
```

#### 3.12 Create Scan Store
`src/store/scan.store.ts`:
```typescript
import { create } from 'zustand';
import { FoodAnalysisResult } from '../types/food.types';
import { scanApi } from '../services/api/scan.api';

interface ScanState {
  currentScan: FoodAnalysisResult | null;
  isAnalyzing: boolean;
  error: string | null;
  currentImage: string | null;
  
  analyzeFood: (imageBase64: string, imageUri: string) => Promise<void>;
  clearScan: () => void;
  updateScan: (updates: Partial<FoodAnalysisResult>) => void;
  clearError: () => void;
}

export const useScanStore = create<ScanState>((set, get) => ({
  currentScan: null,
  isAnalyzing: false,
  error: null,
  currentImage: null,

  analyzeFood: async (imageBase64: string, imageUri: string) => {
    try {
      set({ isAnalyzing: true, error: null, currentImage: imageUri });
      const result = await scanApi.analyzeFood(imageBase64);
      set({
        currentScan: result,
        isAnalyzing: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to analyze food',
        isAnalyzing: false,
      });
      throw error;
    }
  },

  clearScan: () => {
    set({
      currentScan: null,
      currentImage: null,
      error: null,
    });
  },

  updateScan: (updates: Partial<FoodAnalysisResult>) => {
    const currentScan = get().currentScan;
    if (currentScan) {
      set({
        currentScan: { ...currentScan, ...updates },
      });
    }
  },

  clearError: () => set({ error: null }),
}));
```

#### 3.13 Create Camera Hook
`src/hooks/useCamera.ts`:
```typescript
import { useState } from 'react';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { launchImageLibrary } from 'react-native-image-picker';
import { Alert } from 'react-native';

export const useCamera = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const device = useCameraDevice('back');

  const requestCameraPermission = async () => {
    const permission = await Camera.requestCameraPermission();
    setHasPermission(permission === 'granted');
    return permission === 'granted';
  };

  const takePhoto = async () => {
    if (!hasPermission) {
      const granted = await requestCameraPermission();
      if (!granted) {
        Alert.alert('Permission Required', 'Camera permission is required to take photos');
        return null;
      }
    }

    // Return camera component for taking photo
    return 'camera';
  };

  const pickFromGallery = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: false,
    });

    if (result.didCancel) {
      return null;
    }

    if (result.errorCode) {
      Alert.alert('Error', result.errorMessage || 'Failed to pick image');
      return null;
    }

    return result.assets?.[0];
  };

  return {
    hasPermission,
    requestCameraPermission,
    takePhoto,
    pickFromGallery,
    device,
  };
};
```

#### 3.14 Create Scan Screen
`src/screens/Scan/ScanScreen.tsx`:
```typescript
import React, { useState } from 'react';
import { View, StyleSheet, Image, ScrollView } from 'react-native';
import { Button, Text, ActivityIndicator, Card } from 'react-native-paper';
import { useCamera } from '../../hooks/useCamera';
import { useScanStore } from '../../store/scan.store';
import { convertImageToBase64 } from '../../utils/image.utils';
import { ScanResultCard } from '../../components/features/ScanResultCard';

export const ScanScreen = ({ navigation }: any) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { pickFromGallery } = useCamera();
  const { analyzeFood, currentScan, isAnalyzing, error, clearScan } = useScanStore();

  const handlePickImage = async () => {
    const image = await pickFromGallery();
    if (image?.uri) {
      setSelectedImage(image.uri);
      clearScan();
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    try {
      const base64 = await convertImageToBase64(selectedImage);
      await analyzeFood(base64, selectedImage);
    } catch (err) {
      console.error('Analysis error:', err);
    }
  };

  const handleSave = () => {
    // Will be implemented in Story 4
    navigation.navigate('Dashboard');
  };

  const handleEdit = () => {
    navigation.navigate('EditScan');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {!selectedImage ? (
          <View style={styles.uploadSection}>
            <Text variant="headlineSmall" style={styles.title}>
              Scan Your Food
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Take a photo or upload from gallery
            </Text>

            <Button
              mode="contained"
              icon="camera"
              onPress={handlePickImage}
              style={styles.button}
            >
              Select Photo
            </Button>

            <Button
              mode="outlined"
              icon="image"
              onPress={handlePickImage}
              style={styles.button}
            >
              Choose from Gallery
            </Button>
          </View>
        ) : (
          <View>
            <Image
              source={{ uri: selectedImage }}
              style={styles.image}
              resizeMode="cover"
            />

            {!currentScan && !isAnalyzing && (
              <Button
                mode="contained"
                onPress={handleAnalyze}
                style={styles.analyzeButton}
              >
                Analyze Food
              </Button>
            )}

            {isAnalyzing && (
              <Card style={styles.loadingCard}>
                <Card.Content style={styles.loadingContent}>
                  <ActivityIndicator size="large" />
                  <Text style={styles.loadingText}>Analyzing your food...</Text>
                </Card.Content>
              </Card>
            )}

            {error && (
              <Card style={styles.errorCard}>
                <Card.Content>
                  <Text style={styles.errorText}>{error}</Text>
                  <Button mode="outlined" onPress={handleAnalyze}>
                    Try Again
                  </Button>
                </Card.Content>
              </Card>
            )}

            {currentScan && !isAnalyzing && (
              <>
                <ScanResultCard result={currentScan} />
                
                <View style={styles.actions}>
                  <Button
                    mode="outlined"
                    onPress={handleEdit}
                    style={styles.actionButton}
                  >
                    Edit
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleSave}
                    style={styles.actionButton}
                  >
                    Save
                  </Button>
                </View>

                <Button
                  mode="text"
                  onPress={() => {
                    setSelectedImage(null);
                    clearScan();
                  }}
                  style={styles.retryButton}
                >
                  Scan Different Food
                </Button>
              </>
            )}
          </View>
        )}
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
  uploadSection: {
    alignItems: 'center',
    paddingVertical: 40,
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
  button: {
    marginVertical: 8,
    width: '100%',
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 16,
  },
  analyzeButton: {
    marginVertical: 16,
  },
  loadingCard: {
    marginVertical: 16,
  },
  loadingContent: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
  },
  errorCard: {
    marginVertical: 16,
    backgroundColor: '#ffebee',
  },
  errorText: {
    color: '#c62828',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 16,
  },
  actionButton: {
    flex: 1,
  },
  retryButton: {
    marginTop: 8,
  },
});
```

#### 3.15 Create Scan Result Card Component
`src/components/features/ScanResultCard.tsx`:
```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { FoodAnalysisResult } from '../../types/food.types';

interface ScanResultCardProps {
  result: FoodAnalysisResult;
}

export const ScanResultCard: React.FC<ScanResultCardProps> = ({ result }) => {
  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return '#4CAF50';
      case 'medium':
        return '#FF9800';
      case 'low':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <Text variant="headlineSmall">{result.name}</Text>
          <Chip
            style={[
              styles.confidenceChip,
              { backgroundColor: getConfidenceColor(result.confidence) },
            ]}
            textStyle={styles.confidenceText}
          >
            {result.confidence}
          </Chip>
        </View>

        <Text variant="bodyMedium" style={styles.category}>
          {result.category}
        </Text>

        {result.ingredients.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Ingredients
            </Text>
            <Text variant="bodyMedium">{result.ingredients.join(', ')}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Nutritional Information
          </Text>
          
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text variant="headlineMedium" style={styles.calorieValue}>
                {result.nutrition.calories}
              </Text>
              <Text variant="bodySmall">kcal</Text>
            </View>
            
            <View style={styles.nutritionDivider} />
            
            <View style={styles.macrosContainer}>
              <View style={styles.macroItem}>
                <Text variant="titleMedium">{result.nutrition.protein}g</Text>
                <Text variant="bodySmall">Protein</Text>
              </View>
              <View style={styles.macroItem}>
                <Text variant="titleMedium">{result.nutrition.fat}g</Text>
                <Text variant="bodySmall">Fat</Text>
              </View>
              <View style={styles.macroItem}>
                <Text variant="titleMedium">{result.nutrition.carbs}g</Text>
                <Text variant="bodySmall">Carbs</Text>
              </View>
            </View>
          </View>

          <Text variant="bodySmall" style={styles.portionText}>
            Per {result.nutrition.portionSize}g serving
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  confidenceChip: {
    height: 24,
  },
  confidenceText: {
    color: 'white',
    fontSize: 12,
  },
  category: {
    opacity: 0.6,
    marginBottom: 16,
  },
  section: {
    marginTop: 16,
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
  nutritionDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
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
});
```

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

- [ ] Camera integration working on both iOS and Android
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