import type {
  Editor,
  PluginSettingTab
} from 'obsidian';
import type { MaybePromise } from 'obsidian-dev-utils/Async';

import { around } from 'monkey-around';
import { PluginBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginBase';

import { InsertAttachmentsControl } from './InsertAttachmentsControl.ts';

export class InsertMultipleAttachmentsPlugin extends PluginBase<object> {
  protected override createDefaultPluginSettings(): object {
    return {};
  }

  protected override createPluginSettingsTab(): null | PluginSettingTab {
    return null;
  }

  protected override onLayoutReady(): MaybePromise<void> {
    const attachFileCommand = this.app.commands.findCommand('editor:attach-file');
    if (!attachFileCommand) {
      return;
    }

    this.register(around(attachFileCommand, {
      editorCallback: (): (editor: Editor) => void => (editor: Editor) => {
        new InsertAttachmentsControl(this.app, editor);
      }
    }));
  }
}
