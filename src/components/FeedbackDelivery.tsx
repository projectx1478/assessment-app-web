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

export interface FeedbackDeliveryResult {
  studentAnswerId: string;
  hundred: number;
  comment: string;
}

export interface FeedbackDeliveryProps {
  results: FeedbackDeliveryResult[];
  emailByStudentId: Record<string, string>;
  assignmentLabel: string;
}

export default function FeedbackDelivery({
  results,
  emailByStudentId,
  assignmentLabel,
}: FeedbackDeliveryProps) {
  const [open, setOpen] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);
  const [courseId, setCourseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<FeedbackEmailItem[]>([]);
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
            subject: `【評価フィードバック】${assignmentLabel}`,
            body: `${r.comment}\n\n評価点数: ${r.hundred}点`,
          }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "認証・コース取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  function updateBody(studentId: string, body: string) {
    setItems((prev) => prev.map((i) => (i.studentId === studentId ? { ...i, body } : i)));
  }

  async function handleSend() {
    if (!accessToken || !courseId) return;
    setSending(true);
    setError(null);
    try {
      const results = await sendFeedbackBatch(accessToken, items, courseId, announcementText);
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

          {unmatched.length > 0 && (
            <p className="text-sm text-gold-500">
              {unmatched.length}件はメールアドレスが未登録のため配信対象外です（
              {unmatched.map((r) => r.studentAnswerId).join(", ")}）
            </p>
          )}

          <div className="max-h-96 space-y-3 overflow-y-auto">
            {items.map((item) => (
              <div key={item.studentId} className="rounded-lg border border-line bg-white p-3">
                <p className="mb-1 text-sm font-semibold text-forest-500">
                  {item.studentId}（{item.email}）
                </p>
                <textarea
                  className="h-24 w-full rounded-lg border border-line p-2 text-sm focus:border-forest-500 focus:outline-none"
                  value={item.body}
                  onChange={(e) => updateBody(item.studentId, e.target.value)}
                />
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
