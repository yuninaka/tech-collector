import { describe, expect, it, vi } from "vitest";
import { collectAndSummarize, CollectAndSummarizeDeps } from "../../src/usecases/collectAndSummarize";
import { Article, ArticleSummary } from "../../src/domain/article";

const genAiClient = { models: { generateContent: vi.fn() } };
const slackWebhookUrl = "https://hooks.slack.test/xxx";
const summary: ArticleSummary = { summary: "sum", tags: ["t"], target: "target" };

const buildDeps = (overrides: Partial<CollectAndSummarizeDeps> = {}): CollectAndSummarizeDeps => ({
  fetchArticles: vi.fn().mockResolvedValue([]),
  summarize: vi.fn().mockResolvedValue([]),
  publish: vi.fn().mockResolvedValue(undefined),
  loadProcessedUrls: vi.fn().mockResolvedValue([]),
  saveProcessedUrls: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe("collectAndSummarize", () => {
  it("fetches, summarizes in a single batch, publishes, and records unprocessed articles", async () => {
    const articles: Article[] = [
      { title: "A1", link: "https://zenn.dev/a1", contentSnippet: "s1" },
      { title: "A2", link: "https://zenn.dev/a2", contentSnippet: "s2" },
    ];
    const summarized = [
      { ...articles[0], summary },
      { ...articles[1], summary },
    ];
    const deps = buildDeps({
      fetchArticles: vi.fn().mockResolvedValue(articles),
      summarize: vi.fn().mockResolvedValue(summarized),
      loadProcessedUrls: vi.fn().mockResolvedValue(["https://zenn.dev/old"]),
    });

    const result = await collectAndSummarize({ genAiClient, slackWebhookUrl }, deps);

    expect(result).toEqual(summarized);
    expect(deps.summarize).toHaveBeenCalledTimes(1);
    expect(deps.summarize).toHaveBeenCalledWith(genAiClient, articles);
    expect(deps.publish).toHaveBeenCalledWith(slackWebhookUrl, result);
    expect(deps.saveProcessedUrls).toHaveBeenCalledWith(["https://zenn.dev/old", "https://zenn.dev/a1", "https://zenn.dev/a2"]);
  });

  it("skips already-processed articles", async () => {
    const articles: Article[] = [
      { title: "A1", link: "https://zenn.dev/a1" },
      { title: "A2", link: "https://zenn.dev/a2" },
    ];
    const summarized = [{ ...articles[1], summary }];
    const deps = buildDeps({
      fetchArticles: vi.fn().mockResolvedValue(articles),
      summarize: vi.fn().mockResolvedValue(summarized),
      loadProcessedUrls: vi.fn().mockResolvedValue(["https://zenn.dev/a1"]),
    });

    const result = await collectAndSummarize({ genAiClient, slackWebhookUrl }, deps);

    expect(result).toEqual(summarized);
    expect(deps.summarize).toHaveBeenCalledWith(genAiClient, [articles[1]]);
    expect(deps.publish).toHaveBeenCalledWith(slackWebhookUrl, result);
    expect(deps.saveProcessedUrls).toHaveBeenCalledWith(["https://zenn.dev/a1", "https://zenn.dev/a2"]);
  });

  it("skips summarize, publish, and save when every article is already processed", async () => {
    const articles: Article[] = [{ title: "A1", link: "https://zenn.dev/a1" }];
    const deps = buildDeps({
      fetchArticles: vi.fn().mockResolvedValue(articles),
      loadProcessedUrls: vi.fn().mockResolvedValue(["https://zenn.dev/a1"]),
    });

    const result = await collectAndSummarize({ genAiClient, slackWebhookUrl }, deps);

    expect(result).toEqual([]);
    expect(deps.summarize).not.toHaveBeenCalled();
    expect(deps.publish).not.toHaveBeenCalled();
    expect(deps.saveProcessedUrls).not.toHaveBeenCalled();
  });

  it("propagates errors from the publish step without recording the articles as processed", async () => {
    const articles: Article[] = [{ title: "A1", link: "https://zenn.dev/a1" }];
    const deps = buildDeps({
      fetchArticles: vi.fn().mockResolvedValue(articles),
      summarize: vi.fn().mockResolvedValue([{ ...articles[0], summary }]),
      publish: vi.fn().mockRejectedValue(new Error("slack down")),
    });

    await expect(collectAndSummarize({ genAiClient, slackWebhookUrl }, deps)).rejects.toThrow("slack down");
    expect(deps.saveProcessedUrls).not.toHaveBeenCalled();
  });
});
