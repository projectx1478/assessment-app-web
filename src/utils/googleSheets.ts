declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }): { requestAccessToken: () => void };
        };
      };
    };
  }
}

const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let cachedGoogleClientId: string | null = null;

/**
 * Google Client IDをWorker側の /config から取得する。
 * ビルド時埋め込み（VITE_GOOGLE_CLIENT_ID）ではなく実行時取得にすることで、
 * Cloudflare側の値を変更しても再デプロイ不要にする。
 */
async function fetchGoogleClientId(): Promise<string> {
  if (cachedGoogleClientId) return cachedGoogleClientId;

  const res = await fetch("/config");
  if (!res.ok) {
    throw new Error(`設定情報の取得に失敗しました: ${res.status}`);
  }
  const data = await res.json<{ googleClientId: string }>();
  if (!data.googleClientId) {
    throw new Error(
      "GOOGLE_CLIENT_IDが未設定です（CloudflareのVariables and SecretsにGOOGLE_CLIENT_IDを設定してください）"
    );
  }
  cachedGoogleClientId = data.googleClientId;
  return cachedGoogleClientId;
}

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Identity Servicesの読み込みに失敗しました"));
    document.head.appendChild(script);
  });
}

/**
 * 教員のGoogleアカウントで一時的なアクセストークンを取得する。
 * トークンはブラウザ内のみで保持し、サーバーには送らない。
 */
async function requestAccessToken(): Promise<string> {
  const [, clientId] = await Promise.all([loadGisScript(), fetchGoogleClientId()]);

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (response) => {
        if (response.access_token) resolve(response.access_token);
        else reject(new Error(response.error ?? "認証に失敗しました"));
      },
    });
    client.requestAccessToken();
  });
}

export interface SheetRow {
  studentAnswerId: string;
  threePerspective: { basic: string; standard: string; advanced: string };
  fiveScale: number;
  hundred: number;
  comment: string;
}

async function getFirstSheetTitle(spreadsheetId: string, accessToken: string): Promise<string> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    throw new Error(`Spreadsheet情報の取得に失敗しました: ${res.status} ${await res.text()}`);
  }
  const data = await res.json<{ sheets: { properties: { title: string } }[] }>();
  const title = data.sheets?.[0]?.properties?.title;
  if (!title) throw new Error("シートが見つかりませんでした");
  return title;
}

/**
 * 教員のGoogle Driveに新規スプレッドシートを作成し、採点結果を書き込む。
 * 作成先は認証時に選択したGoogleアカウントのマイドライブ直下になる。
 */
export async function createSpreadsheetWithResults(
  rows: SheetRow[],
  title = `採点結果_${new Date().toISOString().slice(0, 10)}`
): Promise<{ spreadsheetId: string; url: string }> {
  const accessToken = await requestAccessToken();

  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: "採点結果" } }],
    }),
  });
  if (!createRes.ok) {
    throw new Error(`Spreadsheetの作成に失敗しました: ${createRes.status} ${await createRes.text()}`);
  }
  const created = await createRes.json<{ spreadsheetId: string; spreadsheetUrl: string }>();

  const values = [
    ["生徒ID", "三観点評価（基礎）", "三観点評価（標準）", "三観点評価（応用）", "5段階評価", "100点法", "コメント"],
    ...rows.map((r) => [
      r.studentAnswerId,
      r.threePerspective.basic,
      r.threePerspective.standard,
      r.threePerspective.advanced,
      String(r.fiveScale),
      String(r.hundred),
      r.comment,
    ]),
  ];
  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${created.spreadsheetId}/values/採点結果!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    }
  );
  if (!writeRes.ok) {
    throw new Error(`作成したSpreadsheetへの書き込みに失敗しました: ${writeRes.status} ${await writeRes.text()}`);
  }

  return { spreadsheetId: created.spreadsheetId, url: created.spreadsheetUrl };
}

/**
 * 採点結果を指定したGoogle Spreadsheetの末尾に追記する。
 * シート名は指定せず、1枚目の既存シートへ自動で反映する。
 * spreadsheetIdはURLの /d/{ここ}/edit の部分。
 */
export async function appendResultsToSpreadsheet(
  spreadsheetId: string,
  rows: SheetRow[]
): Promise<void> {
  const accessToken = await requestAccessToken();
  const sheetName = await getFirstSheetTitle(spreadsheetId, accessToken);
  const values = rows.map((r) => [
    r.studentAnswerId,
    r.threePerspective.basic,
    r.threePerspective.standard,
    r.threePerspective.advanced,
    String(r.fiveScale),
    String(r.hundred),
    r.comment,
  ]);

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      sheetName
    )}!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!res.ok) {
    throw new Error(`Spreadsheetへの反映に失敗しました: ${res.status} ${await res.text()}`);
  }
}
