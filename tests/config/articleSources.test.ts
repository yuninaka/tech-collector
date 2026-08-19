import { describe, expect, it } from "vitest";
import { DEFAULT_ARTICLE_SOURCES, parseArticleSources } from "../../src/config/articleSources";

describe("parseArticleSources", () => {
  it("returns the default sources when the environment variable is undefined", () => {
    expect(parseArticleSources(undefined)).toEqual(DEFAULT_ARTICLE_SOURCES);
  });

  it("returns the default sources when the environment variable is an empty string", () => {
    expect(parseArticleSources("")).toEqual(DEFAULT_ARTICLE_SOURCES);
  });

  it("parses a valid JSON array of sources", () => {
    const custom = [{ source: "Hatena", feedUrl: "https://b.hatena.ne.jp/hotentry/it.rss" }];

    expect(parseArticleSources(JSON.stringify(custom))).toEqual(custom);
  });

  it("throws a contextual error when the value is not valid JSON", () => {
    expect(() => parseArticleSources("not valid json{")).toThrow("ARTICLE_SOURCES");
  });

  it("throws a contextual error when an entry is missing a required field", () => {
    const invalid = [{ source: "Hatena" }];

    expect(() => parseArticleSources(JSON.stringify(invalid))).toThrow("ARTICLE_SOURCES");
  });

  it("throws a contextual error when feedUrl is not a valid URL", () => {
    const invalid = [{ source: "Hatena", feedUrl: "not-a-url" }];

    expect(() => parseArticleSources(JSON.stringify(invalid))).toThrow("ARTICLE_SOURCES");
  });

  it("throws a contextual error when the array is empty", () => {
    expect(() => parseArticleSources("[]")).toThrow("ARTICLE_SOURCES");
  });
});
