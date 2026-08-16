import { describe, expect, it, vi } from "vitest";
import { collectAndSummarize } from "../../src/usecases/collectAndSummarize";
import { Article, ArticleSummary } from "../../src/domain/article";

describe("collectAndSummarize", () => {
  it("fetches, summarizes, and publishes articles", async () => {
    const articles: Article[] = [
      { title: "A1", link: "https://zenn.dev/a1", contentSnippet: "s1" },
      { title: "A2", link: "https://zenn.dev/a2", contentSnippet: "s2" },
    ];
    const summary: ArticleSummary = { summary: "sum", tags: ["t"], target: "target" };

    const fetchArticles = vi.fn().mockResolvedValue(articles);
    const summarize = vi.fn().mockResolvedValue(summary);
    const publish = vi.fn().mockResolvedValue(undefined);
    const genAiClient = { models: { generateContent: vi.fn() } };

    const result = await collectAndSummarize({ genAiClient, slackWebhookUrl: "https://hooks.slack.test/xxx" }, { fetchArticles, summarize, publish });

    expect(result).toEqual([
      { ...articles[0], summary },
      { ...articles[1], summary },
    ]);
    expect(summarize).toHaveBeenCalledTimes(2);
    expect(publish).toHaveBeenCalledWith("https://hooks.slack.test/xxx", result);
  });

  it("propagates errors from the publish step without swallowing them", async () => {
    const articles: Article[] = [{ title: "A1", link: "https://zenn.dev/a1" }];
    const summary: ArticleSummary = { summary: "sum", tags: ["t"], target: "target" };

    const fetchArticles = vi.fn().mockResolvedValue(articles);
    const summarize = vi.fn().mockResolvedValue(summary);
    const publish = vi.fn().mockRejectedValue(new Error("slack down"));
    const genAiClient = { models: { generateContent: vi.fn() } };

    await expect(collectAndSummarize({ genAiClient, slackWebhookUrl: "https://hooks.slack.test/xxx" }, { fetchArticles, summarize, publish })).rejects.toThrow(
      "slack down",
    );
  });
});
