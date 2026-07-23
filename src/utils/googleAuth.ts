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

const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let cachedGoogleClientId: string | null = null;

/**
 * Google Client IDをWorker側の /config から取得する。
 * ビルド時埋め込み（VITE_GOOGLE_CLIENT_ID）ではなく実行時取得にすることで、
 * Cloudflare側の値を変更しても再デプロイ不要にする。
 */
export async function fetchGoogleClientId(): Promise<string> {
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

export function loadGisScript(): Promise<void> {
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
export async function requestAccessToken(scope: string): Promise<string> {
  const [, clientId] = await Promise.all([loadGisScript(), fetchGoogleClientId()]);

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: (response) => {
        if (response.access_token) resolve(response.access_token);
        else reject(new Error(response.error ?? "認証に失敗しました"));
      },
    });
    client.requestAccessToken();
  });
}
