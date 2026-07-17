import { useState } from "react";
import ColumnAssignment from "./components/ColumnAssignment";
import CriteriaSelector from "./components/CriteriaSelector";
import { exportResultsToExcel } from "./utils/exportExcel";
import { appendResultsToSpreadsheet, createSpreadsheetWithResults } from "./utils/googleSheets";

type Step = "upload" | "criteria" | "grading" | "results";

interface Assignment {
  id: string;
  subject: string;
  unit: string;
  evaluationCriteria: string[];
}

interface EvaluationResult {
  studentAnswerId: string;
  scale: string;
  value: string | number;
  comment: string;
}

interface StudentAnswer {
  id: string;
  answerText: string;
}

interface ImportResult {
  columns: {
    nameHeader?: string;
    numberHeader?: string;
    questionHeaders: string[];
    freeTextHeaders: string[];
    unknownHeaders: string[];
  };
  studentAnswers: StudentAnswer[];
}

export default function App() {
  const [step, setStep] = useState<Step>("upload");
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [criteriaConfirmed, setCriteriaConfirmed] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleAssignmentUpload(rawContent: string) {
    setError(null);
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
  }

  async function handleConfirmCriteria(selected: string[]) {
    if (!assignment) return;
    setError(null);
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
  }

  // ファイルはサーバーに保存されないため、未判定列があれば同じファイルを
  // ブラウザ側で保持しておき、教員の手動割当と一緒に再送する。
  async function handleImportFile(
    file: File,
    override?: Record<string, "number" | "question" | "freeText" | "ignore">
  ) {
    if (!assignment) return;
    setError(null);
    setPendingFile(file);

    const mapped =
      override &&
      (() => {
        const questionHeaders: string[] = [];
        const freeTextHeaders: string[] = [];
        let numberHeader: string | undefined;
        for (const [header, role] of Object.entries(override)) {
          if (role === "question") questionHeaders.push(header);
          else if (role === "freeText") freeTextHeaders.push(header);
          else if (role === "number") numberHeader = header;
        }
        return { questionHeaders, freeTextHeaders, numberHeader };
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
      setStep("grading");
    }
  }

  async function handleGrade(studentAnswers: StudentAnswer[]) {
    if (!assignment) return;
    setError(null);
    const res = await fetch("/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId: assignment.id, studentAnswers }),
    });
    if (!res.ok) {
      setError("採点に失敗しました");
      return;
    }
    const data = (await res.json()) as { evaluations: EvaluationResult[] };
    setResults(data.evaluations);
    setStep("results");
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-xl font-semibold text-gray-900">AI評価支援システム</h1>

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {step === "upload" && (
        <UploadStep onSubmit={handleAssignmentUpload} />
      )}

      {step === "criteria" && assignment && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">評価基準の確認</h2>
          <p className="text-sm text-gray-600">
            {assignment.subject} / {assignment.unit}
          </p>

          {!criteriaConfirmed && (
            <CriteriaSelector
              suggested={assignment.evaluationCriteria ?? []}
              onConfirm={handleConfirmCriteria}
            />
          )}

          {criteriaConfirmed && (
            <>
              <ul className="list-inside list-disc text-sm text-gray-800">
                {(assignment.evaluationCriteria ?? []).map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p className="text-sm font-medium text-gray-800">生徒データのアップロード</p>

              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                }}
              />

              {importResult && importResult.columns.unknownHeaders.length > 0 && pendingFile && (
                <ColumnAssignment
                  unknownHeaders={importResult.columns.unknownHeaders}
                  onConfirm={(mapping) => handleImportFile(pendingFile, mapping)}
                />
              )}

              {importResult && importResult.columns.unknownHeaders.length === 0 && (
                <button
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
        />
      )}

      {step === "results" && (
        <ResultsStep results={results} onRestart={() => setStep("upload")} />
      )}
    </div>
  );
}

function UploadStep({ onSubmit }: { onSubmit: (rawContent: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-medium">① 課題をアップロード</h2>
      <textarea
        className="h-40 w-full rounded border border-gray-300 p-2 text-sm"
        placeholder="課題文をここに貼り付けてください"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        disabled={text.trim().length === 0}
        onClick={() => onSubmit(text)}
      >
        解析する
      </button>
    </div>
  );
}

function GradingStep({
  studentAnswers,
  onSubmit,
}: {
  studentAnswers: StudentAnswer[];
  onSubmit: (answers: StudentAnswer[]) => void;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-medium">④ 採点開始</h2>
      <p className="text-sm text-gray-600">{studentAnswers.length}件の回答を読み込み済み</p>
      <ul className="max-h-60 overflow-y-auto rounded border border-gray-200 text-sm">
        {studentAnswers.map((a) => (
          <li key={a.id} className="border-b px-2 py-1 last:border-0">
            <span className="text-gray-500">{a.id}:</span> {a.answerText.slice(0, 40)}
            {a.answerText.length > 40 ? "…" : ""}
          </li>
        ))}
      </ul>
      <button
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        disabled={studentAnswers.length === 0}
        onClick={() => onSubmit(studentAnswers)}
      >
        採点する
      </button>
    </div>
  );
}

function ResultsStep({
  results,
  onRestart,
}: {
  results: EvaluationResult[];
  onRestart: () => void;
}) {
  const [sheetStatus, setSheetStatus] = useState<string | null>(null);

  async function handleCreateNewSheet() {
    setSheetStatus("新規作成中...");
    try {
      const { url } = await createSpreadsheetWithResults(results);
      setSheetStatus(`作成しました: ${url}`);
      window.open(url, "_blank");
    } catch (e) {
      setSheetStatus(e instanceof Error ? e.message : "作成に失敗しました");
    }
  }

  async function handleReflectToSheet() {
    const spreadsheetId = window.prompt(
      "反映先SpreadsheetのID（URLの /d/ と /edit の間の文字列）を入力してください"
    );
    if (!spreadsheetId) return;
    setSheetStatus("反映中...");
    try {
      await appendResultsToSpreadsheet(spreadsheetId, results);
      setSheetStatus("反映しました");
    } catch (e) {
      setSheetStatus(e instanceof Error ? e.message : "反映に失敗しました");
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-medium">⑤ 結果確認</h2>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-gray-500">
            <th className="py-1">生徒ID</th>
            <th className="py-1">評価</th>
            <th className="py-1">コメント</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.studentAnswerId} className="border-b">
              <td className="py-1">{r.studentAnswerId}</td>
              <td className="py-1">{r.value}</td>
              <td className="py-1 text-gray-600">{r.comment}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          onClick={() => exportResultsToExcel(results)}
        >
          ⑥ Excel出力
        </button>
        <button
          className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          onClick={handleCreateNewSheet}
        >
          ⑦ 新規Spreadsheetを作成して反映
        </button>
        <button
          className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          onClick={handleReflectToSheet}
        >
          ⑦ 既存Spreadsheetへ反映
        </button>
        <button
          className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          onClick={onRestart}
        >
          新しい課題を採点する
        </button>
        {sheetStatus && <span className="text-xs text-gray-500">{sheetStatus}</span>}
      </div>
    </div>
  );
}
