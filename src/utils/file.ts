// src/utils/file.ts
import * as fs from "fs";
import { promisify } from "util";

export const writeFile = promisify(fs.writeFile);
export const mkdir = promisify(fs.mkdir);
export const readdir = promisify(fs.readdir);
export const stat = promisify(fs.stat);

/**
 * Ensure a directory exists, creating it if necessary
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}
