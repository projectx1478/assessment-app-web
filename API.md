# API.md

Base: Cloudflare Workers（Hono）。全エンドポイントJSON応答。

## POST /analyzeAssignment
課題を解析する。ハッシュ一致するキャッシュがあれば再利用（Gemini呼ばない）。

Request
```json
{ "rawContent": "課題文..." }
```
Response
```json
{ "assignmentId": "sha256ハッシュ" }
```

## POST /importFile
`multipart/form-data`。Excel/CSVを読込み、列判定→PII除外→StudentAnswer化。**サーバーにファイル・生徒データを保存しない。**

Fields
- `file`: File（.xlsx/.xls/.csv）
- `assignmentId`: string
- `override`（任意）: JSON文字列 `{ numberHeader?, questionHeaders?, freeTextHeaders? }`（未判定列の手動割当）

Response
```json
{
  "columns": {
    "nameHeader": "氏名",
    "numberHeader": "出席番号",
    "questionHeaders": ["設問1"],
    "freeTextHeaders": ["回答"],
    "unknownHeaders": []
  },
  "studentAnswers": [{ "id": "1", "assignmentId": "...", "answerText": "..." }]
}
```
`unknownHeaders` が空でない場合、フロントは保持しているファイルに `override` を付けて再送する。

## POST /grade
保存済み課題情報を使って採点する。回答ハッシュでキャッシュ確認後、未キャッシュ分のみ8人ずつバッチでGemini呼び出し。

Request
```json
{
  "assignmentId": "...",
  "studentAnswers": [{ "id": "1", "answerText": "..." }]
}
```
Response
```json
{
  "evaluations": [
    { "studentAnswerId": "1", "understanding": 80, "accuracy": 70, "logic": 75, "expression": 60, "comment": "..." }
  ]
}
```

## POST /analyzeClass
クラス分析（Gemini呼び出しは最後に1回のみ）。

Request
```json
{ "evaluations": [ /* Evaluation[] 上記と同形式 */ ] }
```
Response
```json
{
  "averageScore": 75,
  "understandingRate": 80,
  "frequentMistakes": ["..."],
  "count": 30,
  "misconceptions": ["..."],
  "teachingImprovementSuggestions": ["..."]
}
```

## GET /usage
API利用量統計を取得する。

Response
```json
{ "geminiCallCount": 12, "cacheHitCount": 48 }
```

## フロント単独処理（Workersを経由しない）
- ⑥Excel出力: `utils/exportExcel.ts`（ブラウザ内でxlsx生成しダウンロード）
- ⑦Spreadsheet反映: `utils/googleSheets.ts`（Google Identity Servicesでトークン取得 → Sheets APIへ直接POST）
