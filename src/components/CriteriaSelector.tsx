import { useState } from "react";
import type { TieredCriteria, EvaluationPerspective, ProficiencyLevel } from "../models/assignment";

interface CriteriaSelectorProps {
  suggested: TieredCriteria;
  onConfirm: (selected: TieredCriteria) => void;
}

const PERSPECTIVES: EvaluationPerspective[] = ["knowledge", "thinking", "attitude"];
const PROFICIENCY_LEVELS: ProficiencyLevel[] = ["basic", "standard", "advanced"];

const PERSPECTIVE_INFO: Record<EvaluationPerspective, { label: string }> = {
  knowledge: { label: "知識・技能" },
  thinking: { label: "思考・判断・表現" },
  attitude: { label: "主体的に学習に取り組む態度" },
};

const LEVEL_INFO: Record<ProficiencyLevel, { label: string; hint: string; badge: string }> = {
  basic: { label: "基礎", hint: "最低限身につけたい理解", badge: "bg-forest-50 text-forest-700" },
  standard: { label: "標準", hint: "標準的な到達レベル", badge: "bg-gold-400/15 text-gold-500" },
  advanced: { label: "応用", hint: "発展的・応用的な理解", badge: "bg-pen-50 text-pen-500" },
};

export default function CriteriaSelector({ suggested, onConfirm }: CriteriaSelectorProps) {
  const initialChecked: Record<string, boolean> = {};
  for (const perspective of PERSPECTIVES) {
    for (const level of PROFICIENCY_LEVELS) {
      for (const c of suggested[perspective][level]) {
        initialChecked[`${perspective}:${level}:${c}`] = true;
      }
    }
  }
  const [checked, setChecked] = useState<Record<string, boolean>>(initialChecked);

  type CustomItemsKey = `${EvaluationPerspective}:${ProficiencyLevel}`;
  const createCustomKey = (p: EvaluationPerspective, l: ProficiencyLevel): CustomItemsKey =>
    `${p}:${l}` as CustomItemsKey;

  const initializeCustomItems = (): Record<CustomItemsKey, string[]> => {
    const result: Record<string, string[]> = {};
    for (const perspective of PERSPECTIVES) {
      for (const level of PROFICIENCY_LEVELS) {
        result[createCustomKey(perspective, level)] = [];
      }
    }
    return result as Record<CustomItemsKey, string[]>;
  };

  const initializeDrafts = (): Record<CustomItemsKey, string> => {
    const result: Record<string, string> = {};
    for (const perspective of PERSPECTIVES) {
      for (const level of PROFICIENCY_LEVELS) {
        result[createCustomKey(perspective, level)] = "";
      }
    }
    return result as Record<CustomItemsKey, string>;
  };

  const [customItems, setCustomItems] = useState<Record<CustomItemsKey, string[]>>(initializeCustomItems);
  const [drafts, setDrafts] = useState<Record<CustomItemsKey, string>>(initializeDrafts);

  function toggle(perspective: EvaluationPerspective, level: ProficiencyLevel, criterion: string) {
    const key = `${perspective}:${level}:${criterion}`;
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleReset() {
    setChecked(initialChecked);
    setCustomItems(initializeCustomItems());
    setDrafts(initializeDrafts());
  }

  function addCustom(perspective: EvaluationPerspective, level: ProficiencyLevel) {
    const key = createCustomKey(perspective, level);
    const text = drafts[key].trim();
    if (!text) return;
    setCustomItems((prev) => ({ ...prev, [key]: [...prev[key], text] }));
    setChecked((prev) => ({ ...prev, [`${perspective}:${level}:${text}`]: true }));
    setDrafts((prev) => ({ ...prev, [key]: "" }));
  }

  function removeCustom(perspective: EvaluationPerspective, level: ProficiencyLevel, text: string) {
    const key = createCustomKey(perspective, level);
    setCustomItems((prev) => ({ ...prev, [key]: prev[key].filter((c) => c !== text) }));
    setChecked((prev) => {
      const next = { ...prev };
      delete next[`${perspective}:${level}:${text}`];
      return next;
    });
  }

  function allItemsOf(perspective: EvaluationPerspective, level: ProficiencyLevel): string[] {
    const key = createCustomKey(perspective, level);
    return [...suggested[perspective][level], ...customItems[key]];
  }

  const selectedCount = PERSPECTIVES.reduce(
    (sum, perspective) =>
      sum +
      PROFICIENCY_LEVELS.reduce(
        (levelSum, level) =>
          levelSum +
          allItemsOf(perspective, level).filter((c) =>
            checked[`${perspective}:${level}:${c}`]
          ).length,
        0
      ),
    0
  );

  function handleConfirm() {
    const result: TieredCriteria = {
      knowledge: { basic: [], standard: [], advanced: [] },
      thinking: { basic: [], standard: [], advanced: [] },
      attitude: { basic: [], standard: [], advanced: [] },
    };
    for (const perspective of PERSPECTIVES) {
      for (const level of PROFICIENCY_LEVELS) {
        result[perspective][level] = allItemsOf(perspective, level).filter((c) =>
          checked[`${perspective}:${level}:${c}`]
        );
      }
    }
    onConfirm(result);
  }

  return (
    <div className="space-y-5">
      <p className="text-base text-ink-muted">
        AIが提案した評価観点です。不要な観点をチェックを外したり、独自の観点を追加できます。
      </p>

      {PERSPECTIVES.map((perspective) => (
        <div key={perspective} className="rounded-xl border border-line bg-white p-5">
          <h3 className="mb-4 text-lg font-semibold text-ink">{PERSPECTIVE_INFO[perspective].label}</h3>

          <div className="space-y-4">
            {PROFICIENCY_LEVELS.map((level) => {
              const levelInfo = LEVEL_INFO[level];
              const key = `${perspective}:${level}` as const;
              return (
                <div key={key} className="rounded-lg border border-line bg-paper p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-sm font-semibold ${levelInfo.badge}`}>
                      {levelInfo.label}
                    </span>
                    <span className="text-sm text-ink-muted">{levelInfo.hint}</span>
                  </div>

                  <ul className="space-y-2">
                    {allItemsOf(perspective, level).map((c) => {
                      const customKey = `${perspective}:${level}` as const;
                      const isCustom = customItems[customKey].includes(c);
                      return (
                        <li key={c} className="flex items-center gap-2.5 text-base text-ink">
                          <input
                            type="checkbox"
                            className="h-5 w-5 rounded border-line text-forest-500 focus:ring-forest-500"
                            checked={checked[`${perspective}:${level}:${c}`] ?? true}
                            onChange={() => toggle(perspective, level, c)}
                          />
                          <span className="flex-1">{c}</span>
                          {isCustom && (
                            <button
                              type="button"
                              className="text-sm text-pen-500 hover:underline"
                              onClick={() => removeCustom(perspective, level, c)}
                            >
                              削除
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      className="flex-1 rounded-lg border border-line px-3 py-2 text-sm focus:border-forest-500 focus:outline-none"
                      placeholder={`${levelInfo.label}の観点を追加`}
                      value={drafts[key]}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addCustom(perspective, level);
                      }}
                    />
                    <button
                      type="button"
                      className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-white"
                      onClick={() => addCustom(perspective, level)}
                    >
                      追加
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

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
