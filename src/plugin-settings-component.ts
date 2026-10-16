import type { DataHandler } from '@mnaoumov/obsidian-lib/data-handler';
import type { PluginEventSource } from '@mnaoumov/obsidian-lib/plugin/plugin-event-source';

import { PluginSettingsComponentBase } from '@mnaoumov/obsidian-lib/components/plugin-settings-component';

import { PluginSettings } from './plugin-settings.ts';

interface PluginSettingsComponentConstructorParams {
  readonly dataHandler: DataHandler;
  readonly pluginEventSource: PluginEventSource;
}

class LegacySettings {
  public shouldInsertDoubleLinesBetweenAttachmentLinks = true;
}

export class PluginSettingsComponent extends PluginSettingsComponentBase<PluginSettings> {
  public constructor(params: PluginSettingsComponentConstructorParams) {
    super({
      dataHandler: params.dataHandler,
      pluginEventSource: params.pluginEventSource,
      pluginSettingsClass: PluginSettings
    });
  }

  protected override registerLegacySettingsConverters(): void {
    this.registerLegacySettingsConverter(LegacySettings, (legacySettings) => {
      if (legacySettings.shouldInsertDoubleLinesBetweenAttachmentLinks !== undefined) {
        legacySettings.attachmentLinksDelimiter = legacySettings.shouldInsertDoubleLinesBetweenAttachmentLinks ? '\n\n' : '\n';
      }
    });
  }
}
