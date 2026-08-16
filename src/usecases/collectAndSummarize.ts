import { fetchLatestArticles } from '../infrastructure/fetchers/rssFetcher';
import { summarizeArticle, GenerateContentClient } from '../infrastructure/ai/geminiSummarizer';
import { publishToSlack } from '../infrastructure/publishers/slackPublisher';
import { SummarizedArticle } from '../domain/article';

export interface CollectAndSummarizeDeps {
  fetchArticles: typeof fetchLatestArticles;
  summarize: typeof summarizeArticle;
  publish: typeof publishToSlack;
}

export interface CollectAndSummarizeParams {
  ai: GenerateContentClient;
  slackWebhookUrl: string;
}

const defaultDeps: CollectAndSummarizeDeps = {
  fetchArticles: fetchLatestArticles,
  summarize: summarizeArticle,
  publish: publishToSlack,
};

export const collectAndSummarize = async (
  params: CollectAndSummarizeParams,
  deps: CollectAndSummarizeDeps = defaultDeps,
): Promise<SummarizedArticle[]> => {
  const articles = await deps.fetchArticles();
  const summarized: SummarizedArticle[] = await Promise.all(
    articles.map(async (article) => ({
      ...article,
      summary: await deps.summarize(params.ai, article),
    })),
  );
  await deps.publish(params.slackWebhookUrl, summarized);
  return summarized;
};
