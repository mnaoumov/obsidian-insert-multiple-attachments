import { PluginSettingsManagerBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsManagerBase';

import type { PluginTypes } from './PluginTypes.ts';

import { PluginSettings } from './PluginSettings.ts';

class LegacySettings {
  public shouldInsertDoubleLinesBetweenAttachmentLinks = true;
}

export class PluginSettingsManager extends PluginSettingsManagerBase<PluginTypes> {
  public createDefaultSettings(): PluginSettings {
    return new PluginSettings();
  }

  protected override registerLegacySettingsConverters(): void {
    this.registerLegacySettingsConverter(LegacySettings, (legacySettings) => {
      if (legacySettings.shouldInsertDoubleLinesBetweenAttachmentLinks !== undefined) {
        legacySettings.attachmentLinksDelimiter = legacySettings.shouldInsertDoubleLinesBetweenAttachmentLinks ? '\n\n' : '\n';
      }
    });
  }
}
