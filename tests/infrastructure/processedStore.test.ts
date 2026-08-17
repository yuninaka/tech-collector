import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadProcessedUrls, saveProcessedUrls } from "../../src/infrastructure/store/processedStore";

describe("processedStore", () => {
  const tempDirs: string[] = [];

  const createStorePath = async (): Promise<string> => {
    const dir = await mkdtemp(join(tmpdir(), "processed-store-"));
    tempDirs.push(dir);
    return join(dir, "nested", "processed.json");
  };

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("returns an empty array when the file does not exist", async () => {
    const storePath = await createStorePath();

    await expect(loadProcessedUrls(storePath)).resolves.toEqual([]);
  });

  it("returns an empty array when the file does not contain a string array", async () => {
    const storePath = await createStorePath();
    await saveProcessedUrls([], storePath);
    await writeFile(storePath, JSON.stringify({ not: "a string array" }), "utf-8");

    await expect(loadProcessedUrls(storePath)).resolves.toEqual([]);
  });

  it("round-trips saved URLs, creating missing parent directories", async () => {
    const storePath = await createStorePath();
    const urls = ["https://zenn.dev/a", "https://zenn.dev/b"];

    await saveProcessedUrls(urls, storePath);

    await expect(loadProcessedUrls(storePath)).resolves.toEqual(urls);
    const raw = await readFile(storePath, "utf-8");
    expect(JSON.parse(raw)).toEqual(urls);
  });
});
