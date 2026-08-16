import { describe, expect, it, vi } from "vitest";
import { collectAndSummarize } from "../../src/usecases/collectAndSummarize";
import { Article, ArticleSummary } from "../../src/domain/article";

const genAiClient = { models: { generateContent: vi.fn() } };
const summary: ArticleSummary = { summary: "sum", tags: ["t"], target: "target" };

describe("collectAndSummarize", () => {
  it("fetches, summarizes, publishes, and records unprocessed articles", async () => {
    const articles: Article[] = [
      { title: "A1", link: "https://zenn.dev/a1", contentSnippet: "s1" },
      { title: "A2", link: "https://zenn.dev/a2", contentSnippet: "s2" },
    ];

    const fetchArticles = vi.fn().mockResolvedValue(articles);
    const summarize = vi.fn().mockResolvedValue(summary);
    const publish = vi.fn().mockResolvedValue(undefined);
    const loadProcessedUrls = vi.fn().mockResolvedValue(["https://zenn.dev/old"]);
    const saveProcessedUrls = vi.fn().mockResolvedValue(undefined);

    const result = await collectAndSummarize(
      { genAiClient, slackWebhookUrl: "https://hooks.slack.test/xxx" },
      { fetchArticles, summarize, publish, loadProcessedUrls, saveProcessedUrls },
    );

    expect(result).toEqual([
      { ...articles[0], summary },
      { ...articles[1], summary },
    ]);
    expect(summarize).toHaveBeenCalledTimes(2);
    expect(publish).toHaveBeenCalledWith("https://hooks.slack.test/xxx", result);
    expect(saveProcessedUrls).toHaveBeenCalledWith(["https://zenn.dev/old", "https://zenn.dev/a1", "https://zenn.dev/a2"]);
  });

  it("skips already-processed articles", async () => {
    const articles: Article[] = [
      { title: "A1", link: "https://zenn.dev/a1" },
      { title: "A2", link: "https://zenn.dev/a2" },
    ];

    const fetchArticles = vi.fn().mockResolvedValue(articles);
    const summarize = vi.fn().mockResolvedValue(summary);
    const publish = vi.fn().mockResolvedValue(undefined);
    const loadProcessedUrls = vi.fn().mockResolvedValue(["https://zenn.dev/a1"]);
    const saveProcessedUrls = vi.fn().mockResolvedValue(undefined);

    const result = await collectAndSummarize(
      { genAiClient, slackWebhookUrl: "https://hooks.slack.test/xxx" },
      { fetchArticles, summarize, publish, loadProcessedUrls, saveProcessedUrls },
    );

    expect(result).toEqual([{ ...articles[1], summary }]);
    expect(summarize).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith("https://hooks.slack.test/xxx", result);
    expect(saveProcessedUrls).toHaveBeenCalledWith(["https://zenn.dev/a1", "https://zenn.dev/a2"]);
  });

  it("skips summarize, publish, and save when every article is already processed", async () => {
    const articles: Article[] = [{ title: "A1", link: "https://zenn.dev/a1" }];

    const fetchArticles = vi.fn().mockResolvedValue(articles);
    const summarize = vi.fn().mockResolvedValue(summary);
    const publish = vi.fn().mockResolvedValue(undefined);
    const loadProcessedUrls = vi.fn().mockResolvedValue(["https://zenn.dev/a1"]);
    const saveProcessedUrls = vi.fn().mockResolvedValue(undefined);

    const result = await collectAndSummarize(
      { genAiClient, slackWebhookUrl: "https://hooks.slack.test/xxx" },
      { fetchArticles, summarize, publish, loadProcessedUrls, saveProcessedUrls },
    );

    expect(result).toEqual([]);
    expect(summarize).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
    expect(saveProcessedUrls).not.toHaveBeenCalled();
  });

  it("propagates errors from the publish step without recording the articles as processed", async () => {
    const articles: Article[] = [{ title: "A1", link: "https://zenn.dev/a1" }];

    const fetchArticles = vi.fn().mockResolvedValue(articles);
    const summarize = vi.fn().mockResolvedValue(summary);
    const publish = vi.fn().mockRejectedValue(new Error("slack down"));
    const loadProcessedUrls = vi.fn().mockResolvedValue([]);
    const saveProcessedUrls = vi.fn().mockResolvedValue(undefined);

    await expect(
      collectAndSummarize(
        { genAiClient, slackWebhookUrl: "https://hooks.slack.test/xxx" },
        { fetchArticles, summarize, publish, loadProcessedUrls, saveProcessedUrls },
      ),
    ).rejects.toThrow("slack down");
    expect(saveProcessedUrls).not.toHaveBeenCalled();
  });
});
