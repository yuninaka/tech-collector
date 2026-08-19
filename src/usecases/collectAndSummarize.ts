import { summarizeArticles, GenerateContentClient } from "../infrastructure/ai/geminiSummarizer";
import { publishToSlack } from "../infrastructure/publishers/slackPublisher";
import { loadProcessedUrls, saveProcessedUrls } from "../infrastructure/store/processedStore";
import { Article, ArticleFetcher, SummarizedArticle } from "../domain/article";

const DEFAULT_MAX_ARTICLES = 5;

export interface CollectAndSummarizeDeps {
  summarize: typeof summarizeArticles;
  publish: typeof publishToSlack;
  loadProcessedUrls: typeof loadProcessedUrls;
  saveProcessedUrls: typeof saveProcessedUrls;
}

export interface CollectAndSummarizeParams {
  genAiClient: GenerateContentClient;
  slackWebhookUrl: string;
  fetchers: ArticleFetcher[];
  maxArticles?: number;
}

const defaultDeps: CollectAndSummarizeDeps = {
  summarize: summarizeArticles,
  publish: publishToSlack,
  loadProcessedUrls,
  saveProcessedUrls,
};

const excludeProcessed = (articles: Article[], processedUrls: string[]): Article[] => {
  const processedUrlSet = new Set(processedUrls);
  return articles.filter((article) => !processedUrlSet.has(article.link));
};

const articleTimestamp = (article: Article): number => (article.isoDate ? Date.parse(article.isoDate) : 0);

const byNewestFirst = (articleX: Article, articleY: Article): number => articleTimestamp(articleY) - articleTimestamp(articleX);

export const collectAndSummarize = async (params: CollectAndSummarizeParams, deps: CollectAndSummarizeDeps = defaultDeps): Promise<SummarizedArticle[]> => {
  const maxArticles = params.maxArticles ?? DEFAULT_MAX_ARTICLES;
  const [articlesBySource, processedUrls] = await Promise.all([Promise.all(params.fetchers.map((fetcher) => fetcher.fetch())), deps.loadProcessedUrls()]);
  const allArticles = articlesBySource.flat();
  const unprocessedArticles = excludeProcessed(allArticles, processedUrls).sort(byNewestFirst).slice(0, maxArticles);

  if (unprocessedArticles.length === 0) {
    return [];
  }

  const summarized = await deps.summarize(params.genAiClient, unprocessedArticles);
  await deps.publish(params.slackWebhookUrl, summarized);
  await deps.saveProcessedUrls([...processedUrls, ...summarized.map((article) => article.link)]);
  return summarized;
};
