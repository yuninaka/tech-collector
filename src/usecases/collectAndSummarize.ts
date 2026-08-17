import { fetchLatestArticles } from "../infrastructure/fetchers/rssFetcher";
import { summarizeArticles, GenerateContentClient } from "../infrastructure/ai/geminiSummarizer";
import { publishToSlack } from "../infrastructure/publishers/slackPublisher";
import { loadProcessedUrls, saveProcessedUrls } from "../infrastructure/store/processedStore";
import { Article, SummarizedArticle } from "../domain/article";

export interface CollectAndSummarizeDeps {
  fetchArticles: typeof fetchLatestArticles;
  summarize: typeof summarizeArticles;
  publish: typeof publishToSlack;
  loadProcessedUrls: typeof loadProcessedUrls;
  saveProcessedUrls: typeof saveProcessedUrls;
}

export interface CollectAndSummarizeParams {
  genAiClient: GenerateContentClient;
  slackWebhookUrl: string;
}

const defaultDeps: CollectAndSummarizeDeps = {
  fetchArticles: fetchLatestArticles,
  summarize: summarizeArticles,
  publish: publishToSlack,
  loadProcessedUrls,
  saveProcessedUrls,
};

const excludeProcessed = (articles: Article[], processedUrls: string[]): Article[] => {
  const processedUrlSet = new Set(processedUrls);
  return articles.filter((article) => !processedUrlSet.has(article.link));
};

export const collectAndSummarize = async (params: CollectAndSummarizeParams, deps: CollectAndSummarizeDeps = defaultDeps): Promise<SummarizedArticle[]> => {
  const [articles, processedUrls] = await Promise.all([deps.fetchArticles(), deps.loadProcessedUrls()]);
  const unprocessedArticles = excludeProcessed(articles, processedUrls);

  if (unprocessedArticles.length === 0) {
    return [];
  }

  const summarized = await deps.summarize(params.genAiClient, unprocessedArticles);
  await deps.publish(params.slackWebhookUrl, summarized);
  await deps.saveProcessedUrls([...processedUrls, ...summarized.map((article) => article.link)]);
  return summarized;
};
