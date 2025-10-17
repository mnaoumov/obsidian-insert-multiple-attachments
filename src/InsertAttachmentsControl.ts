import type {
  App,
  Editor
} from 'obsidian';

import { convertAsyncToSync } from 'obsidian-dev-utils/Async';
import {
  basename,
  extname
} from 'obsidian-dev-utils/Path';

import type { Plugin } from './Plugin.ts';

export class InsertAttachmentsControl {
  private readonly app: App;
  private readonly currentActiveDocument: Document;

  private readonly fileEl: HTMLInputElement;
  private readonly handleFocusClickBound: (this: void) => void;
  private timeoutId = 0;

  public constructor(private readonly plugin: Plugin, private readonly editor: Editor) {
    this.app = this.plugin.app;
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
    window.setTimeout(() => {
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

    const links: string[] = [];

    for (const file of Array.from(this.fileEl.files)) {
      const filename = basename(file.name);
      const data = await file.arrayBuffer();
      const ext = extname(filename);
      const attachmentFile = await this.app.saveAttachment(basename(filename, ext), ext.slice(1), data);
      let link = this.app.fileManager.generateMarkdownLink(attachmentFile, activeFile.path);
      const maxWidth = Number(this.plugin.settings.attachmentMaxWidth) || 0;
      if (/\.(?:png|jpe?g|gif|webp|bmp)$/i.test(filename) && maxWidth > 0) {
        const blob = new Blob([data], { type: file.type });
        const url = URL.createObjectURL(blob);
        try {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = (): void => {
              resolve(image);
            };
            image.onerror = reject;
            image.src = url;
          });
          const targetHeight = Math.round(
            (img.naturalHeight / img.naturalWidth) * maxWidth
          );
          if (!link.startsWith('![') && !link.startsWith('![[')) {
            link = `![[${link}]]`;
          }
          link = link.replace(
            ']]',
            `|${maxWidth.toString()}x${targetHeight.toString()}]]`
          );
        } finally {
          URL.revokeObjectURL(url);
        }
      }
      links.push(link);
    }

    const linksStr = this.plugin.settings.attachmentLinksPrefix
      + links.join(this.plugin.settings.attachmentLinksDelimiter)
      + this.plugin.settings.attachmentLinksSuffix;
    this.editor.replaceSelection(linksStr);
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
    clearTimeout(this.timeoutId);
  }
}
