import type {
  App,
  Editor,
  MarkdownFileInfo
} from 'obsidian';
import type { ReadonlyDeep } from 'type-fest';

import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { PluginSettings } from '../plugin-settings.ts';

import { InvokeCommandHandler } from './invoke-command-handler.ts';

interface InternalExecuteEditor {
  executeEditor(editor: Editor, ctx: MarkdownFileInfo): void;
}

interface MockEditorCommandHandlerConstructorParams {
  readonly icon: string;
  readonly id: string;
  readonly name: string;
}

const hoisted = vi.hoisted(() => ({
  mockInsertAttachmentsControlConstructor: vi.fn()
}));

vi.mock('../insert-attachments-control.ts', () => ({
  InsertAttachmentsControl: hoisted.mockInsertAttachmentsControlConstructor
}));

vi.mock('obsidian-dev-utils/obsidian/command-handlers/editor-command-handler', () => ({
  EditorCommandHandler: class MockEditorCommandHandler {
    public readonly icon: string;
    public readonly id: string;
    public readonly name: string;

    public constructor(params: MockEditorCommandHandlerConstructorParams) {
      this.icon = params.icon;
      this.id = params.id;
      this.name = params.name;
    }
  }
}));

describe('InvokeCommandHandler', () => {
  it('should create an instance', (): void => {
    const handler = new InvokeCommandHandler({
      app: strictProxy<App>({}),
      getPluginSettings: (): ReadonlyDeep<PluginSettings> => strictProxy<PluginSettings>({}),
      pluginName: 'test-plugin'
    });

    expect(handler).toBeInstanceOf(InvokeCommandHandler);
  });

  it('should set correct id', (): void => {
    const handler = new InvokeCommandHandler({
      app: strictProxy<App>({}),
      getPluginSettings: (): ReadonlyDeep<PluginSettings> => strictProxy<PluginSettings>({}),
      pluginName: 'test-plugin'
    });

    expect(handler.id).toBe('invoke');
  });

  it('should set correct icon', (): void => {
    const handler = new InvokeCommandHandler({
      app: strictProxy<App>({}),
      getPluginSettings: (): ReadonlyDeep<PluginSettings> => strictProxy<PluginSettings>({}),
      pluginName: 'test-plugin'
    });

    expect(handler.icon).toBe('lucide-paperclip');
  });

  it('should set correct name', (): void => {
    const handler = new InvokeCommandHandler({
      app: strictProxy<App>({}),
      getPluginSettings: (): ReadonlyDeep<PluginSettings> => strictProxy<PluginSettings>({}),
      pluginName: 'test-plugin'
    });

    expect(handler.name).toBe('Invoke');
  });

  it('should create InsertAttachmentsControl when executeEditor is called', (): void => {
    const mockApp = strictProxy<App>({});
    const mockSettings = strictProxy<PluginSettings>({});
    const handler = new InvokeCommandHandler({
      app: mockApp,
      getPluginSettings: (): ReadonlyDeep<PluginSettings> => mockSettings,
      pluginName: 'test-plugin'
    });

    const mockEditor = strictProxy<Editor>({});
    const mockCtx = strictProxy<MarkdownFileInfo>({});

    // eslint-disable-next-line no-restricted-syntax -- test helper accesses protected executeEditor method.
    (handler as unknown as InternalExecuteEditor).executeEditor(mockEditor, mockCtx);

    expect(hoisted.mockInsertAttachmentsControlConstructor).toHaveBeenCalledWith({
      app: mockApp,
      editor: mockEditor,
      pluginSettings: mockSettings
    });
  });
});
