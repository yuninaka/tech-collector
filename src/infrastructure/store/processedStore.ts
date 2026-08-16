import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const DEFAULT_STORE_PATH = join(process.cwd(), "data", "processed.json");

const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");

const isFileNotFoundError = (error: unknown): boolean => error instanceof Error && "code" in error && error.code === "ENOENT";

export const loadProcessedUrls = async (filePath: string = DEFAULT_STORE_PATH): Promise<string[]> => {
  try {
    const raw = await readFile(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return isStringArray(parsed) ? parsed : [];
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return [];
    }
    throw new Error(`Failed to load processed store (${filePath}): ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
};

export const saveProcessedUrls = async (urls: string[], filePath: string = DEFAULT_STORE_PATH): Promise<void> => {
  try {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(urls, null, 2)}\n`, "utf-8");
  } catch (error) {
    throw new Error(`Failed to save processed store (${filePath}): ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
};
