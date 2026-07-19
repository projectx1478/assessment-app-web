const STEPS: { key: string; label: string }[] = [
  { key: "upload", label: "課題登録" },
  { key: "criteria", label: "評価基準" },
  { key: "grading", label: "採点開始" },
  { key: "results", label: "結果確認" },
];

export default function StepTracker({ current }: { current: string }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <ol className="mb-8 flex items-start">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <li key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  isDone
                    ? "bg-forest-500 text-white"
                    : isCurrent
                      ? "bg-forest-500 text-white ring-4 ring-forest-100"
                      : "bg-white text-ink-muted ring-1 ring-line",
                ].join(" ")}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isDone ? "✓" : i + 1}
              </div>
              <span
                className={[
                  "text-xs font-medium",
                  isCurrent ? "text-ink" : "text-ink-muted",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={[
                  "mx-2 mt-[-20px] h-0.5 flex-1 rounded-full transition-colors",
                  isDone ? "bg-forest-500" : "bg-line",
                ].join(" ")}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
