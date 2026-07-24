# PROJECT

# 1. プロジェクト概要

## プロジェクト名

AI評価支援システム（assessment-app-web）

## 目的

高校教員の採点・評価業務をAIで支援し、評価の質を維持しながら採点時間を大幅に削減する。
本システムは教員の評価を支援するシステムであり、最終評価は教員が決定する。

## 対象ユーザー

高校教員

## 動作環境

- PC / タブレット / スマートフォン
- 対応ブラウザ：主要モダンブラウザ（Chrome等）

## 使用技術

- フロントエンド：React / TypeScript / Vite / TailwindCSS
- バックエンド：Cloudflare Workers（Hono, Zod）
- データ保存：Cloudflare KV（将来的にD1・R2へ対応可能な設計）
- AI：Gemini API（gemini-3.1-flash-lite 固定）
- その他：Google OAuth（Spreadsheet連携、Workers側にシークレット非保存）

---

# 2. 要件定義

## 必須機能

- 課題ファイル（Excel/CSV）の取込・列自動判定（氏名・番号・設問・自由記述）
- 課題解析（教科・単元・学習目標・評価観点・模範回答・よくある誤答の自動生成、課題ごとに1回のみ）
- 評価基準の教員確認・編集（チェックボックス＋自由記述、AIを再実行せず反映）
- 生徒回答の採点（内部評価データ：理解度・正確性・論理性・表現力＋コメント生成）
- 評価方式プラグイン（100点法／5段階／ABC／ルーブリック等、方式変更時はAIを呼ばない）
- クラス全体分析（平均点・理解率・頻出誤答・誤概念分析・授業改善提案）
- Excel出力／Google Spreadsheetへの反映（クライアントサイドOAuth）
- 生徒個別へのフィードバック配信（Gmail送信＋Classroomお知らせ通知、クライアントサイドOAuth）
- API利用量・キャッシュ利用率の表示

## 任意機能

- 判定不能列に対する教員による手動割当UI
- コメント口調変更、コメント一括修正

## 将来追加予定

- PDF対応 / OCR / 手書き答案
- Google Spreadsheetの直接取込（現状は反映のみ対応）
- 学校独自評価基準／学習指導要領対応
- AIモデル切替（Gemini/OpenAI/Claude）
- 年度比較・成績統計・ダッシュボード
- コストシミュレーター、モデル比較（Flash / Pro）

---

# 3. システム設計

## 全体構成

```
Frontend（React）
       │
Cloudflare Workers
       │
Gemini API
```

4つのエンジンで構成する。

```
Import Engine
Analysis Engine
Assessment Engine
Report Engine
```

## データ構造

### Assignment（課題）

- ID（内容ハッシュ方式。同一課題は自動キャッシュ流用）
- 教科 / 単元 / 学習目標 / 評価観点（基礎・標準・応用の3段階、各3〜4個） / 模範回答 / 誤答例

### StudentAnswer（生徒回答）

- ID / assignmentId / 回答

### Evaluation（内部評価）

- 理解度 / 正確性 / 論理性 / 表現力（各0-100点）
- 基礎観点到達度 / 標準観点到達度 / 応用観点到達度（各0-100点、評価基準の3段階に対応）
- コメント（生徒の回答のどの部分を根拠にその評価に至ったかを具体的に説明する。80文字制限は撤廃）
- 改善提案（今後に向けた具体的な改善提案）

### CombinedEvaluationResult（結果確認画面・出力で使用、3方式を同時に含む）

- 三観点評価（ABC）：基礎・標準・応用それぞれのランク（到達度80点以上=A、50点以上=B、それ未満=C）
- 5段階評価（1〜5）
- 100点法（0〜100）
- コメント
- 改善提案

## API

### 使用するAPI

- `POST /analyzeAssignment`：課題データ → assignmentId
- `POST /updateCriteria`：教員確認済み評価基準をKV上のAssignmentへ反映
- `POST /importFile`：ファイル取込・列判定
- `POST /grade`：assignmentId + studentAnswers[] → 評価JSON
- `POST /analyzeClass`：採点結果 → クラス分析
- `GET /usage`：API利用量・キャッシュ利用率
- `GET /config`：フロント起動時の公開設定値取得（Google Client IDなど、秘匿情報ではない値のみ）

### 認証方法

- Gemini APIキー：Cloudflare Workers Secretsのみに保存
- Google Spreadsheet連携：クライアントサイドOAuth（Workers側にOAuthシークレット・トークンを一切保存しない）
- フィードバック配信連携：クライアントサイドOAuth（`gmail.send` / `classroom.courses.readonly` / `classroom.announcements`）。Spreadsheet連携と同じくWorkers側にトークンを保存しない

### 利用制限

- Gemini API無料枠で日常利用できる設計とする
- 課題解析は1課題につき1回のみAIを利用する
- 30人の採点を3〜6回程度のAPI呼び出しで完了する
- 評価方式変更ではAIを呼ばない

---

# 4. 開発ルール

## 基本方針

AIの振る舞いルール（作業プロセス）はCLAUDE.mdに集約。本章以降は技術仕様・プロジェクト固有ルールのみを扱う。

---

## GitHub運用

- GitHubを唯一のソースコード管理場所とする。
- リポジトリ: https://github.com/projectx1478/assessment-app-web
- 運用フロー（ブランチ作成→コミット→PR作成→人がマージ）はCLAUDE.md参照。

---

## セキュリティ

以下はリポジトリへ保存しない。

- APIキー
- パスワード
- Secret
- .env

APIキーはSecret管理を利用する。

- GEMINI_API_KEY：Cloudflare Workers Secretsに保存
- 生徒氏名等PII：AIには一切送信しない（ローカル判定のみ）
- 判定不能列のファイル：サーバーに一時保存せず、フロント保持のファイルを再送する方式

---

## コーディング規約

- 可読性を優先する。
- 保守性を優先する。
- コメントを整理する。
- 既存の設計を尊重する。
- TypeScriptで統一する。
- Honoを採用する。
- Zodでバリデーションする。
- Cloudflare Workersのみで構築する。
- Reactは状態管理を最小限にする。
- モジュール化を徹底する。
- テスト可能な設計とする。

---

## トークン最適化

回答時のAIの振る舞い（最小差分・要求時のみ全文表示等）はCLAUDE.md参照。以下はGemini API呼び出し削減のためのプロジェクト固有ルール。

- 課題解析は一度だけ行い、評価軸・模範回答を保存して再利用する。
- システムプロンプトはWorkers側で固定する。
- AIにはJSONのみ返させ、説明文は禁止する。
- 生徒は5〜10人ずつバッチ処理する。
- コメントは生徒個別フィードバック配信（Gmail送信）で読める分量まで許容する（80文字制限は撤廃。根拠の具体性・改善提案を優先し、その分トークン消費は増える前提とする）。
- 同じ回答はキャッシュする。
- クラス分析は最後に1回だけ実行する。

---

# 5. このプロジェクト固有の設計

## ディレクトリ構成

```
src/
  api/
  engines/
    import/
    analysis/
    assessment/
    report/
  evaluators/
    hundred/
    fiveScale/
    abc/
    rubric/
  providers/
    gemini/
  prompts/
  cache/
  models/
  utils/
  middleware/
public/
tests/
```

## キャッシュ構造（4層）

```
Layer1：課題解析（永久保存）
Layer2：評価テンプレート（永久保存）
Layer3：採点結果（再採点まで保存）
Layer4：クラス分析
```

## 評価フロー

```
課題解析 → 評価軸生成 → 教員確認 → 採点 → コメント生成 → クラス分析
```

## UIフロー

```
①ファイルアップロード → ②課題解析 → ③評価基準確認 → ④採点開始
→ ⑤結果確認 → ⑥Excel出力 → ⑦Spreadsheetへ反映
```

## 決定事項

- 内部評価スコア：理解度/正確性/論理性/表現力は各0-100点
- 出力形式：ABC / 1-5 / 0-100 の3種を提供
- assignmentId：内容ハッシュ方式（同一課題は自動キャッシュ流用）
- Geminiモデル：gemini-3.1-flash-lite 固定
- Import Engineの列判定：ローカル判定のみ（PIIはAIに送信しない）
- 判定不能列：教員による手動割当UIで対応
- 対応形式：現状はExcel/CSVのみ（Google Spreadsheet直接取込は将来対応）
- Excel出力レイアウト：1シートに全員一覧（行=生徒）
- Spreadsheet反映：クライアントサイドOAuth（Google Client IDはビルド時埋め込みではなく、`GET /config`経由で実行時取得。CloudflareのVariables and SecretsにGOOGLE_CLIENT_IDとして設定）
- 評価基準確認：AI提案を基礎・標準・応用の3段階（各3〜4個）に分けて提示 → チェックボックス選択＋自由記述（段階ごとに追加可） → `/updateCriteria`でKV反映後に採点
- 採点結果：三観点評価（ABC）・5段階評価・100点法の3方式を同時に表示・出力する（評価のランクは評価基準確認で示した3段階に対応）
- 生徒データアップロード時、雛形Excel（番号・氏名・メールアドレス・回答1〜3列）をダウンロードできるようにする（public/template_student_data.xlsx）
- 静的アセット配信：Cloudflare Workersの[assets]機能（wrangler v4以降が必須）
- 列判定にメールアドレス列を追加（フィードバック配信での生徒紐付け用）。氏名列と同様にPII扱いとし、Gemini APIには送信しない。生徒番号→メールアドレスのマッピングはフロント側でのみ保持する
- フィードバック配信：Gmail送信（`gmail.send`）＋Classroomお知らせ投稿（`classroom.announcements`）の組み合わせで実現。クライアントサイドOAuth（Sheets連携と同じ方式）
  - 採用理由：Classroom APIの`studentSubmissions`（成績・添付ファイル）は「そのcourseWorkを作成したのと同じ開発者プロジェクトのみ」書き込み可能という制限があり、教員がClassroom上で直接作成した既存課題には本アプリから書き込めない（PERMISSION_DENIED）。また私的コメント欄自体もAPIに存在しない。announcements.createにはこの制限がないため採用
  - フィードバック本文はGmail経由（生徒個別）、配信の告知はClassroomへのお知らせ投稿（クラス全体向け、1件）
  - 送信前に教員がプレビュー画面で生徒ごとの本文を確認・編集してから送信する
  - メールアドレス未登録の生徒は配信対象外とし、画面上で警告表示する
  - フィードバックメールはHTML形式。課題文・生徒の回答を表形式で転記し、評価コメント（根拠）・改善提案を別セクションで表示する
  - 成績の記載有無はトグルで選択可能。記載する場合の評価方式（三観点評価/5段階評価/100点法）も送信時に選択できる（`CombinedEvaluationResult`に3方式とも保持済みのため追加のAI呼び出しは不要）
  - メール件名はアプリ画面上で指定できる（全生徒共通の件名として使用）
  - Classroomお知らせには`materials`にリンク型添付（Gmail起動用URL）を付与し、確実にクリック可能なリンクとして表示する（1クラスに1件、生徒個別の深いリンクではなく汎用のGmail起動リンク）

## 本番環境

- GitHubリポジトリ: https://github.com/projectx1478/assessment-app-web
- Cloudflare Worker名: assessment-app-web
- 本番URL: https://assessment-app-web.projectx1478.workers.dev
- デプロイ方式: GitHub連携（Cloudflare Workers Builds）。mainブランチにpushすると自動ビルド・デプロイ
  - Build command: `npm install && npm run build`
  - Deploy command: `npx wrangler versions upload`
- KV Namespace: ASSIGNMENT_KV（wrangler.tomlに設定済み）
- Build variables：VITE_GOOGLE_CLIENT_ID（未設定時は⑦Spreadsheet反映機能が本番で動作しない）

---

# 6. 今後追加予定

- Cloudflareダッシュボードで VITE_GOOGLE_CLIENT_ID をBuild variablesに追加し再デプロイ
- wrangler v4アップグレード後、本番URLで①〜⑦を再度通し確認
- Google Spreadsheet「取込」対応（現状は「反映」のみ）
- ワンクリック採点、コメント一括修正、コメント口調変更、評価理由表示、再採点
- クラス理解度分析、誤概念分析、次時の授業提案、指導案生成
- 個別アドバイス、復習問題生成、学習計画提案
- API利用量表示、トークン消費量表示、キャッシュ利用率表示、コストシミュレーター、モデル比較（Flash / Pro）

---

# 7. AIへの指示

作業開始時は

1. CLAUDE.md
2. PROJECT.md
3. SESSION.md

を読むこと。

チャット履歴ではなく、このファイルを仕様書とする。

設計変更時は本ファイルを更新する。