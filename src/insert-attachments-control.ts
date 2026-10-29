import type {
  App,
  Editor,
  EditorSelection
} from 'obsidian';

import { convertAsyncToSync } from '@mnaoumov/typescript-lib/async';
import {
  basename,
  extname
} from '@mnaoumov/typescript-lib/path';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';

interface InsertAttachmentsControlConstructorParams {
  readonly app: App;
  readonly editor: Editor;
  readonly pluginSettingsComponent: PluginSettingsComponent;
}

export class InsertAttachmentsControl {
  private readonly app: App;
  private readonly currentActiveDocument: Document;
  private readonly editor: Editor;
  private readonly fileEl: HTMLInputElement;
  private readonly handleFocusClickBound: (this: void) => void;
  private readonly pluginSettingsComponent: PluginSettingsComponent;
  private readonly selections: readonly EditorSelection[];
  private timeoutId = 0;

  public constructor(params: InsertAttachmentsControlConstructorParams) {
    this.app = params.app;
    this.editor = params.editor;
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

    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      this.detachFileEl();
      return;
    }

    const links: string[] = [];

    for (const file of this.fileEl.files) {
      const filename = basename(file.name);
      const data = await file.arrayBuffer();
      const extension = extname(filename);
      const attachmentFile = await this.app.saveAttachment(basename(filename, extension), extension.slice(1), data);
      let link = this.app.fileManager.generateMarkdownLink(attachmentFile, activeFile.path);
      if (!link.startsWith('!')) {
        link = `!${link}`;
      }
      links.push(link);
    }

    const linksString = this.pluginSettingsComponent.settings.attachmentLinksPrefix
      + links.join(this.pluginSettingsComponent.settings.attachmentLinksDelimiter)
      + this.pluginSettingsComponent.settings.attachmentLinksSuffix;
    // `replaceSelection` leaves the cursor after the inserted links.
    this.editor.replaceSelection(linksString);
    this.editor.focus();
    this.detachFileEl();
  }

  private handleFocusClick(): void {
    const TIMEOUT_IN_MILLISECONDS = 5000;
    this.removeHandlers();
    this.timeoutId = window.setTimeout(this.detachFileEl.bind(this), TIMEOUT_IN_MILLISECONDS);
  }

  private removeHandlers(): void {
    this.currentActiveDocument.removeEventListener('focus', this.handleFocusClickBound);
    this.currentActiveDocument.removeEventListener('click', this.handleFocusClickBound);
    window.clearTimeout(this.timeoutId);
  }

  private restoreSelections(): void {
    this.editor.focus();
    this.editor.setSelections([...this.selections]);
  }
}
