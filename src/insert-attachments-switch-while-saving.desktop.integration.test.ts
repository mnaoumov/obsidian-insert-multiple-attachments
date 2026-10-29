/**
 * @file
 *
 * Integration suite checking that switching to another note while the attachments are being saved does not move
 * where the rest of them are saved.
 *
 * `app.saveAttachment` places each file by the active note, and the note stays editable while the files copy, so a
 * user who opens another note mid-save made the remaining attachments land in that other note's attachment
 * folder, while their links still went into the note the command ran from. Here the attachment folder is the
 * note's own folder and the two notes sit in different folders, so a file placed by the wrong note shows in its
 * path.
 *
 * As in the cursor suite, the native picker is suppressed by shadowing `HTMLInputElement.prototype.click`, and its
 * closing is simulated by dispatching the `change` event the browser would fire. The switch is real:
 * `app.saveAttachment` is wrapped so the leaf opens the other note once the first file is saved.
 *
 * Desktop only: it shares the cursor suite's simulated picker, which this project runs on desktop.
 */

import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

const COMMAND_ID = 'insert-multiple-attachments:invoke';

// Vitest's own timeout, on the Node side of the transport, so the per-closure cap below does not apply to it.
const TEST_TIMEOUT_IN_MILLISECONDS = 60_000;

interface SwitchWhileSavingResult {
  readonly attachmentPaths: readonly string[];
  readonly fileNames: readonly string[];
  readonly noteContent: string;
  readonly noteFolder: string;
  readonly otherNoteContent: string;
}

describe('Switching to another note while the attachments are saved', () => {
  it('saves every attachment by the note the command ran from, and links them all from it', async () => {
    const result = await runSwitchWhileSavingScenario();

    expect(result.attachmentPaths).toEqual(result.fileNames.map((fileName) => `${result.noteFolder}/${fileName}`));
    for (const fileName of result.fileNames) {
      expect(result.noteContent).toContain(fileName);
      expect(result.otherNoteContent).not.toContain(fileName);
    }
  }, TEST_TIMEOUT_IN_MILLISECONDS);
});

async function runSwitchWhileSavingScenario(): Promise<SwitchWhileSavingResult> {
  return evalInObsidian({
    async callback({
      app,
      commandId,
      lib: { waitUntil },
      obsidianModule
    }): Promise<SwitchWhileSavingResult> {
      // Under the transport's ~30s per-closure cap: each wait is on sub-second work.
      const WAIT_TIMEOUT_IN_MILLISECONDS = 6000;

      const stamp = `${Date.now().toString()}-${Math.floor(performance.now()).toString()}`;
      const noteFolder = `ima-switch-note-${stamp}`;
      const otherNoteFolder = `ima-switch-other-${stamp}`;
      const fileNames = [`ima-switch-first-${stamp}.png`, `ima-switch-second-${stamp}.png`];

      await app.vault.createFolder(noteFolder);
      await app.vault.createFolder(otherNoteFolder);
      const note = await app.vault.create(`${noteFolder}/note.md`, 'hello world');
      const otherNote = await app.vault.create(`${otherNoteFolder}/other.md`, 'other note');

      const originalAttachmentFolderPath = app.vault.getConfig('attachmentFolderPath');
      app.vault.setConfig('attachmentFolderPath', './');

      const leaf = app.workspace.getLeaf(true);
      await leaf.openFile(note);

      await waitUntil({
        message: 'note did not become the active editor',
        predicate: () => {
          const activeView = app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
          return activeView?.file === note && Boolean(activeView.editor);
        },
        timeoutInMilliseconds: WAIT_TIMEOUT_IN_MILLISECONDS
      });

      HTMLInputElement.prototype.click = (): void => {
        // Intentionally suppress the native file picker during the test.
      };

      const originalSaveAttachment = app.saveAttachment.bind(app);
      function restoreSaveAttachment(): void {
        app.saveAttachment = originalSaveAttachment;
      }
      const attachmentPaths: string[] = [];

      try {
        app.saveAttachment = async (name, extension, data): ReturnType<typeof originalSaveAttachment> => {
          const attachment = await originalSaveAttachment(name, extension, data);
          attachmentPaths.push(attachment.path);
          if (attachmentPaths.length === 1) {
            // Stand in for the user opening another note while the second file is still to be saved.
            await leaf.openFile(otherNote);
          }
          return attachment;
        };

        app.workspace.getActiveViewOfType(obsidianModule.MarkdownView)?.editor.focus();
        app.commands.executeCommandById(commandId);

        await waitUntil({
          message: 'file input was not created',
          predicate: () => document.querySelector('input.insert-multiple-attachments') !== null,
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MILLISECONDS
        });

        const input = document.querySelector<HTMLInputElement>('input.insert-multiple-attachments');
        if (input) {
          const dataTransfer = new DataTransfer();
          for (const fileName of fileNames) {
            dataTransfer.items.add(new File([new Uint8Array([1, 2, 3, 4])], fileName, { type: 'image/png' }));
          }
          input.files = dataTransfer.files;
          input.dispatchEvent(new Event('change'));
        }

        await waitUntil({
          message: 'the links were not appended to the note',
          predicate: async () => {
            const content = await app.vault.read(note);
            return fileNames.every((fileName) => content.includes(fileName));
          },
          timeoutInMilliseconds: WAIT_TIMEOUT_IN_MILLISECONDS
        });
      } finally {
        restoreSaveAttachment();
        Reflect.deleteProperty(HTMLInputElement.prototype, 'click');
        document.querySelector('input.insert-multiple-attachments')?.remove();
        app.vault.setConfig('attachmentFolderPath', originalAttachmentFolderPath);
      }

      const noteContent = await app.vault.read(note);
      const otherNoteContent = await app.vault.read(otherNote);

      leaf.detach();
      for (const folderPath of [noteFolder, otherNoteFolder]) {
        const folder = app.vault.getFolderByPath(folderPath);
        if (folder) {
          await app.fileManager.trashFile(folder);
        }
      }

      return {
        attachmentPaths,
        fileNames,
        noteContent,
        noteFolder,
        otherNoteContent
      };
    },
    input: {
      commandId: COMMAND_ID
    },
    vaultPath: getTemporaryVault().path
  });
}
