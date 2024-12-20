import type {
  Editor,
  PluginSettingTab
} from 'obsidian';
import type { MaybePromise } from 'obsidian-dev-utils/Async';

import { PluginBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginBase';

import { InsertAttachmentsControl } from './InsertAttachmentsControl.ts';

export class InsertMultipleAttachmentsPlugin extends PluginBase<object> {
  protected override createDefaultPluginSettings(): object {
    return {};
  }

  protected override createPluginSettingsTab(): null | PluginSettingTab {
    return null;
  }

  protected override onLayoutReady(): MaybePromise<void> {
    this.addCommand({
      editorCallback: (editor: Editor) => {
        new InsertAttachmentsControl(this.app, editor);
      },
      id: 'insert-multiple-attachments',
      name: 'Insert Multiple Attachments'
    });
  }
}
