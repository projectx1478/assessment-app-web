# AI評価支援システム（assessment-app-web）

## 概要

高校教員の採点・評価業務をAIで支援し、評価の質を維持しながら採点時間を大幅に削減するシステムです。
Google SpreadsheetまたはExcelに入力された生徒の成果物をAIが解析し、評価軸の提案・採点・フィードバック生成・クラス全体分析を行います。

本システムは**教員の評価を支援するシステム**であり、最終評価は教員が決定します。

Gemini API無料枠での継続利用を最優先とし、「課題解析は1回だけ行い、以降は保存した情報を使って採点する」ことでトークン消費を最小化する設計です。

## 主な機能

- 課題ファイル（Excel/CSV）の取込・列自動判定（氏名・番号・設問・自由記述）
- 課題解析（教科・単元・学習目標・評価観点・模範回答・よくある誤答の自動生成、課題ごとに1回のみ）
- 評価基準の教員確認・編集（チェックボックス＋自由記述、AIを再実行せず反映）
- 生徒回答の採点（内部評価データ：理解度・正確性・論理性・表現力＋コメント生成）
- 評価方式プラグイン（100点法／5段階／ABC／ルーブリック等、方式変更時はAIを呼ばない）
- クラス全体分析（平均点・理解率・頻出誤答・誤概念分析・授業改善提案）
- Excel出力／Google Spreadsheetへの反映（クライアントサイドOAuth）
- API利用量・キャッシュ利用率の表示

## 使用技術

- **フロントエンド：** React / TypeScript / Vite / TailwindCSS
- **バックエンド：** Cloudflare Workers（Hono, Zod）
- **データ保存：** Cloudflare KV（将来的にD1・R2へ対応可能な設計）
- **AI：** Gemini API（gemini-3.1-flash-lite 固定）
- **その他：** Google OAuth（Spreadsheet連携、Workers側にシークレット非保存）

## 動作環境

- PC / タブレット / スマートフォン
- 対応ブラウザ：主要モダンブラウザ（Chrome等）

## ディレクトリ構成

```
/
├── README.md
├── PROJECT.md
├── SESSION.md
├── src/
│   ├── api/
│   ├── engines/
│   │   ├── import/
│   │   ├── analysis/
│   │   ├── assessment/
│   │   └── report/
│   ├── evaluators/
│   │   ├── hundred/
│   │   ├── fiveScale/
│   │   ├── abc/
│   │   └── rubric/
│   ├── providers/
│   │   └── gemini/
│   ├── prompts/
│   ├── cache/
│   ├── models/
│   ├── utils/
│   └── middleware/
├── public/
└── tests/
```

## 本番環境

- GitHubリポジトリ: https://github.com/projectx1478/assessment-app-web
- 本番URL: https://assessment-app-web.projectx1478.workers.dev
- デプロイ方式: GitHub連携（Cloudflare Workers Builds、mainブランチpushで自動デプロイ）

## ドキュメント

### PROJECT.md

プロジェクトの要件定義・設計・開発ルールをまとめたドキュメントです。
仕様変更時は必ず更新してください。

### SESSION.md

現在の開発状況・未完了タスク・次回作業を管理するドキュメントです。
新しい開発セッションでは最初に確認してください。

## 開発フロー

1. PROJECT.md を確認
2. SESSION.md を確認
3. 実装
4. 必要に応じて PROJECT.md を更新
5. SESSION.md を更新
6. GitHubへコミット

## ライセンス

必要に応じて記載してください。