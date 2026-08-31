# AI駆動開発・RAG・Claude関連記事の優先度を上げる

Issue: #14

## 背景

`collectAndSummarize` は現在、全ソースから取得した記事を公開日時の新しい順にソートし、上位 `maxArticles` 件(デフォルト5件)のみを要約・Slack投稿している。特定トピック(AI駆動開発・RAG・Claude 等)の記事を優先して拾いたい。

## 方針

- 記事の `title` + `contentSnippet` に優先キーワードが含まれるかで2グループに分割し、優先グループを先頭に固定する(各グループ内は従来通り新しい順)
- 優先キーワードは環境変数 `PRIORITY_KEYWORDS`(カンマ区切り文字列)で上書き可能。未設定時はデフォルト値を使用
  - デフォルト: `AI駆動開発, RAG, Claude, LLM, 生成AI, Agent, AIエージェント`
- 大文字小文字は区別しない(英語キーワード対応のため)

## 変更内容

### 1. `src/config/priorityKeywords.ts` (新規)

`src/config/articleSources.ts` の `parseArticleSources` と同じパターンで実装:

```ts
export const DEFAULT_PRIORITY_KEYWORDS: string[] = ["AI駆動開発", "RAG", "Claude", "LLM", "生成AI", "Agent", "AIエージェント"];

export const parsePriorityKeywords = (rawEnvValue: string | undefined): string[] => {
  if (!rawEnvValue) return DEFAULT_PRIORITY_KEYWORDS;
  const keywords = rawEnvValue
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
  if (keywords.length === 0) return DEFAULT_PRIORITY_KEYWORDS;
  return keywords;
};
```

### 2. `src/usecases/collectAndSummarize.ts`

- `CollectAndSummarizeParams` に `priorityKeywords?: string[]` を追加(未指定時は `DEFAULT_PRIORITY_KEYWORDS`)
- 記事が優先キーワードにマッチするかを判定する純粋関数 `matchesPriorityKeyword(article, keywords)` を追加
- ソート処理を「優先マッチ有無」→「新しい順」の2キーソートに変更
  - `byPriorityThenNewest(keywords)` のような比較関数を作り、`unprocessedArticles` の並び替えに使う

### 3. `src/index.ts`

- `parsePriorityKeywords(process.env.PRIORITY_KEYWORDS)` を呼び出し、`collectAndSummarize` の `priorityKeywords` に渡す

### 4. テスト

- `tests/config/priorityKeywords.test.ts` (新規): `articleSources.test.ts` に準拠したパターンで、デフォルト値・カンマ区切りパース・空白トリム・空文字列除外・完全に空の場合のフォールバックを検証
- `tests/usecases/collectAndSummarize.test.ts`: 優先キーワードにマッチする記事が非マッチの新しい記事より先に選ばれることを検証するケースを追加

### 5. README

- `PRIORITY_KEYWORDS` 環境変数の説明を追記(存在する場合)

## 確認事項

- 大文字小文字を区別しないマッチでよいか(例: `rag` も `RAG` にマッチ)
- 優先グループが `maxArticles` を超える場合は新しい順で上位のみ採用(自然な結果になる想定)
