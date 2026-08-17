import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@google/genai";
import { summarizeArticle } from "../../src/infrastructure/ai/geminiSummarizer";
import { Article } from "../../src/domain/article";

const article: Article = {
  title: "Test Article",
  link: "https://zenn.dev/articles/test",
  contentSnippet: "This is a test snippet",
};

describe("summarizeArticle", () => {
  it("returns a parsed summary on a valid JSON response", async () => {
    const generateContentMock = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        summary: "テスト要約です。",
        tags: ["TypeScript", "Testing"],
        target: "初中級エンジニア向け",
      }),
    });
    const genAiClient = { models: { generateContent: generateContentMock } };

    const result = await summarizeArticle(genAiClient, article);

    expect(result).toEqual({
      summary: "テスト要約です。",
      tags: ["TypeScript", "Testing"],
      target: "初中級エンジニア向け",
    });
    expect(generateContentMock).toHaveBeenCalledWith(expect.objectContaining({ model: "gemini-3.5-flash" }));
  });

  it("throws a contextual error when the response fails schema validation", async () => {
    const generateContentMock = vi.fn().mockResolvedValue({
      text: JSON.stringify({ summary: "incomplete" }),
    });
    const genAiClient = { models: { generateContent: generateContentMock } };

    await expect(summarizeArticle(genAiClient, article)).rejects.toThrow(article.link);
  });

  it("throws a contextual error when the response text is empty", async () => {
    const generateContentMock = vi.fn().mockResolvedValue({ text: undefined });
    const genAiClient = { models: { generateContent: generateContentMock } };

    await expect(summarizeArticle(genAiClient, article)).rejects.toThrow(article.link);
  });

  it("retries a retryable error and succeeds once the API recovers", async () => {
    vi.useFakeTimers();
    try {
      const generateContentMock = vi
        .fn()
        .mockRejectedValueOnce(new ApiError({ message: "high demand", status: 503 }))
        .mockRejectedValueOnce(new ApiError({ message: "high demand", status: 503 }))
        .mockResolvedValueOnce({ text: JSON.stringify({ summary: "sum", tags: ["t"], target: "target" }) });
      const genAiClient = { models: { generateContent: generateContentMock } };

      const resultPromise = summarizeArticle(genAiClient, article);
      await vi.runAllTimersAsync();

      await expect(resultPromise).resolves.toEqual({ summary: "sum", tags: ["t"], target: "target" });
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

      const resultPromise = summarizeArticle(genAiClient, article);
      const assertion = expect(resultPromise).rejects.toThrow(article.link);
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

    await expect(summarizeArticle(genAiClient, article)).rejects.toThrow(article.link);
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });
});
