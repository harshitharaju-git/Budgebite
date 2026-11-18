import {
  ComputedRecipeMatch,
  KitchenProfile,
  PantryItem,
  Recipe,
  RecipeFilter,
  ResolvedIngredient,
} from '../types/pantry';

export function computeRecipeMatches(
  recipes: Recipe[],
  pantryItems: PantryItem[],
  profile: KitchenProfile,
): ComputedRecipeMatch[] {
  const pantryById = new Map(pantryItems.map((item) => [item.id, item]));
  const pantryByName = new Map(
    pantryItems.map((item) => [item.name.toLowerCase(), item]),
  );
  const stapleSet = new Set(profile.staples.map((s) => s.toLowerCase()));

  const compatibleRecipes = recipes.filter((recipe) => {
    // Hard-block allergens
    const hasBlockedAllergen = recipe.allergens.some((a) =>
      profile.allergens.includes(a),
    );
    if (hasBlockedAllergen) return false;

    // Dietary filter if user chose preferences
    if (profile.dietary.length > 0) {
      const matchesDiet = recipe.dietaryTags.some((tag) =>
        profile.dietary.includes(tag),
      );
      if (!matchesDiet) return false;
    }

    return true;
  });

  const computed = compatibleRecipes.map((recipe) => {
    const resolvedIngredients: ResolvedIngredient[] = recipe.ingredients.map(
      (ing) => {
        // 1. Check direct pantry item
        const directPantry = ing.pantryItemId
          ? pantryById.get(ing.pantryItemId)
          : pantryByName.get(ing.name.toLowerCase());

        if (directPantry && directPantry.available) {
          return {
            ingredient: ing,
            status: 'owned',
            matchedPantryItem: directPantry,
          };
        }

        // 2. Check staple rack
        if (ing.stapleName && stapleSet.has(ing.stapleName.toLowerCase())) {
          return {
            ingredient: ing,
            status: 'owned',
          };
        }

        // 3. Check smart substitution
        if (ing.substitution) {
          const subPantry = ing.substitution.pantryItemId
            ? pantryById.get(ing.substitution.pantryItemId)
            : undefined;
          const subStaple = ing.substitution.stapleName
            ? stapleSet.has(ing.substitution.stapleName.toLowerCase())
            : false;

          if ((subPantry && subPantry.available) || subStaple) {
            return {
              ingredient: ing,
              status: 'substituted',
              matchedPantryItem: subPantry,
              activeSubstitution: ing.substitution,
            };
          }
        }

        return {
          ingredient: ing,
          status: 'missing',
        };
      },
    );

    const ownedIngredients = resolvedIngredients.filter(
      (r) => r.status === 'owned',
    );
    const substitutedIngredients = resolvedIngredients.filter(
      (r) => r.status === 'substituted',
    );
    const missingIngredients = resolvedIngredients.filter(
      (r) => r.status === 'missing',
    );

    const totalCount = resolvedIngredients.length || 1;
    // Owned = 1.0 weight, Smart substitution = 0.85 weight
    const scoreNumerator =
      ownedIngredients.length + substitutedIngredients.length * 0.85;
    const matchPercent = Math.round((scoreNumerator / totalCount) * 100);

    const expiringItemsUsed = resolvedIngredients
      .map((r) => r.matchedPantryItem)
      .filter(
        (item): item is PantryItem =>
          Boolean(item && item.available && item.daysLeft !== null && item.daysLeft <= 2),
      )
      .sort((a, b) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99));

    // Deduplicate expiring items used
    const uniqueExpiring = Array.from(
      new Map(expiringItemsUsed.map((i) => [i.id, i])).values(),
    );

    const urgencyBonus = uniqueExpiring.reduce((acc, item) => {
      if (item.daysLeft === 1) return acc + 35;
      if (item.daysLeft === 2) return acc + 20;
      return acc + 10;
    }, 0);

    const urgencyScore = matchPercent + urgencyBonus - missingIngredients.length * 12;

    return {
      recipe,
      matchPercent,
      resolvedIngredients,
      ownedIngredients,
      substitutedIngredients,
      missingIngredients,
      expiringItemsUsed: uniqueExpiring,
      urgencyScore,
    };
  });

  return computed.sort((a, b) => b.urgencyScore - a.urgencyScore);
}

export function filterComputedRecipes(
  matches: ComputedRecipeMatch[],
  filter: RecipeFilter,
  rescueItemId: string | null,
): ComputedRecipeMatch[] {
  let list = matches;

  if (rescueItemId) {
    const rescueFiltered = list.filter((m) =>
      m.resolvedIngredients.some(
        (ri) =>
          ri.matchedPantryItem?.id === rescueItemId ||
          ri.ingredient.pantryItemId === rescueItemId,
      ),
    );
    if (rescueFiltered.length > 0) {
      list = rescueFiltered;
    }
  }

  switch (filter) {
    case 'under20':
      return list.filter((m) => m.recipe.prepMinutes <= 20);
    case 'onepot':
      return list.filter(
        (m) =>
          m.recipe.isOnePot ||
          m.recipe.applianceTag.toLowerCase().includes('induction'),
      );
    case 'expiring':
      return [...list].sort(
        (a, b) =>
          b.expiringItemsUsed.length - a.expiringItemsUsed.length ||
          b.urgencyScore - a.urgencyScore,
      );
    case 'all':
    default:
      return list;
  }
}

export function formatExpiryLabel(daysLeft: number | null): string {
  if (daysLeft === null) return 'Shelf-stable';
  if (daysLeft <= 0) return 'Use Today';
  if (daysLeft === 1) return 'Expires Tomorrow';
  return `${daysLeft} days left`;
}

export function formatScaledAmount(amount: number, multiplier: number): string {
  const scaled = amount * multiplier;
  if (Number.isInteger(scaled)) return String(scaled);
  return scaled.toFixed(1).replace(/\.0$/, '');
}
