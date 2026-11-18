import React, { useRef, useState } from 'react';
import {
  Camera,
  Check,
  Mic,
  Plus,
  ReceiptText,
  ScanLine,
  Upload,
  X,
} from 'lucide-react';
import { SCAN_PRESETS } from '../data/pantryData';
import { PantryCategory } from '../types/pantry';

export interface ScannedItemInput {
  name: string;
  category: PantryCategory;
  quantity: number;
  unit: string;
  daysLeft: number | null;
  estimatedValueInr: number;
}

interface ScanAddSheetProps {
  initialMode: 'camera' | 'voice' | 'manual';
  onClose?: () => void;
  isStandaloneTab?: boolean;
  onAddItems: (items: ScannedItemInput[]) => void;
}

const SAMPLE_VOICE_PHRASES = [
  'Add 200g Paneer and Spinach',
  'Restock Tomatoes and Curd',
  'I have Leftover Rice and Green Peas',
];

export const ScanAddSheet: React.FC<ScanAddSheetProps> = ({
  initialMode,
  onClose,
  isStandaloneTab = false,
  onAddItems,
}) => {
  const [mode, setMode] = useState<'camera' | 'voice' | 'manual'>(initialMode);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [detectedItems, setDetectedItems] = useState<ScannedItemInput[]>([]);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);

  // Manual form state
  const [manualName, setManualName] = useState('');
  const [manualCategory, setManualCategory] =
    useState<PantryCategory>('Fresh Veggies');
  const [manualQty, setManualQty] = useState(200);
  const [manualUnit, setManualUnit] = useState('g');
  const [manualDaysLeft, setManualDaysLeft] = useState<number | null>(3);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const runPresetScan = (presetId: string) => {
    const preset = SCAN_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setIsScanning(true);
    setSelectedPresetId(presetId);
    window.setTimeout(() => {
      setDetectedItems(preset.detectedItems);
      setSelectedNames(preset.detectedItems.map((i) => i.name));
      setIsScanning(false);
    }, 350);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedPreview(url);
    runPresetScan('fridge-spread');
  };

  const toggleDetectedName = (name: string) => {
    setSelectedNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const confirmScannedItems = () => {
    const chosen = detectedItems.filter((d) => selectedNames.includes(d.name));
    if (chosen.length === 0) return;
    onAddItems(chosen);
    setDetectedItems([]);
    setSelectedPresetId(null);
    setUploadedPreview(null);
    onClose?.();
  };

  const parseAndApplyVoice = (transcript: string) => {
    setVoiceTranscript(transcript);
    const lower = transcript.toLowerCase();
    const knownCatalog: ScannedItemInput[] = [
      {
        name: 'Paneer',
        category: 'Dairy & Protein',
        quantity: 200,
        unit: 'g',
        daysLeft: 1,
        estimatedValueInr: 95,
      },
      {
        name: 'Spinach',
        category: 'Fresh Veggies',
        quantity: 200,
        unit: 'g',
        daysLeft: 2,
        estimatedValueInr: 45,
      },
      {
        name: 'Tomatoes',
        category: 'Fresh Veggies',
        quantity: 4,
        unit: 'pcs',
        daysLeft: 3,
        estimatedValueInr: 35,
      },
      {
        name: 'Curd',
        category: 'Dairy & Protein',
        quantity: 250,
        unit: 'g',
        daysLeft: 3,
        estimatedValueInr: 40,
      },
      {
        name: 'Leftover Rice',
        category: 'Grains/Leftovers',
        quantity: 2,
        unit: 'bowls',
        daysLeft: 1,
        estimatedValueInr: 45,
      },
      {
        name: 'Green Peas',
        category: 'Fresh Veggies',
        quantity: 150,
        unit: 'g',
        daysLeft: 5,
        estimatedValueInr: 40,
      },
      {
        name: 'Eggs',
        category: 'Dairy & Protein',
        quantity: 6,
        unit: 'pcs',
        daysLeft: 6,
        estimatedValueInr: 54,
      },
    ];

    const matched = knownCatalog.filter((item) =>
      lower.includes(item.name.toLowerCase().split(' ')[0]),
    );

    if (matched.length > 0) {
      setDetectedItems(matched);
      setSelectedNames(matched.map((m) => m.name));
      setVoiceFeedback(
        `Matched ${matched.length} ingredient${matched.length > 1 ? 's' : ''} ready to add.`,
      );
    } else {
      const cleaned = transcript
        .replace(/^(add|restock|i have)\s+/i, '')
        .trim();
      if (cleaned) {
        const custom: ScannedItemInput = {
          name: cleaned.charAt(0).toUpperCase() + cleaned.slice(1),
          category: 'Fresh Veggies',
          quantity: 1,
          unit: 'pack',
          daysLeft: 4,
          estimatedValueInr: 45,
        };
        setDetectedItems([custom]);
        setSelectedNames([custom.name]);
        setVoiceFeedback(`Parsed "${custom.name}" — tap Add to save.`);
      }
    }
  };

  const startVoiceRecognition = () => {
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown })
        .webkitSpeechRecognition;

    if (!SpeechRec) {
      setVoiceFeedback(
        'Browser speech mic unavailable here — tap a sample phrase below to test.',
      );
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new (SpeechRec as any)();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      setIsListening(true);
      setVoiceFeedback('Listening for ingredients...');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const text = event.results?.[0]?.[0]?.transcript ?? '';
        setIsListening(false);
        if (text) parseAndApplyVoice(text);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setVoiceFeedback(
          'Mic access skipped — tap any sample phrase below to test voice parsing.',
        );
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceFeedback('Tap a sample phrase below to add by voice.');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualName.trim();
    if (!trimmed) return;
    onAddItems([
      {
        name: trimmed,
        category: manualCategory,
        quantity: manualQty,
        unit: manualUnit,
        daysLeft: manualDaysLeft,
        estimatedValueInr: 50,
      },
    ]);
    setManualName('');
    onClose?.();
  };

  const content = (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#1A1D1A]">
            Scan & Fast-Add Groceries
          </h2>
          <p className="text-xs sm:text-sm text-[#5C645E]">
            Scan a countertop spread, Blinkit receipt, or speak ingredients
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close scan panel"
            className="min-h-[44px] min-w-[44px] rounded-full hover:bg-[#FAF9F6] flex items-center justify-center text-[#5C645E]"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#FAF9F6] border border-[#E7E4DC]">
        {[
          { id: 'camera' as const, label: 'Scan / OCR', icon: Camera },
          { id: 'voice' as const, label: 'Voice', icon: Mic },
          { id: 'manual' as const, label: 'Quick Add', icon: Plus },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = mode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setMode(tab.id);
                setDetectedItems([]);
              }}
              className={`min-h-[44px] px-2 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                active
                  ? 'bg-white text-[#1A1D1A] shadow-xs'
                  : 'text-[#5C645E] hover:text-[#1A1D1A]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mode 1: Camera / Receipt OCR */}
      {mode === 'camera' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => runPresetScan('fridge-spread')}
              className={`min-h-[76px] p-3.5 rounded-xl border text-left transition-colors flex items-start gap-3 ${
                selectedPresetId === 'fridge-spread'
                  ? 'bg-[#F0F9F3] border-[#1E7E48]'
                  : 'bg-[#FAF9F6] border-[#E7E4DC] hover:border-[#1E7E48]/60'
              }`}
            >
              <ScanLine className="w-5 h-5 text-[#1E7E48] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#1A1D1A]">
                  Countertop Spread
                </p>
                <p className="text-xs text-[#5C645E] mt-0.5">
                  Auto-detect veggies & dairy on counter
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => runPresetScan('blinkit-receipt')}
              className={`min-h-[76px] p-3.5 rounded-xl border text-left transition-colors flex items-start gap-3 ${
                selectedPresetId === 'blinkit-receipt'
                  ? 'bg-[#F0F9F3] border-[#1E7E48]'
                  : 'bg-[#FAF9F6] border-[#E7E4DC] hover:border-[#1E7E48]/60'
              }`}
            >
              <ReceiptText className="w-5 h-5 text-[#E06D2B] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#1A1D1A]">
                  Grocery Receipt OCR
                </p>
                <p className="text-xs text-[#5C645E] mt-0.5">
                  Parse Blinkit / Zepto bill screenshot
                </p>
              </div>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full min-h-[48px] px-4 rounded-xl border border-dashed border-[#C5BFB2] bg-[#FAF9F6] hover:border-[#1E7E48] text-sm font-semibold text-[#1A1D1A] inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4 text-[#1E7E48]" />
            <span>Take Photo or Upload Receipt Image</span>
          </button>

          {uploadedPreview && (
            <div className="rounded-xl overflow-hidden border border-[#E7E4DC] max-h-40">
              <img
                src={uploadedPreview}
                alt="Uploaded grocery preview"
                className="w-full h-40 object-cover"
              />
            </div>
          )}

          {isScanning && (
            <div className="p-4 rounded-xl bg-[#FAF9F6] text-sm text-[#5C645E] text-center">
              Detecting items and estimating shelf freshness...
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Voice Input */}
      {mode === 'voice' && (
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-[#FAF9F6] border border-[#E7E4DC] text-center space-y-3">
            <button
              type="button"
              onClick={startVoiceRecognition}
              className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center transition-colors ${
                isListening
                  ? 'bg-[#E06D2B] text-white'
                  : 'bg-[#1E7E48] hover:bg-[#166237] text-white'
              }`}
              aria-label="Start voice input"
            >
              <Mic className="w-6 h-6" />
            </button>
            <p className="text-sm font-semibold text-[#1A1D1A]">
              {isListening
                ? 'Listening... Speak now'
                : 'Tap microphone to dictate items'}
            </p>
            {voiceTranscript && (
              <p className="text-xs text-[#1E7E48] font-medium">
                "{voiceTranscript}"
              </p>
            )}
            {voiceFeedback && (
              <p className="text-xs text-[#5C645E]">{voiceFeedback}</p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#5C645E]">
              Try a quick voice phrase:
            </p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_VOICE_PHRASES.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => parseAndApplyVoice(phrase)}
                  className="min-h-[44px] px-3.5 py-2 rounded-full bg-white border border-[#DCD7CC] hover:border-[#1E7E48] text-xs font-medium text-[#1A1D1A]"
                >
                  "{phrase}"
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detected Items Checklist (shared for Camera & Voice) */}
      {detectedItems.length > 0 && mode !== 'manual' && (
        <div className="space-y-3 pt-1">
          <p className="text-xs font-semibold text-[#5C645E]">
            Detected items (tap to include)
          </p>
          <div className="space-y-2">
            {detectedItems.map((item) => {
              const checked = selectedNames.includes(item.name);
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => toggleDetectedName(item.name)}
                  className={`w-full min-h-[48px] px-3.5 py-2 rounded-xl border flex items-center justify-between text-left ${
                    checked
                      ? 'bg-[#F0F9F3] border-[#1E7E48]/40'
                      : 'bg-[#FAF9F6] border-[#E7E4DC]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                        checked
                          ? 'bg-[#1E7E48] border-[#1E7E48] text-white'
                          : 'bg-white border-[#C5BFB2]'
                      }`}
                    >
                      {checked && <Check className="w-3.5 h-3.5" />}
                    </span>
                    <span className="text-sm font-semibold text-[#1A1D1A]">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-xs text-[#5C645E] tabular-nums">
                    {item.quantity} {item.unit} ·{' '}
                    {item.daysLeft !== null
                      ? `${item.daysLeft}d left`
                      : 'Staple'}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={confirmScannedItems}
            className="w-full min-h-[48px] px-4 rounded-xl bg-[#1E7E48] hover:bg-[#166237] text-white text-sm font-semibold"
          >
            Add {selectedNames.length} Items to Pantry
          </button>
        </div>
      )}

      {/* Mode 3: Manual Quick Add */}
      {mode === 'manual' && (
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#5C645E]">
              Ingredient Name
            </label>
            <input
              type="text"
              required
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="e.g., Sweet Corn, Tofu, Methi"
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#FAF9F6] border border-[#E7E4DC] text-sm text-[#1A1D1A] focus:outline-none focus:border-[#1E7E48]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#5C645E]">
                Quantity
              </label>
              <input
                type="number"
                min={1}
                value={manualQty}
                onChange={(e) =>
                  setManualQty(Math.max(1, Number(e.target.value) || 1))
                }
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#FAF9F6] border border-[#E7E4DC] text-sm tabular-nums focus:outline-none focus:border-[#1E7E48]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#5C645E]">
                Unit
              </label>
              <select
                value={manualUnit}
                onChange={(e) => setManualUnit(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-[#FAF9F6] border border-[#E7E4DC] text-sm focus:outline-none focus:border-[#1E7E48]"
              >
                <option value="g">g</option>
                <option value="pcs">pcs</option>
                <option value="bowls">bowls</option>
                <option value="bunch">bunch</option>
                <option value="ml">ml</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#5C645E]">
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  'Fresh Veggies',
                  'Dairy & Protein',
                  'Grains/Leftovers',
                ] as PantryCategory[]
              ).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setManualCategory(cat)}
                  className={`min-h-[44px] px-2 rounded-xl text-xs font-semibold border transition-colors ${
                    manualCategory === cat
                      ? 'bg-[#1E7E48] text-white border-[#1E7E48]'
                      : 'bg-[#FAF9F6] text-[#1A1D1A] border-[#E7E4DC]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#5C645E]">
              Expiry Window
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Tomorrow', val: 1 },
                { label: '3 Days', val: 3 },
                { label: '7 Days', val: 7 },
                { label: 'Staple', val: null },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setManualDaysLeft(opt.val)}
                  className={`min-h-[44px] px-2 rounded-xl text-xs font-semibold border ${
                    manualDaysLeft === opt.val
                      ? 'bg-[#E06D2B] text-white border-[#E06D2B]'
                      : 'bg-[#FAF9F6] text-[#1A1D1A] border-[#E7E4DC]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-h-[48px] px-4 rounded-xl bg-[#1E7E48] hover:bg-[#166237] text-white text-sm font-semibold"
          >
            Add Ingredient to Pantry
          </button>
        </form>
      )}
    </div>
  );

  if (isStandaloneTab) {
    return (
      <div className="max-w-2xl mx-auto pb-24 md:pb-10">
        <div className="bg-white rounded-xl border border-[#E7E4DC] p-4 sm:p-6">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto border border-[#E7E4DC]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 bg-[#DCD7CC] rounded-full mx-auto mb-3 sm:hidden" />
        {content}
      </div>
    </div>
  );
};
