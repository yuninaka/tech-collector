import { describe, expect, it, vi } from "vitest";

const parseURLMock = vi.fn();

vi.mock("rss-parser", () => ({
  default: vi.fn().mockImplementation(function ParserMock() {
    return { parseURL: parseURLMock };
  }),
}));

const { fetchLatestArticles } = await import("../../src/infrastructure/fetchers/rssFetcher");

describe("fetchLatestArticles", () => {
  it("returns at most 5 articles mapped from feed items", async () => {
    parseURLMock.mockResolvedValue({
      items: Array.from({ length: 7 }, (_, i) => ({
        title: `Article ${String(i)}`,
        link: `https://zenn.dev/articles/${String(i)}`,
        contentSnippet: `snippet ${String(i)}`,
        isoDate: "2026-08-17T00:00:00Z",
      })),
    });

    const articles = await fetchLatestArticles("https://zenn.dev/feed");

    expect(articles).toHaveLength(5);
    expect(articles[0]).toEqual({
      title: "Article 0",
      link: "https://zenn.dev/articles/0",
      contentSnippet: "snippet 0",
      isoDate: "2026-08-17T00:00:00Z",
    });
    expect(parseURLMock).toHaveBeenCalledWith("https://zenn.dev/feed");
  });

  it("falls back to empty strings when a feed item has no title or link", async () => {
    parseURLMock.mockResolvedValue({
      items: [{ title: undefined, link: undefined, contentSnippet: "snippet", isoDate: "2026-08-17T00:00:00Z" }],
    });

    const articles = await fetchLatestArticles("https://zenn.dev/feed");

    expect(articles).toEqual([{ title: "", link: "", contentSnippet: "snippet", isoDate: "2026-08-17T00:00:00Z" }]);
  });

  it("throws a contextual error when parsing fails", async () => {
    parseURLMock.mockRejectedValue(new Error("network down"));

    await expect(fetchLatestArticles("https://zenn.dev/feed")).rejects.toThrow(/https:\/\/zenn\.dev\/feed/);
  });

  it("throws a contextual error when parsing fails with a non-Error value", async () => {
    parseURLMock.mockRejectedValue("network down");

    await expect(fetchLatestArticles("https://zenn.dev/feed")).rejects.toThrow(/network down/);
  });
});
