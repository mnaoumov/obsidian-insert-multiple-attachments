/**
 * @file
 *
 * Produces the desktop screenshots the community-store listing needs
 * (T461-P21), driving a staged note in a real Obsidian and writing
 * `images/screenshots/screenshot-desktop-N.png`.
 *
 * The obstacle here is that the plugin's picker is an OS dialog: it builds a
 * hidden `<input type="file" multiple>` and clicks it. That dialog cannot be
 * photographed, and worse, it would block the run.
 *
 * So the shots drive the plugin's REAL path with the dialog suppressed:
 * `HTMLInputElement.prototype.click` is stubbed for the length of the command,
 * the input the plugin created is handed a `DataTransfer` of files, and a
 * `change` event is dispatched — which is exactly what picking those files
 * produces. Everything after that is the plugin's own code saving and embedding
 * them, so the frames show real output rather than a staged imitation of it.
 *
 * The files are SVGs because they are text: a fixture can be written inline and
 * still renders at a visible size, where a placeholder PNG would be a dot.
 */

import {
  mkdirSync,
  writeFileSync
} from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import {
  captureObsidianScreenshot,
  evalInObsidian,
  labelScreenshot,
  readPngDimensions
} from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

/**
 * `App`, reduced to the inline-title toggle that `obsidian-typings` does not
 * declare. Setting the config alone changes nothing on screen.
 */
interface InlineTitleApp {
  updateInlineTitleDisplay(this: void): void;
}

const PLUGIN_ID = 'insert-multiple-attachments';
const WIDTH_IN_PIXELS = 1200;
const HEIGHT_IN_PIXELS = 800;

const SUBJECT_NOTE_PATH = 'Screenshots/Design review.md';

/**
 * The files the shot "picks". Four is enough to make the point that one run
 * handles many, and few enough that every embed fits the frame.
 */
const PICKED_FILE_NAMES = ['bar chart.svg', 'flow diagram.svg', 'wireframe.svg', 'logo.svg'];

const IMAGES_DIRECTORY = join(process.cwd(), 'images', 'screenshots');

beforeAll(async () => {
  const vault = getTemporaryVault();

  vault.populate({ [SUBJECT_NOTE_PATH]: '# Design review\n\nAttachments from today:\n\n' });
  await vault.syncToDevice();

  await evalInObsidian({
    async callback({ app, lib: { waitUntil }, subjectNotePath }) {
      const SETTLE_TIMEOUT_IN_MILLISECONDS = 30_000;
      const SETTLE_DELAY_IN_MILLISECONDS = 1000;

      app.changeTheme('obsidian');

      await waitUntil({
        message: 'the staged note to appear in the vault',
        predicate: () => Boolean(app.vault.getFileByPath(subjectNotePath)),
        timeoutInMilliseconds: SETTLE_TIMEOUT_IN_MILLISECONDS
      });

      app.vault.setConfig('showInlineTitle', false);
      const inlineTitleApp: unknown = app;
      (inlineTitleApp as InlineTitleApp).updateInlineTitleDisplay();

      await sleep(SETTLE_DELAY_IN_MILLISECONDS);
    },
    input: { subjectNotePath: SUBJECT_NOTE_PATH },
    vaultPath: vaultPath()
  });
});

describe('desktop store screenshots', () => {
  it('1 - four attachments embedded by one run', async () => {
    const embedCount = await pickAttachments();
    expect(embedCount).toBe(PICKED_FILE_NAMES.length);
    await shoot(1, `Pick ${String(PICKED_FILE_NAMES.length)} files, get ${String(PICKED_FILE_NAMES.length)} attachments in one run`);
  });

  it('2 - the editor menu it adds', async () => {
    // NOT a second frame of the saved files: shot 1 already shows them in the
    // File explorer beside the note. This is the other way in.
    const items = await openEditorContextMenu();
    expect(items).toContain('Insert multiple attachments');
    await shoot(2, 'Or reach it from the editor right-click menu');
  });
});

/**
 * Right-clicks in the editor, which is where the plugin adds its own entry.
 *
 * @returns The menu entries on screen.
 */
async function openEditorContextMenu(): Promise<string> {
  return await evalInObsidian({
    async callback({ lib: { clickMouse, waitUntil } }) {
      const MENU_TIMEOUT_IN_MILLISECONDS = 15_000;
      const SETTLE_DELAY_IN_MILLISECONDS = 900;
      const RESIZE_SETTLE_DELAY_IN_MILLISECONDS = 2000;
      const HALF = 2;

      // Let the previous shot capture settle: the device-metrics override it
      // Sets and clears tears down a menu opened too soon afterwards.
      await sleep(RESIZE_SETTLE_DELAY_IN_MILLISECONDS);

      const content = document.querySelector('.cm-content');
      if (!(content instanceof HTMLElement)) {
        throw new TypeError('The editor is not on screen.');
      }

      // A TRUSTED right-click in the editor. This is the surface where `isTrusted` actually bites:
      // Obsidian 1.13's markdown viewport listener is `(e) => { if (!e.defaultPrevented && e.isTrusted
      // && ...) }`, so a dispatched `contextmenu` can be dropped on the floor by the very code that
      // Builds the menu this shot photographs.
      const rect = content.getBoundingClientRect();
      clickMouse({
        button: 'right',
        x: rect.left + rect.width / HALF,
        y: rect.top + rect.height / HALF
      });

      await waitUntil({
        message: 'the editor context menu to open',
        predicate: () => Boolean(document.body.querySelector('.menu')),
        timeoutInMilliseconds: MENU_TIMEOUT_IN_MILLISECONDS
      });

      await sleep(SETTLE_DELAY_IN_MILLISECONDS);

      return [...document.querySelectorAll('.menu .menu-item-title')].map((item) => item.textContent).join(' | ');
    },
    vaultPath: vaultPath()
  });
}

/**
 * Runs the plugin's command with the OS dialog suppressed, hands its file input
 * the staged files, and waits for the note to gain an embed for each.
 *
 * @returns How many embeds the note ended up with.
 */
async function pickAttachments(): Promise<number> {
  return await evalInObsidian({
    async callback({ app, fileNames, lib: { waitUntil }, obsidianModule, pluginId, subjectNotePath }) {
      const EMBED_TIMEOUT_IN_MILLISECONDS = 20_000;
      const SETTLE_DELAY_IN_MILLISECONDS = 2000;

      const file = app.vault.getFileByPath(subjectNotePath);
      if (!file) {
        throw new Error(`Note is missing from the vault: ${subjectNotePath}`);
      }

      const leaf = app.workspace.getLeaf(false);
      await leaf.openFile(file);
      await leaf.setViewState({
        state: { file: subjectNotePath, mode: 'preview', source: false },
        type: 'markdown'
      });
      await leaf.setViewState({
        state: { file: subjectNotePath, mode: 'source', source: false },
        type: 'markdown'
      });

      // At the END of the note: the command embeds at the CURSOR, and left at
      // The default the four images landed above the heading, which reads as a
      // Note that starts with a pile of pictures.
      const view = app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
      const editor = view?.editor;
      if (editor) {
        editor.focus();
        editor.setCursor(editor.lastLine(), editor.getLine(editor.lastLine()).length);
      }

      // Suppressed for exactly as long as the command needs it: a real
      // Click here opens the OS file dialog, which cannot be photographed and
      // Blocks the run behind it.
      const originalClick = HTMLInputElement.prototype.click;
      HTMLInputElement.prototype.click = (): void => undefined;

      let inputEl: HTMLInputElement | null;
      try {
        app.commands.executeCommandById(`${pluginId}:invoke`);

        await waitUntil({
          message: 'the plugin to build its file input',
          predicate: () => Boolean(document.querySelector('input.insert-multiple-attachments')),
          timeoutInMilliseconds: EMBED_TIMEOUT_IN_MILLISECONDS
        });

        const candidate = document.querySelector('input.insert-multiple-attachments');
        inputEl = candidate instanceof HTMLInputElement ? candidate : null;
      } finally {
        HTMLInputElement.prototype.click = originalClick;
      }

      if (!inputEl) {
        throw new Error('The plugin did not create its file input.');
      }

      // A DataTransfer is the only way to give an input a FileList, and it is
      // Exactly the object the browser hands it after a real pick.
      const transfer = new DataTransfer();
      for (const [index, fileName] of fileNames.entries()) {
        transfer.items.add(new File([buildSvg(index, fileName)], fileName, { type: 'image/svg+xml' }));
      }
      inputEl.files = transfer.files;
      inputEl.dispatchEvent(new Event('change'));

      await waitUntil({
        message: 'every picked file to be embedded in the note',
        predicate: async () => {
          const content = await app.vault.read(file);
          return fileNames.every((fileName) => content.includes(fileName));
        },
        timeoutInMilliseconds: EMBED_TIMEOUT_IN_MILLISECONDS
      });

      await sleep(SETTLE_DELAY_IN_MILLISECONDS);

      const content = await app.vault.read(file);
      return fileNames.filter((fileName) => content.includes(fileName)).length;

      /**
       * Builds a small labelled SVG, so each embed is visibly its own file
       * rather than four copies of the same placeholder.
       *
       * @param index - Which file this is.
       * @param label - The file name, drawn into the image.
       * @returns The SVG source.
       */
      function buildSvg(index: number, label: string): string {
        const HUE_STEP = 60;
        const hue = index * HUE_STEP;
        return '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="120">'
          + `<rect width="220" height="120" rx="10" fill="hsl(${String(hue)} 45% 45%)"/>`
          + '<text x="110" y="66" font-family="sans-serif" font-size="15" fill="white" text-anchor="middle">'
          + `${label.replace('.svg', '')}</text></svg>`;
      }
    },
    input: { fileNames: PICKED_FILE_NAMES, pluginId: PLUGIN_ID, subjectNotePath: SUBJECT_NOTE_PATH },
    vaultPath: vaultPath()
  });
}

/**
 * Captures the window, captions it, and writes it as
 * `images/screenshots/screenshot-desktop-<index>.png`.
 *
 * @param index - The 1-based listing position.
 * @param caption - The caption drawn across the bottom of the frame.
 */
async function shoot(index: number, caption: string): Promise<void> {
  const bytes = await captureObsidianScreenshot({
    heightInPixels: HEIGHT_IN_PIXELS,
    vaultPath: vaultPath(),
    widthInPixels: WIDTH_IN_PIXELS
  });

  const labeled = await labelScreenshot(bytes, { text: caption });

  expect(readPngDimensions(labeled)).toStrictEqual({
    heightInPixels: HEIGHT_IN_PIXELS,
    widthInPixels: WIDTH_IN_PIXELS
  });

  mkdirSync(IMAGES_DIRECTORY, { recursive: true });
  writeFileSync(join(IMAGES_DIRECTORY, `screenshot-desktop-${String(index)}.png`), labeled);
}

function vaultPath(): string {
  return getTemporaryVault().path;
}
