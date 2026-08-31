import { describe, expect, it } from "vitest";
import { DEFAULT_PRIORITY_KEYWORDS, parsePriorityKeywords } from "../../src/config/priorityKeywords";

describe("parsePriorityKeywords", () => {
  it("returns the default keywords when the environment variable is undefined", () => {
    expect(parsePriorityKeywords(undefined)).toEqual(DEFAULT_PRIORITY_KEYWORDS);
  });

  it("returns the default keywords when the environment variable is an empty string", () => {
    expect(parsePriorityKeywords("")).toEqual(DEFAULT_PRIORITY_KEYWORDS);
  });

  it("parses a comma-separated list of keywords", () => {
    expect(parsePriorityKeywords("RAG,Claude,LLM")).toEqual(["RAG", "Claude", "LLM"]);
  });

  it("trims whitespace around each keyword", () => {
    expect(parsePriorityKeywords(" RAG , Claude ,LLM ")).toEqual(["RAG", "Claude", "LLM"]);
  });

  it("filters out empty entries from consecutive commas", () => {
    expect(parsePriorityKeywords("RAG,,Claude,")).toEqual(["RAG", "Claude"]);
  });

  it("returns the default keywords when the environment variable contains only commas", () => {
    expect(parsePriorityKeywords(",, ,")).toEqual(DEFAULT_PRIORITY_KEYWORDS);
  });
});
