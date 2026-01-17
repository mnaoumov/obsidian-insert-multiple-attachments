import type {
  Editor,
  MarkdownFileInfo
} from 'obsidian';

import {
  EditorCommandBase,
  EditorCommandInvocationBase
} from 'obsidian-dev-utils/obsidian/Commands/EditorCommandBase';

import type { Plugin } from '../Plugin.ts';

import { InsertAttachmentsControl } from '../InsertAttachmentsControl.ts';

class InvokeCommandInvocation extends EditorCommandInvocationBase<Plugin> {
  public constructor(plugin: Plugin, editor: Editor, ctx: MarkdownFileInfo) {
    super(plugin, editor, ctx);
  }

  public override async execute(): Promise<void> {
    new InsertAttachmentsControl(this.plugin, this.editor);
  }
}

export class InvokeCommand extends EditorCommandBase<Plugin> {
  public constructor(plugin: Plugin) {
    super({
      icon: 'lucide-paperclip',
      id: 'invoke',
      name: 'Invoke',
      plugin
    });
  }

  protected override createEditorCommandInvocation(editor: Editor, ctx: MarkdownFileInfo): EditorCommandInvocationBase<Plugin> {
    return new InvokeCommandInvocation(this.plugin, editor, ctx);
  }
}
