# REQUIREMENTS.md（確定仕様）

元となる `requirements.md`（要件定義書v1.0）をベースに、実装過程で確定した仕様を反映する。
**このファイルが唯一の正。** 未記載の項目は元のrequirements.mdに従う。

## 内部評価スコア
- 理解度 / 正確性 / 論理性 / 表現力: 各0〜100点の整数
- 出力形式（EvaluationResult）: 100点法 / 5段階 / 三観点(A/B/C) の3種を提供
- ルーブリック評価: 4固定項目（理解度/正確性/論理性/表現力）をS/A/B/Cの4段階にレベル化（観点カスタマイズは将来対応）

## assignmentId
- 課題内容の正規化テキストをSHA-256ハッシュ化した値を採番に用いる
- 同一内容の課題は自動的にキャッシュ流用され、Gemini APIを再実行しない

## Gemini API
- モデル: `gemini-3.1-flash-lite` 固定
- Analysis Engine・Assessment Engine・Class Analysisの3箇所でのみ呼び出す
- 呼び出し回数とキャッシュヒット回数をKVに記録する（API利用量表示の元データ）

## Import Engine（列自動判定）
- ローカル判定のみ（ヘッダー名のキーワードマッチング）。AIは呼ばない
- 氏名等の個人情報列はヘッダー名から検出し、Gemini APIへは一切送信しない（Assessment Engineへ渡すのはstudentAnswerId + 回答テキストのみ）
- 判定不能な列（unknownHeaders）は教員が手動割当する
  - アップロードしたファイルはサーバーに保存しない。未判定列がある場合はブラウザ側でファイルを保持し、手動割当と一緒に再送する
- 対応形式: Excel(.xlsx) / CSV のみ（Google Spreadsheetの直接取込は将来対応）

## Report Engine
- 個人レポート（strengths/improvements）はローカル集計のみ（AI呼ばない）
- クラス分析はGeminiを最後に1回だけ呼び出し、誤概念分析・授業改善提案を生成する

## フロントエンド
- 画面遷移: 単一ページ内でuseStateによるstep管理（upload→criteria→grading→results）。ルーター未使用
  - 将来、途中経過の永続化や結果の後日参照が必要になった場合はルーター＋永続化へ移行を検討する
- ⑥Excel出力: 1シートに全員一覧（行=生徒、列=生徒ID/評価/コメント）
- ⑦Spreadsheetへの反映: クライアントサイドOAuth（Google Identity Services）でアクセストークンを取得し、ブラウザから直接Sheets APIへ追記する。サーバーにOAuthシークレット・トークンは一切保存しない
  - Spreadsheetからの「取込」は今回スコープ外（将来対応）

## セキュリティ
- Gemini APIキー: Cloudflare Workers Secretsのみ（変更なし）
- OAuthクライアントID: 秘密情報ではないためフロントの`.env`（`VITE_GOOGLE_CLIENT_ID`）に設定してよい
- 生徒の氏名等個人情報は、いかなる場合もGemini APIへ送信しない
