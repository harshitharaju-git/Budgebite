import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Timer,
  X,
} from 'lucide-react';
import { ComputedRecipeMatch, PantryItem } from '../types/pantry';
import { formatScaledAmount } from '../utils/recipeMatcher';

interface CookingModeProps {
  match: ComputedRecipeMatch;
  pantryItems: PantryItem[];
  onBack: () => void;
  onConfirmCooked: (
    deductedPantryIds: string[],
    savedInr: number,
    servingsMultiplier: 1 | 2,
  ) => void;
}

interface TimerState {
  remaining: number;
  running: boolean;
  completed: boolean;
}

function playGentleChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // Ignore audio context restrictions if blocked
  }
}

function formatSeconds(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const CookingMode: React.FC<CookingModeProps> = ({
  match,
  pantryItems,
  onBack,
  onConfirmCooked,
}) => {
  const { recipe, resolvedIngredients, substitutedIngredients } = match;
  const [multiplier, setMultiplier] = useState<1 | 2>(1);
  const [screenAwake, setScreenAwake] = useState(true);
  const [showIngredients, setShowIngredients] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>(
    {},
  );
  const [showDeductionSheet, setShowDeductionSheet] = useState(false);

  // Initialize countdown timers for each step that has timerSeconds
  const [timers, setTimers] = useState<Record<string, TimerState>>(() => {
    const init: Record<string, TimerState> = {};
    for (const step of recipe.steps) {
      if (step.timerSeconds) {
        init[step.id] = {
          remaining: step.timerSeconds,
          running: false,
          completed: false,
        };
      }
    }
    return init;
  });

  // Wake Lock API integration
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const nav = navigator as unknown as {
      wakeLock?: {
        request: (type: 'screen') => Promise<{ release: () => Promise<void> }>;
      };
    };

    if (screenAwake && nav.wakeLock) {
      nav.wakeLock
        .request('screen')
        .then((sentinel) => {
          if (cancelled) {
            sentinel.release().catch(() => {});
          } else {
            wakeLockRef.current = sentinel;
          }
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [screenAwake]);

  // Global interval ticking any active step timers
  useEffect(() => {
    const hasRunning = Object.values(timers).some((t) => t.running);
    if (!hasRunning) return;

    const id = window.setInterval(() => {
      setTimers((prev) => {
        const next: Record<string, TimerState> = { ...prev };
        for (const [stepId, state] of Object.entries(prev)) {
          if (state.running) {
            if (state.remaining <= 1) {
              playGentleChime();
              next[stepId] = {
                remaining: 0,
                running: false,
                completed: true,
              };
            } else {
              next[stepId] = {
                ...state,
                remaining: state.remaining - 1,
              };
            }
          }
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [timers]);

  const toggleTimer = (stepId: string, defaultSeconds: number) => {
    setTimers((prev) => {
      const current = prev[stepId] ?? {
        remaining: defaultSeconds,
        running: false,
        completed: false,
      };
      if (current.completed || current.remaining === 0) {
        return {
          ...prev,
          [stepId]: {
            remaining: defaultSeconds,
            running: true,
            completed: false,
          },
        };
      }
      return {
        ...prev,
        [stepId]: { ...current, running: !current.running },
      };
    });
  };

  const resetTimer = (stepId: string, defaultSeconds: number) => {
    setTimers((prev) => ({
      ...prev,
      [stepId]: {
        remaining: defaultSeconds,
        running: false,
        completed: false,
      },
    }));
  };

  // Used perishables from pantry for "Cooked This" automatic deduction
  const usedPerishables = useMemo(() => {
    const pantryMap = new Map(pantryItems.map((i) => [i.id, i]));
    const items: PantryItem[] = [];
    for (const ri of resolvedIngredients) {
      const pId =
        ri.matchedPantryItem?.id ??
        (ri.status === 'substituted'
          ? ri.activeSubstitution?.pantryItemId
          : undefined);
      if (pId) {
        const found = pantryMap.get(pId);
        if (found && found.available && found.daysLeft !== null) {
          if (!items.some((x) => x.id === found.id)) {
            items.push(found);
          }
        }
      }
    }
    return items;
  }, [pantryItems, resolvedIngredients]);

  const [checkedPerishableIds, setCheckedPerishableIds] = useState<string[]>(
    () => usedPerishables.map((p) => p.id),
  );

  // Sync default checked list if sheet opens
  const openCompletionSheet = () => {
    setCheckedPerishableIds(usedPerishables.map((p) => p.id));
    setShowDeductionSheet(true);
  };

  const togglePerishableCheck = (id: string) => {
    setCheckedPerishableIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const estimatedSavingsInr = useMemo(() => {
    return usedPerishables
      .filter((p) => checkedPerishableIds.includes(p.id))
      .reduce((sum, p) => sum + p.estimatedValueInr, 0);
  }, [usedPerishables, checkedPerishableIds]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1D1A] pb-28">
      {/* Distraction-Free Sticky Header */}
      <header className="sticky top-0 z-30 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#E7E4DC]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to recipes"
              className="min-h-[44px] min-w-[44px] -ml-2 rounded-full hover:bg-black/5 flex items-center justify-center text-[#1A1D1A] shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-sm sm:text-base font-bold text-[#1A1D1A] truncate">
              {recipe.title}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Serving Size Adjuster 1x / 2x */}
            <div
              role="group"
              aria-label="Serving size multiplier"
              className="inline-flex items-center p-0.5 rounded-lg bg-[#EAE6DC]"
            >
              {([1, 2] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMultiplier(m)}
                  className={`min-h-[36px] px-2.5 rounded-md text-xs font-semibold tabular-nums transition-colors ${
                    multiplier === m
                      ? 'bg-white text-[#1A1D1A] shadow-xs'
                      : 'text-[#5C645E] hover:text-[#1A1D1A]'
                  }`}
                >
                  {m}x
                </button>
              ))}
            </div>

            {/* Screen-Awake Indicator */}
            <button
              type="button"
              onClick={() => setScreenAwake((prev) => !prev)}
              aria-pressed={screenAwake}
              title="Keep screen awake while cooking"
              className={`min-h-[36px] px-2.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                screenAwake
                  ? 'bg-[#F0F9F3] border-[#1E7E48]/30 text-[#1E7E48]'
                  : 'bg-white border-[#DCD7CC] text-[#5C645E]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {screenAwake ? 'Awake On' : 'Awake Off'}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* Smart Substitution Callout Box (No border-l-4, clean warm amber tint + hairline border) */}
        {substitutedIngredients.length > 0 && (
          <section
            aria-label="Smart substitutions active"
            className="bg-[#FFF7F0] border border-[#E06D2B]/30 rounded-xl p-4 space-y-2"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-[#9A4212]">
              <RefreshCw className="w-4 h-4 text-[#E06D2B] shrink-0" />
              <span>Smart Substitution Active</span>
            </div>
            <div className="space-y-1.5">
              {substitutedIngredients.map((si) => (
                <p
                  key={si.ingredient.id}
                  className="text-sm text-[#1A1D1A] leading-relaxed"
                >
                  {si.activeSubstitution?.note}
                </p>
              ))}
            </div>
          </section>
        )}

        {/* Scaled Ingredient Checklist */}
        <section className="bg-white rounded-xl border border-[#E7E4DC] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowIngredients((prev) => !prev)}
            className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between text-left"
          >
            <div>
              <h2 className="text-base font-bold text-[#1A1D1A]">
                Ingredients ({recipe.baseServings * multiplier} servings)
              </h2>
              <p className="text-xs text-[#5C645E]">
                Scaled automatically to {multiplier}x
              </p>
            </div>
            {showIngredients ? (
              <ChevronUp className="w-5 h-5 text-[#5C645E]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[#5C645E]" />
            )}
          </button>

          {showIngredients && (
            <div className="px-4 pb-4 pt-1 border-t border-[#F0EDE6] grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {resolvedIngredients.map((ri) => {
                const displayAmt = formatScaledAmount(
                  ri.ingredient.amount,
                  multiplier,
                );
                return (
                  <div
                    key={ri.ingredient.id}
                    className="flex items-center justify-between gap-2 py-1.5 text-sm"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          ri.status === 'owned'
                            ? 'bg-[#1E7E48]'
                            : ri.status === 'substituted'
                              ? 'bg-[#E06D2B]'
                              : 'bg-[#B42318]'
                        }`}
                      />
                      <span className="text-[#1A1D1A] font-medium truncate">
                        {ri.status === 'substituted'
                          ? `${ri.activeSubstitution?.itemName} (swap)`
                          : ri.ingredient.name}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-[#5C645E] tabular-nums shrink-0">
                      {displayAmt} {ri.ingredient.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Numbered Large-Font Cooking Steps with Interactive Countdown Timers */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-[#1A1D1A]">
            Cooking Steps
          </h2>

          {recipe.steps.map((step, index) => {
            const stepDone = Boolean(completedSteps[step.id]);
            const timer = timers[step.id];
            const progressPct =
              step.timerSeconds && timer
                ? ((step.timerSeconds - timer.remaining) / step.timerSeconds) *
                  100
                : 0;

            return (
              <div
                key={step.id}
                className={`bg-white rounded-xl border p-4 sm:p-5 space-y-4 transition-colors ${
                  stepDone
                    ? 'border-[#1E7E48]/40 bg-[#F9FCFA]'
                    : 'border-[#E7E4DC]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 rounded-full text-xs font-bold tabular-nums flex items-center justify-center shrink-0 ${
                        stepDone
                          ? 'bg-[#1E7E48] text-white'
                          : 'bg-[#FAF9F6] border border-[#DCD7CC] text-[#1A1D1A]'
                      }`}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h3 className="text-base font-bold text-[#1A1D1A]">
                      {step.title}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setCompletedSteps((prev) => ({
                        ...prev,
                        [step.id]: !prev[step.id],
                      }))
                    }
                    aria-label={`Mark step ${index + 1} complete`}
                    className={`min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center border transition-colors ${
                      stepDone
                        ? 'bg-[#1E7E48] border-[#1E7E48] text-white'
                        : 'bg-[#FAF9F6] border-[#DCD7CC] text-[#5C645E] hover:border-[#1E7E48]'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>

                <p
                  className={`text-lg leading-relaxed ${
                    stepDone ? 'text-[#5C645E]' : 'text-[#1A1D1A]'
                  }`}
                >
                  {step.instruction}
                </p>

                {/* Built-in Interactive Countdown Timer */}
                {step.timerSeconds && timer && (
                  <div className="rounded-xl bg-[#FAF9F6] border border-[#E7E4DC] p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Timer
                          className={`w-4 h-4 shrink-0 ${
                            timer.completed
                              ? 'text-[#1E7E48]'
                              : timer.running
                                ? 'text-[#E06D2B]'
                                : 'text-[#5C645E]'
                          }`}
                        />
                        <span className="text-xs font-semibold text-[#5C645E] truncate">
                          {timer.completed
                            ? 'Timer Complete'
                            : step.timerLabel ?? 'Step timer'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-base font-semibold tabular-nums text-[#1A1D1A]">
                          {formatSeconds(timer.remaining)}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            toggleTimer(step.id, step.timerSeconds!)
                          }
                          className={`min-h-[44px] px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                            timer.running
                              ? 'bg-[#E06D2B] text-white'
                              : 'bg-[#1E7E48] text-white'
                          }`}
                        >
                          {timer.running ? (
                            <>
                              <Pause className="w-3.5 h-3.5" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" />
                              <span>
                                {timer.completed ? 'Restart' : 'Start'}
                              </span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            resetTimer(step.id, step.timerSeconds!)
                          }
                          aria-label="Reset timer"
                          className="min-h-[44px] min-w-[44px] rounded-lg border border-[#DCD7CC] bg-white text-[#5C645E] hover:text-[#1A1D1A] flex items-center justify-center"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-[#E7E4DC] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          timer.completed ? 'bg-[#1E7E48]' : 'bg-[#E06D2B]'
                        }`}
                        style={{ width: `${Math.min(100, progressPct)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </main>

      {/* Sticky Completion Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-[#FAF9F6] via-[#FAF9F6]/95 to-transparent pt-4 pb-4 px-4">
        <div className="max-w-3xl mx-auto">
          <button
            type="button"
            onClick={openCompletionSheet}
            className="w-full min-h-[48px] px-5 rounded-xl bg-[#1E7E48] hover:bg-[#166237] text-white text-base font-semibold shadow-lg shadow-[#1E7E48]/20 transition-transform active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <span>I Cooked This ✓</span>
          </button>
        </div>
      </div>

      {/* Bottom-Sheet Confirmation Checklist for Pantry Deduction */}
      {showDeductionSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowDeductionSheet(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-5 space-y-4 border border-[#E7E4DC]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-[#DCD7CC] rounded-full mx-auto sm:hidden" />

            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#1A1D1A]">
                  Sync Used Perishables
                </h3>
                <p className="text-xs text-[#5C645E] mt-0.5">
                  Uncheck anything you still have enough of in your fridge.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeductionSheet(false)}
                aria-label="Close confirmation"
                className="min-h-[44px] min-w-[44px] rounded-full hover:bg-[#FAF9F6] flex items-center justify-center text-[#5C645E]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {usedPerishables.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {usedPerishables.map((item) => {
                  const checked = checkedPerishableIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => togglePerishableCheck(item.id)}
                      className={`w-full min-h-[52px] px-3.5 py-2.5 rounded-xl border flex items-center justify-between gap-3 text-left transition-colors ${
                        checked
                          ? 'bg-[#F0F9F3] border-[#1E7E48]/40'
                          : 'bg-[#FAF9F6] border-[#E7E4DC]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                            checked
                              ? 'bg-[#1E7E48] border-[#1E7E48] text-white'
                              : 'bg-white border-[#C5BFB2]'
                          }`}
                        >
                          {checked && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[#1A1D1A]">
                            {item.name}
                          </p>
                          <p className="text-xs text-[#5C645E] tabular-nums">
                            Deduct {item.quantity} {item.unit}
                          </p>
                        </div>
                      </div>

                      <span className="text-xs font-semibold text-[#1E7E48] tabular-nums">
                        ₹{item.estimatedValueInr}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E7E4DC] text-sm text-[#5C645E]">
                No expiring perishables to deduct for this recipe. Your cooking
                log will still be saved.
              </div>
            )}

            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#EBF7F0] text-sm font-semibold text-[#1E7E48]">
              <span>Food waste prevented</span>
              <span className="tabular-nums">
                +₹{Math.max(40, estimatedSavingsInr)} saved
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                onConfirmCooked(
                  checkedPerishableIds,
                  Math.max(40, estimatedSavingsInr),
                  multiplier,
                );
                setShowDeductionSheet(false);
              }}
              className="w-full min-h-[48px] px-4 rounded-xl bg-[#1E7E48] hover:bg-[#166237] text-white text-sm font-semibold transition-colors"
            >
              Confirm & Update Pantry
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
