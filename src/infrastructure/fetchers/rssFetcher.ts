import Parser from 'rss-parser';
import { Article } from '../../domain/article';

const ZENN_FEED_URL = 'https://zenn.dev/feed';
const MAX_ARTICLES = 5;
const REQUEST_TIMEOUT_MS = 10000;

export const fetchLatestArticles = async (
  feedUrl: string = ZENN_FEED_URL,
): Promise<Article[]> => {
  const parser = new Parser({ timeout: REQUEST_TIMEOUT_MS });
  try {
    const feed = await parser.parseURL(feedUrl);
    return (feed.items ?? []).slice(0, MAX_ARTICLES).map((item) => ({
      title: item.title ?? '',
      link: item.link ?? '',
      contentSnippet: item.contentSnippet,
      isoDate: item.isoDate,
    }));
  } catch (error) {
    throw new Error(
      `Failed to fetch RSS feed (${feedUrl}): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};
