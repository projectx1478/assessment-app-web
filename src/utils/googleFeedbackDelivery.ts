import { requestAccessToken } from "./googleAuth";

// Classroom提出物(studentSubmissions)の添付・成績更新・返却は
// 「そのcourseWorkを作成したのと同じ開発者プロジェクト」でなければPERMISSION_DENIEDになる
// （教員がClassroom上で直接作成した既存課題には書き込めない）。
// そのため成績・添付ファイルのAPIは使わず、Gmail送信＋Classroomお知らせ投稿の組み合わせで届ける。
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.announcements",
].join(" ");

export function requestFeedbackAccessToken(): Promise<string> {
  return requestAccessToken(SCOPES);
}

export interface ClassroomCourse {
  id: string;
  name: string;
}

export async function listClassroomCourses(accessToken: string): Promise<ClassroomCourse[]> {
  const res = await fetch(
    "https://classroom.googleapis.com/v1/courses?teacherId=me&courseStates=ACTIVE&fields=courses(id,name)",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    throw new Error(`コース一覧の取得に失敗しました: ${res.status} ${await res.text()}`);
  }
  const data = await res.json<{ courses?: ClassroomCourse[] }>();
  return data.courses ?? [];
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export function encodeBase64Url(input: string): string {
  return toBase64(new TextEncoder().encode(input))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function encodeMimeHeader(text: string): string {
  return `=?UTF-8?B?${toBase64(new TextEncoder().encode(text))}?=`;
}

/**
 * Gmail APIのusers.messages.sendに渡すRFC 2822形式のメール本文を組み立てる。
 */
export function buildRfc2822Message(to: string, subject: string, body: string): string {
  const headers = [
    `To: ${to}`,
    `Subject: ${encodeMimeHeader(subject)}`,
    "Content-Type: text/plain; charset=UTF-8",
    "MIME-Version: 1.0",
  ].join("\r\n");
  return `${headers}\r\n\r\n${body}`;
}

async function sendGmail(accessToken: string, to: string, subject: string, body: string): Promise<void> {
  const raw = encodeBase64Url(buildRfc2822Message(to, subject, body));
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    throw new Error(`メール送信に失敗しました: ${res.status} ${await res.text()}`);
  }
}

export async function createClassroomAnnouncement(
  accessToken: string,
  courseId: string,
  text: string
): Promise<void> {
  const res = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/announcements`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw new Error(`お知らせの投稿に失敗しました: ${res.status} ${await res.text()}`);
  }
}

export interface FeedbackEmailItem {
  studentId: string;
  email: string;
  subject: string;
  body: string;
}

export interface FeedbackSendResult {
  studentId: string;
  email: string;
  success: boolean;
  error?: string;
}

/**
 * 生徒ごとにフィードバックメールを送信し、最後にClassroomへお知らせを1件投稿する。
 * 一部の生徒への送信が失敗しても他の生徒への送信は続行する（部分失敗を許容）。
 */
export async function sendFeedbackBatch(
  accessToken: string,
  items: FeedbackEmailItem[],
  courseId: string,
  announcementText: string
): Promise<FeedbackSendResult[]> {
  const results: FeedbackSendResult[] = [];

  for (const item of items) {
    try {
      await sendGmail(accessToken, item.email, item.subject, item.body);
      results.push({ studentId: item.studentId, email: item.email, success: true });
    } catch (e) {
      results.push({
        studentId: item.studentId,
        email: item.email,
        success: false,
        error: e instanceof Error ? e.message : "送信に失敗しました",
      });
    }
  }

  await createClassroomAnnouncement(accessToken, courseId, announcementText);

  return results;
}
