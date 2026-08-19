import Parser from "rss-parser";
import { Article, ArticleFetcher } from "../../domain/article";

const MAX_ARTICLES = 5;
const REQUEST_TIMEOUT_MS = 10000;

export const createRssFetcher = (source: string, feedUrl: string, maxArticles: number = MAX_ARTICLES): ArticleFetcher => ({
  source,
  fetch: async (): Promise<Article[]> => {
    const parser = new Parser({ timeout: REQUEST_TIMEOUT_MS });
    try {
      const feed = await parser.parseURL(feedUrl);
      return feed.items.slice(0, maxArticles).map((item) => ({
        source,
        title: item.title ?? "",
        link: item.link ?? "",
        contentSnippet: item.contentSnippet,
        isoDate: item.isoDate,
      }));
    } catch (error) {
      throw new Error(`Failed to fetch RSS feed (${source}: ${feedUrl}): ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }
  },
});
