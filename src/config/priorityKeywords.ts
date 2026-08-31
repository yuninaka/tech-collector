export const DEFAULT_PRIORITY_KEYWORDS: string[] = ["AI駆動開発", "RAG", "Claude", "LLM", "生成AI", "Agent", "AIエージェント"];

export const parsePriorityKeywords = (rawEnvValue: string | undefined): string[] => {
  if (!rawEnvValue) {
    return DEFAULT_PRIORITY_KEYWORDS;
  }
  const keywords = rawEnvValue
    .split(",")
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);
  return keywords.length > 0 ? keywords : DEFAULT_PRIORITY_KEYWORDS;
};
