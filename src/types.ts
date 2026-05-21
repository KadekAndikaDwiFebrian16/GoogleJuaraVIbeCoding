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
  imageCredit?: string; // photo credit/attribution text
  duration?: number; // in minutes
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  imageCredit?: string; // photo credit/attribution text for cover
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

export interface CustomRecipeInstruction {
  step: number;
  text: string;
  duration?: number;
}

export interface CustomRecipe {
  id: string;
  userId: string;
  title: string;
  source: 'chef_ai' | 'meal_planner' | 'magic_ingredients' | 'manual';
  instructions: CustomRecipeInstruction[];
  createdAt: string;
  updatedAt: string;
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
