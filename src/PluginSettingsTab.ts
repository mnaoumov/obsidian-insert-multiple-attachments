import { Setting } from 'obsidian';
import { PluginSettingsTabBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsTabBase';

import type { PluginTypes } from './PluginTypes.ts';

export class PluginSettingsTab extends PluginSettingsTabBase<PluginTypes> {
  public override display(): void {
    super.display();

    new Setting(this.containerEl)
      .setName('Insert double lines between attachment links')
      .setDesc(createFragment((f) => {
        f.appendText('If enabled, double lines will be inserted between attachment links.');
        f.createEl('br');
        f.appendText('If disabled, single line will be inserted between attachment links.');
      }))
      .addToggle((toggle) => {
        this.bind(toggle, 'shouldInsertDoubleLinesBetweenAttachmentLinks');
      });
  }
}
