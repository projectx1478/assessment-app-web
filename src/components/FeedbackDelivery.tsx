import { useState } from "react";
import Spinner from "./Spinner";
import {
  requestFeedbackAccessToken,
  listClassroomCourses,
  sendFeedbackBatch,
  type ClassroomCourse,
  type FeedbackEmailItem,
  type FeedbackSendResult,
} from "../utils/googleFeedbackDelivery";
import { buildFeedbackEmailHtml, formatGradeLabel, type FeedbackGradeScale } from "../utils/feedbackHtml";

export interface FeedbackDeliveryResult {
  studentAnswerId: string;
  threePerspective: { knowledge: string; thinking: string; attitude: string };
  fiveScale: number;
  hundred: number;
  comment: string;
  improvementSuggestion: string;
}

export interface FeedbackDeliveryProps {
  results: FeedbackDeliveryResult[];
  emailByStudentId: Record<string, string>;
  answerByStudentId: Record<string, string>;
  assignmentText: string;
  assignmentLabel: string;
}

interface EditableItem {
  studentId: string;
  email: string;
  comment: string;
  improvementSuggestion: string;
}

const GRADE_SCALE_LABEL: Record<FeedbackGradeScale, string> = {
  hundred: "100点法",
  fiveScale: "5段階評価",
  abc: "三観点評価（ABC）",
};

export default function FeedbackDelivery({
  results,
  emailByStudentId,
  answerByStudentId,
  assignmentText,
  assignmentLabel,
}: FeedbackDeliveryProps) {
  const [open, setOpen] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);
  const [courseId, setCourseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState(`【評価フィードバック】${assignmentLabel}`);
  const [includeGrade, setIncludeGrade] = useState(true);
  const [gradeScale, setGradeScale] = useState<FeedbackGradeScale>("hundred");
  const [items, setItems] = useState<EditableItem[]>([]);
  const [announcementText, setAnnouncementText] = useState(
    `AIによる評価フィードバックをメールで送信しました。ご確認ください。（${assignmentLabel}）`
  );
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState<FeedbackSendResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unmatched = results.filter((r) => !emailByStudentId[r.studentAnswerId]);

  async function handleOpen() {
    setError(null);
    setOpen(true);
    setLoading(true);
    try {
      const token = await requestFeedbackAccessToken();
      setAccessToken(token);

      const courseList = await listClassroomCourses(token);
      setCourses(courseList);
      if (courseList[0]) setCourseId(courseList[0].id);

      setItems(
        results
          .filter((r) => emailByStudentId[r.studentAnswerId])
          .map((r) => ({
            studentId: r.studentAnswerId,
            email: emailByStudentId[r.studentAnswerId],
            comment: r.comment,
            improvementSuggestion: r.improvementSuggestion,
          }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "認証・コース取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  function updateItem(studentId: string, field: "comment" | "improvementSuggestion", value: string) {
    setItems((prev) => prev.map((i) => (i.studentId === studentId ? { ...i, [field]: value } : i)));
  }

  function buildBodyHtml(item: EditableItem): string {
    const result = results.find((r) => r.studentAnswerId === item.studentId);
    return buildFeedbackEmailHtml({
      assignmentLabel,
      assignmentText,
      answerText: answerByStudentId[item.studentId] ?? "",
      comment: item.comment,
      improvementSuggestion: item.improvementSuggestion,
      gradeLabel: includeGrade && result ? formatGradeLabel(result, gradeScale) : undefined,
    });
  }

  async function handleSend() {
    if (!accessToken || !courseId) return;
    setSending(true);
    setError(null);
    try {
      const emailItems: FeedbackEmailItem[] = items.map((item) => ({
        studentId: item.studentId,
        email: item.email,
        subject,
        bodyHtml: buildBodyHtml(item),
      }));
      const results = await sendFeedbackBatch(accessToken, emailItems, courseId, announcementText, {
        url: "https://mail.google.com/mail/",
        title: "Gmailを開く",
      });
      setSendResults(results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "送信に失敗しました");
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-paper"
        onClick={handleOpen}
      >
        Classroom/Gmailでフィードバック配信
      </button>
    );
  }

  return (
    <div className="mt-4 w-full space-y-4 rounded-xl border border-line bg-paper p-5">
      <p className="font-display text-lg font-semibold text-ink">フィードバック配信</p>

      {error && <p className="text-sm text-pen-600">{error}</p>}

      {loading && (
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <Spinner /> コース情報を取得しています…
        </p>
      )}

      {!loading && !sendResults && (
        <>
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-muted">配信先コース</label>
            <select
              className="rounded-lg border border-line bg-white px-3 py-2 text-base"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-muted">メールの件名</label>
            <input
              type="text"
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-base focus:border-forest-500 focus:outline-none"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={includeGrade}
                onChange={(e) => setIncludeGrade(e.target.checked)}
              />
              成績を記載する
            </label>

            {includeGrade && (
              <div className="flex items-center gap-3 text-sm text-ink">
                {(Object.keys(GRADE_SCALE_LABEL) as FeedbackGradeScale[]).map((scale) => (
                  <label key={scale} className="flex items-center gap-1">
                    <input
                      type="radio"
                      name="gradeScale"
                      checked={gradeScale === scale}
                      onChange={() => setGradeScale(scale)}
                    />
                    {GRADE_SCALE_LABEL[scale]}
                  </label>
                ))}
              </div>
            )}
          </div>

          {unmatched.length > 0 && (
            <p className="text-sm text-gold-500">
              {unmatched.length}件はメールアドレスが未登録のため配信対象外です（
              {unmatched.map((r) => r.studentAnswerId).join(", ")}）
            </p>
          )}

          <div className="max-h-[32rem] space-y-4 overflow-y-auto">
            {items.map((item) => (
              <div key={item.studentId} className="rounded-lg border border-line bg-white p-3">
                <p className="mb-2 text-sm font-semibold text-forest-500">
                  {item.studentId}（{item.email}）
                </p>

                <label className="mb-1 block text-xs font-semibold text-ink-muted">
                  評価コメント（根拠）
                </label>
                <textarea
                  className="mb-2 h-24 w-full rounded-lg border border-line p-2 text-sm focus:border-forest-500 focus:outline-none"
                  value={item.comment}
                  onChange={(e) => updateItem(item.studentId, "comment", e.target.value)}
                />

                <label className="mb-1 block text-xs font-semibold text-ink-muted">
                  今後に向けた改善提案
                </label>
                <textarea
                  className="mb-3 h-20 w-full rounded-lg border border-line p-2 text-sm focus:border-forest-500 focus:outline-none"
                  value={item.improvementSuggestion}
                  onChange={(e) => updateItem(item.studentId, "improvementSuggestion", e.target.value)}
                />

                <details>
                  <summary className="cursor-pointer text-xs font-semibold text-ink-muted">
                    メールプレビュー
                  </summary>
                  <div
                    className="mt-2 rounded-lg border border-line bg-paper p-3 text-sm"
                    dangerouslySetInnerHTML={{ __html: buildBodyHtml(item) }}
                  />
                </details>
              </div>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-muted">
              Classroomお知らせ文
            </label>
            <textarea
              className="h-20 w-full rounded-lg border border-line p-2 text-sm focus:border-forest-500 focus:outline-none"
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
            />
            <p className="mt-1 text-xs text-ink-muted">
              「Gmailを開く」というリンク付きでClassroomに投稿されます。
            </p>
          </div>

          <button
            type="button"
            disabled={sending || items.length === 0 || !courseId}
            className="inline-flex items-center gap-2 rounded-lg bg-forest-500 px-5 py-3 text-base font-semibold text-white hover:bg-forest-600 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleSend}
          >
            {sending && <Spinner />}
            {sending ? "送信しています…" : `送信する（${items.length}件）`}
          </button>
        </>
      )}

      {sendResults && (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink">送信結果</p>
          <ul className="max-h-60 space-y-1 overflow-y-auto text-sm">
            {sendResults.map((r) => (
              <li key={r.studentId} className={r.success ? "text-forest-600" : "text-pen-600"}>
                {r.studentId}（{r.email}）: {r.success ? "送信成功" : `失敗 - ${r.error}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
