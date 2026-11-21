import { createSetup } from 'obsidian-integration-testing/vitest-global-setup-plugin';

import { generatePerformanceVault } from './helpers/generate-performance-vault.ts';

/**
 * Vitest global setup for the `integration-tests:desktop-performance` project: it fills the vault with empty notes
 * before Obsidian opens it, so the insert path is timed on a vault the size of a real one.
 */
export const { setup, teardown } = createSetup({
  populate: generatePerformanceVault
});
