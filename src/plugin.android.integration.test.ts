import { getTempVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

import { registerInsertAttachmentsEntryPointsSuite } from './insert-attachments-entry-points-shared.integration.test.ts';

describe('Smoke test', () => {
  it('should load plugin on Android', () => {
    const vault = getTempVault();
    expect(vault.path).toBeTruthy();
  });
});

registerInsertAttachmentsEntryPointsSuite('Android');
