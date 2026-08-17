import { Type, ApiError, type Schema } from "@google/genai";
import { Article, ArticleSummary, articleSummarySchema } from "../../domain/article";

const MODEL_NAME = "gemini-3.5-flash";
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    target: { type: Type.STRING },
  },
  required: ["summary", "tags", "target"],
};

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

const buildPrompt = (article: Article): string =>
  [
    "以下の技術記事のタイトルと概要から、要約情報をJSON形式で出力してください。",
    `タイトル: ${article.title}`,
    `概要: ${article.contentSnippet ?? ""}`,
    "出力項目:",
    "- summary: 3行程度の日本語要約",
    "- tags: 関連する技術タグの配列",
    "- target: どんなエンジニア向けかを1文で",
  ].join("\n");

export const summarizeArticle = async (genAiClient: GenerateContentClient, article: Article): Promise<ArticleSummary> => {
  try {
    const response = await generateContentWithRetry(genAiClient, {
      model: MODEL_NAME,
      contents: buildPrompt(article),
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });
    if (!response.text) {
      throw new Error("empty response text");
    }
    const parsed = articleSummarySchema.safeParse(JSON.parse(response.text));
    if (!parsed.success) {
      throw new Error(`response failed schema validation: ${parsed.error.message}`);
    }
    return parsed.data;
  } catch (error) {
    throw new Error(`Failed to summarize article (${article.link}): ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
};
