import fs from 'fs';
import pth from 'path';
import globby, { GlobbyOptions } from 'globby';
import rimraf from 'rimraf';

/**
 * Get files by glob patterns
 * @param patterns the glob patterns
 * @param options the globby options
 */
export async function getFiles(
  patterns: string[],
  options?: GlobbyOptions,
): Promise<string[]> {
  // Try multiple times for ensuring corrected result
  return Promise.all(
    Array(3)
      .fill(0)
      .map(() => globby(patterns, options)),
  ).then(agg => [
    ...new Set(
      agg.reduce<string[]>((result, cur) => {
        result.push(...cur);
        return result;
      }, []),
    ),
  ]);
}

/**
 * Detect a file is exists or not.
 * @param path the path to the file
 */
export async function fileExists(path: string): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) =>
    fs.promises
      .stat(path)
      .then(stat => resolve(stat.isFile()))
      .catch(() => resolve(false)),
  );
}

/**
 * Detect a directory exists or not.
 * @param path the path to the directory
 */
export async function directoryExists(path: string): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) =>
    fs.promises
      .stat(path)
      .then(stat => resolve(stat.isDirectory()))
      .catch(() => resolve(false)),
  );
}

/**
 * Create a directory.
 * @param path the path to the directory
 */
export async function createDirectory(path: string): Promise<void> {
  return fs.promises.mkdir(path, { recursive: true });
}

/**
 * Delete a file or a directory.
 * @param path the path to the file or the directory
 */
export async function deleteFileOrDirectory(path: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    rimraf(path, fs, error => resolve());
  });
}

/**
 * Save text to a file.
 * @param path the path to the file
 * @param content the content to save
 */
export async function save(path: string, content: string): Promise<void> {
  const dir = pth.dirname(path);
  if (!(await directoryExists(dir))) {
    await createDirectory(dir);
  }
  return fs.promises.writeFile(path, content);
}

/**
 * Read a text file.
 * @param path the path to the file
 */
export async function read(path: string): Promise<string> {
  return fs.promises.readFile(path, 'utf-8');
}

/**
 * Load a json file.
 * @param path the path to the file
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function load<T = any>(path: string): Promise<T> {
  const content = await fs.promises.readFile(path, 'utf-8');
  return JSON.parse(content);
}