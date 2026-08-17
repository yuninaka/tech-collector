import { Type, ApiError, type Schema } from "@google/genai";
import { z } from "zod";
import { Article, SummarizedArticle, articleSummarySchema } from "../../domain/article";

const MODEL_NAME = "gemini-3.5-flash";
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    summaries: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          link: { type: Type.STRING },
          summary: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          target: { type: Type.STRING },
        },
        required: ["link", "summary", "tags", "target"],
      },
    },
  },
  required: ["summaries"],
};

const batchResponseSchema = z.object({
  summaries: z.array(articleSummarySchema.extend({ link: z.string() })),
});

export interface GenerateContentClient {
  models: {
    generateContent: (params: { model: string; contents: string; config: { responseMimeType: string; responseSchema: Schema } }) => Promise<{ text?: string }>;
  };
}

type GenerateContentRequest = Parameters<GenerateContentClient["models"]["generateContent"]>[0];
type GenerateContentResult = Awaited<ReturnType<GenerateContentClient["models"]["generateContent"]>>;

const isRetryableError = (error: unknown): boolean => error instanceof ApiError && RETRYABLE_STATUS_CODES.has(error.status);

const wait = (delayMs: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, delayMs));

const generateContentWithRetry = async (genAiClient: GenerateContentClient, request: GenerateContentRequest, attempt = 0): Promise<GenerateContentResult> => {
  try {
    return await genAiClient.models.generateContent(request);
  } catch (error) {
    if (!isRetryableError(error) || attempt >= MAX_RETRY_ATTEMPTS) {
      throw error;
    }
    await wait(RETRY_BASE_DELAY_MS * 2 ** attempt);
    return generateContentWithRetry(genAiClient, request, attempt + 1);
  }
};

const buildPrompt = (articles: Article[]): string =>
  [
    "以下の複数の技術記事それぞれについて、要約情報をJSON形式で出力してください。",
    "各記事は link で識別してください。出力する summaries 配列の各要素には、対応する記事の link を",
    "そのまま含めてください。",
    "",
    ...articles.map((article, index) =>
      [`記事${String(index + 1)}:`, `  link: ${article.link}`, `  タイトル: ${article.title}`, `  概要: ${article.contentSnippet ?? ""}`].join("\n"),
    ),
    "",
    "出力項目 (summaries の各要素):",
    "- link: 対応する記事の link (入力の値をそのまま)",
    "- summary: 3行程度の日本語要約",
    "- tags: 関連する技術タグの配列",
    "- target: どんなエンジニア向けかを1文で",
  ].join("\n");

const matchSummariesToArticles = (articles: Article[], summaries: z.infer<typeof batchResponseSchema>["summaries"]): SummarizedArticle[] => {
  const summaryByLink = new Map(summaries.map((item) => [item.link, item]));
  const missingLinks = articles.filter((article) => !summaryByLink.has(article.link)).map((article) => article.link);
  if (missingLinks.length > 0) {
    throw new Error(`response is missing summaries for: ${missingLinks.join(", ")}`);
  }
  return articles.map((article) => {
    const matched = summaryByLink.get(article.link);
    if (!matched) {
      throw new Error(`response is missing summaries for: ${article.link}`);
    }
    const { summary, tags, target } = matched;
    return { ...article, summary: { summary, tags, target } };
  });
};

export const summarizeArticles = async (genAiClient: GenerateContentClient, articles: Article[]): Promise<SummarizedArticle[]> => {
  if (articles.length === 0) {
    return [];
  }
  try {
    const response = await generateContentWithRetry(genAiClient, {
      model: MODEL_NAME,
      contents: buildPrompt(articles),
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });
    if (!response.text) {
      throw new Error("empty response text");
    }
    const parsed = batchResponseSchema.safeParse(JSON.parse(response.text));
    if (!parsed.success) {
      throw new Error(`response failed schema validation: ${parsed.error.message}`);
    }
    return matchSummariesToArticles(articles, parsed.data.summaries);
  } catch (error) {
    throw new Error(`Failed to summarize batch of ${String(articles.length)} article(s): ${error instanceof Error ? error.message : String(error)}`, {
      cause: error,
    });
  }
};
