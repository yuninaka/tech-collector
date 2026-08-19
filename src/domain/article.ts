import { z } from "zod";

export interface Article {
  source: string;
  title: string;
  link: string;
  contentSnippet?: string;
  isoDate?: string;
}

export interface ArticleFetcher {
  readonly source: string;
  fetch: () => Promise<Article[]>;
}

export const articleSummarySchema = z.object({
  summary: z.string(),
  tags: z.array(z.string()),
  target: z.string(),
});

export type ArticleSummary = z.infer<typeof articleSummarySchema>;

export interface SummarizedArticle extends Article {
  summary: ArticleSummary;
}
