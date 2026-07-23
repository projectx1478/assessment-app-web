import { useState } from "react";

export interface ColumnAssignmentProps {
  unknownHeaders: string[];
  onConfirm: (mapping: Record<string, "number" | "email" | "question" | "freeText" | "ignore">) => void;
}

const ROLE_LABELS: Record<string, string> = {
  number: "番号",
  email: "メールアドレス",
  question: "設問",
  freeText: "自由記述",
  ignore: "使用しない",
};

export default function ColumnAssignment({ unknownHeaders, onConfirm }: ColumnAssignmentProps) {
  const [mapping, setMapping] = useState<Record<string, "number" | "email" | "question" | "freeText" | "ignore">>(
    Object.fromEntries(unknownHeaders.map((h) => [h, "ignore"]))
  );

  if (unknownHeaders.length === 0) return null;

  return (
    <div className="rounded-xl border border-gold-400/40 bg-gold-400/10 p-5">
      <p className="mb-4 text-base font-semibold text-ink">
        自動判定できなかった列があります。手動で割り当ててください。
      </p>
      <div className="space-y-3">
        {unknownHeaders.map((header) => (
          <div key={header} className="flex items-center justify-between gap-3">
            <span className="text-base text-ink">{header}</span>
            <select
              className="rounded-lg border border-line bg-white px-3 py-2 text-base focus:border-forest-500 focus:outline-none"
              value={mapping[header]}
              onChange={(e) =>
                setMapping((prev) => ({ ...prev, [header]: e.target.value as typeof prev[string] }))
              }
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-4 rounded-lg bg-gold-500 px-4 py-2.5 text-base font-semibold text-white hover:opacity-90"
        onClick={() => onConfirm(mapping)}
      >
        割り当てを確定
      </button>
    </div>
  );
}
