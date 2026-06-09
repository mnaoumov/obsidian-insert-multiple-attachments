import type {
  App,
  PluginManifest
} from 'obsidian';

import { noopAsync } from 'obsidian-dev-utils/function';
import { AppActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import { CommandHandlerComponent } from 'obsidian-dev-utils/obsidian/command-handlers/command-handler-component';
import { PluginCommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import { CallbackLayoutReadyComponent } from 'obsidian-dev-utils/obsidian/components/layout-ready-component';
import { MenuEventRegistrarComponent } from 'obsidian-dev-utils/obsidian/components/menu-event-registrar-component';
import { PluginSettingsTabComponent } from 'obsidian-dev-utils/obsidian/components/plugin-settings-tab-component';
import { PluginDataHandler } from 'obsidian-dev-utils/obsidian/data-handler';
import { PluginBase } from 'obsidian-dev-utils/obsidian/plugin/plugin';
import { PluginEventSourceImpl } from 'obsidian-dev-utils/obsidian/plugin/plugin-event-source';

import type { PluginSettings } from './plugin-settings.ts';

import { InvokeCommandHandler } from './command-handlers/invoke-command-handler.ts';
import { PluginSettingsComponent } from './plugin-settings-component.ts';
import { PluginSettingsTab } from './plugin-settings-tab.ts';

export class Plugin extends PluginBase {
  private readonly pluginSettingsComponent: PluginSettingsComponent;

  public constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    this.pluginSettingsComponent = this.addChild(
      new PluginSettingsComponent({
        dataHandler: new PluginDataHandler(this),
        pluginEventSource: new PluginEventSourceImpl(this)
      })
    );
    this.addChild(
      new PluginSettingsTabComponent({
        plugin: this,
        pluginSettingsTab: new PluginSettingsTab({
          plugin: this,
          pluginSettingsComponent: this.pluginSettingsComponent
        })
      })
    );
    const menuEventRegistrar = this.addChild(new MenuEventRegistrarComponent(app));
    this.addChild(
      new CommandHandlerComponent({
        activeFileProvider: new AppActiveFileProvider(app),
        commandHandlers: [
          new InvokeCommandHandler({
            app,
            getPluginSettings: (): PluginSettings => this.pluginSettingsComponent.settings as PluginSettings,
            pluginName: manifest.name
          })
        ],
        commandRegistrar: new PluginCommandRegistrar(this),
        menuEventRegistrar,
        pluginName: manifest.name
      })
    );
    this.addChild(new CallbackLayoutReadyComponent(app, this.onLayoutReady.bind(this)));
  }

  protected async onLayoutReady(): Promise<void> {
    await noopAsync();
  }
}
