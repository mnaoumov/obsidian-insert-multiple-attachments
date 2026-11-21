import type { PluginNoticeComponent } from '@mnaoumov/obsidian-lib/components/plugin-notice-component';
import type {
  App,
  Editor,
  MarkdownFileInfo
} from 'obsidian';

import { strictProxy } from '@mnaoumov/typescript-test-toolkit/strict-proxy';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { PluginSettingsComponent } from '../plugin-settings-component.ts';

import {
  IMAGE_ACCEPT,
  InsertImagesCommandHandler
} from './insert-images-command-handler.ts';

const hoisted = vi.hoisted(() => ({
  mockInsertAttachmentsControlConstructor: vi.fn()
}));

vi.mock('../insert-attachments-control.ts', () => ({
  InsertAttachmentsControl: hoisted.mockInsertAttachmentsControlConstructor
}));

function createHandler(
  app?: App,
  pluginSettingsComponent?: PluginSettingsComponent,
  pluginNoticeComponent?: PluginNoticeComponent
): InsertImagesCommandHandler {
  return new InsertImagesCommandHandler({
    app: app ?? strictProxy<App>({}),
    pluginNoticeComponent: pluginNoticeComponent ?? strictProxy<PluginNoticeComponent>({}),
    pluginSettingsComponent: pluginSettingsComponent ?? strictProxy<PluginSettingsComponent>({})
  });
}

describe('InsertImagesCommandHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should build the insert-images command', (): void => {
    const command = createHandler().buildCommand();

    expect(command.id).toBe('insert-images');
    expect(command.name).toBe('Insert multiple images');
    expect(command.icon).toBe('lucide-images');
    expect(command.editorCheckCallback).toBeDefined();
  });

  it('should accept images only', (): void => {
    expect(IMAGE_ACCEPT).toBe('image/*');
  });

  it('should create an image-only InsertAttachmentsControl when the command executes', (): void => {
    const app = strictProxy<App>({});
    const pluginSettingsComponent = strictProxy<PluginSettingsComponent>({});
    const pluginNoticeComponent = strictProxy<PluginNoticeComponent>({});
    const handler = createHandler(app, pluginSettingsComponent, pluginNoticeComponent);

    const editor = strictProxy<Editor>({});
    const context = strictProxy<MarkdownFileInfo>({});
    handler.buildCommand().editorCheckCallback?.(false, editor, context);

    expect(hoisted.mockInsertAttachmentsControlConstructor).toHaveBeenCalledWith({
      accept: IMAGE_ACCEPT,
      app,
      editor,
      pluginNoticeComponent,
      pluginSettingsComponent
    });
  });

  it('should not create InsertAttachmentsControl when only checking', (): void => {
    const editor = strictProxy<Editor>({});
    const context = strictProxy<MarkdownFileInfo>({});
    const result = createHandler().buildCommand().editorCheckCallback?.(true, editor, context);

    expect(result).toBe(true);
    expect(hoisted.mockInsertAttachmentsControlConstructor).not.toHaveBeenCalled();
  });
});
