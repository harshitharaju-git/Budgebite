import React, { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  Camera,
  ChefHat,
  Refrigerator,
  SlidersHorizontal,
  Utensils,
} from 'lucide-react';
import { CookingMode } from './components/CookingMode';
import { KitchenSetup } from './components/KitchenSetup';
import { PantryHome } from './components/PantryHome';
import { RecipeFeed } from './components/RecipeFeed';
import { SavedRecipes } from './components/SavedRecipes';
import { ScanAddSheet, ScannedItemInput } from './components/ScanAddSheet';
import {
  DEFAULT_KITCHEN_PROFILE,
  INITIAL_PANTRY_ITEMS,
  RECIPES,
} from './data/pantryData';
import {
  AppTab,
  ComputedRecipeMatch,
  CookedHistoryEntry,
  KitchenProfile,
  PantryItem,
  RecipeFilter,
} from './types/pantry';
import { computeRecipeMatches } from './utils/recipeMatcher';

const STORAGE_KEY = 'pantrypulse_state_v1';

interface PersistedState {
  profile: KitchenProfile;
  pantryItems: PantryItem[];
  wasteSavedInr: number;
  savedRecipeIds: string[];
  cookedHistory: CookedHistoryEntry[];
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (parsed.profile && Array.isArray(parsed.pantryItems)) {
        return {
          profile: parsed.profile,
          pantryItems: parsed.pantryItems,
          wasteSavedInr: parsed.wasteSavedInr ?? 1450,
          savedRecipeIds: parsed.savedRecipeIds ?? ['palak-paneer-bhurji'],
          cookedHistory: parsed.cookedHistory ?? [
            {
              id: 'hist-1',
              recipeId: 'masala-paneer-fried-rice',
              recipeTitle: 'Tawa Masala Paneer Fried Rice',
              cookedAt: 'Yesterday · 8:30 PM',
              savedInr: 140,
              servings: 1,
            },
          ],
        };
      }
    }
  } catch {
    // Fallback to clean defaults
  }

  return {
    profile: DEFAULT_KITCHEN_PROFILE,
    pantryItems: INITIAL_PANTRY_ITEMS,
    wasteSavedInr: 1450,
    savedRecipeIds: ['palak-paneer-bhurji'],
    cookedHistory: [
      {
        id: 'hist-1',
        recipeId: 'masala-paneer-fried-rice',
        recipeTitle: 'Tawa Masala Paneer Fried Rice',
        cookedAt: 'Yesterday · 8:30 PM',
        savedInr: 140,
        servings: 1,
      },
    ],
  };
}

export default function App() {
  const [initial] = useState<PersistedState>(() => loadInitialState());
  const [profile, setProfile] = useState<KitchenProfile>(initial.profile);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>(
    initial.pantryItems,
  );
  const [wasteSavedInr, setWasteSavedInr] = useState<number>(
    initial.wasteSavedInr,
  );
  const [savedRecipeIds, setSavedRecipeIds] = useState<string[]>(
    initial.savedRecipeIds,
  );
  const [cookedHistory, setCookedHistory] = useState<CookedHistoryEntry[]>(
    initial.cookedHistory,
  );

  const [showSetup, setShowSetup] = useState<boolean>(
    !initial.profile.setupComplete,
  );
  const [activeTab, setActiveTab] = useState<AppTab>('pantry');
  const [recipeFilter, setRecipeFilter] = useState<RecipeFilter>('all');
  const [rescueItemId, setRescueItemId] = useState<string | null>(null);
  const [activeCookingRecipeId, setActiveCookingRecipeId] = useState<
    string | null
  >(null);
  const [scanModalMode, setScanModalMode] = useState<
    'camera' | 'voice' | 'manual' | null
  >(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const payload: PersistedState = {
        profile,
        pantryItems,
        wasteSavedInr,
        savedRecipeIds,
        cookedHistory,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [profile, pantryItems, wasteSavedInr, savedRecipeIds, cookedHistory]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const computedMatches = useMemo(
    () => computeRecipeMatches(RECIPES, pantryItems, profile),
    [pantryItems, profile],
  );

  const readyRecipesCount = useMemo(
    () => computedMatches.filter((m) => m.matchPercent >= 50).length,
    [computedMatches],
  );

  const rescueItem = useMemo(
    () => pantryItems.find((i) => i.id === rescueItemId) ?? null,
    [pantryItems, rescueItemId],
  );

  const activeCookingMatch: ComputedRecipeMatch | null = useMemo(() => {
    if (!activeCookingRecipeId) return null;
    return (
      computedMatches.find((m) => m.recipe.id === activeCookingRecipeId) ?? null
    );
  }, [computedMatches, activeCookingRecipeId]);

  const savedMatches = useMemo(
    () =>
      computedMatches.filter((m) => savedRecipeIds.includes(m.recipe.id)),
    [computedMatches, savedRecipeIds],
  );

  const handleToggleItem = (id: string) => {
    setPantryItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, available: !item.available } : item,
      ),
    );
  };

  const handleUpdateItem = (updated: PantryItem) => {
    setPantryItems((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item)),
    );
    showToast(`Updated ${updated.name}`);
  };

  const handleDeleteItem = (id: string) => {
    setPantryItems((prev) => prev.filter((item) => item.id !== id));
    showToast('Removed item from pantry');
  };

  const handleQuickAdd = (name: string) => {
    const existing = pantryItems.find(
      (i) => i.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      setPantryItems((prev) =>
        prev.map((i) => (i.id === existing.id ? { ...i, available: true } : i)),
      );
      showToast(`${existing.name} marked available`);
      return;
    }

    const newItem: PantryItem = {
      id: `custom-${Date.now()}`,
      name,
      category: 'Fresh Veggies',
      quantity: 1,
      unit: 'pack',
      daysLeft: 4,
      available: true,
      estimatedValueInr: 45,
    };
    setPantryItems((prev) => [newItem, ...prev]);
    showToast(`Added ${name} to pantry`);
  };

  const handleAddScannedItems = (scanned: ScannedItemInput[]) => {
    setPantryItems((prev) => {
      const next = [...prev];
      for (const s of scanned) {
        const idx = next.findIndex(
          (i) => i.name.toLowerCase() === s.name.toLowerCase(),
        );
        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            quantity: s.quantity,
            unit: s.unit,
            daysLeft: s.daysLeft,
            available: true,
          };
        } else {
          next.unshift({
            id: `scan-${s.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
            name: s.name,
            category: s.category,
            quantity: s.quantity,
            unit: s.unit,
            daysLeft: s.daysLeft,
            available: true,
            estimatedValueInr: s.estimatedValueInr,
          });
        }
      }
      return next;
    });
    showToast(
      `Added ${scanned.length} item${scanned.length > 1 ? 's' : ''} to your pantry`,
    );
    if (activeTab === 'scan') {
      setActiveTab('pantry');
    }
  };

  const handleRestockMissingItems = (keys: string[]) => {
    setPantryItems((prev) => {
      const next = [...prev];
      for (const key of keys) {
        const idx = next.findIndex(
          (i) =>
            i.id === key || i.name.toLowerCase() === key.toLowerCase(),
        );
        if (idx >= 0) {
          next[idx] = { ...next[idx], available: true, daysLeft: 5 };
        } else {
          next.unshift({
            id: `blinkit-${Date.now()}-${Math.random()}`,
            name: key,
            category: 'Fresh Veggies',
            quantity: 1,
            unit: 'pack',
            daysLeft: 5,
            available: true,
            estimatedValueInr: 45,
          });
        }
      }
      return next;
    });
    showToast('Restocked missing items via Blinkit into your pantry');
  };

  const handleToggleSaveRecipe = (recipeId: string) => {
    setSavedRecipeIds((prev) =>
      prev.includes(recipeId)
        ? prev.filter((id) => id !== recipeId)
        : [...prev, recipeId],
    );
  };

  const handleConfirmCooked = (
    deductedPantryIds: string[],
    savedInr: number,
    servingsMultiplier: 1 | 2,
  ) => {
    const cookedRecipeTitle =
      activeCookingMatch?.recipe.title ?? 'Home-cooked meal';
    const cookedRecipeId = activeCookingMatch?.recipe.id ?? 'meal';

    if (deductedPantryIds.length > 0) {
      setPantryItems((prev) =>
        prev.map((item) =>
          deductedPantryIds.includes(item.id)
            ? { ...item, available: false }
            : item,
        ),
      );
    }

    setWasteSavedInr((prev) => prev + savedInr);
    setCookedHistory((prev) => [
      {
        id: `cook-${Date.now()}`,
        recipeId: cookedRecipeId,
        recipeTitle: cookedRecipeTitle,
        cookedAt: 'Just now',
        savedInr,
        servings:
          (activeCookingMatch?.recipe.baseServings ?? 2) * servingsMultiplier,
      },
      ...prev,
    ]);

    setActiveCookingRecipeId(null);
    setActiveTab('pantry');
    showToast(`Cooked ${cookedRecipeTitle} · Saved ₹${savedInr}!`);
  };

  // Screen 1: 30-Second Kitchen Setup
  if (showSetup) {
    return (
      <KitchenSetup
        profile={profile}
        onSaveProfile={(updated) => {
          setProfile(updated);
          setShowSetup(false);
          setActiveTab('pantry');
          showToast('Kitchen profile saved');
        }}
        onSkipToPantry={() => {
          setProfile((prev) => ({ ...prev, setupComplete: true }));
          setShowSetup(false);
          setActiveTab('pantry');
        }}
      />
    );
  }

  // Screen 4: Step-by-Step Cooking Mode
  if (activeCookingMatch) {
    return (
      <CookingMode
        match={activeCookingMatch}
        pantryItems={pantryItems}
        onBack={() => setActiveCookingRecipeId(null)}
        onConfirmCooked={handleConfirmCooked}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1D1A] flex flex-col">
      {/* Desktop Top Navigation Bar (3-zone contract) */}
      <header className="hidden md:block sticky top-0 z-30 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#E7E4DC]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('pantry')}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-[#1E7E48] text-white flex items-center justify-center">
              <ChefHat className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-[#1A1D1A]">
              PantryPulse
            </span>
          </button>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav
            aria-label="Primary navigation"
            className="flex items-center gap-7 text-sm font-semibold"
          >
            {[
              { id: 'pantry' as const, label: 'Pantry' },
              { id: 'recipes' as const, label: 'Recipes' },
              { id: 'scan' as const, label: 'Scan/Add' },
              { id: 'saved' as const, label: 'Saved' },
            ].map((nav) => {
              const active = activeTab === nav.id;
              return (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => setActiveTab(nav.id)}
                  className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-[#1E7E48] text-[#1E7E48]'
                      : 'border-transparent text-[#5C645E] hover:text-[#1A1D1A]'
                  }`}
                >
                  {nav.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <button
            type="button"
            onClick={() => setShowSetup(true)}
            className="min-h-[44px] px-4 rounded-xl bg-white border border-[#E7E4DC] hover:border-[#1E7E48] text-xs font-semibold text-[#1A1D1A] inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#1E7E48]" />
            <span>Kitchen Setup</span>
          </button>
        </div>
      </header>

      {/* Mobile Non-Sticky Compact Top Brand Bar */}
      <header className="md:hidden px-4 pt-3 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#1E7E48] text-white flex items-center justify-center">
            <ChefHat className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-[#1A1D1A]">
            PantryPulse
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowSetup(true)}
          className="min-h-[44px] px-2 text-xs font-semibold text-[#5C645E] hover:text-[#1A1D1A] inline-flex items-center gap-1"
        >
          <span>Diet & Tools</span>
        </button>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-6 pt-3 md:pt-7">
        {activeTab === 'pantry' && (
          <PantryHome
            pantryItems={pantryItems}
            wasteSavedInr={wasteSavedInr}
            readyRecipesCount={readyRecipesCount}
            onToggleItem={handleToggleItem}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onQuickAdd={handleQuickAdd}
            onRestoreDefaults={() => {
              setPantryItems(INITIAL_PANTRY_ITEMS);
              showToast('Restored starter kitchen ingredients');
            }}
            onOpenScan={(mode) => setScanModalMode(mode)}
            onFindRecipes={() => {
              setRescueItemId(null);
              setActiveTab('recipes');
            }}
            onRescueItem={(itemId) => {
              setRescueItemId(itemId);
              setRecipeFilter('expiring');
              setActiveTab('recipes');
            }}
            onEditKitchen={() => setShowSetup(true)}
          />
        )}

        {activeTab === 'recipes' && (
          <RecipeFeed
            matches={computedMatches}
            activeFilter={recipeFilter}
            onChangeFilter={setRecipeFilter}
            rescueItem={rescueItem}
            onClearRescue={() => setRescueItemId(null)}
            savedRecipeIds={savedRecipeIds}
            onToggleSave={handleToggleSaveRecipe}
            onOpenRecipe={(match) => setActiveCookingRecipeId(match.recipe.id)}
            onRestockMissingItems={handleRestockMissingItems}
          />
        )}

        {activeTab === 'scan' && (
          <ScanAddSheet
            initialMode="camera"
            isStandaloneTab
            onAddItems={handleAddScannedItems}
          />
        )}

        {activeTab === 'saved' && (
          <SavedRecipes
            savedMatches={savedMatches}
            cookedHistory={cookedHistory}
            onOpenRecipe={(match) => setActiveCookingRecipeId(match.recipe.id)}
            onRemoveSaved={handleToggleSaveRecipe}
            onBrowseRecipes={() => setActiveTab('recipes')}
          />
        )}
      </main>

      {/* Mobile Bottom Tab Navigation (Pantry, Recipes, Scan/Add, Saved) */}
      <nav
        aria-label="Mobile bottom navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E7E4DC]"
      >
        <div className="grid grid-cols-4 h-[60px] items-center max-w-md mx-auto">
          {[
            { id: 'pantry' as const, label: 'Pantry', icon: Refrigerator },
            { id: 'recipes' as const, label: 'Recipes', icon: Utensils },
            { id: 'scan' as const, label: 'Scan/Add', icon: Camera },
            { id: 'saved' as const, label: 'Saved', icon: Bookmark },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'text-[#1E7E48]' : 'text-[#5C645E]'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${active ? 'stroke-[2.25]' : 'stroke-[1.75]'}`}
                />
                <span className="text-[11px] font-semibold tracking-tight">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Scan / Voice Quick-Add Modal */}
      {scanModalMode && (
        <ScanAddSheet
          initialMode={scanModalMode}
          onClose={() => setScanModalMode(null)}
          onAddItems={handleAddScannedItems}
        />
      )}

      {/* Subtle Toast Confirmation */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#1A1D1A] text-white text-xs sm:text-sm font-semibold shadow-lg whitespace-nowrap"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
