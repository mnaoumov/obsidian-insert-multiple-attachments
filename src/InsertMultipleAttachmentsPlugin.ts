import type {
  Editor,
  PluginSettingTab
} from 'obsidian';

import { EmptySettings } from 'obsidian-dev-utils/obsidian/Plugin/EmptySettings';
import { PluginBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginBase';

import { InsertAttachmentsControl } from './InsertAttachmentsControl.ts';

export class InsertMultipleAttachmentsPlugin extends PluginBase {
  protected override createPluginSettings(): EmptySettings {
    return new EmptySettings();
  }

  protected override createPluginSettingsTab(): null | PluginSettingTab {
    return null;
  }

  protected override onLayoutReady(): void {
    this.addCommand({
      editorCallback: (editor: Editor) => {
        new InsertAttachmentsControl(this.app, editor);
      },
      id: 'insert-multiple-attachments',
      name: 'Insert Multiple Attachments'
    });
  }
}
