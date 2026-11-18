export type DietaryPreference =
  | 'Vegetarian'
  | 'Eggetarian'
  | 'Non-Veg'
  | 'Vegan'
  | 'Jain';

export type Allergen = 'Peanuts' | 'Dairy' | 'Gluten' | 'Soy';

export type Appliance =
  | 'Single Induction'
  | 'Gas Stove'
  | 'Microwave'
  | 'Mixer/Grinder'
  | 'Electric Kettle'
  | 'No Oven';

export interface KitchenProfile {
  dietary: DietaryPreference[];
  allergens: Allergen[];
  appliances: Appliance[];
  staples: string[];
  setupComplete: boolean;
}

export type PantryCategory =
  | 'Fresh Veggies'
  | 'Dairy & Protein'
  | 'Grains/Leftovers';

export interface PantryItem {
  id: string;
  name: string;
  category: PantryCategory;
  quantity: number;
  unit: string;
  daysLeft: number | null; // null = shelf-stable
  available: boolean;
  estimatedValueInr: number;
}

export interface IngredientSubstitution {
  itemName: string;
  pantryItemId?: string;
  stapleName?: string;
  note: string;
}

export interface RecipeIngredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  pantryItemId?: string;
  stapleName?: string;
  isPerishable?: boolean;
  substitution?: IngredientSubstitution;
  blinkitPriceInr?: number;
}

export interface RecipeStep {
  id: string;
  title: string;
  instruction: string;
  timerSeconds?: number;
  timerLabel?: string;
}

export interface Recipe {
  id: string;
  title: string;
  image: string;
  prepMinutes: number;
  applianceTag: string;
  requiredAppliances: Appliance[];
  isOnePot: boolean;
  dietaryTags: DietaryPreference[];
  allergens: Allergen[];
  baseServings: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
}

export interface ResolvedIngredient {
  ingredient: RecipeIngredient;
  status: 'owned' | 'substituted' | 'missing';
  matchedPantryItem?: PantryItem;
  activeSubstitution?: IngredientSubstitution;
}

export interface ComputedRecipeMatch {
  recipe: Recipe;
  matchPercent: number;
  resolvedIngredients: ResolvedIngredient[];
  ownedIngredients: ResolvedIngredient[];
  substitutedIngredients: ResolvedIngredient[];
  missingIngredients: ResolvedIngredient[];
  expiringItemsUsed: PantryItem[];
  urgencyScore: number;
}

export type AppTab = 'pantry' | 'recipes' | 'scan' | 'saved';

export type RecipeFilter =
  | 'all'
  | 'under20'
  | 'onepot'
  | 'expiring';

export interface CookedHistoryEntry {
  id: string;
  recipeId: string;
  recipeTitle: string;
  cookedAt: string;
  savedInr: number;
  servings: number;
}
