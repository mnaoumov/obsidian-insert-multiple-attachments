/**
 * @file
 *
 * Produces the mobile screenshots the community-store listing needs
 * (T461-P21), driving a staged note in Obsidian Mobile on a real Android
 * emulator and writing `images/screenshots/screenshot-mobile-N.png`.
 *
 * The obstacle is the same one the desktop suite works around: the plugin's
 * picker is the platform's own file dialog, built as a hidden
 * `<input type="file" multiple>` and clicked. That dialog cannot be
 * photographed, and it would block the run behind it.
 *
 * So the shots drive the plugin's REAL path with the dialog suppressed:
 * `HTMLInputElement.prototype.click` is stubbed for the length of the command,
 * the input the plugin created is handed a `DataTransfer` of files, and a
 * `change` event is dispatched — which is exactly what picking those files
 * produces. Everything after that is the plugin's own code saving and embedding
 * them, so the frames show real output rather than a staged imitation of it.
 * The same technique is what `insert-attachments-entry-points.cross-platform`
 * already exercises on this platform, so the mechanism is not novel here.
 *
 * The files are SVGs because they are text: a fixture can be written inline and
 * still renders at a visible size, where a placeholder PNG would be a dot.
 *
 * There is no mobile equivalent of the desktop viewport override, so the AVD is
 * built at exactly 900x1600 — see [[T461-P21]] for its one-time provisioning.
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
 * `App`, reduced to the font-size applier that `obsidian-typings` does not
 * declare. Setting `baseFontSize` alone changes nothing on screen.
 */
interface FontSizeApp {
  updateFontSize(this: void): void;
}

/**
 * `App`, reduced to the inline-title toggle that `obsidian-typings` does not
 * declare. Setting the config alone changes nothing on screen.
 */
interface InlineTitleApp {
  updateInlineTitleDisplay(this: void): void;
}

const PLUGIN_ID = 'insert-multiple-attachments';
const WIDTH_IN_PIXELS = 900;
const HEIGHT_IN_PIXELS = 1600;

/**
 * Base font size for the mobile shots, below the 16px default so the note and
 * all four embeds fit one 450dp screen.
 */
const MOBILE_FONT_SIZE_IN_PIXELS = 13;

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
    async callback({ app, fontSizeInPixels, lib: { waitUntil }, subjectNotePath }) {
      // A closure runs inside ONE Appium execute/sync call, which WebDriver caps
      // Around 30s, so every wait in here stays comfortably under it.
      const SETTLE_TIMEOUT_IN_MILLISECONDS = 15_000;
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

      app.vault.setConfig('baseFontSize', fontSizeInPixels);
      const fontApp: unknown = app;
      (fontApp as FontSizeApp).updateFontSize();

      await sleep(SETTLE_DELAY_IN_MILLISECONDS);
    },
    input: { fontSizeInPixels: MOBILE_FONT_SIZE_IN_PIXELS, subjectNotePath: SUBJECT_NOTE_PATH },
    vaultPath: vaultPath()
  });
});

describe('mobile store screenshots', () => {
  it('1 - four attachments embedded by one run', async () => {
    const embedCount = await pickAttachments();
    expect(embedCount).toBe(PICKED_FILE_NAMES.length);
    await shoot(1, `Pick ${String(PICKED_FILE_NAMES.length)} files, get ${String(PICKED_FILE_NAMES.length)} attachments in one run`);
  });

  it('2 - the command it registers', async () => {
    // NOT a second frame of the saved files: shot 1 already shows them. This is
    // The way in on a phone, where the editor right-click menu the desktop set
    // Photographs has no equivalent.
    const suggestions = await openCommandPalette('Insert multiple');
    // What is ON SCREEN, not what the registry holds: this is an EDITOR
    // Command, so the palette hides it whenever there is no editor to run it
    // Against — and a registry-based assertion passed happily while the frame
    // Read 'No commands found.'
    // `includes` rather than an exact match: the palette renders the plugin
    // Name and the command name as two elements, so `textContent` runs them
    // Together without the separator the reader sees between them.
    expect(suggestions.some((suggestion) => suggestion.includes('Insert Multiple Attachments'))).toBe(true);
    await shoot(2, 'One command, and the phone picker takes it from there');
  });
});

/**
 * Opens the command palette over the note, in the editor, and filters it.
 *
 * @param query - What to type into the palette.
 * @returns The suggestions left on screen.
 */
async function openCommandPalette(query: string): Promise<string[]> {
  return await evalInObsidian({
    async callback({ app, lib: { waitUntil }, query: text, subjectNotePath }) {
      const PALETTE_TIMEOUT_IN_MILLISECONDS = 15_000;
      const SETTLE_DELAY_IN_MILLISECONDS = 900;
      const RESIZE_SETTLE_DELAY_IN_MILLISECONDS = 2000;

      // Let the previous shot's capture settle: the device-metrics override it
      // Sets and clears tears down anything opened too soon afterwards.
      await sleep(RESIZE_SETTLE_DELAY_IN_MILLISECONDS);

      // In the EDITOR, not the reading view shot 1 ends in: this is an editor
      // Command, and the palette drops it when there is nothing to edit.
      const file = app.vault.getFileByPath(subjectNotePath);
      if (!file) {
        throw new Error(`Note is missing from the vault: ${subjectNotePath}`);
      }

      const leaf = app.workspace.getLeaf(false);
      await leaf.openFile(file);
      await leaf.setViewState({
        state: { file: subjectNotePath, mode: 'source', source: false },
        type: 'markdown'
      });

      app.commands.executeCommandById('command-palette:open');

      await waitUntil({
        message: 'the command palette to open',
        predicate: () => Boolean(document.querySelector('.prompt input')),
        timeoutInMilliseconds: PALETTE_TIMEOUT_IN_MILLISECONDS
      });

      const input = document.querySelector('.prompt input');
      if (!(input instanceof HTMLInputElement)) {
        throw new TypeError('The command palette has no input.');
      }

      input.value = text;
      // The palette filters from its own `input` handler, so setting `value`
      // Alone would leave every command in the vault on screen.
      input.dispatchEvent(new Event('input'));

      await sleep(SETTLE_DELAY_IN_MILLISECONDS);

      // Read off the SCREEN, so the shot asserts what the reader will see. The
      // Registry would answer 'the command exists' even in the frame where the
      // Palette says 'No commands found.'
      return [...document.querySelectorAll('.suggestion-item')]
        .map((item) => item.textContent)
        .filter((suggestion) => suggestion !== '');
    },
    input: { query, subjectNotePath: SUBJECT_NOTE_PATH },
    vaultPath: vaultPath()
  });
}

/**
 * Runs the plugin's command with the platform dialog suppressed, hands its file
 * input the staged files, and waits for the note to gain an embed for each.
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
      // The default the four images land above the heading, which reads as a
      // Note that starts with a pile of pictures.
      const view = app.workspace.getActiveViewOfType(obsidianModule.MarkdownView);
      const editor = view?.editor;
      if (editor) {
        editor.focus();
        editor.setCursor(editor.lastLine(), editor.getLine(editor.lastLine()).length);
      }

      // Suppressed for exactly as long as the command needs it: a real click
      // Here opens the platform's file dialog, which cannot be photographed and
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
      // Exactly the object the WebView hands it after a real pick.
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

      // Back to reading view for the frame: source mode shows four lines of
      // `![[...]]`, and the point of the shot is the attachments themselves.
      await leaf.setViewState({
        state: { file: subjectNotePath, mode: 'preview', source: false },
        type: 'markdown'
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
 * `images/screenshots/screenshot-mobile-<index>.png`.
 *
 * @param index - The 1-based listing position.
 * @param caption - The caption drawn across the bottom of the frame.
 */
async function shoot(index: number, caption: string): Promise<void> {
  const captured = await captureObsidianScreenshot({ vaultPath: vaultPath() });

  // The AVD is 900x1600, so the device frame IS the store size. Asserting it
  // Here is what keeps that true: run this against any other AVD and it fails
  // Loudly instead of quietly shipping an off-spec image.
  expect(readPngDimensions(captured)).toStrictEqual({
    heightInPixels: HEIGHT_IN_PIXELS,
    widthInPixels: WIDTH_IN_PIXELS
  });

  const labeled = await labelScreenshot(captured, { text: caption });

  mkdirSync(IMAGES_DIRECTORY, { recursive: true });
  writeFileSync(join(IMAGES_DIRECTORY, `screenshot-mobile-${String(index)}.png`), labeled);
}

function vaultPath(): string {
  return getTemporaryVault().path;
}
