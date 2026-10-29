import type { PluginNoticeComponent } from '@mnaoumov/obsidian-lib/components/plugin-notice-component';
import type {
  App,
  Editor
} from 'obsidian';

import { EditorCommandHandler } from '@mnaoumov/obsidian-lib/command-handlers/editor-command-handler';

import type { PluginSettingsComponent } from '../plugin-settings-component.ts';

import { InsertAttachmentsControl } from '../insert-attachments-control.ts';

interface InvokeCommandHandlerConstructorParams {
  readonly app: App;
  readonly pluginNoticeComponent: PluginNoticeComponent;
  readonly pluginSettingsComponent: PluginSettingsComponent;
}

export class InvokeCommandHandler extends EditorCommandHandler {
  private readonly app: App;
  private readonly pluginNoticeComponent: PluginNoticeComponent;
  private readonly pluginSettingsComponent: PluginSettingsComponent;

  public constructor(params: InvokeCommandHandlerConstructorParams) {
    super({
      editorMenuItemName: 'Insert multiple attachments',
      icon: 'lucide-paperclip',
      id: 'invoke',
      name: 'Invoke'
    });
    this.app = params.app;
    this.pluginNoticeComponent = params.pluginNoticeComponent;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
  }

  protected override executeEditor(editor: Editor): void {
    new InsertAttachmentsControl({
      app: this.app,
      editor,
      pluginNoticeComponent: this.pluginNoticeComponent,
      pluginSettingsComponent: this.pluginSettingsComponent
    });
  }

  protected override shouldAddToEditorMenu(): boolean {
    return this.pluginSettingsComponent.settings.shouldShowInEditorContextMenu;
  }
}
