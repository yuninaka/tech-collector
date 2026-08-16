import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { collectAndSummarize } from './usecases/collectAndSummarize';

const main = async (): Promise<void> => {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }
  if (!slackWebhookUrl) {
    throw new Error('SLACK_WEBHOOK_URL is not set in environment variables');
  }

  const ai = new GoogleGenAI({ apiKey: geminiApiKey });
  const summarized = await collectAndSummarize({ ai, slackWebhookUrl });

  console.log(`Published ${summarized.length} articles to Slack.`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
