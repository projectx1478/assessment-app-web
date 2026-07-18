# SESSION

> 詳細な確定仕様・構成・API仕様はPROJECT.mdを参照。このSESSION.mdは直近の状態のみを保持する。
> ローカルのプロジェクトフォルダは削除済み。以後はGitHubのブラウザ編集のみで開発する。

## 本番環境（デプロイ済み）
- GitHubリポジトリ: https://github.com/projectx1478/assessment-app-web
- Cloudflare Worker名: assessment-app-web
- 本番URL: https://assessment-app-web.projectx1478.workers.dev
- デプロイ方式: GitHub連携（Cloudflare Workers Builds）。mainブランチにpushすると自動ビルド・デプロイ
  - Build command: npm install && npm run build
  - Deploy command: npx wrangler versions upload（Cloudflare側が自動で本番に反映）
- KV Namespace: ASSIGNMENT_KV（id: 1b17a4b446fa42609809a1bb37478884）※wrangler.tomlに設定済み
- Secrets（Cloudflareダッシュボード → Settings → Variables and Secrets）
  - GEMINI_API_KEY: 設定済み
- Build variables（未設定・要対応）
  - VITE_GOOGLE_CLIENT_ID: 未設定。ビルド時に埋め込まれる値のためSecretsではなく
    「Build variables / Environment variables」欄に設定が必要。設定するまで⑦Spreadsheet
    反映機能は本番で動作しない。

## 動作確認済み（ローカル、フォルダ削除前）
- ①課題アップロード→解析 ②評価基準確認(チェックボックス+自由記述) ③CSVデータ取込
  ④採点 ⑤結果確認 ⑥Excel出力 ⑦Spreadsheet新規作成/既存反映
- 本番: ①〜⑥は動作確認済み（/usageで200 OK確認）。画面(index.html)が404になる不具合を
  wrangler v4へのアップグレードで解消（v3.114ではassets機能が正しく動作しなかった）。
  v4への切り替え後の本番再確認は未実施。

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
- wrangler.toml（[assets]によるフロント静的配信 + KV Namespace設定済み）
- tests/（evaluators, piiFilter, import, report）13件全て成功、tsc --noEmit エラーなし

## 未完了タスク
- Cloudflareダッシュボードで VITE_GOOGLE_CLIENT_ID をBuild variablesに追加し再デプロイ
- wrangler v4アップグレード後、本番URLで①〜⑦を再度通し確認
- Google Spreadsheet「取込」対応（現状は「反映」のみ、将来対応）
- requirements.mdの削除（PROJECT.mdへ統合済みのため）

## 次に行う作業
- VITE_GOOGLE_CLIENT_ID のBuild variables設定 → 再デプロイ → ⑦の本番動作確認