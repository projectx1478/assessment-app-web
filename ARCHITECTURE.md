# ARCHITECTURE.md

## 全体構成

```
Frontend (React + Vite, useStateによるstep管理)
        │ fetch (JSON / multipart)
Cloudflare Workers (Hono)
        │
        ├─ engines/import    … Excel/CSV読込・列判定・PII除外（ローカルのみ）
        ├─ engines/analysis  … 課題解析（Gemini、キャッシュ優先）
        ├─ engines/assessment… 採点（Gemini、バッチ8人、キャッシュ優先）
        ├─ engines/report    … 個人レポート（ローカル）/ クラス分析（Gemini 1回）
        │
        ├─ providers/gemini  … Gemini API呼び出しラッパー（gemini-3.1-flash-lite固定）
        ├─ cache             … Cloudflare KV読み書き（Layer1〜3 + 利用量統計）
        └─ evaluators        … 表示用スコア変換プラグイン（hundred/fiveScale/abc/rubric）

Frontend単独（Workers非経由）
        └─ utils/googleSheets.ts … Google Identity Servicesでトークン取得しSheets APIへ直接反映
```

## ディレクトリ構成（実装済み）

```
src/
  api/
    router.ts        Honoルーティング（/analyzeAssignment /grade /analyzeClass /importFile /usage）
    schemas.ts        Zodバリデーション
  engines/
    import/           列判定 + fileParser.ts（SheetJS）
    analysis/          課題解析エンジン
    assessment/        採点エンジン（バッチ処理）
    report/            個人/クラスレポート生成
  evaluators/
    hundred/ fiveScale/ abc/ rubric/
  providers/gemini/    client.ts
  prompts/             analysis.ts assessment.ts classAnalysis.ts
  cache/
    assignmentCache.ts  Layer1: 課題解析結果（永久）
    answerCache.ts       Layer3: 採点結果（再採点まで）
    usageStats.ts         Gemini呼び出し数/キャッシュヒット数
  models/               Assignment / Evaluation / Evaluator 型定義
  utils/
    hash.ts             assignmentId生成（SHA-256）
    piiFilter.ts        氏名等PII列の判定・除外
    exportExcel.ts       ⑥Excel出力（1シート・全員一覧）
    googleSheets.ts       ⑦Spreadsheet反映（クライアントサイドOAuth）
  middleware/
    requestLogger.ts     リクエストログ（Log API usage）
  components/
    ColumnAssignment.tsx  未判定列の手動割当UI
  App.tsx, main.tsx, index.css
```

## KVキー設計

| Prefix           | 内容                         | 保持期間        |
|------------------|------------------------------|-----------------|
| `assignment:{id}`| 課題解析結果（Assignment）    | 永久（Layer1）  |
| `evaluation:{assignmentId}:{answerHash}` | 採点結果 | 再採点まで（Layer3） |
| `stats:geminiCallCount` / `stats:cacheHitCount` | 利用量カウンタ | 永久（集計用） |

`id` はいずれも内容のSHA-256ハッシュ（`utils/hash.ts`）。

## データフロー（採点1件あたり）

```
Excel/CSVアップロード（ブラウザ）
  → /importFile: ローカル列判定 → PII除外 → StudentAnswer[]を返却（サーバーは保存しない）
  → (unknownHeadersがあれば) ブラウザ保持ファイルを手動割当と共に再送
  → /grade: assignmentId + StudentAnswer[] を送信
      → 回答ハッシュでキャッシュ確認 → 未キャッシュ分のみ8人ずつバッチでGemini呼び出し
      → 採点結果をLayer3へ保存し返却
  → ブラウザで⑥Excel出力 / ⑦Spreadsheet反映（Workersを経由しない）
```

## セキュリティ境界

- Gemini APIキー: Workers Secretsのみ。ブラウザ・GitHub・Spreadsheetには一切送らない
- 生徒氏名等PII: ローカル判定の時点で除外し、Gemini APIへのプロンプトに含めない
- Google OAuthトークン: ブラウザ内メモリのみ。Workers側には送信・保存しない
