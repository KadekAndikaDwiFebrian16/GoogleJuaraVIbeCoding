export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface Nutrition {
  calories: string;
  protein: string;
  fat: string;
  carbs: string;
}

export interface InstructionStep {
  step: number;
  text: string;
  image?: string;
  duration?: number; // in minutes
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  mealTime: 'pagi' | 'siang' | 'sore' | 'malam';
  condition: string;
  nutrition: Nutrition;
  ingredients: string[];
  instructions: InstructionStep[];
  rating: number;
  reviewCount: number;
  prepTime: string;
  servings: string;
  createdBy: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  recipeId: string;
  userId: string;
  userName: string;
  userPhoto: string;
  text: string;
  rating: number;
  createdAt: string;
}

export interface Suggestion {
  id: string;
  userId: string;
  userName: string;
  title: string;
  description: string;
  ingredients: string;
  status: 'pending' | 'reviewed' | 'added';
  createdAt: string;
}
