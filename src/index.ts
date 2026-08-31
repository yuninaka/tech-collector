import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { collectAndSummarize } from "./usecases/collectAndSummarize";
import { createRssFetcher } from "./infrastructure/fetchers/rssFetcher";
import { parseArticleSources } from "./config/articleSources";
import { parsePriorityKeywords } from "./config/priorityKeywords";

const main = async (): Promise<void> => {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  }
  if (!slackWebhookUrl) {
    throw new Error("SLACK_WEBHOOK_URL is not set in environment variables");
  }

  const genAiClient = new GoogleGenAI({ apiKey: geminiApiKey });
  const fetchers = parseArticleSources(process.env.ARTICLE_SOURCES).map((source) => createRssFetcher(source.source, source.feedUrl));
  const priorityKeywords = parsePriorityKeywords(process.env.PRIORITY_KEYWORDS);
  const summarized = await collectAndSummarize({ genAiClient, slackWebhookUrl, fetchers, priorityKeywords });

  console.log(`Published ${String(summarized.length)} articles to Slack.`);
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
