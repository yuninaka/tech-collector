import { z } from "zod";

export interface ArticleSourceConfig {
  source: string;
  feedUrl: string;
}

const articleSourceConfigSchema = z.object({
  source: z.string(),
  feedUrl: z.url(),
});

const articleSourceConfigListSchema = z.array(articleSourceConfigSchema).min(1);

export const DEFAULT_ARTICLE_SOURCES: ArticleSourceConfig[] = [
  { source: "Zenn", feedUrl: "https://zenn.dev/feed" },
  { source: "Qiita", feedUrl: "https://qiita.com/popular-items/feed" },
  { source: "Hatena", feedUrl: "https://b.hatena.ne.jp/hotentry/it.rss" },
];

export const parseArticleSources = (rawEnvValue: string | undefined): ArticleSourceConfig[] => {
  if (!rawEnvValue) {
    return DEFAULT_ARTICLE_SOURCES;
  }
  try {
    const parsed = articleSourceConfigListSchema.safeParse(JSON.parse(rawEnvValue));
    if (!parsed.success) {
      throw new Error(parsed.error.message);
    }
    return parsed.data;
  } catch (error) {
    throw new Error(`Invalid ARTICLE_SOURCES environment variable: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
};
