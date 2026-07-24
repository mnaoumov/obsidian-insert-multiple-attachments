import type {
  App,
  Editor
} from 'obsidian';
import type { PluginNoticeComponent } from 'obsidian-dev-utils/obsidian/components/plugin-notice-component';
import type { RibbonIconRegistrar } from 'obsidian-dev-utils/obsidian/ribbon-icon-registrar';

import { registerAsyncEvent } from 'obsidian-dev-utils/obsidian/components/async-events-component';
import { ComponentEx } from 'obsidian-dev-utils/obsidian/components/component-ex';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';

import { InsertAttachmentsControl } from './insert-attachments-control.ts';

interface RibbonIconComponentConstructorParams {
  readonly app: App;
  readonly pluginNoticeComponent: PluginNoticeComponent;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly ribbonIconRegistrar: RibbonIconRegistrar;
}

export class RibbonIconComponent extends ComponentEx {
  private readonly app: App;
  private readonly pluginNoticeComponent: PluginNoticeComponent;
  private readonly pluginSettingsComponent: PluginSettingsComponent;
  private ribbonIconEl: HTMLElement | null = null;
  private readonly ribbonIconRegistrar: RibbonIconRegistrar;

  public constructor(params: RibbonIconComponentConstructorParams) {
    super();
    this.app = params.app;
    this.pluginNoticeComponent = params.pluginNoticeComponent;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
    this.ribbonIconRegistrar = params.ribbonIconRegistrar;
  }

  public override onload(): void {
    super.onload();
    this.register(() => {
      this.removeIcon();
    });
    registerAsyncEvent(
      this,
      this.pluginSettingsComponent.on('loadSettings', () => {
        this.sync();
      })
    );
    registerAsyncEvent(
      this,
      this.pluginSettingsComponent.on('saveSettings', () => {
        this.sync();
      })
    );
    this.sync();
  }

  private handleClick(): void {
    const editor: Editor | undefined = this.app.workspace.activeEditor?.editor;
    if (!editor) {
      this.pluginNoticeComponent.showNotice('Open a note to insert attachments.');
      return;
    }

    new InsertAttachmentsControl({
      app: this.app,
      editor,
      pluginSettingsComponent: this.pluginSettingsComponent
    });
  }

  private removeIcon(): void {
    this.ribbonIconEl?.remove();
    this.ribbonIconEl = null;
  }

  private sync(): void {
    const shouldShow = this.pluginSettingsComponent.settings.shouldShowRibbonIcon;
    if (shouldShow && !this.ribbonIconEl) {
      this.ribbonIconEl = this.ribbonIconRegistrar.addRibbonIcon({
        callback: () => {
          this.handleClick();
        },
        icon: 'lucide-paperclip',
        title: 'Insert Multiple Attachments'
      });
    } else if (!shouldShow) {
      this.removeIcon();
    }
  }
}
