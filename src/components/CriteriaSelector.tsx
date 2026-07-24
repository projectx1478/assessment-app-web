import { useState } from "react";

export type CriteriaTier = "basic" | "standard" | "advanced";

export interface TieredCriteria {
  basic: string[];
  standard: string[];
  advanced: string[];
}

interface CriteriaSelectorProps {
  suggested: TieredCriteria;
  onConfirm: (selected: TieredCriteria) => void;
}

const TIER_INFO: Record<CriteriaTier, { label: string; hint: string; badge: string }> = {
  basic: { label: "基礎", hint: "最低限身につけたい理解", badge: "bg-forest-50 text-forest-700" },
  standard: { label: "標準", hint: "標準的な到達レベル", badge: "bg-gold-400/15 text-gold-500" },
  advanced: { label: "応用", hint: "発展的・応用的な理解", badge: "bg-pen-50 text-pen-500" },
};

const TIERS: CriteriaTier[] = ["basic", "standard", "advanced"];

export default function CriteriaSelector({ suggested, onConfirm }: CriteriaSelectorProps) {
  const initialChecked: Record<string, boolean> = {};
  for (const tier of TIERS) {
    for (const c of suggested[tier]) initialChecked[`${tier}:${c}`] = true;
  }
  const [checked, setChecked] = useState<Record<string, boolean>>(initialChecked);
  const [customItems, setCustomItems] = useState<Record<CriteriaTier, string[]>>({
    basic: [],
    standard: [],
    advanced: [],
  });
  const [drafts, setDrafts] = useState<Record<CriteriaTier, string>>({
    basic: "",
    standard: "",
    advanced: "",
  });

  function toggle(tier: CriteriaTier, criterion: string) {
    const key = `${tier}:${criterion}`;
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleReset() {
    setChecked(initialChecked);
    setCustomItems({ basic: [], standard: [], advanced: [] });
    setDrafts({ basic: "", standard: "", advanced: "" });
  }

  function addCustom(tier: CriteriaTier) {
    const text = drafts[tier].trim();
    if (!text) return;
    setCustomItems((prev) => ({ ...prev, [tier]: [...prev[tier], text] }));
    setChecked((prev) => ({ ...prev, [`${tier}:${text}`]: true }));
    setDrafts((prev) => ({ ...prev, [tier]: "" }));
  }

  function removeCustom(tier: CriteriaTier, text: string) {
    setCustomItems((prev) => ({ ...prev, [tier]: prev[tier].filter((c) => c !== text) }));
    setChecked((prev) => {
      const next = { ...prev };
      delete next[`${tier}:${text}`];
      return next;
    });
  }

  function allItemsOf(tier: CriteriaTier): string[] {
    return [...suggested[tier], ...customItems[tier]];
  }

  const selectedCount = TIERS.reduce(
    (sum, tier) => sum + allItemsOf(tier).filter((c) => checked[`${tier}:${c}`]).length,
    0
  );

  function handleConfirm() {
    const result: TieredCriteria = { basic: [], standard: [], advanced: [] };
    for (const tier of TIERS) {
      result[tier] = allItemsOf(tier).filter((c) => checked[`${tier}:${c}`]);
    }
    onConfirm(result);
  }

  return (
    <div className="space-y-5">
      <p className="text-base text-ink-muted">
        AIが提案した評価観点です。段階ごとにチェックを外したり、独自の観点を追加できます。
      </p>

      {TIERS.map((tier) => {
        const info = TIER_INFO[tier];
        return (
          <div key={tier} className="rounded-xl border border-line bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-sm font-semibold ${info.badge}`}>
                {info.label}
              </span>
              <span className="text-sm text-ink-muted">{info.hint}</span>
            </div>

            <ul className="space-y-2">
              {allItemsOf(tier).map((c) => {
                const isCustom = customItems[tier].includes(c);
                return (
                  <li key={c} className="flex items-center gap-2.5 text-base text-ink">
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-line text-forest-500 focus:ring-forest-500"
                      checked={checked[`${tier}:${c}`] ?? true}
                      onChange={() => toggle(tier, c)}
                    />
                    <span className="flex-1">{c}</span>
                    {isCustom && (
                      <button
                        type="button"
                        className="text-sm text-pen-500 hover:underline"
                        onClick={() => removeCustom(tier, c)}
                      >
                        削除
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="mt-3 flex gap-2">
              <input
                type="text"
                className="flex-1 rounded-lg border border-line px-3 py-2 text-base focus:border-forest-500 focus:outline-none"
                placeholder={`${info.label}の観点を追加`}
                value={drafts[tier]}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [tier]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addCustom(tier);
                }}
              />
              <button
                type="button"
                className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
                onClick={() => addCustom(tier)}
              >
                追加
              </button>
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-lg bg-forest-500 px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-forest-600 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={selectedCount === 0}
          onClick={handleConfirm}
        >
          評価観点を確定する（{selectedCount}件選択中）
        </button>
        <button
          type="button"
          className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-paper"
          onClick={handleReset}
        >
          AI提案にリセット
        </button>
      </div>
    </div>
  );
}
