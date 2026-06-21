import type {
  App,
  Editor,
  MarkdownFileInfo
} from 'obsidian';
import type { ReadonlyDeep } from 'type-fest';

import { EditorCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/editor-command-handler';

import type { PluginSettings } from '../plugin-settings.ts';

import { InsertAttachmentsControl } from '../insert-attachments-control.ts';

export interface InvokeCommandHandlerConstructorParams {
  readonly app: App;

  getPluginSettings(): ReadonlyDeep<PluginSettings>;

  readonly pluginName: string;
}

export class InvokeCommandHandler extends EditorCommandHandler {
  private readonly app: App;
  private readonly getPluginSettingsFn: () => ReadonlyDeep<PluginSettings>;

  public constructor(params: InvokeCommandHandlerConstructorParams) {
    super({
      icon: 'lucide-paperclip',
      id: 'invoke',
      name: 'Invoke'
    });
    this.app = params.app;
    this.getPluginSettingsFn = params.getPluginSettings.bind(params);
  }

  protected override executeEditor(editor: Editor, _ctx: MarkdownFileInfo): void {
    new InsertAttachmentsControl({
      app: this.app,
      editor,
      pluginSettings: this.getPluginSettingsFn()
    });
  }
}
