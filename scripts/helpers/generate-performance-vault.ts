import type { PopulateFilesParams } from 'obsidian-integration-testing';

/**
 * @file
 *
 * Builds the file map for the `integration-tests:desktop-performance` vault: empty filler notes that give the vault a
 * large real vault's breadth, so a step of the insert path that grows with the vault shows up in the timings.
 */

const DEFAULT_FILLER_FILE_COUNT = 20_000;
const FILLER_FILES_PER_FOLDER = 500;

/**
 * How many empty filler notes are generated, in folders of {@link FILLER_FILES_PER_FOLDER} under `filler/`. They link
 * nothing and nothing links them. Overridable via the `IMA_PERF_FILLER_FILE_COUNT` environment variable; `0` is
 * honoured, for a quick run on an empty vault.
 */
export const PERFORMANCE_VAULT_FILLER_FILE_COUNT = parseFillerFileCount(process.env['IMA_PERF_FILLER_FILE_COUNT']);

/**
 * Builds the file map for the performance vault, written to disk before Obsidian opens it, so its startup scan
 * indexes everything in one pass.
 *
 * @returns A map of vault-relative paths to content.
 */
export function generatePerformanceVault(): PopulateFilesParams {
  const files: PopulateFilesParams = {};
  for (let index = 0; index < PERFORMANCE_VAULT_FILLER_FILE_COUNT; index++) {
    files[`filler/${String(Math.floor(index / FILLER_FILES_PER_FOLDER))}/filler-${String(index)}.md`] = '';
  }
  return files;
}

function parseFillerFileCount(value: string | undefined): number {
  if (value === undefined || value === '') {
    return DEFAULT_FILLER_FILE_COUNT;
  }
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : DEFAULT_FILLER_FILE_COUNT;
}
