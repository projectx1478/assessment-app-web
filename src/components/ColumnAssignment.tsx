import { useState } from "react";

export interface ColumnAssignmentProps {
  unknownHeaders: string[];
  onConfirm: (mapping: Record<string, "number" | "question" | "freeText" | "ignore">) => void;
}

const ROLE_LABELS: Record<string, string> = {
  number: "番号",
  question: "設問",
  freeText: "自由記述",
  ignore: "使用しない",
};

export default function ColumnAssignment({ unknownHeaders, onConfirm }: ColumnAssignmentProps) {
  const [mapping, setMapping] = useState<Record<string, "number" | "question" | "freeText" | "ignore">>(
    Object.fromEntries(unknownHeaders.map((h) => [h, "ignore"]))
  );

  if (unknownHeaders.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
      <p className="mb-3 text-sm font-medium text-amber-900">
        自動判定できなかった列があります。手動で割り当ててください。
      </p>
      <div className="space-y-2">
        {unknownHeaders.map((header) => (
          <div key={header} className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-800">{header}</span>
            <select
              className="rounded border border-gray-300 px-2 py-1 text-sm"
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
        className="mt-4 rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
        onClick={() => onConfirm(mapping)}
      >
        割り当てを確定
      </button>
    </div>
  );
}
