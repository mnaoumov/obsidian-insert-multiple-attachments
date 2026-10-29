import type { EditorView } from '@codemirror/view';
import type { PluginNoticeComponent } from '@mnaoumov/obsidian-lib/components/plugin-notice-component';
import type {
  App,
  Editor,
  EditorSelection,
  TFile
} from 'obsidian';

import { EditorSelection as CodeMirrorEditorSelection } from '@codemirror/state';
import { convertAsyncToSync } from '@mnaoumov/typescript-lib/async';
import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import {
  basename,
  extname
} from '@mnaoumov/typescript-lib/path';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';

import {
  getPendingInsertionSelection,
  pendingInsertionEndEffect,
  pendingInsertionStartEffect
} from './pending-insertion-field.ts';

interface InsertAttachmentsControlConstructorParams {
  readonly app: App;
  readonly editor: Editor;
  readonly pluginNoticeComponent: PluginNoticeComponent;
  readonly pluginSettingsComponent: PluginSettingsComponent;
}

export class InsertAttachmentsControl {
  private static lastInsertionId = 0;
  private readonly app: App;
  private readonly currentActiveDocument: Document;
  private readonly editor: Editor;
  private readonly fileEl: HTMLInputElement;
  private readonly handleFocusClickBound: (this: void) => void;
  private readonly pluginNoticeComponent: PluginNoticeComponent;
  private readonly pluginSettingsComponent: PluginSettingsComponent;
  private readonly selections: readonly EditorSelection[];
  private timeoutId = 0;

  /*
   * `obsidian-typings` declares `editor.cm` against a second declaration of `@codemirror/view`, so the two
   * `EditorView` types are mutually unassignable. It is the same class at runtime (Obsidian's own CodeMirror,
   * which the build leaves external), so the cast is a type-level identity, not a claim about the value.
   */
  private get editorView(): EditorView {
    return castTo<EditorView>(this.editor.cm);
  }

  public constructor(params: InsertAttachmentsControlConstructorParams) {
    this.app = params.app;
    this.editor = params.editor;
    this.pluginNoticeComponent = params.pluginNoticeComponent;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
    // The file picker takes the focus away from the editor, so the cursor has to be given back once it closes.
    this.selections = this.editor.listSelections();
    this.currentActiveDocument = activeDocument;
    this.handleFocusClickBound = this.handleFocusClick.bind(this);
    this.fileEl = this.currentActiveDocument.body.createEl('input', {
      attr: {
        multiple: ''
      },
      cls: 'insert-multiple-attachments',
      type: 'file'
    });
    this.fileEl.addEventListener('change', convertAsyncToSync(this.handleChange.bind(this)));
    this.fileEl.addEventListener('cancel', this.handleCancel.bind(this));
    this.fileEl.focus();
    this.fileEl.click();
    window.setTimeout(() => {
      this.currentActiveDocument.addEventListener('focus', this.handleFocusClickBound);
      this.currentActiveDocument.addEventListener('click', this.handleFocusClickBound);
    }, 0);
  }

  private detachFileEl(): void {
    this.fileEl.detach();
  }

  private handleCancel(): void {
    this.removeHandlers();
    this.restoreSelections();
    this.detachFileEl();
  }

  private async handleChange(): Promise<void> {
    this.removeHandlers();
    this.restoreSelections();
    if (!this.fileEl.files) {
      this.detachFileEl();
      return;
    }

    const note = this.app.workspace.getActiveFile();
    if (!note) {
      this.detachFileEl();
      return;
    }

    /*
     * Saving the files takes as long as copying them, and the user may edit the note meanwhile. The insertion
     * point is therefore tracked through every edit rather than locked, so the links land where the cursor was.
     */
    InsertAttachmentsControl.lastInsertionId += 1;
    const insertionId = InsertAttachmentsControl.lastInsertionId;
    this.editorView.dispatch({
      effects: pendingInsertionStartEffect.of({ id: insertionId, selection: this.editorView.state.selection })
    });

    try {
      const attachmentFiles: TFile[] = [];
      for (const file of this.fileEl.files) {
        const filename = basename(file.name);
        const data = await file.arrayBuffer();
        const extension = extname(filename);
        attachmentFiles.push(await this.app.saveAttachment(basename(filename, extension), extension.slice(1), data));
      }

      // Generated after every save, against the note's path as it is now, so a rename meanwhile is followed.
      const links = attachmentFiles.map((attachmentFile) => {
        const link = this.app.fileManager.generateMarkdownLink(attachmentFile, note.path);
        return link.startsWith('!') ? link : `!${link}`;
      });

      const linksString = this.pluginSettingsComponent.settings.attachmentLinksPrefix
        + links.join(this.pluginSettingsComponent.settings.attachmentLinksDelimiter)
        + this.pluginSettingsComponent.settings.attachmentLinksSuffix;
      await this.insertLinks(note, insertionId, linksString);
    } finally {
      this.removePendingInsertion(insertionId);
      this.detachFileEl();
    }
  }

  private handleFocusClick(): void {
    const TIMEOUT_IN_MILLISECONDS = 5000;
    this.removeHandlers();
    this.timeoutId = window.setTimeout(this.detachFileEl.bind(this), TIMEOUT_IN_MILLISECONDS);
  }

  private async insertLinks(note: TFile, insertionId: number, linksString: string): Promise<void> {
    if (this.app.vault.getFileByPath(note.path) !== note) {
      this.pluginNoticeComponent.showNotice('The note was deleted, so the saved attachments were not linked from it.');
      return;
    }

    const editorView = this.editorView;
    /*
     * A closed leaf removes its editor from the DOM, and a leaf switched to another note comes back with no
     * pending insertion, so in both cases the tracked point no longer belongs to this note.
     */
    const pendingSelection = editorView.dom.isConnected ? getPendingInsertionSelection(editorView.state, insertionId) : null;
    if (!pendingSelection) {
      await this.app.vault.process(note, (content) => {
        const separator = content === '' || content.endsWith('\n') ? '' : '\n';
        return content + separator + linksString;
      });
      this.pluginNoticeComponent.showNotice('The note was closed while the attachments were saved, so their links were added at its end.');
      return;
    }

    // The user did not move the cursor or edit since the picker closed, so the cursor goes after the links.
    const isUserIdle = pendingSelection.eq(editorView.state.selection);
    const changes = editorView.state.changes(pendingSelection.ranges.map((range) => ({
      from: range.from,
      insert: linksString,
      to: range.to
    })));
    editorView.dispatch({
      changes,
      effects: pendingInsertionEndEffect.of(insertionId),
      userEvent: 'input.paste',
      ...isUserIdle && {
        scrollIntoView: true,
        selection: CodeMirrorEditorSelection.create(
          pendingSelection.ranges.map((range) => CodeMirrorEditorSelection.cursor(changes.mapPos(range.to, 1))),
          pendingSelection.mainIndex
        )
      }
    });

    if (isUserIdle) {
      this.editor.focus();
    }
  }

  private removeHandlers(): void {
    this.currentActiveDocument.removeEventListener('focus', this.handleFocusClickBound);
    this.currentActiveDocument.removeEventListener('click', this.handleFocusClickBound);
    window.clearTimeout(this.timeoutId);
  }

  private removePendingInsertion(insertionId: number): void {
    const editorView = this.editorView;
    if (getPendingInsertionSelection(editorView.state, insertionId)) {
      editorView.dispatch({ effects: pendingInsertionEndEffect.of(insertionId) });
    }
  }

  private restoreSelections(): void {
    this.editor.focus();
    this.editor.setSelections([...this.selections]);
  }
}
