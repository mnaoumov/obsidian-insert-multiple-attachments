import type { PluginNoticeComponent } from '@mnaoumov/obsidian-lib/components/plugin-notice-component';
import type {
  App,
  Editor
} from 'obsidian';

import { EditorCommandHandler } from '@mnaoumov/obsidian-lib/command-handlers/editor-command-handler';

import type { PluginSettingsComponent } from '../plugin-settings-component.ts';

import { InsertAttachmentsControl } from '../insert-attachments-control.ts';

/**
 * The picker filter of the image-only command.
 */
export const IMAGE_ACCEPT = 'image/*';

interface InsertImagesCommandHandlerConstructorParams {
  readonly app: App;
  readonly pluginNoticeComponent: PluginNoticeComponent;
  readonly pluginSettingsComponent: PluginSettingsComponent;
}

/**
 * Runs the same flow as the `Invoke` command, with a picker that accepts images only.
 */
export class InsertImagesCommandHandler extends EditorCommandHandler {
  private readonly app: App;
  private readonly pluginNoticeComponent: PluginNoticeComponent;
  private readonly pluginSettingsComponent: PluginSettingsComponent;

  public constructor(params: InsertImagesCommandHandlerConstructorParams) {
    super({
      icon: 'lucide-images',
      id: 'insert-images',
      name: 'Insert multiple images'
    });
    this.app = params.app;
    this.pluginNoticeComponent = params.pluginNoticeComponent;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
  }

  protected override executeEditor(editor: Editor): void {
    new InsertAttachmentsControl({
      accept: IMAGE_ACCEPT,
      app: this.app,
      editor,
      pluginNoticeComponent: this.pluginNoticeComponent,
      pluginSettingsComponent: this.pluginSettingsComponent
    });
  }
}
