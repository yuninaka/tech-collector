import { afterEach, describe, expect, it, vi } from "vitest";
import { publishToSlack } from "../../src/infrastructure/publishers/slackPublisher";
import { SummarizedArticle } from "../../src/domain/article";

const webhookUrl = "https://hooks.slack.test/services/xxx";

const articles: SummarizedArticle[] = [
  {
    title: "Article One",
    link: "https://zenn.dev/articles/one",
    contentSnippet: "snippet",
    summary: { summary: "要約1", tags: ["TypeScript", "Vitest"], target: "初級者向け" },
  },
];

interface SlackFetchInit {
  method: string;
  headers: Record<string, string>;
  body: string;
  signal: AbortSignal;
}

const expectedBlocks = [
  { type: "header", text: { type: "plain_text", text: "📰 今日の技術記事まとめ", emoji: true } },
  { type: "divider" },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: ["*<https://zenn.dev/articles/one|Article One>*", "要約1", "*対象:* 初級者向け", "*タグ:* `TypeScript` `Vitest`"].join("\n"),
    },
  },
];

describe("publishToSlack", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a correctly structured Block Kit payload to the webhook URL", async () => {
    const fetchMock = vi.fn<(url: string, init: SlackFetchInit) => Promise<{ ok: boolean }>>().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await publishToSlack(webhookUrl, articles);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    if (!call) {
      throw new Error("fetch was not called");
    }
    const [calledUrl, init] = call;
    expect(calledUrl).toBe(webhookUrl);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({ blocks: expectedBlocks });
  });

  it("resolves without throwing when the webhook responds successfully", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    await expect(publishToSlack(webhookUrl, articles)).resolves.toBeUndefined();
  });

  it("throws a contextual error when the webhook responds with a non-ok status", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue("internal error"),
    });
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = publishToSlack(webhookUrl, articles);

    await expect(resultPromise).rejects.toThrow(/500/);
    await expect(resultPromise).rejects.toThrow(webhookUrl);
  });

  it("throws a contextual error when the request fails at the network level", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const resultPromise = publishToSlack(webhookUrl, articles);

    await expect(resultPromise).rejects.toThrow(webhookUrl);
    await expect(resultPromise).rejects.toThrow("network down");
  });

  it("throws a contextual error when the request times out", async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn().mockImplementation(
        (_url: string, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener("abort", () => {
              reject(new DOMException("The operation was aborted.", "AbortError"));
            });
          }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const resultPromise = publishToSlack(webhookUrl, articles);
      const assertion = expect(resultPromise).rejects.toThrow(webhookUrl);
      await vi.advanceTimersByTimeAsync(10000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});
