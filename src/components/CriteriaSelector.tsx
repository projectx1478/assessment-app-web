import { useState } from "react";

interface CriteriaSelectorProps {
  suggested: string[];
  onConfirm: (selected: string[]) => void;
}

export default function CriteriaSelector({ suggested, onConfirm }: CriteriaSelectorProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(suggested.map((c) => [c, true]))
  );
  const [customItems, setCustomItems] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  function toggle(criterion: string) {
    setChecked((prev) => ({ ...prev, [criterion]: !prev[criterion] }));
  }

  function addCustom() {
    const text = draft.trim();
    if (!text) return;
    setCustomItems((prev) => [...prev, text]);
    setChecked((prev) => ({ ...prev, [text]: true }));
    setDraft("");
  }

  function removeCustom(text: string) {
    setCustomItems((prev) => prev.filter((c) => c !== text));
    setChecked((prev) => {
      const next = { ...prev };
      delete next[text];
      return next;
    });
  }

  const allItems = [...suggested, ...customItems];
  const selectedCount = allItems.filter((c) => checked[c]).length;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-800">AIが提案した評価観点（チェックを外すと除外されます）</p>
      <ul className="space-y-1">
        {suggested.map((c) => (
          <li key={c} className="flex items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={checked[c] ?? true}
              onChange={() => toggle(c)}
            />
            <span>{c}</span>
          </li>
        ))}
      </ul>

      {customItems.length > 0 && (
        <>
          <p className="text-sm font-medium text-gray-800">追加した観点</p>
          <ul className="space-y-1">
            {customItems.map((c) => (
              <li key={c} className="flex items-center gap-2 text-sm text-gray-800">
                <input type="checkbox" checked={checked[c] ?? true} onChange={() => toggle(c)} />
                <span>{c}</span>
                <button
                  className="text-xs text-red-600 hover:underline"
                  onClick={() => removeCustom(c)}
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
          placeholder="独自の評価観点を追加（例: 独創性）"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addCustom();
          }}
        />
        <button
          className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
          onClick={addCustom}
        >
          追加
        </button>
      </div>

      <button
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        disabled={selectedCount === 0}
        onClick={() => onConfirm(allItems.filter((c) => checked[c]))}
      >
        評価観点を確定する（{selectedCount}件選択中）
      </button>
    </div>
  );
}
