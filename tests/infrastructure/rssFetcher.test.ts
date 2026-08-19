import { describe, expect, it, vi } from "vitest";

const parseURLMock = vi.fn();

vi.mock("rss-parser", () => ({
  default: vi.fn().mockImplementation(function ParserMock() {
    return { parseURL: parseURLMock };
  }),
}));

const { createRssFetcher } = await import("../../src/infrastructure/fetchers/rssFetcher");

describe("createRssFetcher", () => {
  it("exposes the given source name", () => {
    const fetcher = createRssFetcher("Zenn", "https://zenn.dev/feed");

    expect(fetcher.source).toBe("Zenn");
  });

  it("returns at most 5 articles mapped from feed items, tagged with the source", async () => {
    parseURLMock.mockResolvedValue({
      items: Array.from({ length: 7 }, (_, i) => ({
        title: `Article ${String(i)}`,
        link: `https://zenn.dev/articles/${String(i)}`,
        contentSnippet: `snippet ${String(i)}`,
        isoDate: "2026-08-17T00:00:00Z",
      })),
    });
    const fetcher = createRssFetcher("Zenn", "https://zenn.dev/feed");

    const articles = await fetcher.fetch();

    expect(articles).toHaveLength(5);
    expect(articles[0]).toEqual({
      source: "Zenn",
      title: "Article 0",
      link: "https://zenn.dev/articles/0",
      contentSnippet: "snippet 0",
      isoDate: "2026-08-17T00:00:00Z",
    });
    expect(parseURLMock).toHaveBeenCalledWith("https://zenn.dev/feed");
  });

  it("respects a custom maxArticles limit", async () => {
    parseURLMock.mockResolvedValue({
      items: Array.from({ length: 5 }, (_, i) => ({
        title: `Article ${String(i)}`,
        link: `https://qiita.com/articles/${String(i)}`,
      })),
    });
    const fetcher = createRssFetcher("Qiita", "https://qiita.com/popular-items/feed", 2);

    const articles = await fetcher.fetch();

    expect(articles).toHaveLength(2);
  });

  it("falls back to empty strings when a feed item has no title or link", async () => {
    parseURLMock.mockResolvedValue({
      items: [{ title: undefined, link: undefined, contentSnippet: "snippet", isoDate: "2026-08-17T00:00:00Z" }],
    });
    const fetcher = createRssFetcher("Zenn", "https://zenn.dev/feed");

    const articles = await fetcher.fetch();

    expect(articles).toEqual([{ source: "Zenn", title: "", link: "", contentSnippet: "snippet", isoDate: "2026-08-17T00:00:00Z" }]);
  });

  it("throws a contextual error when parsing fails", async () => {
    parseURLMock.mockRejectedValue(new Error("network down"));
    const fetcher = createRssFetcher("Zenn", "https://zenn.dev/feed");

    await expect(fetcher.fetch()).rejects.toThrow(/Zenn.*https:\/\/zenn\.dev\/feed/);
  });

  it("throws a contextual error when parsing fails with a non-Error value", async () => {
    parseURLMock.mockRejectedValue("network down");
    const fetcher = createRssFetcher("Zenn", "https://zenn.dev/feed");

    await expect(fetcher.fetch()).rejects.toThrow(/network down/);
  });
});
