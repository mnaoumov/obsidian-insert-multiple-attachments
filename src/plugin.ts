import { OpenBugReportCommandHandler } from '@mnaoumov/obsidian-lib/command-handlers/open-bug-report-command-handler';
import { OpenDemoVaultCommandHandler } from '@mnaoumov/obsidian-lib/command-handlers/open-demo-vault-command-handler';
import { PluginSettingsTabComponent } from '@mnaoumov/obsidian-lib/components/plugin-settings-tab-component';
import { PluginDataHandler } from '@mnaoumov/obsidian-lib/data-handler';
import { PluginBase } from '@mnaoumov/obsidian-lib/plugin/plugin';
import { PluginEventSourceImpl } from '@mnaoumov/obsidian-lib/plugin/plugin-event-source';
import { PluginRibbonIconRegistrar } from '@mnaoumov/obsidian-lib/ribbon-icon-registrar';

import { InvokeCommandHandler } from './command-handlers/invoke-command-handler.ts';
import { getPendingInsertionExtension } from './pending-insertion-field.ts';
import { PluginSettingsComponent } from './plugin-settings-component.ts';
import { PluginSettingsTab } from './plugin-settings-tab.ts';
import { RibbonIconComponent } from './ribbon-icon-component.ts';

export class Plugin extends PluginBase {
  protected override async onloadImpl(): Promise<void> {
    const pluginSettingsComponent = this.addChild(
      new PluginSettingsComponent({
        dataHandler: new PluginDataHandler(this),
        pluginEventSource: new PluginEventSourceImpl(this)
      })
    );
    this.pluginSettingsComponent = pluginSettingsComponent;
    this.addChild(
      new PluginSettingsTabComponent({
        plugin: this,
        pluginSettingsTab: new PluginSettingsTab({
          plugin: this,
          pluginSettingsComponent
        })
      })
    );
    this.registerEditorExtension(getPendingInsertionExtension());
    this.addChild(
      new RibbonIconComponent({
        app: this.app,
        pluginNoticeComponent: this.pluginNoticeComponent,
        pluginSettingsComponent,
        ribbonIconRegistrar: new PluginRibbonIconRegistrar(this)
      })
    );
    await this.commandHandlerComponent.registerCommandHandlers(() => [
      new InvokeCommandHandler({
        app: this.app,
        pluginNoticeComponent: this.pluginNoticeComponent,
        pluginSettingsComponent
      }),
      new OpenBugReportCommandHandler({
        app: this.app,
        gitHubRepo: 'mnaoumov/obsidian-insert-multiple-attachments',
        pluginId: this.manifest.id
      }),
      new OpenDemoVaultCommandHandler({
        app: this.app,
        pluginId: this.manifest.id,
        pluginNoticeComponent: this.pluginNoticeComponent,
        pluginVersion: this.manifest.version
      })
    ]);
  }
}
