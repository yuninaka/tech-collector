# 収集記事のソースをZenn/Qiitaに絞る(Hatenaを除外)

Issue: #16

## 背景

Hatenaホットエントリー(はてブ人気エントリー IT)は技術ニュースやバズった記事も混ざりやすく、実務寄りの記事に絞りたい。Zenn/Qiitaの方が実装記録・導入記事など実務直結のコンテンツが多い。

## 方針

コード変更は不要。`src/config/articleSources.ts` の `ARTICLE_SOURCES` 環境変数の仕組みをそのまま使い、`.github/workflows/collect.yml` の `Collect and summarize` ステップの `env` に `ARTICLE_SOURCES` を明示的に設定してZenn/Qiitaのみに絞る。値はコードにハードコードされる非機密情報(公開フィードURL)なのでワークフローファイルに直接書き、GitHubリポジトリ変数などの非バージョン管理な設定には置かない。

## 変更内容

### `.github/workflows/collect.yml`

`Collect and summarize` ステップの `env` に以下を追加:

```yaml
ARTICLE_SOURCES: '[{"source":"Zenn","feedUrl":"https://zenn.dev/feed"},{"source":"Qiita","feedUrl":"https://qiita.com/popular-items/feed"}]'
```

### `.env.example`

コメントで「現在GitHub Actionsの本番設定はZenn/Qiitaのみに絞っている」旨を追記(任意)。

## 確認事項

- Hatenaを完全に除外してよいか(将来的に戻したくなった場合は `.github/workflows/collect.yml` の1行を消すだけで元に戻る)
