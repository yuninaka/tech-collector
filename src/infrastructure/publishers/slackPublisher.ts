import { SummarizedArticle } from '../../domain/article';

type SlackBlock = Record<string, unknown>;

const REQUEST_TIMEOUT_MS = 10000;

const buildBlocks = (articles: SummarizedArticle[]): SlackBlock[] => {
  const header: SlackBlock = {
    type: 'header',
    text: { type: 'plain_text', text: '📰 今日の技術記事まとめ', emoji: true },
  };
  const articleBlocks: SlackBlock[] = articles.flatMap((article) => [
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: [
          `*<${article.link}|${article.title}>*`,
          article.summary.summary,
          `*対象:* ${article.summary.target}`,
          `*タグ:* ${article.summary.tags.map((tag) => `\`${tag}\``).join(' ')}`,
        ].join('\n'),
      },
    },
  ]);
  return [header, ...articleBlocks];
};

export const publishToSlack = async (
  webhookUrl: string,
  articles: SummarizedArticle[],
): Promise<void> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks: buildBlocks(articles) }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Slack webhook returned status ${response.status}: ${body}`);
    }
  } catch (error) {
    throw new Error(
      `Failed to publish to Slack (${webhookUrl}): ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    clearTimeout(timeoutId);
  }
};
