import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Check,
  Mic,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { EMPTY_PANTRY_IMAGE } from '../data/pantryData';
import { PantryCategory, PantryItem } from '../types/pantry';
import { formatExpiryLabel } from '../utils/recipeMatcher';

interface PantryHomeProps {
  pantryItems: PantryItem[];
  wasteSavedInr: number;
  readyRecipesCount: number;
  onToggleItem: (id: string) => void;
  onUpdateItem: (updated: PantryItem) => void;
  onDeleteItem: (id: string) => void;
  onQuickAdd: (name: string) => void;
  onRestoreDefaults: () => void;
  onOpenScan: (initialMode: 'camera' | 'voice' | 'manual') => void;
  onFindRecipes: () => void;
  onRescueItem: (itemId: string) => void;
  onEditKitchen: () => void;
}

const CATEGORIES: PantryCategory[] = [
  'Fresh Veggies',
  'Dairy & Protein',
  'Grains/Leftovers',
];

export const PantryHome: React.FC<PantryHomeProps> = ({
  pantryItems,
  wasteSavedInr,
  readyRecipesCount,
  onToggleItem,
  onUpdateItem,
  onDeleteItem,
  onQuickAdd,
  onRestoreDefaults,
  onOpenScan,
  onFindRecipes,
  onRescueItem,
  onEditKitchen,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  const availableItems = useMemo(
    () => pantryItems.filter((item) => item.available),
    [pantryItems],
  );

  const expiringItems = useMemo(
    () =>
      pantryItems
        .filter(
          (item) =>
            item.available && item.daysLeft !== null && item.daysLeft <= 2,
        )
        .sort((a, b) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99)),
    [pantryItems],
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pantryItems;
    return pantryItems.filter((item) => item.name.toLowerCase().includes(q));
  }, [pantryItems, searchQuery]);

  const exactMatchExists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return pantryItems.some((item) => item.name.toLowerCase() === q);
  }, [pantryItems, searchQuery]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Long-press handlers for editing quantity & expiry
  const handlePointerDown = (item: PantryItem) => {
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      setEditingItem(item);
    }, 450);
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleChipClick = (item: PantryItem) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    onToggleItem(item.id);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    if (!exactMatchExists) {
      onQuickAdd(trimmed);
      setSearchQuery('');
    }
  };

  return (
    <div className="space-y-6 pb-28 md:pb-10">
      {/* Greeting & Food Waste Saved Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1D1A]">
            {getGreeting()}, Chef
          </h1>
          <p className="text-sm text-[#5C645E] mt-0.5 tabular-nums">
            {availableItems.length} ingredients ready on your shelf
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#EBF7F0] border border-[#1E7E48]/20 text-xs sm:text-sm font-semibold text-[#1E7E48] tabular-nums">
            <span>₹{wasteSavedInr.toLocaleString('en-IN')} saved this month</span>
          </div>

          <button
            type="button"
            onClick={onEditKitchen}
            aria-label="Edit kitchen profile"
            className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-white border border-[#E7E4DC] text-[#1A1D1A] hover:border-[#1E7E48]/50 transition-colors inline-flex items-center justify-center gap-1.5 text-xs font-semibold"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#5C645E]" />
            <span className="hidden sm:inline">Kitchen Setup</span>
          </button>
        </div>
      </section>

      {/* Expiring Soon Horizontal Carousel */}
      {expiringItems.length > 0 && (
        <section aria-labelledby="expiring-heading">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#E06D2B]" />
              <h2
                id="expiring-heading"
                className="text-sm font-semibold text-[#1A1D1A]"
              >
                Expiring Soon
              </h2>
            </div>
            <span className="text-xs font-medium text-[#E06D2B] tabular-nums">
              {expiringItems.length} to rescue
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            {expiringItems.map((item) => (
              <div
                key={item.id}
                className="shrink-0 w-[235px] sm:w-[250px] bg-[#FFF8F3] border border-[#E06D2B]/30 rounded-xl p-3.5 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-sm text-[#1A1D1A] leading-snug">
                      {item.name}
                    </span>
                    <span className="text-xs font-medium text-[#5C645E] tabular-nums shrink-0">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#E06D2B] mt-1">
                    {formatExpiryLabel(item.daysLeft)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onRescueItem(item.id)}
                  className="min-h-[44px] w-full px-3 rounded-lg bg-[#E06D2B] hover:bg-[#C95C1E] text-white text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <span>Rescue Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick-Add Bar with Camera Scan & Voice Input */}
      <section className="bg-white rounded-xl p-3 border border-[#E7E4DC]">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-[#5C645E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or quick-add (e.g. Mushroom)..."
              className="w-full min-h-[44px] pl-9 pr-8 rounded-lg bg-[#FAF9F6] border border-[#E7E4DC] text-sm text-[#1A1D1A] placeholder:text-[#5C645E] focus:outline-none focus:border-[#1E7E48]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#5C645E] hover:text-[#1A1D1A]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => onOpenScan('camera')}
            aria-label="Camera Scan for countertop or receipt"
            className="min-h-[44px] px-3.5 rounded-lg bg-[#1E7E48] hover:bg-[#166237] text-white text-xs sm:text-sm font-semibold transition-colors inline-flex items-center gap-1.5 shrink-0"
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Scan</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenScan('voice')}
            aria-label="Voice input ingredients"
            className="min-h-[44px] min-w-[44px] rounded-lg bg-[#FAF9F6] border border-[#E7E4DC] hover:border-[#1E7E48] text-[#1A1D1A] transition-colors inline-flex items-center justify-center shrink-0"
          >
            <Mic className="w-4 h-4 text-[#1E7E48]" />
          </button>
        </form>

        {searchQuery.trim() && !exactMatchExists && (
          <button
            type="button"
            onClick={() => {
              onQuickAdd(searchQuery.trim());
              setSearchQuery('');
            }}
            className="mt-2.5 min-h-[44px] w-full px-3 rounded-lg bg-[#F0F9F3] border border-[#1E7E48]/25 text-[#1E7E48] text-sm font-semibold flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add "{searchQuery.trim()}" to Pantry</span>
          </button>
        )}
      </section>

      {/* Empty State when no ingredients are selected */}
      {availableItems.length === 0 ? (
        <section className="bg-white rounded-xl border border-[#E7E4DC] overflow-hidden">
          <div className="grid md:grid-cols-2 items-center">
            <div className="aspect-[4/3] bg-[#F2EFE8] relative overflow-hidden">
              <img
                src={EMPTY_PANTRY_IMAGE}
                alt="Clean empty ceramic bowl and wooden chopping board on kitchen counter"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-[#1A1D1A]">
                Your pantry selection is empty
              </h2>
              <p className="text-sm text-[#5C645E] leading-relaxed">
                Tap any ingredient below to mark it available, scan your fridge
                countertop, or restore your starter essentials.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={onRestoreDefaults}
                  className="min-h-[44px] px-4 rounded-xl bg-[#1E7E48] hover:bg-[#166237] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restore Kitchen Items</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenScan('camera')}
                  className="min-h-[44px] px-4 rounded-xl bg-[#FAF9F6] border border-[#DCD7CC] text-[#1A1D1A] text-sm font-semibold inline-flex items-center gap-2 hover:border-[#1E7E48] transition-colors"
                >
                  <Camera className="w-4 h-4 text-[#1E7E48]" />
                  <span>Scan Fridge</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Categorized Pantry Chips */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#1A1D1A]">
            Pantry Inventory
          </h2>
          <span className="text-xs text-[#5C645E]">
            Tap to toggle · Hold to edit qty/expiry
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {CATEGORIES.map((category) => {
            const itemsInCat = filteredItems.filter(
              (item) => item.category === category,
            );
            if (itemsInCat.length === 0 && searchQuery.trim()) return null;

            return (
              <div
                key={category}
                className="bg-white rounded-xl p-4 border border-[#E7E4DC] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#1A1D1A]">
                    {category}
                  </h3>
                  <span className="text-xs text-[#5C645E] tabular-nums">
                    {itemsInCat.filter((i) => i.available).length}/
                    {itemsInCat.length} active
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {itemsInCat.map((item) => {
                    const isUrgent =
                      item.available &&
                      item.daysLeft !== null &&
                      item.daysLeft <= 2;

                    return (
                      <div key={item.id} className="inline-flex items-center">
                        <button
                          type="button"
                          onPointerDown={() => handlePointerDown(item)}
                          onPointerUp={clearLongPress}
                          onPointerLeave={clearLongPress}
                          onPointerCancel={clearLongPress}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setEditingItem(item);
                          }}
                          onClick={() => handleChipClick(item)}
                          aria-pressed={item.available}
                          className={`min-h-[44px] pl-3.5 pr-2.5 py-2 rounded-full text-sm font-medium border transition-colors inline-flex items-center gap-2 select-none ${
                            item.available
                              ? isUrgent
                                ? 'bg-[#FFF5EE] border-[#E06D2B]/50 text-[#1A1D1A]'
                                : 'bg-[#F0F9F3] border-[#1E7E48]/40 text-[#1A1D1A]'
                              : 'bg-[#FAF9F6] border-[#E7E4DC] text-[#5C645E] opacity-75 hover:opacity-100'
                          }`}
                        >
                          {item.available && (
                            <Check
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isUrgent ? 'text-[#E06D2B]' : 'text-[#1E7E48]'
                              }`}
                            />
                          )}
                          <span>{item.name}</span>
                          <span className="text-xs text-[#5C645E] tabular-nums">
                            {item.quantity}
                            {item.unit}
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            aria-label={`Edit ${item.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingItem(item);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditingItem(item);
                              }
                            }}
                            className="w-6 h-6 rounded-full hover:bg-black/5 inline-flex items-center justify-center text-[#5C645E]"
                          >
                            <Pencil className="w-3 h-3" />
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Desktop Inline CTA + Mobile Floating CTA */}
      <div className="hidden md:flex justify-end pt-2">
        <button
          type="button"
          onClick={onFindRecipes}
          className="min-h-[48px] px-6 rounded-xl bg-[#1E7E48] hover:bg-[#166237] text-white text-base font-semibold transition-colors inline-flex items-center gap-2.5 shadow-sm"
        >
          <Sparkles className="w-4 h-4" />
          <span className="tabular-nums">
            Find Recipes ({readyRecipesCount} Ready)
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Floating Bottom CTA above bottom tab nav */}
      <div className="md:hidden fixed bottom-[68px] left-0 right-0 z-30 px-4 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <button
            type="button"
            onClick={onFindRecipes}
            className="w-full min-h-[48px] px-5 rounded-xl bg-[#1E7E48] hover:bg-[#166237] text-white text-sm font-semibold shadow-lg shadow-[#1E7E48]/20 transition-transform active:scale-[0.98] inline-flex items-center justify-center gap-2"
          >
            <span className="tabular-nums">
              Find Recipes ({readyRecipesCount} Ready)
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Long-Press / Edit Quantity & Expiry Bottom Sheet */}
      {editingItem && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setEditingItem(null)}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-5 space-y-5 border border-[#E7E4DC]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-[#DCD7CC] rounded-full mx-auto sm:hidden" />

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#1A1D1A]">
                  {editingItem.name}
                </h3>
                <p className="text-xs text-[#5C645E]">{editingItem.category}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                aria-label="Close editor"
                className="min-h-[44px] min-w-[44px] rounded-full hover:bg-[#FAF9F6] flex items-center justify-center text-[#5C645E]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quantity Stepper */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#5C645E]">
                Quantity
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setEditingItem((prev) =>
                      prev
                        ? {
                            ...prev,
                            quantity: Math.max(
                              1,
                              prev.quantity - (prev.unit === 'g' ? 50 : 1),
                            ),
                          }
                        : null,
                    )
                  }
                  className="min-h-[44px] min-w-[44px] rounded-xl border border-[#DCD7CC] bg-[#FAF9F6] text-lg font-bold text-[#1A1D1A]"
                >
                  −
                </button>
                <div className="flex-1 text-center font-semibold text-base tabular-nums text-[#1A1D1A]">
                  {editingItem.quantity} {editingItem.unit}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditingItem((prev) =>
                      prev
                        ? {
                            ...prev,
                            quantity:
                              prev.quantity + (prev.unit === 'g' ? 50 : 1),
                          }
                        : null,
                    )
                  }
                  className="min-h-[44px] min-w-[44px] rounded-xl border border-[#DCD7CC] bg-[#FAF9F6] text-lg font-bold text-[#1A1D1A]"
                >
                  +
                </button>
              </div>
            </div>

            {/* Expiry Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#5C645E]">
                Freshness & Expiry
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Use Today', value: 0 },
                  { label: 'Tomorrow', value: 1 },
                  { label: '2 Days', value: 2 },
                  { label: '4 Days', value: 4 },
                  { label: '7 Days', value: 7 },
                  { label: 'Shelf-stable', value: null },
                ].map((opt) => {
                  const selected = editingItem.daysLeft === opt.value;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() =>
                        setEditingItem((prev) =>
                          prev ? { ...prev, daysLeft: opt.value } : null,
                        )
                      }
                      className={`min-h-[44px] px-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                        selected
                          ? opt.value !== null && opt.value <= 2
                            ? 'bg-[#E06D2B] text-white border-[#E06D2B]'
                            : 'bg-[#1E7E48] text-white border-[#1E7E48]'
                          : 'bg-[#FAF9F6] text-[#1A1D1A] border-[#E7E4DC]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  onDeleteItem(editingItem.id);
                  setEditingItem(null);
                }}
                className="min-h-[48px] px-4 rounded-xl border border-[#E79E98] text-[#B42318] hover:bg-[#FEF3F2] text-sm font-semibold inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateItem({ ...editingItem, available: true });
                  setEditingItem(null);
                }}
                className="flex-1 min-h-[48px] px-4 rounded-xl bg-[#1E7E48] hover:bg-[#166237] text-white text-sm font-semibold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
