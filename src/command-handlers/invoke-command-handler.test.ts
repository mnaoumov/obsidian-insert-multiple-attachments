import type {
  App,
  Editor,
  MarkdownFileInfo
} from 'obsidian';

import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { PluginSettingsComponent } from '../plugin-settings-component.ts';

import { InvokeCommandHandler } from './invoke-command-handler.ts';

const hoisted = vi.hoisted(() => ({
  mockInsertAttachmentsControlConstructor: vi.fn()
}));

vi.mock('../insert-attachments-control.ts', () => ({
  InsertAttachmentsControl: hoisted.mockInsertAttachmentsControlConstructor
}));

function createHandler(app?: App, pluginSettingsComponent?: PluginSettingsComponent): InvokeCommandHandler {
  return new InvokeCommandHandler({
    app: app ?? strictProxy<App>({}),
    pluginSettingsComponent: pluginSettingsComponent ?? strictProxy<PluginSettingsComponent>({})
  });
}

describe('InvokeCommandHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create an instance', (): void => {
    expect(createHandler()).toBeInstanceOf(InvokeCommandHandler);
  });

  it('should set correct id', (): void => {
    expect(createHandler().buildCommand().id).toBe('invoke');
  });

  it('should set correct icon', (): void => {
    expect(createHandler().buildCommand().icon).toBe('lucide-paperclip');
  });

  it('should set correct name', (): void => {
    expect(createHandler().buildCommand().name).toBe('Invoke');
  });

  it('should build a command with an editorCheckCallback', (): void => {
    const command = createHandler().buildCommand();

    expect(command.id).toBe('invoke');
    expect(command.editorCheckCallback).toBeDefined();
  });

  it('should create InsertAttachmentsControl when the command executes', (): void => {
    const app = strictProxy<App>({});
    const pluginSettingsComponent = strictProxy<PluginSettingsComponent>({});
    const handler = createHandler(app, pluginSettingsComponent);

    const editor = strictProxy<Editor>({});
    const ctx = strictProxy<MarkdownFileInfo>({});
    const command = handler.buildCommand();
    command.editorCheckCallback?.(false, editor, ctx);

    expect(hoisted.mockInsertAttachmentsControlConstructor).toHaveBeenCalledWith({
      app,
      editor,
      pluginSettingsComponent
    });
  });

  it('should not create InsertAttachmentsControl when only checking', (): void => {
    const handler = createHandler();

    const editor = strictProxy<Editor>({});
    const ctx = strictProxy<MarkdownFileInfo>({});
    const command = handler.buildCommand();
    const result = command.editorCheckCallback?.(true, editor, ctx);

    expect(result).toBe(true);
    expect(hoisted.mockInsertAttachmentsControlConstructor).not.toHaveBeenCalled();
  });
});
