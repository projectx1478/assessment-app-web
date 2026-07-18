# SESSION

> 詳細な確定仕様・構成・API仕様はPROJECT.mdを参照。このSESSION.mdは直近の状態のみを保持する。
> ローカルのプロジェクトフォルダは削除済み。以後はGitHubのブラウザ編集のみで開発する。

## 本番環境（デプロイ済み）
- GitHubリポジトリ: https://github.com/projectx1478/assessment-app-web
- Cloudflare Worker名: assessment-app-web
- 本番URL: https://assessment-app-web.projectx1478.workers.dev
- デプロイ方式: GitHub連携（Cloudflare Workers Builds）。mainブランチにpushすると自動ビルド・デプロイ
  - Build command: npm install && npm run build
  - Deploy command: npx wrangler deploy（Cloudflare側が自動で本番に反映）
- KV Namespace: ASSIGNMENT_KV（id: 1b17a4b446fa42609809a1bb37478884）※wrangler.tomlに設定済み
- Secrets（Cloudflareダッシュボード → Settings → Variables and Secrets）
  - GEMINI_API_KEY: 設定済み
- Build variables（未設定・要対応）
  - VITE_GOOGLE_CLIENT_ID: 未設定。ビルド時に埋め込まれる値のためSecretsではなく
    「Build variables / Environment variables」欄に設定が必要。設定するまで⑦Spreadsheet
    反映機能は本番で動作しない。

## 動作確認済み
- 本番: 画面(index.html)表示を確認済み（2026-07-18）。①〜⑥は以前から動作確認済み（/usageで200 OK確認）。
- ⑦Spreadsheet反映は VITE_GOOGLE_CLIENT_ID 未設定のため本番では未確認。

## 直近の対応（2026-07-18）
本番URLが404（真っ黒画面、`/src/main.tsx`が404）になる不具合を修正。

- **原因1**: `wrangler.toml`に`[assets]`セクションが存在せず、静的アセット（ビルド後の`dist`)が
  配信されていなかった。未ビルドのソース`index.html`がそのまま返っていた。
  → `[assets] directory = "./dist" / binding = "ASSETS"` を追加。
- **原因2**: `package.json`の`wrangler`が実際は`^3.80.0`のままで、v4未使用だった。
  → `wrangler`を`^4.0.0`に更新。
- 上記に伴い`@cloudflare/workers-types`をv4→v5(`^5.20260714.1`)に更新（wrangler v4のpeer dependency）。
- `package-lock.json`をv4/v5系に合わせて再生成（`npm ci`のEUSAGEエラー解消）。
- `wrangler.toml`の`name`が`ai-assessment-platform`のままで本番Worker名`assessment-app-web`と
  不一致だった点を修正（CI警告解消）。
- 上記5点をGitHubへ直接push（Fine-grained PAT使用、作業後に失効済み）。
- ビルド・デプロイ成功、本番画面表示を確認済み。

## 決定事項
決定事項の詳細はPROJECT.md「5. このプロジェクト固有の設計」に集約済み。

## 完了（実装済み機能の一覧）
- models/, evaluators/{hundred,fiveScale,abc,rubric}
- utils/hash.ts, utils/piiFilter.ts, utils/exportExcel.ts, utils/googleSheets.ts
- cache/assignmentCache.ts, cache/answerCache.ts, cache/usageStats.ts
- providers/gemini/client.ts（gemini-3.1-flash-lite）
- engines/analysis, engines/assessment（キャッシュ優先）
- engines/import（fileParser.ts + 列判定 + PII除外 + 手動オーバーライド）
- engines/report（ローカル集計 + クラス分析はGemini1回呼び出し）
- components/ColumnAssignment.tsx, components/CriteriaSelector.tsx
- api/router.ts（/analyzeAssignment /updateCriteria /importFile /grade /analyzeClass /usage）
- middleware/requestLogger.ts
- App.tsx（useStateによるstep管理、ルーター未使用）
- index.html, main.tsx, index.css, vite.config.ts, tailwind.config.js, postcss.config.js
- wrangler.toml（[assets]によるフロント静的配信 + KV Namespace設定済み、wrangler v4対応済み）
- tests/（evaluators, piiFilter, import, report）13件全て成功、tsc --noEmit エラーなし

## 未完了タスク
- Cloudflareダッシュボードで VITE_GOOGLE_CLIENT_ID をBuild variablesに追加し再デプロイ
- 本番URLで⑦Spreadsheet反映を含めた通し確認（VITE_GOOGLE_CLIENT_ID設定後）
- Google Spreadsheet「取込」対応（現状は「反映」のみ、将来対応）

## 次に行う作業
- VITE_GOOGLE_CLIENT_ID のBuild variables設定 → 再デプロイ → ⑦の本番動作確認
<!-- redeploy trigger: 2026-07-18T16:21:25.840761 -->
<!-- redeploy trigger (VITE_GOOGLE_CLIENT_ID re-registered): 2026-07-18T21:32:49.367211+00:00 -->
<!-- redeploy trigger (Build tab Variables and secrets configured): 2026-07-18T22:01:54.033027+00:00 -->
