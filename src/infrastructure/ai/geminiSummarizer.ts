import { Type, type Schema } from "@google/genai";
import { Article, ArticleSummary, articleSummarySchema } from "../../domain/article";

const MODEL_NAME = "gemini-3.5-flash";

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
    const response = await genAiClient.models.generateContent({
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
