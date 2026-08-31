import { describe, expect, it, vi } from "vitest";
import { collectAndSummarize, CollectAndSummarizeDeps } from "../../src/usecases/collectAndSummarize";
import { Article, ArticleFetcher, ArticleSummary } from "../../src/domain/article";

const genAiClient = { models: { generateContent: vi.fn() } };
const slackWebhookUrl = "https://hooks.slack.test/xxx";
const summary: ArticleSummary = { summary: "sum", tags: ["t"], target: "target" };

const buildFetcher = (source: string, articles: Article[]): ArticleFetcher => ({
  source,
  fetch: vi.fn().mockResolvedValue(articles),
});

const buildDeps = (overrides: Partial<CollectAndSummarizeDeps> = {}): CollectAndSummarizeDeps => ({
  summarize: vi.fn().mockResolvedValue([]),
  publish: vi.fn().mockResolvedValue(undefined),
  loadProcessedUrls: vi.fn().mockResolvedValue([]),
  saveProcessedUrls: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe("collectAndSummarize", () => {
  it("fetches from every source in parallel, summarizes in a single batch, publishes, and records unprocessed articles", async () => {
    const zennArticles: Article[] = [{ source: "Zenn", title: "Z1", link: "https://zenn.dev/z1", contentSnippet: "s1", isoDate: "2026-08-17T00:00:00Z" }];
    const qiitaArticles: Article[] = [{ source: "Qiita", title: "Q1", link: "https://qiita.com/q1", contentSnippet: "s2", isoDate: "2026-08-16T00:00:00Z" }];
    const fetchers = [buildFetcher("Zenn", zennArticles), buildFetcher("Qiita", qiitaArticles)];
    const allArticles = [...zennArticles, ...qiitaArticles];
    const summarized = allArticles.map((article) => ({ ...article, summary }));
    const deps = buildDeps({
      summarize: vi.fn().mockResolvedValue(summarized),
      loadProcessedUrls: vi.fn().mockResolvedValue(["https://zenn.dev/old"]),
    });

    const result = await collectAndSummarize({ genAiClient, slackWebhookUrl, fetchers }, deps);

    expect(result).toEqual(summarized);
    expect(fetchers[0]?.fetch).toHaveBeenCalledTimes(1);
    expect(fetchers[1]?.fetch).toHaveBeenCalledTimes(1);
    expect(deps.summarize).toHaveBeenCalledWith(genAiClient, allArticles);
    expect(deps.publish).toHaveBeenCalledWith(slackWebhookUrl, result);
    expect(deps.saveProcessedUrls).toHaveBeenCalledWith(["https://zenn.dev/old", "https://zenn.dev/z1", "https://qiita.com/q1"]);
  });

  it("sorts merged articles newest-first and selects only the top maxArticles", async () => {
    const zennArticles: Article[] = [
      { source: "Zenn", title: "Old", link: "https://zenn.dev/old", isoDate: "2026-08-10T00:00:00Z" },
      { source: "Zenn", title: "Newest", link: "https://zenn.dev/newest", isoDate: "2026-08-19T00:00:00Z" },
    ];
    const qiitaArticles: Article[] = [{ source: "Qiita", title: "Middle", link: "https://qiita.com/middle", isoDate: "2026-08-15T00:00:00Z" }];
    const fetchers = [buildFetcher("Zenn", zennArticles), buildFetcher("Qiita", qiitaArticles)];
    const deps = buildDeps();

    await collectAndSummarize({ genAiClient, slackWebhookUrl, fetchers, maxArticles: 2 }, deps);

    expect(deps.summarize).toHaveBeenCalledWith(genAiClient, [zennArticles[1], qiitaArticles[0]]);
  });

  it("prioritizes articles matching a priority keyword over newer non-matching articles", async () => {
    const zennArticles: Article[] = [
      { source: "Zenn", title: "RAGを使った実装", link: "https://zenn.dev/rag", isoDate: "2026-08-10T00:00:00Z" },
      { source: "Zenn", title: "最新フレームワーク入門", link: "https://zenn.dev/newest", isoDate: "2026-08-19T00:00:00Z" },
    ];
    const qiitaArticles: Article[] = [{ source: "Qiita", title: "Claudeで自動化", link: "https://qiita.com/claude", isoDate: "2026-08-15T00:00:00Z" }];
    const fetchers = [buildFetcher("Zenn", zennArticles), buildFetcher("Qiita", qiitaArticles)];
    const deps = buildDeps();

    await collectAndSummarize({ genAiClient, slackWebhookUrl, fetchers, maxArticles: 2, priorityKeywords: ["RAG", "Claude"] }, deps);

    expect(deps.summarize).toHaveBeenCalledWith(genAiClient, [qiitaArticles[0], zennArticles[0]]);
  });

  it("matches priority keywords case-insensitively against title and contentSnippet", async () => {
    const articles: Article[] = [
      { source: "Zenn", title: "新機能リリース", link: "https://zenn.dev/a1", contentSnippet: "ragを活用した検索", isoDate: "2026-08-19T00:00:00Z" },
      { source: "Zenn", title: "通常の記事", link: "https://zenn.dev/a2", isoDate: "2026-08-18T00:00:00Z" },
    ];
    const fetchers = [buildFetcher("Zenn", articles)];
    const deps = buildDeps();

    await collectAndSummarize({ genAiClient, slackWebhookUrl, fetchers, priorityKeywords: ["RAG"] }, deps);

    expect(deps.summarize).toHaveBeenCalledWith(genAiClient, [articles[0], articles[1]]);
  });

  it("skips already-processed articles", async () => {
    const articles: Article[] = [
      { source: "Zenn", title: "A1", link: "https://zenn.dev/a1" },
      { source: "Zenn", title: "A2", link: "https://zenn.dev/a2" },
    ];
    const summarized = [{ ...articles[1], summary }];
    const fetchers = [buildFetcher("Zenn", articles)];
    const deps = buildDeps({
      summarize: vi.fn().mockResolvedValue(summarized),
      loadProcessedUrls: vi.fn().mockResolvedValue(["https://zenn.dev/a1"]),
    });

    const result = await collectAndSummarize({ genAiClient, slackWebhookUrl, fetchers }, deps);

    expect(result).toEqual(summarized);
    expect(deps.summarize).toHaveBeenCalledWith(genAiClient, [articles[1]]);
    expect(deps.publish).toHaveBeenCalledWith(slackWebhookUrl, result);
    expect(deps.saveProcessedUrls).toHaveBeenCalledWith(["https://zenn.dev/a1", "https://zenn.dev/a2"]);
  });

  it("skips summarize, publish, and save when every article is already processed", async () => {
    const articles: Article[] = [{ source: "Zenn", title: "A1", link: "https://zenn.dev/a1" }];
    const fetchers = [buildFetcher("Zenn", articles)];
    const deps = buildDeps({ loadProcessedUrls: vi.fn().mockResolvedValue(["https://zenn.dev/a1"]) });

    const result = await collectAndSummarize({ genAiClient, slackWebhookUrl, fetchers }, deps);

    expect(result).toEqual([]);
    expect(deps.summarize).not.toHaveBeenCalled();
    expect(deps.publish).not.toHaveBeenCalled();
    expect(deps.saveProcessedUrls).not.toHaveBeenCalled();
  });

  it("propagates errors from the publish step without recording the articles as processed", async () => {
    const articles: Article[] = [{ source: "Zenn", title: "A1", link: "https://zenn.dev/a1" }];
    const fetchers = [buildFetcher("Zenn", articles)];
    const deps = buildDeps({
      summarize: vi.fn().mockResolvedValue([{ ...articles[0], summary }]),
      publish: vi.fn().mockRejectedValue(new Error("slack down")),
    });

    await expect(collectAndSummarize({ genAiClient, slackWebhookUrl, fetchers }, deps)).rejects.toThrow("slack down");
    expect(deps.saveProcessedUrls).not.toHaveBeenCalled();
  });

  it("propagates errors when one of the source fetchers fails", async () => {
    const fetchers = [buildFetcher("Zenn", []), { source: "Qiita", fetch: vi.fn().mockRejectedValue(new Error("feed down")) }];
    const deps = buildDeps();

    await expect(collectAndSummarize({ genAiClient, slackWebhookUrl, fetchers }, deps)).rejects.toThrow("feed down");
  });
});
