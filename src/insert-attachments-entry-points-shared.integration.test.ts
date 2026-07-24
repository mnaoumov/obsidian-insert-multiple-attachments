/**
 * @file
 *
 * Shared integration suite exercising the two GUI entry points added for issue #8 — the ribbon icon
 * and the editor right-click menu item — against a live Obsidian instance.
 *
 * The OS-native file picker cannot be automated, but the flow underneath it can: the plugin opens a
 * hidden `<input type="file">` and only ever reads `input.files` on the `change` event. So each
 * scenario opens a note, triggers the entry point, suppresses the native picker by shadowing
 * `HTMLInputElement.prototype.click`, populates the input via a `DataTransfer`, dispatches `change`,
 * and asserts the two attachments were saved and embedded into the note joined by the default
 * delimiter.
 *
 * Registered by the platform entry points (`plugin.desktop.integration.test.ts`,
 * `plugin.android.integration.test.ts`) so the exact same flow runs on both Desktop and Android. The
 * `*.integration.test.ts` name matches the unit project's exclude glob (so it is not collected as a
 * unit test or coverage-instrumented) yet no `*.desktop`/`*.android`/`*.no-app` project glob — it runs
 * only when imported by a platform entry point.
 */

import type { MenuItem } from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTempVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

const RIBBON_TITLE = 'Insert Multiple Attachments';
const MENU_ITEM_TITLE = 'Insert multiple attachments';
const WAIT_TIMEOUT_IN_MILLISECONDS = 20_000;
const TEST_TIMEOUT_IN_MILLISECONDS = 60_000;

interface ScenarioResult {
  readonly attachmentAExists: boolean;
  readonly attachmentBExists: boolean;
  readonly content: string;
  readonly fileNameA: string;
  readonly fileNameB: string;
  readonly itemFound: boolean;
  readonly triggered: boolean;
}

/**
 * Registers the ribbon-icon and editor-context-menu insertion integration tests for the given platform.
 *
 * @param platform - Human-readable platform label used in the test name (e.g. `'Desktop'`).
 */
export function registerInsertAttachmentsEntryPointsSuite(platform: string): void {
  describe(`Insert multiple attachments entry points (${platform})`, () => {
    it('inserts the picked attachments when the ribbon icon is clicked', async () => {
      const result = await runInsertScenario('ribbon');

      expect(result.triggered).toBe(true);
      assertAttachmentsInserted(result);
    }, TEST_TIMEOUT_IN_MILLISECONDS);

    it('inserts the picked attachments when the editor context-menu item is invoked', async () => {
      const result = await runInsertScenario('contextMenu');

      expect(result.triggered).toBe(true);
      expect(result.itemFound).toBe(true);
      assertAttachmentsInserted(result);
    }, TEST_TIMEOUT_IN_MILLISECONDS);
  });
}

function assertAttachmentsInserted(result: ScenarioResult): void {
  expect(result.attachmentAExists).toBe(true);
  expect(result.attachmentBExists).toBe(true);

  // Default settings: no prefix/suffix, a blank-line delimiter, so the note holds exactly two embeds.
  const parts = result.content.split('\n\n');
  expect(parts).toHaveLength(2);
  expect(parts[0]).toContain(result.fileNameA);
  expect(parts[1]).toContain(result.fileNameB);
}

async function runInsertScenario(scenarioMode: 'contextMenu' | 'ribbon'): Promise<ScenarioResult> {
  return evalInObsidian({
    args: {
      menuItemTitle: MENU_ITEM_TITLE,
      mode: scenarioMode,
      ribbonTitle: RIBBON_TITLE,
      timeoutInMilliseconds: WAIT_TIMEOUT_IN_MILLISECONDS
    },
    async fn({
      app,
      lib: { waitUntil },
      menuItemTitle,
      mode,
      obsidianModule,
      ribbonTitle,
      timeoutInMilliseconds
    }): Promise<ScenarioResult> {
      const stamp = `${Date.now().toString()}-${Math.floor(performance.now()).toString()}`;
      const notePath = `ima-${mode}-${stamp}.md`;
      const fileNameA = `ima-a-${stamp}.png`;
      const fileNameB = `ima-b-${stamp}.png`;

      const existingNote = app.vault.getAbstractFileByPath(notePath);
      if (existingNote) {
        await app.fileManager.trashFile(existingNote);
      }

      const note = await app.vault.create(notePath, '');
      const leaf = app.workspace.getLeaf(true);
      await leaf.openFile(note);

      await waitUntil({
        message: 'note did not become the active editor',
        predicate: () => {
          const view = app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
          return view?.file?.path === notePath && Boolean(view.editor);
        },
        timeoutInMilliseconds
      });

      const view = app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
      const editor = view?.editor;

      let triggered = false;
      let itemFound = false;
      let content = '';

      // The plugin opens the OS file picker by clicking a hidden <input type="file"> in its
      // Constructor. Shadow the click so no native dialog appears; the files are supplied directly below.
      HTMLInputElement.prototype.click = (): void => {
        // Intentionally suppress the native file picker during the test.
      };

      try {
        if (view && editor) {
          if (mode === 'ribbon') {
            await waitUntil({
              message: 'ribbon icon was not rendered',
              predicate: () => document.querySelector(`[aria-label="${ribbonTitle}"]`) !== null,
              timeoutInMilliseconds
            });
            const ribbonEl = document.querySelector<HTMLElement>(`[aria-label="${ribbonTitle}"]`);
            if (ribbonEl) {
              triggered = true;
              ribbonEl.click();
            }
          } else {
            const menu = new obsidianModule.Menu();
            app.workspace.trigger('editor-menu', menu, editor, view);
            const menuItem = menu.items.find((item): item is MenuItem => 'titleEl' in item && item.titleEl.textContent === menuItemTitle);
            itemFound = menuItem !== undefined;
            if (menuItem) {
              triggered = true;
              menuItem.callback?.();
            }
          }

          if (triggered) {
            await waitUntil({
              message: 'file input was not created',
              predicate: () => document.querySelector('input.insert-multiple-attachments') !== null,
              timeoutInMilliseconds
            });

            const input = document.querySelector<HTMLInputElement>('input.insert-multiple-attachments');
            if (input) {
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(new File([new Uint8Array([1, 2, 3, 4])], fileNameA, { type: 'image/png' }));
              dataTransfer.items.add(new File([new Uint8Array([5, 6, 7, 8])], fileNameB, { type: 'image/png' }));
              input.files = dataTransfer.files;
              input.dispatchEvent(new Event('change'));

              await waitUntil({
                message: 'attachments were not inserted into the note',
                predicate: async () => {
                  const current = await app.vault.read(note);
                  return current.includes(fileNameA) && current.includes(fileNameB);
                },
                timeoutInMilliseconds
              });
              content = await app.vault.read(note);
            }
          }
        }
      } finally {
        Reflect.deleteProperty(HTMLInputElement.prototype, 'click');
      }

      const paths = app.vault.getFiles().map((file) => file.path);
      const attachmentAPath = paths.find((path) => path.endsWith(fileNameA)) ?? null;
      const attachmentBPath = paths.find((path) => path.endsWith(fileNameB)) ?? null;

      for (const path of [notePath, attachmentAPath, attachmentBPath]) {
        if (path) {
          const file = app.vault.getAbstractFileByPath(path);
          if (file) {
            await app.fileManager.trashFile(file);
          }
        }
      }

      return {
        attachmentAExists: attachmentAPath !== null,
        attachmentBExists: attachmentBPath !== null,
        content,
        fileNameA,
        fileNameB,
        itemFound,
        triggered
      };
    },
    vaultPath: getTempVault().path
  });
}
