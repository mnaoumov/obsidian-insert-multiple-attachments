import type { Editor } from 'obsidian';

import { PluginBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginBase';

import type { PluginTypes } from './PluginTypes.ts';

import { InsertAttachmentsControl } from './InsertAttachmentsControl.ts';

export class Plugin extends PluginBase<PluginTypes> {
  protected override async onLayoutReady(): Promise<void> {
    await super.onLayoutReady();
    this.addCommand({
      editorCallback: (editor: Editor) => {
        new InsertAttachmentsControl(this.app, editor);
      },
      icon: 'lucide-paperclip',
      id: 'insert-multiple-attachments',
      name: 'Insert Multiple Attachments'
    });
  }
}
