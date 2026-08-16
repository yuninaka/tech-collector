import { z } from "zod";

export interface Article {
  title: string;
  link: string;
  contentSnippet?: string;
  isoDate?: string;
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
