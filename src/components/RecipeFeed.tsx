import React, { useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  Check,
  Clock,
  Flame,
  RefreshCw,
  ShoppingBag,
  Utensils,
  X,
} from 'lucide-react';
import {
  ComputedRecipeMatch,
  PantryItem,
  RecipeFilter,
} from '../types/pantry';
import { filterComputedRecipes } from '../utils/recipeMatcher';

interface RecipeFeedProps {
  matches: ComputedRecipeMatch[];
  activeFilter: RecipeFilter;
  onChangeFilter: (f: RecipeFilter) => void;
  rescueItem: PantryItem | null;
  onClearRescue: () => void;
  savedRecipeIds: string[];
  onToggleSave: (recipeId: string) => void;
  onOpenRecipe: (match: ComputedRecipeMatch) => void;
  onRestockMissingItems: (ingredientIds: string[]) => void;
}

const FILTER_OPTIONS: { id: RecipeFilter; label: string }[] = [
  { id: 'all', label: 'All Matches' },
  { id: 'under20', label: 'Under 20 Mins' },
  { id: 'onepot', label: '1-Pot / Induction' },
  { id: 'expiring', label: 'Expiring First' },
];

export const RecipeFeed: React.FC<RecipeFeedProps> = ({
  matches,
  activeFilter,
  onChangeFilter,
  rescueItem,
  onClearRescue,
  savedRecipeIds,
  onToggleSave,
  onOpenRecipe,
  onRestockMissingItems,
}) => {
  const [blinkitOrderMatch, setBlinkitOrderMatch] =
    useState<ComputedRecipeMatch | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const visibleMatches = filterComputedRecipes(
    matches,
    activeFilter,
    rescueItem?.id ?? null,
  );

  return (
    <div className="space-y-5 pb-24 md:pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1D1A]">
            Urgency-Ranked Recipes
          </h1>
          <p className="text-sm text-[#5C645E] mt-0.5 tabular-nums">
            {visibleMatches.length} recipes ranked by pantry match & expiry rescue
          </p>
        </div>

        {rescueItem && (
          <button
            type="button"
            onClick={onClearRescue}
            className="min-h-[44px] px-3.5 rounded-full bg-[#FFF5EE] border border-[#E06D2B]/40 text-[#E06D2B] text-xs font-semibold inline-flex items-center gap-2 self-start sm:self-auto"
          >
            <span>Rescuing: {rescueItem.name}</span>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Top Filter Ribbon */}
      <div
        role="tablist"
        aria-label="Recipe filters"
        className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 py-0.5"
      >
        {FILTER_OPTIONS.map((opt) => {
          const active = activeFilter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChangeFilter(opt.id)}
              className={`min-h-[44px] px-4 rounded-full text-xs sm:text-sm font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-[#1A1D1A] text-white border-[#1A1D1A]'
                  : 'bg-white text-[#5C645E] border-[#E7E4DC] hover:text-[#1A1D1A] hover:border-[#C5BFB2]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Recipe Cards Feed */}
      {visibleMatches.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E7E4DC] p-8 text-center space-y-3">
          <p className="text-base font-semibold text-[#1A1D1A]">
            No recipes match this filter right now
          </p>
          <p className="text-sm text-[#5C645E]">
            Try switching back to All Matches or adjusting your dietary hard-blocks.
          </p>
          <button
            type="button"
            onClick={() => {
              onChangeFilter('all');
              onClearRescue();
            }}
            className="min-h-[44px] px-4 rounded-xl bg-[#1E7E48] text-white text-sm font-semibold"
          >
            Show All Matches
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {visibleMatches.map((match) => {
            const {
              recipe,
              matchPercent,
              ownedIngredients,
              substitutedIngredients,
              missingIngredients,
              expiringItemsUsed,
            } = match;
            const isSaved = savedRecipeIds.includes(recipe.id);
            const hasExpiring = expiringItemsUsed.length > 0;
            const primaryExpiring = expiringItemsUsed[0];
            const imageFailed = imageErrors[recipe.id];

            return (
              <article
                key={recipe.id}
                className="bg-white rounded-xl border border-[#E7E4DC] overflow-hidden flex flex-col justify-between transition-shadow hover:shadow-md"
              >
                <div>
                  {/* 4:3 Food Thumbnail */}
                  <div
                    onClick={() => onOpenRecipe(match)}
                    className="relative aspect-[4/3] bg-[#F2EFE8] cursor-pointer overflow-hidden group"
                  >
                    {!imageFailed ? (
                      <img
                        src={recipe.image}
                        alt={recipe.title}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setImageErrors((prev) => ({
                            ...prev,
                            [recipe.id]: true,
                          }))
                        }
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#EFECE4] to-[#E3DED2] flex flex-col items-center justify-center gap-2 text-[#5C645E] p-4 text-center">
                        <Utensils className="w-8 h-8 text-[#1E7E48]" />
                        <span className="text-sm font-semibold text-[#1A1D1A]">
                          {recipe.title}
                        </span>
                      </div>
                    )}

                    {/* Top-Left Single Badge: Expiring Alert OR Green Match */}
                    <div className="absolute top-3 left-3">
                      {hasExpiring && primaryExpiring ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E06D2B] text-white text-xs font-semibold shadow-sm">
                          <Flame className="w-3.5 h-3.5" />
                          <span>Uses Expiring {primaryExpiring.name}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#1E7E48] text-white text-xs font-semibold shadow-sm tabular-nums">
                          <span>{matchPercent}% Match</span>
                        </span>
                      )}
                    </div>

                    {/* Top-Right Bookmark Action */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSave(recipe.id);
                      }}
                      aria-label={
                        isSaved ? 'Remove from saved' : 'Save recipe'
                      }
                      className="absolute top-2 right-2 min-h-[44px] min-w-[44px] rounded-full bg-white/90 backdrop-blur-xs text-[#1A1D1A] flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                    >
                      <Bookmark
                        className={`w-4 h-4 ${
                          isSaved
                            ? 'fill-[#1E7E48] text-[#1E7E48]'
                            : 'text-[#1A1D1A]'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3.5">
                    <div>
                      <button
                        type="button"
                        onClick={() => onOpenRecipe(match)}
                        className="text-left w-full group"
                      >
                        <h2 className="text-lg font-bold text-[#1A1D1A] group-hover:text-[#1E7E48] transition-colors leading-snug">
                          {recipe.title}
                        </h2>
                      </button>

                      {/* Clean Unboxed Metadata */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#5C645E] mt-1 font-medium">
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Clock className="w-3.5 h-3.5" />
                          {recipe.prepMinutes}m
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{recipe.applianceTag}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#1E7E48] font-semibold tabular-nums">
                          {matchPercent}% Match
                        </span>
                      </div>
                    </div>

                    {/* Ingredient Status Strip */}
                    <div className="space-y-2">
                      {/* Owned Ingredients */}
                      {ownedIngredients.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {ownedIngredients.map((ri) => (
                            <span
                              key={ri.ingredient.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#F0F9F3] text-[#1E7E48] text-xs font-medium"
                            >
                              <Check className="w-3 h-3 shrink-0" />
                              <span>{ri.ingredient.name}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Substituted Ingredients */}
                      {substitutedIngredients.map((ri) => (
                        <div
                          key={ri.ingredient.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FFF5EE] border border-[#E06D2B]/25 text-xs font-medium text-[#9A4212]"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-[#E06D2B] shrink-0" />
                          <span>
                            Missing: {ri.ingredient.name} →{' '}
                            <strong className="font-semibold text-[#1A1D1A]">
                              Swap with {ri.activeSubstitution?.itemName}
                            </strong>
                          </span>
                        </div>
                      ))}

                      {/* Missing Ingredients + Blinkit Quick Link */}
                      {missingIngredients.length > 0 && (
                        <div className="rounded-lg bg-[#FAF9F6] border border-[#E7E4DC] p-2.5 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#B42318] font-medium">
                            <span>Missing:</span>
                            <span>
                              {missingIngredients
                                .map((m) => m.ingredient.name)
                                .join(', ')}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setBlinkitOrderMatch(match)}
                            className="min-h-[44px] -my-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E7E48] hover:underline"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>
                              Order {missingIngredients.length} missing{' '}
                              {missingIngredients.length === 1
                                ? 'item'
                                : 'items'}{' '}
                              via Blinkit →
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer Action */}
                <div className="px-4 pb-4 pt-1">
                  <button
                    type="button"
                    onClick={() => onOpenRecipe(match)}
                    className="w-full min-h-[44px] px-4 rounded-xl bg-[#FAF9F6] hover:bg-[#1E7E48] text-[#1A1D1A] hover:text-white border border-[#E7E4DC] hover:border-[#1E7E48] text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <span>Start Cooking</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Blinkit Missing Items Quick-Order Sheet */}
      {blinkitOrderMatch && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setBlinkitOrderMatch(null)}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-5 space-y-4 border border-[#E7E4DC]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-[#DCD7CC] rounded-full mx-auto sm:hidden" />

            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#1A1D1A]">
                  Quick Restock via Blinkit
                </h3>
                <p className="text-xs text-[#5C645E] mt-0.5">
                  10-minute delivery estimate for {blinkitOrderMatch.recipe.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBlinkitOrderMatch(null)}
                aria-label="Close Blinkit sheet"
                className="min-h-[44px] min-w-[44px] rounded-full hover:bg-[#FAF9F6] flex items-center justify-center text-[#5C645E]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="divide-y divide-[#E7E4DC] border border-[#E7E4DC] rounded-xl overflow-hidden">
              {blinkitOrderMatch.missingIngredients.map((mi) => (
                <div
                  key={mi.ingredient.id}
                  className="flex items-center justify-between px-4 py-3 bg-white"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#1A1D1A]">
                      {mi.ingredient.name}
                    </p>
                    <p className="text-xs text-[#5C645E] tabular-nums">
                      {mi.ingredient.amount} {mi.ingredient.unit} needed
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#1A1D1A] tabular-nums">
                    ₹{mi.ingredient.blinkitPriceInr ?? 40}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm font-semibold px-1">
              <span className="text-[#5C645E]">Estimated basket</span>
              <span className="text-[#1A1D1A] tabular-nums">
                ₹
                {blinkitOrderMatch.missingIngredients.reduce(
                  (sum, mi) => sum + (mi.ingredient.blinkitPriceInr ?? 40),
                  0,
                )}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                onRestockMissingItems(
                  blinkitOrderMatch.missingIngredients.map(
                    (mi) => mi.ingredient.pantryItemId ?? mi.ingredient.name,
                  ),
                );
                setBlinkitOrderMatch(null);
              }}
              className="w-full min-h-[48px] px-4 rounded-xl bg-[#1E7E48] hover:bg-[#166237] text-white text-sm font-semibold transition-colors"
            >
              Mark Delivered & Add to Pantry
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
