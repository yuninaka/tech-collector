import { describe, expect, it, vi } from "vitest";
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
    expect(generateContentMock).toHaveBeenCalledWith(expect.objectContaining({ model: "gemini-2.5-flash" }));
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
});
