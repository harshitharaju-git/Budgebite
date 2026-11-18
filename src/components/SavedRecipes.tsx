import React from 'react';
import {
  ArrowRight,
  Bookmark,
  Clock,
  History,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react';
import { ComputedRecipeMatch, CookedHistoryEntry } from '../types/pantry';

interface SavedRecipesProps {
  savedMatches: ComputedRecipeMatch[];
  cookedHistory: CookedHistoryEntry[];
  onOpenRecipe: (match: ComputedRecipeMatch) => void;
  onRemoveSaved: (recipeId: string) => void;
  onBrowseRecipes: () => void;
}

export const SavedRecipes: React.FC<SavedRecipesProps> = ({
  savedMatches,
  cookedHistory,
  onOpenRecipe,
  onRemoveSaved,
  onBrowseRecipes,
}) => {
  return (
    <div className="space-y-8 pb-24 md:pb-10">
      <div className="pt-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1D1A]">
          Saved & Cooked Log
        </h1>
        <p className="text-sm text-[#5C645E] mt-0.5">
          Your go-to 15-minute staples and recent kitchen rescues
        </p>
      </div>

      {/* Saved Recipes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#1A1D1A] inline-flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#1E7E48]" />
            <span>Bookmarked Recipes</span>
          </h2>
          <span className="text-xs text-[#5C645E] tabular-nums">
            {savedMatches.length} saved
          </span>
        </div>

        {savedMatches.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E7E4DC] p-6 text-center space-y-3">
            <UtensilsCrossed className="w-7 h-7 text-[#5C645E] mx-auto" />
            <p className="text-sm font-semibold text-[#1A1D1A]">
              No bookmarked recipes yet
            </p>
            <p className="text-xs text-[#5C645E]">
              Tap the bookmark icon on any recipe card to save it for busy weeknights.
            </p>
            <button
              type="button"
              onClick={onBrowseRecipes}
              className="min-h-[44px] px-4 rounded-xl bg-[#1E7E48] text-white text-sm font-semibold"
            >
              Explore Recipe Feed
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedMatches.map((match) => (
              <div
                key={match.recipe.id}
                className="bg-white rounded-xl border border-[#E7E4DC] p-3 flex items-center gap-3.5"
              >
                <img
                  src={match.recipe.image}
                  alt={match.recipe.title}
                  referrerPolicy="no-referrer"
                  className="w-24 h-20 rounded-lg object-cover shrink-0 bg-[#F2EFE8]"
                />
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => onOpenRecipe(match)}
                    className="text-left w-full"
                  >
                    <h3 className="text-sm font-bold text-[#1A1D1A] truncate hover:text-[#1E7E48]">
                      {match.recipe.title}
                    </h3>
                  </button>
                  <div className="flex items-center gap-2 text-xs text-[#5C645E] mt-1">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock className="w-3 h-3" />
                      {match.recipe.prepMinutes}m
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#1E7E48] font-semibold tabular-nums">
                      {match.matchPercent}% Match
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => onOpenRecipe(match)}
                      className="min-h-[36px] px-3 rounded-lg bg-[#F0F9F3] text-[#1E7E48] text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <span>Cook</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveSaved(match.recipe.id)}
                      aria-label={`Remove ${match.recipe.title} from saved`}
                      className="min-h-[36px] min-w-[36px] rounded-lg text-[#5C645E] hover:text-[#B42318] flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Cooked Log */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#1A1D1A] inline-flex items-center gap-2">
            <History className="w-4 h-4 text-[#E06D2B]" />
            <span>Recent Kitchen Rescues</span>
          </h2>
          <span className="text-xs text-[#5C645E] tabular-nums">
            {cookedHistory.length} meals
          </span>
        </div>

        <div className="bg-white rounded-xl border border-[#E7E4DC] divide-y divide-[#F0EDE6]">
          {cookedHistory.map((entry) => (
            <div
              key={entry.id}
              className="px-4 py-3.5 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1A1D1A] truncate">
                  {entry.recipeTitle}
                </p>
                <p className="text-xs text-[#5C645E] mt-0.5">
                  {entry.cookedAt} · {entry.servings}x batch
                </p>
              </div>
              <span className="text-xs font-semibold text-[#1E7E48] bg-[#EBF7F0] px-2.5 py-1 rounded-full tabular-nums shrink-0">
                +₹{entry.savedInr} saved
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
