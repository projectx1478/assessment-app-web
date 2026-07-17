# CHANGELOG.md

## 2026-07-15
- ディレクトリ雛形、共通型定義(models/)を作成
- evaluators（hundred/fiveScale/abc/rubric）実装。内部評価スコアは0-100点に確定
- assignmentIdを内容ハッシュ方式に確定。cache/assignmentCache.ts, cache/answerCache.ts実装
- Geminiモデルを`gemini-3.1-flash-lite`に確定。providers/gemini/client.ts実装
- engines/analysis, engines/assessment実装（Rule1・Rule9のキャッシュ優先ロジック）
- Import Engineの列判定をローカル判定のみに確定（PII保護のため）。engines/import実装
- 判定不能列は教員による手動割当UIで対応。components/ColumnAssignment.tsx実装
- engines/report実装。クラス分析はGemini呼び出しを最後に1回のみに確定
- api/router.ts, api/schemas.ts実装（Hono + Zod）。requestLoggerと/usageで利用量記録を追加
- tests/にユニットテスト追加（13件）。tsc --noEmit エラーなしを確認
- Excel/CSV対応のfileParser.ts実装。Google Spreadsheetは将来対応と確定
- 未判定列の再送方式をフロント保持＋再送に確定（サーバーにファイルを一時保存しない）
- ⑥Excel出力（1シート全員一覧）実装
- ⑦Spreadsheet反映をクライアントサイドOAuth方式で実装（Workersにトークン・シークレットを保存しない）
- Vite起動に必須の index.html / main.tsx / index.css / vite.config.ts / tailwind.config.js /
  postcss.config.js が欠落していた不備を修正
- vite.config.tsにwrangler dev(localhost:8787)へのプロキシ設定を追加。.dev.vars.exampleを追加
- REQUIREMENTS.md, ARCHITECTURE.md, API.md を新規作成（このセッションの決定事項を集約）
