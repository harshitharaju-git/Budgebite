import React, { useState } from 'react';
import {
  ArrowRight,
  Ban,
  Check,
  ChefHat,
  Flame,
  Microwave,
  RotateCw,
  ShieldAlert,
  Sparkles,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';
import {
  ALLERGEN_OPTIONS,
  APPLIANCE_OPTIONS,
  BASIC_INDIAN_STAPLES,
  DIETARY_OPTIONS,
  EXTRA_STAPLES,
} from '../data/pantryData';
import {
  Allergen,
  Appliance,
  DietaryPreference,
  KitchenProfile,
} from '../types/pantry';

interface KitchenSetupProps {
  profile: KitchenProfile;
  onSaveProfile: (updated: KitchenProfile) => void;
  onSkipToPantry: () => void;
}

const APPLIANCE_ICONS: Record<Appliance, React.ReactNode> = {
  'Single Induction': <Zap className="w-5 h-5" />,
  'Gas Stove': <Flame className="w-5 h-5" />,
  Microwave: <Microwave className="w-5 h-5" />,
  'Mixer/Grinder': <RotateCw className="w-5 h-5" />,
  'Electric Kettle': <UtensilsCrossed className="w-5 h-5" />,
  'No Oven': <Ban className="w-5 h-5" />,
};

export const KitchenSetup: React.FC<KitchenSetupProps> = ({
  profile,
  onSaveProfile,
  onSkipToPantry,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [draft, setDraft] = useState<KitchenProfile>(profile);

  const toggleDietary = (item: DietaryPreference) => {
    setDraft((prev) => {
      const exists = prev.dietary.includes(item);
      const next = exists
        ? prev.dietary.filter((d) => d !== item)
        : [...prev.dietary, item];
      return { ...prev, dietary: next };
    });
  };

  const toggleAllergen = (item: Allergen) => {
    setDraft((prev) => {
      const exists = prev.allergens.includes(item);
      const next = exists
        ? prev.allergens.filter((a) => a !== item)
        : [...prev.allergens, item];
      return { ...prev, allergens: next };
    });
  };

  const toggleAppliance = (item: Appliance) => {
    setDraft((prev) => {
      const exists = prev.appliances.includes(item);
      const next = exists
        ? prev.appliances.filter((a) => a !== item)
        : [...prev.appliances, item];
      return { ...prev, appliances: next };
    });
  };

  const toggleStaple = (staple: string) => {
    setDraft((prev) => {
      const exists = prev.staples.includes(staple);
      const next = exists
        ? prev.staples.filter((s) => s !== staple)
        : [...prev.staples, staple];
      return { ...prev, staples: next };
    });
  };

  const selectAllBasicStaples = () => {
    setDraft((prev) => {
      const merged = Array.from(
        new Set([...prev.staples, ...BASIC_INDIAN_STAPLES]),
      );
      return { ...prev, staples: merged };
    });
  };

  const allBasicSelected = BASIC_INDIAN_STAPLES.every((s) =>
    draft.staples.includes(s),
  );

  const handleComplete = () => {
    onSaveProfile({ ...draft, setupComplete: true });
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1D1A] pb-28">
      {/* Compact Sticky Header */}
      <header className="sticky top-0 z-30 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#E7E4DC]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#1E7E48] text-white flex items-center justify-center shrink-0">
                <ChefHat className="w-4 h-4" />
              </div>
              <span className="font-bold tracking-tight text-base text-[#1A1D1A] whitespace-nowrap">
                PantryPulse
              </span>
            </div>

            <button
              type="button"
              onClick={onSkipToPantry}
              className="min-h-[44px] px-3 text-sm font-medium text-[#5C645E] hover:text-[#1A1D1A] transition-colors whitespace-nowrap"
            >
              Skip to Pantry
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs font-medium text-[#5C645E] mb-1.5">
              <span className="tabular-nums">Step {step} of 2</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={`transition-colors ${
                    step === 1
                      ? 'text-[#1E7E48] font-semibold'
                      : 'text-[#5C645E] hover:text-[#1A1D1A]'
                  }`}
                >
                  1. Diet & Tools
                </button>
                <span aria-hidden="true" className="text-[#D4CFC5]">
                  /
                </span>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className={`transition-colors ${
                    step === 2
                      ? 'text-[#1E7E48] font-semibold'
                      : 'text-[#5C645E] hover:text-[#1A1D1A]'
                  }`}
                >
                  2. Spice & Staple Rack
                </button>
              </div>
            </div>
            <div className="w-full h-1.5 bg-[#E7E4DC] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1E7E48] rounded-full transition-transform duration-200 origin-left"
                style={{
                  transform: `scaleX(${step === 1 ? 0.5 : 1})`,
                }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1D1A]">
            Set up your kitchen once
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-[#5C645E] leading-relaxed">
            {step === 1
              ? 'Tell us what you eat and what you cook with so every recipe fits your setup.'
              : 'Toggle the spices and basics you already keep on hand so we never ask you to buy salt.'}
          </p>
        </div>

        {step === 1 ? (
          <div className="space-y-6">
            {/* Dietary Preferences */}
            <section className="bg-white rounded-xl p-4 sm:p-5 border border-[#E7E4DC]">
              <div className="flex items-baseline justify-between gap-2 mb-3.5">
                <h2 className="text-base font-semibold text-[#1A1D1A]">
                  Dietary Preferences
                </h2>
                <span className="text-xs text-[#5C645E]">Multi-select</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {DIETARY_OPTIONS.map((item) => {
                  const selected = draft.dietary.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleDietary(item)}
                      aria-pressed={selected}
                      className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium border transition-colors inline-flex items-center gap-2 whitespace-nowrap ${
                        selected
                          ? 'bg-[#1E7E48] text-white border-[#1E7E48]'
                          : 'bg-[#FAF9F6] text-[#1A1D1A] border-[#DCD7CC] hover:border-[#1E7E48]/60'
                      }`}
                    >
                      {selected && <Check className="w-4 h-4 shrink-0" />}
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Allergen Hard-Blocks */}
            <section className="bg-white rounded-xl p-4 sm:p-5 border border-[#E7E4DC]">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#C63B2F]" />
                  <h2 className="text-base font-semibold text-[#1A1D1A]">
                    Allergen Hard-Blocks
                  </h2>
                </div>
                <span className="text-xs text-[#5C645E]">Strictly hidden</span>
              </div>
              <p className="text-xs text-[#5C645E] mb-3.5">
                Recipes containing selected allergens will be automatically filtered out.
              </p>
              <div className="flex flex-wrap gap-2.5">
                {ALLERGEN_OPTIONS.map((item) => {
                  const blocked = draft.allergens.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleAllergen(item)}
                      aria-pressed={blocked}
                      className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium border transition-colors inline-flex items-center gap-2 whitespace-nowrap ${
                        blocked
                          ? 'bg-[#C63B2F] text-white border-[#C63B2F]'
                          : 'bg-white text-[#B42318] border-[#E79E98] hover:bg-[#FEF3F2]'
                      }`}
                    >
                      <Ban className="w-3.5 h-3.5 shrink-0" />
                      <span>No {item}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Available Appliances Grid */}
            <section className="bg-white rounded-xl p-4 sm:p-5 border border-[#E7E4DC]">
              <div className="flex items-baseline justify-between gap-2 mb-3.5">
                <h2 className="text-base font-semibold text-[#1A1D1A]">
                  Available Appliances
                </h2>
                <span className="text-xs text-[#5C645E] tabular-nums">
                  {draft.appliances.length} selected
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {APPLIANCE_OPTIONS.map((appliance) => {
                  const active = draft.appliances.includes(appliance);
                  return (
                    <button
                      key={appliance}
                      type="button"
                      onClick={() => toggleAppliance(appliance)}
                      aria-pressed={active}
                      className={`min-h-[72px] p-3.5 rounded-xl border text-left transition-colors flex flex-col justify-between gap-2 ${
                        active
                          ? 'bg-[#F0F9F3] border-[#1E7E48] text-[#1A1D1A]'
                          : 'bg-[#FAF9F6] border-[#E7E4DC] text-[#5C645E] hover:border-[#C5BFB2]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={
                            active ? 'text-[#1E7E48]' : 'text-[#5C645E]'
                          }
                        >
                          {APPLIANCE_ICONS[appliance]}
                        </span>
                        {active && (
                          <span className="w-5 h-5 rounded-full bg-[#1E7E48] text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-semibold leading-tight text-[#1A1D1A]">
                        {appliance}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Default Spice & Staple Rack */}
            <section className="bg-white rounded-xl p-4 sm:p-5 border border-[#E7E4DC]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base font-semibold text-[#1A1D1A]">
                    Default Spice & Staple Rack
                  </h2>
                  <p className="text-xs text-[#5C645E] mt-0.5">
                    Tap to toggle what is always stocked in your shelf.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={selectAllBasicStaples}
                  className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold border transition-colors inline-flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto ${
                    allBasicSelected
                      ? 'bg-[#F0F9F3] text-[#1E7E48] border-[#1E7E48]/30'
                      : 'bg-[#FAF9F6] text-[#1A1D1A] border-[#DCD7CC] hover:border-[#1E7E48]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#1E7E48]" />
                  <span>
                    {allBasicSelected
                      ? 'All Basic Indian Staples Selected'
                      : 'Select All Basic Indian Staples'}
                  </span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {[...BASIC_INDIAN_STAPLES, ...EXTRA_STAPLES].map((staple) => {
                  const checked = draft.staples.includes(staple);
                  return (
                    <button
                      key={staple}
                      type="button"
                      onClick={() => toggleStaple(staple)}
                      aria-pressed={checked}
                      className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium border transition-colors inline-flex items-center gap-2 whitespace-nowrap ${
                        checked
                          ? 'bg-[#1E7E48] text-white border-[#1E7E48]'
                          : 'bg-[#FAF9F6] text-[#5C645E] border-[#DCD7CC] hover:text-[#1A1D1A]'
                      }`}
                    >
                      {checked && <Check className="w-4 h-4 shrink-0" />}
                      <span>{staple}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Quick Summary Review */}
            <section className="bg-white rounded-xl p-4 sm:p-5 border border-[#E7E4DC]">
              <h3 className="text-sm font-semibold text-[#1A1D1A] mb-2">
                Your Kitchen Summary
              </h3>
              <div className="text-sm text-[#5C645E] space-y-1.5">
                <p>
                  <span className="font-medium text-[#1A1D1A]">Diet:</span>{' '}
                  {draft.dietary.length > 0
                    ? draft.dietary.join(', ')
                    : 'Any'}
                </p>
                <p>
                  <span className="font-medium text-[#1A1D1A]">Blocked:</span>{' '}
                  {draft.allergens.length > 0
                    ? draft.allergens.join(', ')
                    : 'None'}
                </p>
                <p>
                  <span className="font-medium text-[#1A1D1A]">
                    Appliances:
                  </span>{' '}
                  {draft.appliances.length > 0
                    ? draft.appliances.join(' · ')
                    : 'Basic stovetop'}
                </p>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-[#FAF9F6] via-[#FAF9F6]/95 to-transparent pt-4 pb-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          {step === 2 && (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="min-h-[48px] px-4 rounded-xl border border-[#DCD7CC] bg-white text-sm font-semibold text-[#1A1D1A] hover:bg-[#FAF9F6] transition-colors whitespace-nowrap"
            >
              Back
            </button>
          )}
          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 min-h-[48px] px-5 rounded-xl bg-[#1E7E48] hover:bg-[#166237] text-white text-sm sm:text-base font-semibold transition-colors inline-flex items-center justify-center gap-2 shadow-sm active:scale-[0.99]"
            >
              <span>Next: Spice & Staple Rack</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              className="flex-1 min-h-[48px] px-5 rounded-xl bg-[#1E7E48] hover:bg-[#166237] text-white text-sm sm:text-base font-semibold transition-colors inline-flex items-center justify-center gap-2 shadow-sm active:scale-[0.99]"
            >
              <span>Save Kitchen Profile</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
