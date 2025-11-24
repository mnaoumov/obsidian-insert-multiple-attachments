import type { Editor } from 'obsidian';

import { PluginBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginBase';

import type { PluginTypes } from './PluginTypes.ts';

import { InsertAttachmentsControl } from './InsertAttachmentsControl.ts';
import { PluginSettingsManager } from './PluginSettingsManager.ts';
import { PluginSettingsTab } from './PluginSettingsTab.ts';

export class Plugin extends PluginBase<PluginTypes> {
  protected override createSettingsManager(): PluginSettingsManager {
    return new PluginSettingsManager(this);
  }

  protected override createSettingsTab(): null | PluginSettingsTab {
    return new PluginSettingsTab(this);
  }

  protected override async onLayoutReady(): Promise<void> {
    await super.onLayoutReady();
    this.addCommand({
      editorCallback: (editor: Editor) => {
        new InsertAttachmentsControl(this, editor);
      },
      icon: 'lucide-paperclip',
      id: 'invoke',
      name: 'Invoke'
    });
  }
}
