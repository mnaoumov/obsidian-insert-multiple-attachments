/**
 * @file
 *
 * Integration suite checking that an edit made while the attachments are being saved does not move where
 * their links land.
 *
 * Saving copies every picked file, so on a large one the user goes on typing meanwhile. The insertion point is
 * tracked through each edit rather than locked, so the links must land where the cursor was when the picker
 * closed, and the user's own cursor must stay where they were typing.
 *
 * As in the cursor suite, the native picker is suppressed by shadowing `HTMLInputElement.prototype.click`, and
 * its closing is simulated by dispatching the `change` event the browser would fire. The edit is real typing:
 * `app.saveAttachment` is wrapped so the trusted key presses happen before the save goes ahead.
 *
 * Desktop only: the trusted key presses go through Electron, which a phone does not have.
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
// Lowercase letters only: each is one trusted key press with no modifier.
const TYPED_TEXT = 'ok';

// Vitest's own timeout, on the Node side of the transport, so the per-closure cap below does not apply to it.
const TEST_TIMEOUT_IN_MILLISECONDS = 60_000;

interface EditWhileSavingResult {
  readonly content: string;
  readonly cursor: EditorPosition | null;
  readonly fileName: string;
  readonly markerCountAfter: number;
  readonly markerCountWhileSaving: number;
}

describe('Editing the note while the attachments are saved', () => {
  it('inserts the links where the cursor was, and leaves the user\'s cursor where they typed', async () => {
    const result = await runEditWhileSavingScenario();

    expect(result.markerCountWhileSaving).toBe(1);
    expect(result.markerCountAfter).toBe(0);
    const prefix = TYPED_TEXT + NOTE_CONTENT.slice(0, CURSOR_CH);
    const suffix = NOTE_CONTENT.slice(CURSOR_CH);
    expect(result.content.startsWith(prefix)).toBe(true);
    expect(result.content.endsWith(suffix)).toBe(true);
    const insertedText = result.content.slice(prefix.length, result.content.length - suffix.length);
    expect(insertedText).toContain(result.fileName);
    expect(result.cursor).toEqual({ ch: TYPED_TEXT.length, line: 0 });
  }, TEST_TIMEOUT_IN_MILLISECONDS);
});

async function runEditWhileSavingScenario(): Promise<EditWhileSavingResult> {
  return evalInObsidian({
    async callback({
      app,
      commandId,
      cursorCh,
      lib: { pressKey, waitUntil },
      noteContent,
      obsidianModule,
      typedText
    }): Promise<EditWhileSavingResult> {
      // Under the transport's ~30s per-closure cap: each wait is on sub-second work.
      const WAIT_TIMEOUT_IN_MILLISECONDS = 6000;

      const stamp = `${Date.now().toString()}-${Math.floor(performance.now()).toString()}`;
      const notePath = `ima-edit-while-saving-${stamp}.md`;
      const fileName = `ima-edit-while-saving-${stamp}.png`;

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

      function countMarkers(): number {
        return view?.contentEl.querySelectorAll('.insert-multiple-attachments-pending').length ?? 0;
      }

      let content = '';
      let cursor: EditorPosition | null = null;
      let markerCountWhileSaving = -1;

      HTMLInputElement.prototype.click = (): void => {
        // Intentionally suppress the native file picker during the test.
      };

      const originalSaveAttachment = app.saveAttachment.bind(app);
      function restoreSaveAttachment(): void {
        app.saveAttachment = originalSaveAttachment;
      }

      try {
        if (view) {
          app.saveAttachment = async (name, extension, data): ReturnType<typeof originalSaveAttachment> => {
            markerCountWhileSaving = countMarkers();
            // Stand in for the user typing at the start of the note while the file is copied.
            view.editor.focus();
            view.editor.setCursor({ ch: 0, line: 0 });
            for (const key of typedText) {
              await pressKey({ key });
            }
            await waitUntil({
              message: 'typed text did not reach the note',
              predicate: () => view.editor.getValue().startsWith(typedText),
              timeoutInMilliseconds: WAIT_TIMEOUT_IN_MILLISECONDS
            });
            return originalSaveAttachment(name, extension, data);
          };

          view.editor.focus();
          view.editor.setCursor({ ch: cursorCh, line: 0 });
          app.commands.executeCommandById(commandId);

          await waitUntil({
            message: 'file input was not created',
            predicate: () => document.querySelector('input.insert-multiple-attachments') !== null,
            timeoutInMilliseconds: WAIT_TIMEOUT_IN_MILLISECONDS
          });

          const input = document.querySelector<HTMLInputElement>('input.insert-multiple-attachments');
          if (input) {
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

          content = view.editor.getValue();
          cursor = view.editor.getCursor();
        }
      } finally {
        restoreSaveAttachment();
        Reflect.deleteProperty(HTMLInputElement.prototype, 'click');
        document.querySelector('input.insert-multiple-attachments')?.remove();
      }

      const markerCountAfter = countMarkers();

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
        markerCountAfter,
        markerCountWhileSaving
      };
    },
    input: {
      commandId: COMMAND_ID,
      cursorCh: CURSOR_CH,
      noteContent: NOTE_CONTENT,
      typedText: TYPED_TEXT
    },
    vaultPath: getTemporaryVault().path
  });
}
