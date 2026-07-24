import { useState } from "react";
import ColumnAssignment from "./components/ColumnAssignment";
import CriteriaSelector, { type TieredCriteria } from "./components/CriteriaSelector";
import StepTracker from "./components/StepTracker";
import Spinner from "./components/Spinner";
import FeedbackDelivery from "./components/FeedbackDelivery";
import { exportResultsToExcel } from "./utils/exportExcel";
import { appendResultsToSpreadsheet, createSpreadsheetWithResults } from "./utils/googleSheets";

type Step = "upload" | "criteria" | "grading" | "results";

interface Assignment {
  id: string;
  subject: string;
  unit: string;
  evaluationCriteria: TieredCriteria;
}

interface CombinedEvaluationResult {
  studentAnswerId: string;
  threePerspective: { basic: string; standard: string; advanced: string };
  fiveScale: number;
  hundred: number;
  comment: string;
}

interface StudentAnswer {
  id: string;
  answerText: string;
}

interface ImportResult {
  columns: {
    nameHeader?: string;
    emailHeader?: string;
    numberHeader?: string;
    questionHeaders: string[];
    freeTextHeaders: string[];
    unknownHeaders: string[];
  };
  studentAnswers: StudentAnswer[];
  emailByStudentId: Record<string, string>;
}

const TIER_LABEL: Record<"basic" | "standard" | "advanced", string> = {
  basic: "基礎",
  standard: "標準",
  advanced: "応用",
};

export default function App() {
  const [step, setStep] = useState<Step>("upload");
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [criteriaConfirmed, setCriteriaConfirmed] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [results, setResults] = useState<CombinedEvaluationResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConfirmingCriteria, setIsConfirmingCriteria] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isGrading, setIsGrading] = useState(false);

  async function handleAssignmentUpload(rawContent: string) {
    setError(null);
    setIsAnalyzing(true);
    try {
      const res = await fetch("/analyzeAssignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawContent }),
      });
      if (!res.ok) {
        setError("課題の解析に失敗しました");
        return;
      }
      const data = (await res.json()) as Assignment;
      setAssignment(data);
      setCriteriaConfirmed(false);
      setStep("criteria");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleConfirmCriteria(selected: TieredCriteria) {
    if (!assignment) return;
    setError(null);
    setIsConfirmingCriteria(true);
    try {
      const res = await fetch("/updateCriteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: assignment.id, evaluationCriteria: selected }),
      });
      if (!res.ok) {
        setError("評価観点の確定に失敗しました");
        return;
      }
      const data = (await res.json()) as Assignment;
      setAssignment(data);
      setCriteriaConfirmed(true);
    } finally {
      setIsConfirmingCriteria(false);
    }
  }

  // ファイルはサーバーに保存されないため、未判定列があれば同じファイルを
  // ブラウザ側で保持しておき、教員の手動割当と一緒に再送する。
  async function handleImportFile(
    file: File,
    override?: Record<string, "number" | "email" | "question" | "freeText" | "ignore">
  ) {
    if (!assignment) return;
    setError(null);
    setPendingFile(file);
    setIsImporting(true);

    try {
      const mapped =
        override &&
        (() => {
          const questionHeaders: string[] = [];
          const freeTextHeaders: string[] = [];
          let numberHeader: string | undefined;
          let emailHeader: string | undefined;
          for (const [header, role] of Object.entries(override)) {
            if (role === "question") questionHeaders.push(header);
            else if (role === "freeText") freeTextHeaders.push(header);
            else if (role === "number") numberHeader = header;
            else if (role === "email") emailHeader = header;
          }
          return { questionHeaders, freeTextHeaders, numberHeader, emailHeader };
        })();

      const form = new FormData();
      form.append("file", file);
      form.append("assignmentId", assignment.id);
      if (mapped) form.append("override", JSON.stringify(mapped));

      const res = await fetch("/importFile", { method: "POST", body: form });
      if (!res.ok) {
        setError("ファイルの読込に失敗しました");
        return;
      }
      const data = (await res.json()) as ImportResult;
      setImportResult(data);
      if (data.columns.unknownHeaders.length === 0) {
        setPendingFile(null);
      }
    } finally {
      setIsImporting(false);
    }
  }

  async function handleGrade(studentAnswers: StudentAnswer[]) {
    if (!assignment) return;
    setError(null);
    setIsGrading(true);
    try {
      const res = await fetch("/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: assignment.id, studentAnswers }),
      });
      if (!res.ok) {
        setError("採点に失敗しました");
        return;
      }
      const data = (await res.json()) as { evaluations: CombinedEvaluationResult[] };
      setResults(data.evaluations);
      setStep("results");
    } finally {
      setIsGrading(false);
    }
  }

  function goBack() {
    setError(null);
    if (step === "criteria") {
      if (criteriaConfirmed) {
        setCriteriaConfirmed(false);
      } else {
        setStep("upload");
      }
      return;
    }
    if (step === "grading") {
      setStep("criteria");
      return;
    }
    if (step === "results") {
      setStep("grading");
      return;
    }
  }

  const showBackButton = step !== "upload";

  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-2 font-display text-3xl font-semibold text-ink">AI評価支援システム</h1>
        <p className="mb-8 text-sm text-ink-muted">最終評価は教員が決定します。AIは採点を支援します。</p>

        <StepTracker current={step} />

        {error && (
          <div className="mb-5 rounded-lg border border-pen-400/40 bg-pen-50 px-4 py-3 text-base text-pen-600">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
          {showBackButton && (
            <button
              type="button"
              onClick={goBack}
              className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-ink-muted hover:text-ink"
            >
              ← 戻る
            </button>
          )}

          {step === "upload" && (
            <UploadStep onSubmit={handleAssignmentUpload} isLoading={isAnalyzing} />
          )}

          {step === "criteria" && assignment && (
            <div className="space-y-5">
              <h2 className="font-display text-xl font-semibold text-ink">評価基準の確認</h2>
              <p className="text-base text-ink-muted">
                {assignment.subject} / {assignment.unit}
              </p>

              {!criteriaConfirmed && (
                <CriteriaSelector
                  suggested={assignment.evaluationCriteria}
                  onConfirm={handleConfirmCriteria}
                />
              )}

              {isConfirmingCriteria && (
                <p className="flex items-center gap-2 text-sm text-ink-muted">
                  <Spinner /> 確定しています…
                </p>
              )}

              {criteriaConfirmed && (
                <>
                  <div className="space-y-3">
                    {(["basic", "standard", "advanced"] as const).map((tier) => (
                      <div key={tier}>
                        <p className="mb-1 text-sm font-semibold text-ink-muted">
                          {TIER_LABEL[tier]}
                        </p>
                        <ul className="list-inside list-disc text-base text-ink">
                          {assignment.evaluationCriteria[tier].map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-line pt-5">
                    <p className="mb-2 text-base font-semibold text-ink">生徒データのアップロード</p>
                    <a
                      href="/template_student_data.xlsx"
                      download
                      className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-forest-500 hover:underline"
                    >
                      ダウンロード：雛形Excel（番号・氏名・メールアドレス・回答1〜3）
                    </a>

                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="block w-full text-base file:mr-3 file:rounded-lg file:border-0 file:bg-forest-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-forest-700 hover:file:bg-forest-100"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImportFile(file);
                        }}
                      />
                      {isImporting && <Spinner className="text-forest-500" />}
                    </div>
                  </div>

                  {importResult && importResult.columns.unknownHeaders.length > 0 && pendingFile && (
                    <ColumnAssignment
                      unknownHeaders={importResult.columns.unknownHeaders}
                      onConfirm={(mapping) => handleImportFile(pendingFile, mapping)}
                    />
                  )}

                  {importResult && importResult.columns.unknownHeaders.length === 0 && (
                    <button
                      type="button"
                      className="rounded-lg bg-forest-500 px-5 py-3 text-base font-semibold text-white hover:bg-forest-600"
                      onClick={() => setStep("grading")}
                    >
                      採点へ進む（{importResult.studentAnswers.length}件）
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {step === "grading" && (
            <GradingStep
              studentAnswers={importResult?.studentAnswers ?? []}
              onSubmit={handleGrade}
              isLoading={isGrading}
            />
          )}

          {step === "results" && (
            <ResultsStep
              results={results}
              emailByStudentId={importResult?.emailByStudentId ?? {}}
              assignmentLabel={assignment ? `${assignment.subject} / ${assignment.unit}` : ""}
              onRestart={() => {
                setAssignment(null);
                setCriteriaConfirmed(false);
                setPendingFile(null);
                setImportResult(null);
                setResults([]);
                setStep("upload");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function UploadStep({
  onSubmit,
  isLoading,
}: {
  onSubmit: (rawContent: string) => void;
  isLoading: boolean;
}) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-semibold text-ink">課題をアップロード</h2>
      <textarea
        className="h-44 w-full rounded-lg border border-line p-3 text-base focus:border-forest-500 focus:outline-none"
        placeholder="課題文をここに貼り付けてください"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-lg bg-forest-500 px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-forest-600 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={text.trim().length === 0 || isLoading}
        onClick={() => onSubmit(text)}
      >
        {isLoading && <Spinner />}
        {isLoading ? "解析しています…" : "解析する"}
      </button>
    </div>
  );
}

function GradingStep({
  studentAnswers,
  onSubmit,
  isLoading,
}: {
  studentAnswers: StudentAnswer[];
  onSubmit: (answers: StudentAnswer[]) => void;
  isLoading: boolean;
}) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-semibold text-ink">採点開始</h2>
      <p className="text-base text-ink-muted">{studentAnswers.length}件の回答を読み込み済み</p>
      <ul className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-line p-1 text-base">
        {studentAnswers.map((a) => (
          <li key={a.id} className="rounded-md border-b border-line/60 px-3 py-2 last:border-0">
            <span className="mr-2 font-semibold text-forest-500">{a.id}</span>
            <span className="text-ink">
              {a.answerText.slice(0, 40)}
              {a.answerText.length > 40 ? "…" : ""}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-lg bg-forest-500 px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-forest-600 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={studentAnswers.length === 0 || isLoading}
        onClick={() => onSubmit(studentAnswers)}
      >
        {isLoading && <Spinner />}
        {isLoading ? "採点しています…" : "採点する"}
      </button>
    </div>
  );
}

function ResultsStep({
  results,
  emailByStudentId,
  assignmentLabel,
  onRestart,
}: {
  results: CombinedEvaluationResult[];
  emailByStudentId: Record<string, string>;
  assignmentLabel: string;
  onRestart: () => void;
}) {
  const [sheetStatus, setSheetStatus] = useState<string | null>(null);
  const [sheetBusy, setSheetBusy] = useState(false);

  async function handleCreateNewSheet() {
    setSheetBusy(true);
    setSheetStatus("新規作成中…");
    try {
      const { url } = await createSpreadsheetWithResults(results);
      setSheetStatus(`作成しました: ${url}`);
      window.open(url, "_blank");
    } catch (e) {
      setSheetStatus(e instanceof Error ? e.message : "作成に失敗しました");
    } finally {
      setSheetBusy(false);
    }
  }

  async function handleReflectToSheet() {
    const spreadsheetId = window.prompt(
      "反映先SpreadsheetのID（URLの /d/ と /edit の間の文字列）を入力してください"
    );
    if (!spreadsheetId) return;
    setSheetBusy(true);
    setSheetStatus("反映中…");
    try {
      await appendResultsToSpreadsheet(spreadsheetId, results);
      setSheetStatus("反映しました");
    } catch (e) {
      setSheetStatus(e instanceof Error ? e.message : "反映に失敗しました");
    } finally {
      setSheetBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="font-display text-xl font-semibold text-ink">結果確認</h2>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left text-base">
          <thead>
            <tr className="border-b border-line bg-paper text-sm text-ink-muted">
              <th className="px-3 py-2">生徒ID</th>
              <th className="px-3 py-2">三観点評価（基礎/標準/応用）</th>
              <th className="px-3 py-2">5段階評価</th>
              <th className="px-3 py-2">100点法</th>
              <th className="px-3 py-2">コメント</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.studentAnswerId} className="border-b border-line last:border-0">
                <td className="px-3 py-2 font-semibold text-forest-500">{r.studentAnswerId}</td>
                <td className="px-3 py-2">
                  <span className="mr-2 rounded bg-forest-50 px-1.5 py-0.5 text-sm text-forest-700">
                    {r.threePerspective.basic}
                  </span>
                  <span className="mr-2 rounded bg-gold-400/15 px-1.5 py-0.5 text-sm text-gold-500">
                    {r.threePerspective.standard}
                  </span>
                  <span className="rounded bg-pen-50 px-1.5 py-0.5 text-sm text-pen-500">
                    {r.threePerspective.advanced}
                  </span>
                </td>
                <td className="px-3 py-2">{r.fiveScale}</td>
                <td className="px-3 py-2">{r.hundred}</td>
                <td className="px-3 py-2 text-ink-muted">{r.comment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-paper"
          onClick={() => exportResultsToExcel(results)}
        >
          Excel出力
        </button>
        <button
          type="button"
          disabled={sheetBusy}
          className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-paper disabled:opacity-50"
          onClick={handleCreateNewSheet}
        >
          {sheetBusy && <Spinner className="h-3.5 w-3.5" />}
          新規Spreadsheetを作成して反映
        </button>
        <button
          type="button"
          disabled={sheetBusy}
          className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-paper disabled:opacity-50"
          onClick={handleReflectToSheet}
        >
          {sheetBusy && <Spinner className="h-3.5 w-3.5" />}
          既存Spreadsheetへ反映
        </button>
        <button
          type="button"
          className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-paper"
          onClick={onRestart}
        >
          新しい課題を採点する
        </button>
        {sheetStatus && <span className="text-xs text-ink-muted">{sheetStatus}</span>}
      </div>
      <FeedbackDelivery
        results={results}
        emailByStudentId={emailByStudentId}
        assignmentLabel={assignmentLabel}
      />
    </div>
  );
}
