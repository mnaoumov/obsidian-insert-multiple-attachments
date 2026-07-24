import type { AsyncEventRef } from 'obsidian-dev-utils/async-events';
import type { DataHandler } from 'obsidian-dev-utils/obsidian/data-handler';
import type { PluginEventSource } from 'obsidian-dev-utils/obsidian/plugin/plugin-event-source';
import type { GenericObject } from 'obsidian-dev-utils/type-guards';

import {
  noop,
  noopAsync
} from 'obsidian-dev-utils/function';
import { PluginSettingsComponentBase } from 'obsidian-dev-utils/obsidian/components/plugin-settings-component';
import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { PluginSettingsComponent } from './plugin-settings-component.ts';
import { PluginSettings } from './plugin-settings.ts';

class MockDataHandler implements DataHandler {
  public loadData = vi.fn(() => Promise.resolve(this.data));

  private _data: unknown;

  public saveData = vi.fn((data: unknown) => {
    this._data = data;
    return noopAsync();
  });

  public get data(): unknown {
    return this._data;
  }

  public constructor(data: GenericObject) {
    this._data = data;
  }
}

async function createLoadedComponent(data: GenericObject): Promise<PluginSettingsComponent> {
  const component = new PluginSettingsComponent({
    dataHandler: new MockDataHandler(data),
    pluginEventSource: createMockPluginEventSource()
  });
  await component.loadWithPromises();
  return component;
}

function createMockPluginEventSource(): PluginEventSource {
  const source: PluginEventSource = strictProxy<PluginEventSource>({
    offref: noop,
    on(name: string, callback: () => void, thisArg?: unknown): AsyncEventRef {
      return { asyncEventSource: source, callback, name, thisArg };
    }
  });
  return source;
}

describe('PluginSettingsComponent', () => {
  it('should be a PluginSettingsComponentBase with PluginSettings defaults', () => {
    const component = new PluginSettingsComponent({
      dataHandler: strictProxy<DataHandler>({}),
      pluginEventSource: createMockPluginEventSource()
    });

    expect(component).toBeInstanceOf(PluginSettingsComponentBase);
    expect(component.defaultSettings).toEqual(new PluginSettings());
  });

  it('should convert legacy shouldInsertDoubleLinesBetweenAttachmentLinks=true to a double newline delimiter', async () => {
    const component = await createLoadedComponent({ shouldInsertDoubleLinesBetweenAttachmentLinks: true });

    expect(component.settings.attachmentLinksDelimiter).toBe('\n\n');
  });

  it('should convert legacy shouldInsertDoubleLinesBetweenAttachmentLinks=false to a single newline delimiter', async () => {
    const component = await createLoadedComponent({ shouldInsertDoubleLinesBetweenAttachmentLinks: false });

    expect(component.settings.attachmentLinksDelimiter).toBe('\n');
  });

  it('should leave the delimiter at its default when the legacy field is absent', async () => {
    const component = await createLoadedComponent({});

    expect(component.settings.attachmentLinksDelimiter).toBe(new PluginSettings().attachmentLinksDelimiter);
  });

  it('should drop the legacy field after conversion', async () => {
    const component = await createLoadedComponent({ shouldInsertDoubleLinesBetweenAttachmentLinks: true });

    expect(component.settings).toEqual({
      attachmentLinksDelimiter: '\n\n',
      attachmentLinksPrefix: '',
      attachmentLinksSuffix: '',
      shouldShowInEditorContextMenu: true,
      shouldShowRibbonIcon: true
    });
  });
});
