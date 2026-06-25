import type {
  App,
  Editor
} from 'obsidian';

import { EditorCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/editor-command-handler';

import type { PluginSettingsComponent } from '../plugin-settings-component.ts';

import { InsertAttachmentsControl } from '../insert-attachments-control.ts';

interface InvokeCommandHandlerConstructorParams {
  readonly app: App;
  readonly pluginSettingsComponent: PluginSettingsComponent;
}

export class InvokeCommandHandler extends EditorCommandHandler {
  private readonly app: App;
  private readonly pluginSettingsComponent: PluginSettingsComponent;

  public constructor(params: InvokeCommandHandlerConstructorParams) {
    super({
      icon: 'lucide-paperclip',
      id: 'invoke',
      name: 'Invoke'
    });
    this.app = params.app;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
  }

  protected override executeEditor(editor: Editor): void {
    new InsertAttachmentsControl({
      app: this.app,
      editor,
      pluginSettingsComponent: this.pluginSettingsComponent
    });
  }
}
