import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@google/genai";
import { summarizeArticles } from "../../src/infrastructure/ai/geminiSummarizer";
import { Article } from "../../src/domain/article";

const articles: Article[] = [
  { title: "Article One", link: "https://zenn.dev/articles/one", contentSnippet: "snippet one" },
  { title: "Article Two", link: "https://zenn.dev/articles/two", contentSnippet: "snippet two" },
];

describe("summarizeArticles", () => {
  it("returns an empty array without calling the API when there are no articles", async () => {
    const generateContentMock = vi.fn();
    const genAiClient = { models: { generateContent: generateContentMock } };

    await expect(summarizeArticles(genAiClient, [])).resolves.toEqual([]);
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it("matches each summary back to its article by link in a single request", async () => {
    const generateContentMock = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        summaries: [
          { link: "https://zenn.dev/articles/two", summary: "要約2", tags: ["Vue"], target: "初級者向け" },
          { link: "https://zenn.dev/articles/one", summary: "要約1", tags: ["TypeScript"], target: "中級者向け" },
        ],
      }),
    });
    const genAiClient = { models: { generateContent: generateContentMock } };

    const result = await summarizeArticles(genAiClient, articles);

    expect(result).toEqual([
      { ...articles[0], summary: { summary: "要約1", tags: ["TypeScript"], target: "中級者向け" } },
      { ...articles[1], summary: { summary: "要約2", tags: ["Vue"], target: "初級者向け" } },
    ]);
    expect(generateContentMock).toHaveBeenCalledTimes(1);
    expect(generateContentMock).toHaveBeenCalledWith(expect.objectContaining({ model: "gemini-3.5-flash" }));
  });

  it("throws a contextual error when a summary is missing for one of the articles", async () => {
    const generateContentMock = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        summaries: [{ link: "https://zenn.dev/articles/one", summary: "要約1", tags: [], target: "target" }],
      }),
    });
    const genAiClient = { models: { generateContent: generateContentMock } };

    await expect(summarizeArticles(genAiClient, articles)).rejects.toThrow("https://zenn.dev/articles/two");
  });

  it("throws a contextual error when the response fails schema validation", async () => {
    const generateContentMock = vi.fn().mockResolvedValue({
      text: JSON.stringify({ summaries: [{ link: "https://zenn.dev/articles/one" }] }),
    });
    const genAiClient = { models: { generateContent: generateContentMock } };

    await expect(summarizeArticles(genAiClient, articles)).rejects.toThrow(/2 article/);
  });

  it("throws a contextual error when the response text is empty", async () => {
    const generateContentMock = vi.fn().mockResolvedValue({ text: undefined });
    const genAiClient = { models: { generateContent: generateContentMock } };

    await expect(summarizeArticles(genAiClient, articles)).rejects.toThrow(/2 article/);
  });

  it("retries a retryable error and succeeds once the API recovers", async () => {
    vi.useFakeTimers();
    try {
      const generateContentMock = vi
        .fn()
        .mockRejectedValueOnce(new ApiError({ message: "high demand", status: 503 }))
        .mockRejectedValueOnce(new ApiError({ message: "high demand", status: 503 }))
        .mockResolvedValueOnce({
          text: JSON.stringify({
            summaries: [
              { link: "https://zenn.dev/articles/one", summary: "要約1", tags: [], target: "target" },
              { link: "https://zenn.dev/articles/two", summary: "要約2", tags: [], target: "target" },
            ],
          }),
        });
      const genAiClient = { models: { generateContent: generateContentMock } };

      const resultPromise = summarizeArticles(genAiClient, articles);
      await vi.runAllTimersAsync();

      await expect(resultPromise).resolves.toHaveLength(2);
      expect(generateContentMock).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("gives up after the max retry attempts and throws a contextual error", async () => {
    vi.useFakeTimers();
    try {
      const generateContentMock = vi.fn().mockRejectedValue(new ApiError({ message: "high demand", status: 503 }));
      const genAiClient = { models: { generateContent: generateContentMock } };

      const resultPromise = summarizeArticles(genAiClient, articles);
      const assertion = expect(resultPromise).rejects.toThrow(/2 article/);
      await vi.runAllTimersAsync();
      await assertion;

      expect(generateContentMock).toHaveBeenCalledTimes(4);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not retry a non-retryable error", async () => {
    const generateContentMock = vi.fn().mockRejectedValue(new ApiError({ message: "bad request", status: 400 }));
    const genAiClient = { models: { generateContent: generateContentMock } };

    await expect(summarizeArticles(genAiClient, articles)).rejects.toThrow(/2 article/);
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });
});
