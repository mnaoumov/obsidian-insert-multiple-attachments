import type { App } from 'obsidian';

import { Notice } from 'obsidian';
import { configureCommunityPlugin } from 'obsidian-dev-utils/obsidian/community-plugins';

const PLUGIN_ID = 'insert-multiple-attachments';
const PLAYGROUND_NOTE_PATH = 'Playground.md';

interface DemoSettingsPatch {
  attachmentLinksDelimiter?: string;
  attachmentLinksPrefix?: string;
  attachmentLinksSuffix?: string;
  shouldShowInEditorContextMenu?: boolean;
  shouldShowRibbonIcon?: boolean;
}

// The command always inserts at the cursor, which the button parks on the blank line after this marker.
// So everything the insert added sits between the marker and the `## Steps` heading, and the reset can
// Simply empty that gap — no copy of the note's prose to keep in step with the note itself.
const CURSOR_MARKER = '<!-- Place your cursor below and run the command. -->';
const STEPS_HEADING = '## Steps';

/**
 * Applies a settings patch, live, through the plugin's own settings component.
 *
 * Manual equivalent: edit the same field in **Settings -> Community plugins -> Insert Multiple
 * Attachments**. Note the settings tab renders spaces as `␣` and newlines as `↵`; the values here are
 * the real characters those stand for.
 */
export async function changeSettings(app: App, patch: DemoSettingsPatch): Promise<void> {
  await configureCommunityPlugin({ app, pluginId: PLUGIN_ID, settings: patch });
  new Notice('Applied. Re-run the command in Playground to see the new joining.');
}

/**
 * Opens the playground, puts the cursor on its blank line, and runs the insert command.
 *
 * The OS file picker that opens next is a native dialog, so it cannot be driven from here — pick two
 * or more files yourself. Everything up to that point is what this button removes.
 *
 * Manual equivalent: open `Playground.md`, click the blank line under the first heading, and run
 * **Insert Multiple Attachments: Invoke**.
 */
export async function insertInPlayground(app: App): Promise<void> {
  const note = app.vault.getFileByPath(PLAYGROUND_NOTE_PATH);
  if (!note) {
    new Notice('Playground.md is missing from the vault.');
    return;
  }

  await app.workspace.getLeaf(false).openFile(note);

  const editor = app.workspace.activeEditor?.editor;
  if (editor) {
    const lineCount = editor.lineCount();
    for (let line = 0; line < lineCount; line++) {
      if (editor.getLine(line).startsWith('<!-- Place your cursor below')) {
        editor.setCursor({ ch: 0, line: line + 1 });
        break;
      }
    }
  }

  app.commands.executeCommandById(`${PLUGIN_ID}:invoke`);
}

/**
 * Clears whatever the command inserted, so it can be tried again with different settings.
 *
 * Only the gap between the cursor marker and the `## Steps` heading is emptied — the note's own prose
 * is left alone, so this cannot go stale against edits to the note.
 *
 * Manual equivalent: delete the embeds the command inserted.
 */
export async function resetPlayground(app: App): Promise<void> {
  const note = app.vault.getFileByPath(PLAYGROUND_NOTE_PATH);
  if (!note) {
    new Notice('Playground.md is missing.');
    return;
  }

  await app.vault.process(note, (content) => {
    const markerIndex = content.indexOf(CURSOR_MARKER);
    const stepsIndex = content.indexOf(STEPS_HEADING);
    if (markerIndex === -1 || stepsIndex === -1 || stepsIndex < markerIndex) {
      return content;
    }

    const head = content.slice(0, markerIndex + CURSOR_MARKER.length);
    const tail = content.slice(stepsIndex);
    return `${head}\n\n${tail}`;
  });

  new Notice('Playground reset — the inserted embeds are gone.');
}
