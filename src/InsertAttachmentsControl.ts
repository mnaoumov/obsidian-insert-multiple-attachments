import type {
  App,
  Editor
} from 'obsidian';

import { convertAsyncToSync } from 'obsidian-dev-utils/Async';
import {
  basename,
  extname
} from 'obsidian-dev-utils/Path';

export class InsertAttachmentsControl {
  private readonly currentActiveDocument: Document;
  private readonly fileEl: HTMLInputElement;
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  private handleFocusClickBound: (this: void) => void;
  private timeoutId = 0;

  public constructor(private readonly app: App, private readonly editor: Editor) {
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
    this.fileEl.focus();
    this.fileEl.click();
    setTimeout(() => {
      this.currentActiveDocument.addEventListener('focus', this.handleFocusClickBound);
      this.currentActiveDocument.addEventListener('click', this.handleFocusClickBound);
    }, 0);
  }

  private detachFileEl(): void {
    this.fileEl.detach();
  }

  private async handleChange(): Promise<void> {
    this.removeHandlers();
    if (!this.fileEl.files) {
      this.detachFileEl();
      return;
    }

    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      this.detachFileEl();
      return;
    }

    const links = [];

    for (const file of Array.from(this.fileEl.files)) {
      const filename = basename(file.name);
      const data = await file.arrayBuffer();
      const ext = extname(filename);
      const attachmentFile = await this.app.saveAttachment(basename(filename, ext), ext.slice(1), data);
      links.push(this.app.fileManager.generateMarkdownLink(attachmentFile, activeFile.path));
    }

    this.editor.replaceSelection(links.join('\n\n'));
    this.detachFileEl();
  }

  private handleFocusClick(): void {
    this.removeHandlers();
    this.timeoutId = window.setTimeout(this.detachFileEl.bind(this), 5000);
  }

  private removeHandlers(): void {
    this.currentActiveDocument.removeEventListener('focus', this.handleFocusClickBound);
    this.currentActiveDocument.removeEventListener('click', this.handleFocusClickBound);
    clearTimeout(this.timeoutId);
  }
}
