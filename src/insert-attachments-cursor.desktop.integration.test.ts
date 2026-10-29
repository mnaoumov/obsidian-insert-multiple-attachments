/**
 * @file
 *
 * Integration suite checking that the cursor comes back to the editor once the file picker closes.
 *
 * The picker takes the focus away from the editor, which left the user with no visible insertion point.
 * As in the entry-points suite, the native picker is suppressed by shadowing `HTMLInputElement.prototype.click`,
 * and its closing is simulated by dispatching the event the browser would fire: `cancel` or `change`.
 *
 * Desktop only: on Android, focusing the editor raises the soft keyboard, which this suite does not exercise.
 */

import type { EditorPosition } from 'obsidian';

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

const COMMAND_ID = 'insert-multiple-attachments:invoke';
const NOTE_CONTENT = 'hello world';
const CURSOR_CH = 5;
const MINIMUM_CHROMIUM_VERSION_WITH_FILE_INPUT_CANCEL = 113;

// Vitest's own timeout, on the Node side of the transport, so the per-closure cap below does not apply to it.
const TEST_TIMEOUT_IN_MILLISECONDS = 60_000;

interface CursorScenarioResult {
  readonly content: string;
  readonly cursor: EditorPosition | null;
  readonly fileName: string;
  readonly isCancelEventSupported: boolean;
  readonly isEditorFocused: boolean;
  readonly isEditorFocusedWhilePickerOpen: boolean;
}

describe('Cursor after the file picker closes', () => {
  it('gives the cursor back where it was when the picker is cancelled', async () => {
    const result = await runCursorScenario('cancel');

    expect(result.isCancelEventSupported).toBe(true);
    expect(result.isEditorFocusedWhilePickerOpen).toBe(false);
    expect(result.isEditorFocused).toBe(true);
    expect(result.cursor).toEqual({ ch: CURSOR_CH, line: 0 });
    expect(result.content).toBe(NOTE_CONTENT);
  }, TEST_TIMEOUT_IN_MILLISECONDS);

  it('puts the cursor after the inserted links when files are picked', async () => {
    const result = await runCursorScenario('change');

    expect(result.isEditorFocusedWhilePickerOpen).toBe(false);
    expect(result.isEditorFocused).toBe(true);
    const insertedText = result.content.slice(CURSOR_CH, result.content.length - (NOTE_CONTENT.length - CURSOR_CH));
    expect(insertedText).toContain(result.fileName);
    expect(result.cursor).toEqual({ ch: CURSOR_CH + insertedText.length, line: 0 });
  }, TEST_TIMEOUT_IN_MILLISECONDS);
});

async function runCursorScenario(scenarioCloseEvent: 'cancel' | 'change'): Promise<CursorScenarioResult> {
  return evalInObsidian({
    async callback({
      app,
      closeEvent,
      commandId,
      cursorCh,
      lib: { waitUntil },
      minimumChromiumVersion,
      noteContent,
      obsidianModule
    }): Promise<CursorScenarioResult> {
      // Under the transport's ~30s per-closure cap: each wait is on sub-second work.
      const WAIT_TIMEOUT_IN_MILLISECONDS = 6000;

      const stamp = `${Date.now().toString()}-${Math.floor(performance.now()).toString()}`;
      const notePath = `ima-cursor-${closeEvent}-${stamp}.md`;
      const fileName = `ima-cursor-${stamp}.png`;

      const note = await app.vault.create(notePath, noteContent);
      const leaf = app.workspace.getLeaf(true);
      await leaf.openFile(note);

      await waitUntil({
        message: 'note did not become the active editor',
        predicate: () => {
          const activeView = app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
          return activeView?.file?.path === notePath && Boolean(activeView.editor);
        },
        timeoutInMilliseconds: WAIT_TIMEOUT_IN_MILLISECONDS
      });

      const view = app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);

      // Read the focus off the DOM rather than `editor.hasFocus()`, which also needs the OS window to be focused.
      function isEditorFocused(): boolean {
        const activeEl = document.activeElement;
        return Boolean(view && activeEl?.classList.contains('cm-content') && view.contentEl.contains(activeEl));
      }

      let isEditorFocusedWhilePickerOpen = true;
      let content = '';
      let cursor: EditorPosition | null = null;
      let isFocusedAfterClose = false;

      HTMLInputElement.prototype.click = (): void => {
        // Intentionally suppress the native file picker during the test.
      };

      try {
        if (view) {
          view.editor.focus();
          view.editor.setCursor({ ch: cursorCh, line: 0 });
          app.commands.executeCommandById(commandId);

          await waitUntil({
            message: 'file input was not created',
            predicate: () => document.querySelector('input.insert-multiple-attachments') !== null,
            timeoutInMilliseconds: WAIT_TIMEOUT_IN_MILLISECONDS
          });

          isEditorFocusedWhilePickerOpen = isEditorFocused();
          // Stand in for the user moving the cursor while the picker is open: the recorded position must win.
          view.editor.setCursor({ ch: 0, line: 0 });

          const input = document.querySelector<HTMLInputElement>('input.insert-multiple-attachments');
          if (input) {
            if (closeEvent === 'cancel') {
              input.dispatchEvent(new Event('cancel'));
            } else {
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(new File([new Uint8Array([1, 2, 3, 4])], fileName, { type: 'image/png' }));
              input.files = dataTransfer.files;
              input.dispatchEvent(new Event('change'));
              await waitUntil({
                message: 'attachment was not inserted into the note',
                predicate: () => view.editor.getValue().includes(fileName),
                timeoutInMilliseconds: WAIT_TIMEOUT_IN_MILLISECONDS
              });
            }
          }

          content = view.editor.getValue();
          cursor = view.editor.getCursor();
          isFocusedAfterClose = isEditorFocused();
        }
      } finally {
        Reflect.deleteProperty(HTMLInputElement.prototype, 'click');
        document.querySelector('input.insert-multiple-attachments')?.remove();
      }

      // A file input fires `cancel` when its picker is dismissed from Chromium 113 on.
      const chromiumMajorVersion = Number((process.versions['chrome'] ?? '0').split('.', 1)[0]);

      leaf.detach();
      const attachment = app.vault.getFiles().find((file) => file.path.endsWith(fileName));
      for (const file of [note, attachment]) {
        if (file) {
          await app.fileManager.trashFile(file);
        }
      }

      return {
        content,
        cursor,
        fileName,
        isCancelEventSupported: chromiumMajorVersion >= minimumChromiumVersion,
        isEditorFocused: isFocusedAfterClose,
        isEditorFocusedWhilePickerOpen
      };
    },
    input: {
      closeEvent: scenarioCloseEvent,
      commandId: COMMAND_ID,
      cursorCh: CURSOR_CH,
      minimumChromiumVersion: MINIMUM_CHROMIUM_VERSION_WITH_FILE_INPUT_CANCEL,
      noteContent: NOTE_CONTENT
    },
    vaultPath: getTemporaryVault().path
  });
}
