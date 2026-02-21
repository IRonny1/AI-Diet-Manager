export interface User {
  id: string;
  email: string;
  createdAt: Date;
}

export interface UserProfile {
  userId: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  weight?: number;
  height?: number;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goalType?: 'lose_weight' | 'maintain' | 'gain_weight';
  dailyCalorieGoal: number;
  calculationMethod: 'auto' | 'manual';
}

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
  createdAt: Date;
}
